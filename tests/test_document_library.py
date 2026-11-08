import copy
import json
from pathlib import Path
import sqlite3
import zipfile

import pytest

from scripts import document_library as dl


@pytest.fixture
def library(tmp_path):
    source, project = tmp_path/'old', tmp_path/'new'
    source.mkdir();project.mkdir()
    (source/'nested folder').mkdir();(source/'nested folder/empty').mkdir()
    (source/'nested folder/document.bin').write_bytes(b'opaque bytes\x00\xff')
    (source/'CATALOG.md').write_bytes(b'Original catalogue; no rewriting.\n')
    (source/'do-not-execute.py').write_text("raise RuntimeError('This script must only be copied')",encoding='utf-8')
    (project/'doc_library').mkdir();(project/'doc_library/preserved.epub').write_bytes(b'Existing EPUB stays intact')
    (project/'data').mkdir()
    with sqlite3.connect(project/'data/knowledge.sqlite') as c:
        c.executescript("CREATE TABLE meta(key,value); INSERT INTO meta VALUES('revision','5'); CREATE TABLE sources(id,data); CREATE TABLE topics(id,data); INSERT INTO topics VALUES('existing','{}'); CREATE VIRTUAL TABLE search USING fts5(text); INSERT INTO search VALUES('Existing search record');")
        c.execute('INSERT INTO sources VALUES (?,?)',('REGISTERED',json.dumps({'id':'REGISTERED','sha256':dl.sha256(source/'CATALOG.md')})))
    return dl.Library(project),source


def test_copy_preserves_all_bytes_timestamps_registration_and_database(library):
    lib,source=library;before,_=dl.knowledge_snapshot(lib.project)
    result=lib.copy(source)
    assert result['files']==4 and result['copied_files']==3 and not result['ingestion_performed']
    for path in source.rglob('*'):
        target=lib.destination/path.relative_to(source)
        if path.is_file():
            assert target.read_bytes()==path.read_bytes()
            assert target.stat().st_mtime_ns==path.stat().st_mtime_ns
        else:assert target.is_dir()
    assert (lib.destination/'preserved.epub').read_bytes()==b'Existing EPUB stays intact'
    manifest=dl.load_inventory(lib.inventory_path)
    assert next(x for x in manifest['files'] if x['path']=='CATALOG.md')['existing_graph_source_ids']==['REGISTERED']
    assert next(x for x in manifest['files'] if x['path']=='preserved.epub')['origin']=='preserved'
    assert manifest['ingestion_performed'] is False and manifest['knowledge_action']=='none'
    assert dl.knowledge_snapshot(lib.project)[0]==before
    assert lib.verify()['status']=='verified'


def test_preview_writes_nothing(library):
    lib,source=library
    paths={p.relative_to(lib.project) for p in lib.project.rglob('*')}
    db=dl.sha256(lib.project/'data/knowledge.sqlite')
    assert lib.copy(source,check=True)['status']=='preview'
    assert {p.relative_to(lib.project) for p in lib.project.rglob('*')}==paths
    assert dl.sha256(lib.project/'data/knowledge.sqlite')==db


def test_identical_rerun_does_not_rewrite_files_or_manifest(library):
    lib,source=library;lib.copy(source)
    before={p.relative_to(lib.project):(p.stat().st_mtime_ns,dl.sha256(p)) for p in [*lib.destination.rglob('*'),lib.inventory_path] if p.is_file()}
    assert lib.copy(source)['status']=='unchanged'
    after={p.relative_to(lib.project):(p.stat().st_mtime_ns,dl.sha256(p)) for p in [*lib.destination.rglob('*'),lib.inventory_path] if p.is_file()}
    assert before==after


@pytest.mark.parametrize('kind',['content','case','file-directory'])
def test_conflicts_never_overwrite_destination(library,kind):
    lib,source=library
    if kind=='content':(lib.destination/'CATALOG.md').write_bytes(b'Different existing file')
    elif kind=='case':(lib.destination/'catalog.md').write_bytes((source/'CATALOG.md').read_bytes())
    else:(lib.destination/'nested folder').write_bytes(b'This is a file')
    before=dl.scan(lib.destination)
    with pytest.raises(dl.LibraryError,match='conflict'):lib.copy(source)
    assert dl.scan(lib.destination)==before and not lib.inventory_path.exists()


def test_interruption_rolls_back_only_new_files(library,monkeypatch):
    lib,source=library;before=dl.scan(lib.destination)
    original=dl.shutil.copyfileobj
    calls=0
    def interrupted(src,dst,*args,**kwargs):
        nonlocal calls
        calls+=1
        if calls==2:
            dst.write(b'Partial file')
            raise KeyboardInterrupt('Simulated interruption during publication')
        return original(src,dst,*args,**kwargs)
    monkeypatch.setattr(dl.shutil,'copyfileobj',interrupted)
    with pytest.raises(KeyboardInterrupt):lib.copy(source)
    assert dl.scan(lib.destination)==before and not lib.inventory_path.exists()
    assert not list((lib.project/'data/library-staging').iterdir())
    assert not (lib.project/'data/document-library.lock').exists()


def test_changed_source_is_not_published(library,monkeypatch):
    lib,source=library;original=dl.shutil.copy2;before=dl.scan(lib.destination)
    def changing(src,dst,*args,**kwargs):
        result=original(src,dst,*args,**kwargs)
        if Path(src).name=='CATALOG.md':Path(src).write_bytes(b'Changed externally while copying')
        return result
    monkeypatch.setattr(dl.shutil,'copy2',changing)
    with pytest.raises(dl.LibraryError,match='Source changed'):lib.copy(source)
    assert dl.scan(lib.destination)==before and not lib.inventory_path.exists()


