# Owned document library

Completed 8 November 2026. This is file ownership and preservation only; no document content was extracted, indexed or ingested.

## Collection and authority

Copied 378 files (601,507,644 bytes) recursively from `C:\Users\JanEngelke\git_private\algarrobos\doc_library` into this project’s `doc_library/`. The existing tracked `Scientific_Knowledge_Graphs_ElevenReader.epub` is preserved, giving 379 files and 603,608,676 bytes in the owned folder.

All original filenames, relative directories, catalogue/history files and bytes are preserved. All 378 copied file modification timestamps match their originals on this filesystem. Companion images, EPUBs, scripts, archives, CAD/GIS data and the existing compiled Python file were copied as opaque files. Copied scripts were not executed; embedded archives were not unpacked. Historical absolute paths or external links inside documents remain original text, not automatically rewritten or downloaded.

Ownership metadata is in `imports/document-library-inventory.json`, separately from accepted knowledge. It records SHA-256, byte size, modification time, copied/preserved origin, copy provenance and existing graph-source matches. It is not a graph-import batch. Ten copied files match existing registrations by hash: nine PDFs and the supplied vegetation poster. An existing registration does not mean a complete file has been ingested or reviewed.

Existing registered copies under `sources/library/` and `sources/plant-intake/` remain in place. No deduplication or citation-path changes were made. No new source registrations, graph records, text extraction, OCR, embeddings or search indexing were performed.

New document bytes are ignored by Git under `/doc_library/`. The pre-existing tracked EPUB remains tracked. Git stores the inventory, tooling, tests and this report; a code-only checkout does not carry the local collection.

## Commands

Run from this project with its Python:

```powershell
.venv\Scripts\python.exe scripts/document_library.py copy --source "C:\Users\JanEngelke\git_private\algarrobos\doc_library" --check
.venv\Scripts\python.exe scripts/document_library.py copy --source "C:\Users\JanEngelke\git_private\algarrobos\doc_library"
.venv\Scripts\python.exe scripts/document_library.py verify
.venv\Scripts\python.exe scripts/document_library.py backup
```

`copy --check` is read-only. Copy uses verified staging under `data/library-staging/`, rechecks the source before and after publication, and writes the completed inventory last. Different destination content is an error, never an overwrite. Existing identical files are retained. Identical completed reruns return `unchanged` without rewriting the inventory or document files.

Verification reports missing, changed and unexpected files/directories without repairing them. Filesystem links, escaping paths and case-only/file-directory collisions are rejected. Normal exceptions and keyboard interruption remove only newly published files from that attempt; pre-existing files are preserved.

Operations use `data/document-library.lock`. If an external process kill or machine failure leaves a lock or staging directory, first confirm the PID recorded in the lock has stopped. Preserve the destination and inventory, inspect the abandoned operation, and remove only its stale lock/staging directory before retrying. Do not delete the owned folder or reset the graph. Verification must pass before treating a collection or archive as complete.

## Verified backup and recovery

Backup: `backups/document-library-20261108T112426791307Z.zip`.

SHA-256:

```text
5a0f30815699813992e47663a5307ec4594df3e158e7dab73e93a242b70aa8cd
```

The archive contains `doc_library/` and `imports/document-library-inventory.json`, including the preserved EPUB and empty directories. Its entries and file hashes were checked against the inventory. This is a document-library backup; the graph database, registered-source copies and plant media keep their separate backup workflow.

Recovery:

1. Verify the archive checksum above and run the archive check below before extracting.
2. Extract into a new, empty folder. Do not unpack over a different or damaged collection.
3. Verify the restored folder with the existing script and its explicit `--project-root` option.
4. Keep the verified collection and inventory together. To restore into an existing project, preserve its current library and inventory first, then place the verified pair together. No graph import or source-registration command is needed.

```powershell
.venv\Scripts\python.exe scripts/document_library.py verify --archive "backups\document-library-20261108T112426791307Z.zip"
.venv\Scripts\python.exe scripts/document_library.py --project-root "C:\path\to\empty-folder-after-extraction" verify
```

ZIP timestamps have limited precision. Exact original modification times are recorded as `mtime_ns` in the inventory; they were reapplied during the restore test. Byte integrity does not depend on timestamp precision.

## Validation and retained evidence

- 21 automated tests passed; one native symlink-creation test was skipped because this Windows account lacks that privilege. Independent mocked symlink and junction rejection tests both passed.
- Tests cover nested/empty directories, byte and timestamp preservation, read-only preview, identical reruns, conflicts, case/path collisions, interruption, source changes during staging/publication, corrupt/missing/unexpected files, low disk space, stale locks, backup restore and archive path/hash rejection.
- The real library verifies at 379 files. Its originals were rehashed successfully and the existing EPUB is unchanged.
- Repeating the real copy returned `unchanged`.
- A full archive was restored in a separate empty folder and all 379 files plus the inventory verified. An audit hook forbade reads/listing of the old repository during restoration and verification.
- Knowledge remains at revision 5. The database file’s SHA-256, schema fingerprint and accepted knowledge/source/search table fingerprints are unchanged. Saved explorations/research tasks were not written or reset.
- All 21 existing registered source-file endpoints returned the exact registered bytes. The normal application remains running without a restart.

Retained verification records:

- `backups/pre-document-library-20261108T111828Z/database-before.json`
- `backups/pre-document-library-20261108T111828Z/copy-before.json`
- `backups/pre-document-library-20261108T111828Z/verification.json`
- `backups/pre-document-library-20261108T111828Z/restore-verification.json`
- Restore test folder: `data/library-restore-tests/932c83b9a25f4e53b6a5495caf7db3ff`
