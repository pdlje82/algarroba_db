"""Own opaque document files without importing or indexing their contents.

Only stdlib is used. This module deliberately never imports backend.Store or application code.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sqlite3
import stat
import sys
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = 'imports/document-library-inventory.json'
TABLES = ('meta', 'sources', 'topics', 'relationships', 'findings', 'coverage',
          'unresolved', 'browse_groups', 'plant_images', 'batches', 'redirects', 'page_text', 'search')


class LibraryError(ValueError):
    pass


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def no_links(path):
    """Check the lexical path before resolving it, including existing ancestors."""
    path = Path(os.path.abspath(path))
    for candidate in reversed((path, *path.parents)):
        if candidate.is_symlink() or candidate.is_junction():
            raise LibraryError(f'Filesystem links are not permitted: {candidate}')
        if os.name == 'nt' and candidate.exists() and candidate.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise LibraryError(f'Reparse points are not permitted: {candidate}')
    return path


def relative_path(value):
    if not isinstance(value, str) or not value or '\\' in value or ':' in value:
        raise LibraryError(f'Invalid relative path: {value!r}')
    path = PurePosixPath(value)
    if path.is_absolute() or any(p in {'', '.', '..'} for p in value.split('/')):
        raise LibraryError(f'Unsafe relative path: {value!r}')
    return path


def inside(root, value):
    relative_path(value)
    path = no_links(Path(root) / value)
    if not path.resolve().is_relative_to(Path(root).resolve()):
        raise LibraryError(f'Path escapes its library: {value}')
    return path


def scan(root):
    root = no_links(root)
    if not root.is_dir():
        raise LibraryError(f'Library directory is unavailable: {root}')
    files, directories, names = [], [], set()
    for current, children, filenames in os.walk(root, followlinks=False):
        for name in sorted(children + filenames):
            path = no_links(Path(current) / name)
            relative = path.relative_to(root).as_posix()
            relative_path(relative)
            if relative.casefold() in names:
                raise LibraryError(f'Case-insensitive filename collision: {relative}')
            names.add(relative.casefold())
            if path.is_dir():
                directories.append(relative)
            elif path.is_file():
                before = path.stat()
                digest = sha256(path)
                after = path.stat()
                if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                    raise LibraryError(f'File changed while hashing: {relative}')
                files.append(dict(path=relative, size=after.st_size, sha256=digest, mtime_ns=after.st_mtime_ns))
            else:
                raise LibraryError(f'Unsupported filesystem entry: {path}')
    return {'files': sorted(files, key=lambda f: f['path']), 'directories': sorted(directories)}


def content_map(tree):
    return {f['path']: (f['size'], f['sha256']) for f in tree['files']}


def knowledge_snapshot(project):
    """Read-only SQL, excluding unrelated saved explorations and research tasks."""
    database = project / 'data/knowledge.sqlite'
    if not database.exists():
        return {'present': False}, []
    with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as connection:
        connection.execute('BEGIN')
        available = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        tables = {}
        for name in TABLES:
            if name not in available:
                continue
            rows = sorted(connection.execute(f'SELECT * FROM "{name}"').fetchall(), key=repr)
            encoded = json.dumps(rows, ensure_ascii=False, separators=(',', ':'), default=str).encode()
            tables[name] = {'rows': len(rows), 'sha256': hashlib.sha256(encoded).hexdigest()}
        sources = [json.loads(row[0]) for row in connection.execute('SELECT data FROM sources')] if 'sources' in available else []
        revision = connection.execute("SELECT value FROM meta WHERE key='revision'").fetchone()[0] if 'meta' in available else None
        schema = connection.execute('SELECT type,name,sql FROM sqlite_master ORDER BY type,name').fetchall()
    return {'present': True, 'revision': revision, 'tables': tables,
            'schema_sha256': hashlib.sha256(json.dumps(schema).encode()).hexdigest()}, sources


def load_inventory(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if data.get('schema_version') != 1 or data.get('destination') != 'doc_library':
        raise LibraryError('Unsupported document-library inventory')
    seen = set()
    for record in data['files']:
        relative_path(record['path'])
        if record['path'].casefold() in seen:
            raise LibraryError('Duplicate inventory path')
        seen.add(record['path'].casefold())
        if record['origin'] not in {'copied', 'preserved'} or len(record['sha256']) != 64 or record['size'] < 0:
            raise LibraryError('Invalid inventory file record')
    for directory in data['directories']:
        relative_path(directory)
    if data['file_count'] != len(data['files']) or data['total_bytes'] != sum(f['size'] for f in data['files']):
        raise LibraryError('Inventory totals do not match its records')
    return data


def compare(inventory, actual):
    expected, found = content_map(inventory), content_map(actual)
    return {
        'missing': sorted(expected.keys() - found.keys()),
        'changed': sorted(p for p in expected.keys() & found.keys() if expected[p] != found[p]),
        'unexpected': sorted(found.keys() - expected.keys()),
        'missing_directories': sorted(set(inventory['directories']) - set(actual['directories'])),
        'unexpected_directories': sorted(set(actual['directories']) - set(inventory['directories'])),
    }


def require_equal(inventory, actual):
    differences = compare(inventory, actual)
    if any(differences.values()):
        raise LibraryError('Library verification failed: ' + json.dumps(differences, ensure_ascii=False))
    return differences


class Library:
    def __init__(self, project=ROOT):
        self.project = no_links(project).resolve()
        self.destination = self.project / 'doc_library'
        self.inventory_path = inside(self.project, INVENTORY)

    @contextmanager
    def lock(self):
        folder = self.project / 'data'
        no_links(folder)
        folder.mkdir(exist_ok=True)
        path = folder / 'document-library.lock'
        try:
            stream = path.open('x', encoding='utf-8')
        except FileExistsError as error:
            raise LibraryError(f'Another operation or an interrupted run holds {path}. Check the recorded process before removing the stale lock.') from error
        try:
            with stream:
                stream.write(json.dumps({'pid': os.getpid(), 'started': utc_now()}))
            yield
        finally:
            path.unlink()

    def preview(self, source):
        source = no_links(source).resolve()
        destination = no_links(self.destination).resolve()
        if source.is_relative_to(destination) or destination.is_relative_to(source):
            raise LibraryError('Source and destination must be separate directory trees')
        incoming = scan(source)
        existing = scan(destination) if destination.exists() else {'files': [], 'directories': []}
        source_files, target_files = content_map(incoming), content_map(existing)
        collisions = sorted(p for p in source_files.keys() & target_files.keys() if source_files[p] != target_files[p])
        # Directory/file and case-only collisions cannot be merged safely on Windows.
        source_entries = {p.casefold(): (p, 'file') for p in source_files} | {p.casefold(): (p, 'directory') for p in incoming['directories']}
        target_entries = {p.casefold(): (p, 'file') for p in target_files} | {p.casefold(): (p, 'directory') for p in existing['directories']}
        for key in source_entries.keys() & target_entries.keys():
            if source_entries[key] != target_entries[key]:
                collisions.append(source_entries[key][0])
        if collisions:
            raise LibraryError('Destination conflicts; no files overwritten: ' + json.dumps(sorted(set(collisions))))
        unchanged = False
        if self.inventory_path.exists():
            previous = load_inventory(self.inventory_path)
            require_equal(previous, existing)
            missing = {f['path'] for f in previous['files'] if f['origin'] == 'copied'} - source_files.keys()
            if missing:
                raise LibraryError('Source no longer contains previously copied files: ' + json.dumps(sorted(missing)))
            unchanged = content_map(previous) == target_files | source_files and set(previous['directories']) == set(incoming['directories']) | set(existing['directories'])
        bytes_required = 0 if unchanged else sum(f['size'] for f in incoming['files']) + sum(source_files[p][0] for p in source_files.keys() - target_files.keys())
        if bytes_required and shutil.disk_usage(self.project).free < bytes_required + 16 * 1024 ** 2:
            raise LibraryError(f'Insufficient free space; staging and publication require {bytes_required} bytes plus 16 MiB')
        return source, incoming, existing

    def copy(self, source, check=False):
        if check:
            source, incoming, existing = self.preview(source)
            return dict(status='preview', source=str(source), source_files=len(incoming['files']), source_bytes=sum(f['size'] for f in incoming['files']),
                        preserved_destination_files=len(content_map(existing).keys() - content_map(incoming).keys()), ingestion_performed=False)
        with self.lock():
            source, incoming, existing = self.preview(source)
            before, registered = knowledge_snapshot(self.project)
            previous = load_inventory(self.inventory_path) if self.inventory_path.exists() else None
            expected_files = content_map(existing) | content_map(incoming)
            if previous and content_map(previous) == expected_files and set(previous['directories']) == set(incoming['directories']) | set(existing['directories']):
                return {'status': 'unchanged', 'files': previous['file_count'], 'inventory': str(self.inventory_path), 'ingestion_performed': False}
            staging_parent = self.project / 'data/library-staging'
            no_links(staging_parent)
            staging_parent.mkdir(exist_ok=True)
            staging = staging_parent / uuid.uuid4().hex
            staging.mkdir()
            published, created_directories = [], []
            temp_manifest = self.inventory_path.with_name('.document-library-' + uuid.uuid4().hex + '.tmp')
            manifest_created = False
            try:
                for directory in incoming['directories']:
                    inside(staging, directory).mkdir(parents=True, exist_ok=True)
                for record in incoming['files']:
                    staged = inside(staging, record['path'])
                    staged.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(inside(source, record['path']), staged)
                require_equal(incoming, scan(staging))
                if scan(source) != incoming:
                    raise LibraryError('Source changed during copying; staged content was not published')
                require_equal(existing, scan(self.destination) if self.destination.exists() else {'files': [], 'directories': []})
                if not self.destination.exists():
                    self.destination.mkdir()
                    created_directories.append(self.destination)
                for directory in incoming['directories']:
                    path = inside(self.destination, directory)
                    if not path.exists():
                        path.mkdir()
                        created_directories.append(path)
                for record in incoming['files']:
                    path = inside(self.destination, record['path'])
                    if path.exists():
                        if path.stat().st_size != record['size'] or sha256(path) != record['sha256']:
                            raise LibraryError(f'Destination changed during publication: {path}')
                        continue
                    with path.open('xb') as output:
                        published.append((path, path.stat().st_ino))
                        with inside(staging, record['path']).open('rb') as input_file:
                            shutil.copyfileobj(input_file, output)
                        output.flush()
                        os.fsync(output.fileno())
                    shutil.copystat(inside(staging, record['path']), path)
                actual = scan(self.destination)
                require_equal({'files': existing['files'] + [f for f in incoming['files'] if f['path'] not in content_map(existing)],
                               'directories': sorted(set(existing['directories']) | set(incoming['directories']))}, actual)
                if scan(source) != incoming:
                    raise LibraryError('Source changed during publication; no ownership inventory was accepted')
                after, _ = knowledge_snapshot(self.project)
                if before != after:
                    raise LibraryError('Knowledge tables changed concurrently; no database writes were made by this tool')
                registered_hashes = {}
                for record in registered:
                    registered_hashes.setdefault(record['sha256'], []).append(record['id'])
                source_files = content_map(incoming)
                now = utc_now()
                records = [dict(f, origin='copied' if f['path'] in source_files else 'preserved',
                                existing_graph_source_ids=sorted(registered_hashes.get(f['sha256'], []))) for f in actual['files']]
                manifest = dict(schema_version=1, destination='doc_library', source_root=str(source), created_at=previous['created_at'] if previous else now,
                                verified_at=now, ingestion_performed=False, knowledge_action='none', knowledge_snapshot=before,
                                file_count=len(records), copied_file_count=len(incoming['files']), total_bytes=sum(f['size'] for f in records),
                                files=records, directories=actual['directories'])
                self.inventory_path.parent.mkdir(exist_ok=True)
                with temp_manifest.open('x', encoding='utf-8') as output:
                    manifest_created = True
                    output.write(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
                os.replace(temp_manifest, self.inventory_path)
                return dict(status='copied', files=len(records), copied_files=len(incoming['files']), bytes=manifest['total_bytes'],
                            inventory=str(self.inventory_path), knowledge_unchanged=True, ingestion_performed=False)
            except BaseException:
                for path, inode in reversed(published):
                    if path.exists() and not path.is_symlink() and path.stat().st_ino == inode:
                        path.unlink()
                for path in sorted(created_directories, key=lambda p: len(p.parts), reverse=True):
                    if path.exists() and not any(path.iterdir()):
                        path.rmdir()
                raise
            finally:
                if manifest_created and temp_manifest.exists():
                    temp_manifest.unlink()
                if staging.resolve().parent != staging_parent.resolve() or len(staging.name) != 32:
                    raise LibraryError('Refusing to remove an unexpected staging path')
                shutil.rmtree(staging)

    def verify(self):
        inventory = load_inventory(self.inventory_path)
        actual = scan(self.destination)
        require_equal(inventory, actual)
        return {'status': 'verified', 'files': inventory['file_count'], 'bytes': inventory['total_bytes'], 'ingestion_performed': False}

    def backup(self):
        with self.lock():
            self.verify()
            inventory = load_inventory(self.inventory_path)
            folder = no_links(self.project / 'backups')
            folder.mkdir(exist_ok=True)
            if shutil.disk_usage(folder).free < inventory['total_bytes'] + 16 * 1024 ** 2:
                raise LibraryError('Insufficient space for a verified library backup')
            target = folder / ('document-library-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.zip')
            temporary = target.with_suffix('.partial')
            created = False
            try:
                with zipfile.ZipFile(temporary, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=3) as archive:
                    created = True
                    archive.write(self.inventory_path, INVENTORY)
                    for directory in inventory['directories']:
                        archive.write(inside(self.destination, directory), 'doc_library/' + directory + '/')
                    for record in inventory['files']:
                        archive.write(inside(self.destination, record['path']), 'doc_library/' + record['path'])
                result = verify_archive(temporary)
                if target.exists():
                    raise LibraryError(f'Backup target already exists; it has been preserved: {target}')
                os.rename(temporary, target)
                return dict(result, archive=str(target), sha256=sha256(target))
            finally:
                if created and temporary.exists():
                    temporary.unlink()


def verify_archive(path):
    with zipfile.ZipFile(no_links(path)) as archive:
        names = archive.namelist()
        if len(set(names)) != len(names):
            raise LibraryError('Duplicate archive entries')
        for name in names:
            relative_path(name.rstrip('/'))
            if stat.S_ISLNK(archive.getinfo(name).external_attr >> 16):
                raise LibraryError(f'Archive filesystem links are not permitted: {name}')
        raw = archive.read(INVENTORY)
        inventory = json.loads(raw)
        # Reuse inventory validation without extracting any archive entries.
        if inventory.get('schema_version') != 1 or inventory.get('destination') != 'doc_library':
            raise LibraryError('Unsupported archived inventory')
        expected = {INVENTORY} | {'doc_library/' + f['path'] for f in inventory['files']} | {'doc_library/' + d + '/' for d in inventory['directories']}
        if set(names) != expected:
            raise LibraryError('Archive entries do not exactly match the inventory')
        for record in inventory['files']:
            relative_path(record['path'])
            name = 'doc_library/' + record['path']
            with archive.open(name) as stream:
                digest = hashlib.file_digest(stream, 'sha256').hexdigest()
            if archive.getinfo(name).file_size != record['size'] or digest != record['sha256']:
                raise LibraryError(f'Archive checksum mismatch: {name}')
        if inventory['file_count'] != len(inventory['files']) or inventory['total_bytes'] != sum(f['size'] for f in inventory['files']):
            raise LibraryError('Archived inventory totals do not match')
    return {'status': 'verified', 'files': inventory['file_count'], 'bytes': inventory['total_bytes']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root', type=Path, default=ROOT, help='Explicit project or restored backup root')
    sub = parser.add_subparsers(dest='command', required=True)
    command = sub.add_parser('copy'); command.add_argument('--source', type=Path, required=True); command.add_argument('--check', action='store_true')
    command = sub.add_parser('verify'); command.add_argument('--archive', type=Path)
    sub.add_parser('backup')
    args = parser.parse_args()
    try:
        library = Library(args.project_root)
        if args.command == 'copy': result = library.copy(args.source, args.check)
        elif args.command == 'backup': result = library.backup()
        else: result = verify_archive(args.archive) if args.archive else library.verify()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except (LibraryError, OSError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