@pytest.mark.parametrize('problem',['missing','corrupt','unexpected','missing-directory'])
def test_verify_reports_differences_without_repair(library,problem):
    lib,source=library;lib.copy(source)
    if problem=='missing':(lib.destination/'CATALOG.md').unlink()
    elif problem=='corrupt':(lib.destination/'CATALOG.md').write_bytes(b'Corrupted copy')
    elif problem=='unexpected':(lib.destination/'unrelated.txt').write_bytes(b'Preserve me')
    else:(lib.destination/'nested folder/empty').rmdir()
    before=dl.scan(lib.destination)
    with pytest.raises(dl.LibraryError,match='verification failed'):lib.verify()
    assert dl.scan(lib.destination)==before


def test_backup_restores_in_an_empty_tree_without_originals(library,tmp_path):
    lib,source=library;lib.copy(source);result=lib.backup()
    archive=Path(result['archive']);assert result['files']==4
    assert dl.verify_archive(archive)['status']=='verified'
    restored=tmp_path/'restored';restored.mkdir()
    # Archive has already passed safe-path/link validation. These are the backup's own entries.
    with zipfile.ZipFile(archive) as z:z.extractall(restored)
    assert dl.Library(restored).verify()['files']==4
    assert not (restored/'data/knowledge.sqlite').exists()


def test_invalid_archive_path_is_rejected(tmp_path):
    p=tmp_path/'bad.zip'
    with zipfile.ZipFile(p,'w') as z:z.writestr('../outside.txt','Escape')
    with pytest.raises(dl.LibraryError,match='Unsafe'):dl.verify_archive(p)


def test_backup_detects_replaced_archive_file(library,tmp_path):
    lib,source=library;lib.copy(source);good=Path(lib.backup()['archive']);bad=tmp_path/'corrupt.zip'
    with zipfile.ZipFile(good) as original,zipfile.ZipFile(bad,'w') as changed:
        for entry in original.infolist():changed.writestr(entry,b'Corruption' if entry.filename=='doc_library/CATALOG.md' else original.read(entry))
    with pytest.raises(dl.LibraryError,match='checksum mismatch'):dl.verify_archive(bad)


def test_overlapping_roots_and_source_symlink_are_rejected(library):
    lib,source=library
    with pytest.raises(dl.LibraryError,match='separate'):lib.copy(lib.project)
    try:(source/'linked-file').symlink_to(source/'CATALOG.md')
    except OSError:pytest.skip('Creating a symlink is not available to this test account')
    with pytest.raises(dl.LibraryError,match='links'):lib.copy(source)


def test_missing_source_and_stale_lock_are_explicit(library):
    lib,source=library
    with pytest.raises(dl.LibraryError,match='unavailable'):lib.copy(source/'absent',check=True)
    lock=lib.project/'data/document-library.lock';lock.write_text('{"pid":123}')
    with pytest.raises(dl.LibraryError,match='stale lock'):lib.copy(source)
    assert lock.read_text()=='{"pid":123}'


@pytest.mark.parametrize('link_kind',['is_symlink','is_junction'])
def test_link_rejection_does_not_require_link_creation_privileges(library,monkeypatch,link_kind):
    lib,source=library;original=getattr(Path,link_kind)
    def flagged(path):return path==source/'CATALOG.md' or original(path)
    monkeypatch.setattr(Path,link_kind,flagged)
    with pytest.raises(dl.LibraryError,match='links'):lib.copy(source)


def test_incremental_copy_adds_new_files_without_reclassifying_preserved_epub(library):
    lib,source=library;lib.copy(source)
    (source/'new addition.txt').write_bytes(b'New opaque document')
    assert lib.copy(source)['files']==5
    assert next(x for x in dl.load_inventory(lib.inventory_path)['files'] if x['path']=='preserved.epub')['origin']=='preserved'


def test_source_change_during_publication_rolls_back(library,monkeypatch):
    lib,source=library;before=dl.scan(lib.destination);original=dl.shutil.copyfileobj;changed=False
    def mutate_source(src,dst,*args,**kwargs):
        nonlocal changed
        result=original(src,dst,*args,**kwargs)
        if not changed:
            (source/'CATALOG.md').write_bytes(b'Changed externally during publication');changed=True
        return result
    monkeypatch.setattr(dl.shutil,'copyfileobj',mutate_source)
    with pytest.raises(dl.LibraryError,match='Source changed during publication'):lib.copy(source)
    assert dl.scan(lib.destination)==before and not lib.inventory_path.exists()


def test_space_check_and_unchanged_rerun_with_no_free_space(library,monkeypatch):
    from types import SimpleNamespace
    lib,source=library;original=dl.shutil.disk_usage
    monkeypatch.setattr(dl.shutil,'disk_usage',lambda path:SimpleNamespace(free=0))
    with pytest.raises(dl.LibraryError,match='Insufficient free space'):lib.copy(source)
    monkeypatch.setattr(dl.shutil,'disk_usage',original)
    lib.copy(source)
    monkeypatch.setattr(dl.shutil,'disk_usage',lambda path:SimpleNamespace(free=0))
    assert lib.copy(source)['status']=='unchanged'
