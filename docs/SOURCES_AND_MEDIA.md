# Sources, document library and plant media

Current maintenance reference, reconciled 10 November 2026. Paths and commands below are
relative to the repository root. Dated copy/intake results are historical acceptance evidence;
query SQLite and the file inventories for current contents and coverage.

| Collection | Authority and purpose | Backup |
| --- | --- | --- |
| `data/knowledge.sqlite` | Accepted concepts, sources, coverage, image associations and working plans | `python -m backend.cli backup` (database only) |
| `sources/` and `media/plants/` | Registered editions, artwork and provenance used by the app | `python -m backend.cli backup-media` (SQLite plus companion media/source archive) |
| `doc_library/` | Owned input collection; a copied file is not evidence of ingestion | `python scripts/document_library.py backup` (separate library archive) |
| `public/branding/` | Interface assets with their own [provenance](../public/branding/README.md) | Preserve with application source; these are not plant evidence |

Keep all backup scopes together for a complete recovery. Git alone does not carry local SQLite,
managed sources/media or the complete document library. The old `algarrobos` repository remains
read-only; the running app uses project-owned copies. Do not rerun a historical preparation/copy
script as a routine reset or overwrite accepted source editions.

For full-library and weekly factual intake use the [reusable ingestion prompt](../DOCUMENT_INGESTION_PROMPT.md)
and [import contract](../imports/CONTRACT.md). Library verification reports ownership differences;
weekly additions need their own hashes/edition reconciliation and do not automatically rewrite
`imports/document-library-inventory.json`. Current verification commands are centralized in
[Verification](VERIFICATION.md). The mappings and source-review details below preserve the
original intake's scope; the live registry is authoritative for subsequent additions.

All source links need a visible section heading or descriptive keyword, friendly document title
and exact page/section. New/revised references supply checked `label` and precise `locator`;
distinguish links to one document by passage/table/subject. Naming titles and media-reference
labels follow this rule. Translate faithfully and preserve original identifiers in the locator;
never invent missing headings. Checked PDF `page_labels` can add legacy page context through a
new metadata-only batch while preserving source bytes and immutable evidence/snapshots. See the
[citation-label contract](../imports/CONTRACT.md#descriptive-source-links-all-new-and-revised-intake).

## Owned document library

The ownership operation completed on 8 November 2026. It copied and preserved files; that operation did not extract, index or ingest their contents. Later knowledge intake has its own page coverage.

### Collection and authority

Copied 378 files (601,507,644 bytes) recursively from `C:\Users\JanEngelke\git_private\algarrobos\doc_library` into this project’s `doc_library/`. The existing tracked `Scientific_Knowledge_Graphs_ElevenReader.epub` is preserved, giving 379 files and 603,608,676 bytes in the owned folder.

All original filenames, relative directories, catalogue/history files and bytes are preserved. All 378 copied file modification timestamps match their originals on this filesystem. Companion images, EPUBs, scripts, archives, CAD/GIS data and the existing compiled Python file were copied as opaque files. Copied scripts were not executed; embedded archives were not unpacked. Historical absolute paths or external links inside documents remain original text, not automatically rewritten or downloaded.

Ownership metadata is in `imports/document-library-inventory.json`, separately from accepted knowledge. It records SHA-256, byte size, modification time, copied/preserved origin, copy provenance and existing graph-source matches. It is not a graph-import batch. Ten copied files match existing registrations by hash: nine PDFs and the supplied vegetation poster. An existing registration does not mean a complete file has been ingested or reviewed.

Existing registered copies under `sources/library/` and `sources/plant-intake/` remain in place. No deduplication or citation-path changes were made. No new source registrations, graph records, text extraction, OCR, embeddings or search indexing were performed.

New document bytes are ignored by Git under `/doc_library/`. The pre-existing tracked EPUB remains tracked. Git stores the inventory, tooling, tests and this report; a code-only checkout does not carry the local collection.

### Commands

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

### Verified backup and recovery

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

### Historical ownership verification (8 November 2026)

- 21 automated tests passed; one native symlink-creation test was skipped because this Windows account lacks that privilege. Independent mocked symlink and junction rejection tests both passed.
- Tests cover nested/empty directories, byte and timestamp preservation, read-only preview, identical reruns, conflicts, case/path collisions, interruption, source changes during staging/publication, corrupt/missing/unexpected files, low disk space, stale locks, backup restore and archive path/hash rejection.
- The real library verifies at 379 files. Its originals were rehashed successfully and the existing EPUB is unchanged.
- Repeating the real copy returned `unchanged`.
- A full archive was restored in a separate empty folder and all 379 files plus the inventory verified. An audit hook forbade reads/listing of the old repository during restoration and verification.
- Knowledge remained at revision 5 during that ownership operation. The database file’s SHA-256, schema fingerprint and accepted knowledge/source/search table fingerprints are unchanged. Saved explorations/research tasks were not written or reset.
- All 21 existing registered source-file endpoints returned the exact registered bytes. That ownership operation required no application restart.

Retained verification records:

- `backups/pre-document-library-20261108T111828Z/database-before.json`
- `backups/pre-document-library-20261108T111828Z/copy-before.json`
- `backups/pre-document-library-20261108T111828Z/verification.json`
- `backups/pre-document-library-20261108T111828Z/restore-verification.json`
- Restore test folder: `data/library-restore-tests/932c83b9a25f4e53b6a5495caf7db3ff`

## Plant illustrations and focused profiles

Historical intake completed 8 November 2026. That checked batch added 46 illustrations for 23 plant identities, ten new species topics, four habitat topics, 16 relationships and seven findings. Thirteen existing plant topics receive illustration-profile metadata; existing factual descriptions remain intact.

### Historical intake mapping (8 November 2026)

| Source asset stem | Canonical topic ID | Scientific identity |
|---|---|---|
| `carob` | `carob` | Ceratonia siliqua |
| `cork_oak` | `cork-oak` | Quercus suber |
| `palmetto` | `dwarf-palm` | Chamaerops humilis |
| `ephedra_fragilis` | `ephedra-fragilis` | Ephedra fragilis |
| `esparto` | `esparto` | Macrochloa tenacissima |
| `holm_oak` | `holm-oak-rotundifolia` | Quercus rotundifolia |
| `kermes_oak` | `kermes-oak` | Quercus coccifera |
| `lycium` | `lycium-intricatum` | Lycium intricatum |
| `lentisk` | `mastic` | Pistacia lentiscus |
| `myrtle` | `myrtle` | Myrtus communis |
| `oleander` | `oleander` | Nerium oleander |
| `phillyrea_angustifolia` | `phillyrea-angustifolia` | Phillyrea angustifolia |
| `phillyrea_latifolia` | `phillyrea-latifolia` | Phillyrea latifolia |
| `retama` | `retama-sphaerocarpa` | Retama sphaerocarpa |
| `buckthorn` | `rhamnus-alaternus` | Rhamnus alaternus |
| `rhamnus_lycioides` | `rhamnus-lycioides` | Rhamnus lycioides |
| `rosemary` | `rosemary` | Salvia rosmarinus |
| `salsola` | `salsola-webbii` | Salsola webbii |
| `tamarix` | `tamarix` | Tamarix spp. |
| `terebinth` | `terebinth` | Pistacia terebinthus |
| `thyme` | `thymus-hyemalis` | Thymus hyemalis |
| `wild_olive` | `wild-olive` | Olea europaea var. sylvestris |
| `ziziphus` | `ziziphus-lotus` | Ziziphus lotus |

The holm-oak drawings depict Quercus rotundifolia exclusively. Q. ilex remains a separate existing concept without this artwork. Rhamnus alaternus and R. lycioides are separate. Tamarix remains genus-level; esparto species and esparto-grassland habitat remain separate.

### Evidence and actual coverage

Old-app catalogue, plant names, illustration metadata, generation manifests, review notes, planning rules/source references, and relevant connected-knowledge entries were inspected first. The poster was visually inspected. Catalogue quantities, prices and assumed planting dimensions were not imported.

New scientific review inspected the UAL WEB_BIOCON descriptions/ecology for Retama, Macrochloa, Thymus and Ephedra; UIB Lycium and Nerium accounts; UAL salt-garden habitat descriptions; and the two single-page UAM sheets. UAL thesis PDF 66 (printed 65) was visually checked for the relevant Salsola, Thymus and genus-versus-species Tamarix context. The thesis cover was consulted for bibliographic metadata; the accepted factual scope is the specified table row on PDF 66. Other thesis tables encountered while locating this row are not claimed as fully reviewed or fully ingested.

All 23 profiles retain the old illustration-review features and habit notes under an explicit illustration-notes label. This intake does not claim a fresh botanical re-review of all 46 drawings or of every external link in their original metadata.

Useful additional findings include Retama symbioses, esparto leaf response, thyme seasonal drought avoidance, Ephedra evidence limits, jujube shelter/soil functions and oleander toxicity. Community links retain source-specific settings and do not claim measured facilitation or universal planting suitability.

| New source | Kind | Title and original reference | Reviewed scope |
|---|---|---|---|
| KGB-SRC-0001 | web | [Retama sphaerocarpa — WEB_BIOCON](https://nevada.ual.es/biocon/retama-sphaerocarpa.html) | Breve Descripción; Ecología |
| KGB-SRC-0002 | web | [Macrochloa tenacissima — WEB_BIOCON](https://nevada.ual.es/biocon/macrochloa-tenacissima.html) | Breve Descripción; Ecología |
| KGB-SRC-0003 | web | [Thymus hyemalis subsp. hyemalis — WEB_BIOCON](https://nevada.ual.es/biocon/thymus-hyemalis-subsp.-hyemalis.html) | Breve Descripción; Distribución; Ecología |
| KGB-SRC-0004 | web | [Ephedra fragilis subsp. fragilis — WEB_BIOCON](https://nevada.ual.es/biocon/ephedra-fragilis-desf.-subsp.-fragilis.html) | Breve Descripción; Ecología |
| KGB-SRC-0005 | web | [Lycium intricatum — Herbari Virtual](https://herbarivirtual.uib.es/es/general/505/especie/arc-intricat) | Hábitats; Características |
| KGB-SRC-0006 | web | [Nerium oleander — Herbari Virtual](https://herbarivirtual.uib.es/es/general/895/especie/nerium-oleander-l-) | Hábitats; Descripción; Observaciones |
| KGB-SRC-0007 | web | [Jardín de la Sal — habitat descriptions](https://herbario.ual.es/jardin-de-la-sal/) | Hábitat 92D0; AZUFAIFAR; SUBDESIERTO DE TABERNAS |
| KGB-SRC-0008 | pdf | [Rosmarinus officinalis — Herbario docente MA-UAM](https://herbariodocenteuam.github.io/Paneles/paneles/fichas/Rosmarinus_officinalis.pdf) | PDF 1: names, description, ecology |
| KGB-SRC-0009 | pdf | [Ziziphus lotus — Herbario docente MA-UAM](https://herbariodocenteuam.github.io/Paneles/paneles/fichas/Ziziphus_lotus.pdf) | PDF 1: names, description, ecology and shelter/soil functions |
| KGB-SRC-0010 | pdf | [Diseño de un Jardín Botánico en la Universidad de Almería](https://herbario.ual.es/wp-content/uploads/2016/04/JARDIN-SAL-FINALIZADO.pdf) | PDF 66, printed 65: focused review of Salsola webbii and Thymus hyemalis rows; Tamarix species not generalized to an unidentified plant |
| KGB-SRC-0011 | image | Supplied vegetation systems for dryland restoration poster | Systems 2–5; illustrative planning context, not scientific planting evidence |
| KGB-SRC-0012 | web | [Salsola webbii — Plants of the World Online](https://powo.science.kew.org/taxon/167159-1) | Accepted name, native range, synonyms |

The previously cited Flora de Almería detail download returned rejection HTML and was not registered as a PDF. Salsola identity/synonyms use Kew; semi-arid habitat/Almería occurrence use the UAL thesis instead. Direct Kew archiving returned HTTP 403: its local record explicitly identifies a reviewed excerpt obtained through browsing, not a byte-identical webpage. Original artwork review notes remain separate from newly verified facts. Málaga’s cited Ziziphus site was temporarily unavailable; the UAM sheet and UAL community account supplied the reviewed evidence.

The supplied poster has unknown authorship/publication date and remains illustrative. Publication dates for undated sources remain unknown. Legacy source-spelling Withania/Whitania correspondence was recorded as unresolved and not merged.

### Storage, interfaces and maintenance

- SQLite `plant_images` is authoritative for image/topic/role associations, captions, provenance, references and file hashes. `whole` requires original/preview/thumbnail; `detail` requires original/preview. Both roles are required for every illustrated topic.
- Originals remain byte-identical RGBA PNGs (1254×1254). Transparent previews are 768 pixels, thumbnails 256. Derivatives total about 14.2 MB; full PNGs load only on request.
- Managed originals, derivatives and source provenance live in `media/plants/`. New sources live in `sources/plant-intake/`; nine existing registered PDFs were copied unchanged to `sources/library/`. Relative managed paths make the installation portable.
- These local collections, like `data/knowledge.sqlite`, are ignored by Git. Preserve them with the database; a code-only checkout does not contain accepted local knowledge or media.
- `GET /api/plant-images/{image_id}/{variant}` validates registered paths and hashes, supports ETag revalidation, and distinguishes unknown/missing files (404) from checksum conflicts (409). Catalog/exploration/inspection expose public metadata, not original filesystem paths.
- Source kind is PDF by default for legacy records; image/web references require locators without invented PDF pages. Existing PDF references remain one-based. Web excerpts are readable offline; external links open only on request.
- Preparation script takes the old repository as an explicit input and produces a candidate only; the running browser has no simulator dependency. Reuse accepted batch IDs only byte-for-byte. New corrections use a new batch ID and current base_revision.

```powershell
.venv\Scripts\python.exe -m backend.cli media-integrity
.venv\Scripts\python.exe -m backend.cli export --output data/current-snapshot.json
.venv\Scripts\python.exe -m backend.cli backup-media
```

`backup-media` creates a SQLite snapshot and a companion `.media.zip` containing registered media, managed sources and original provenance records. Restore both together into the same project root while the local server is stopped. Plain `backup` remains a database-only snapshot.

### Recovery and verification

Pre-change source/build archive and SQLite snapshot: `backups/pre-plant-images-20261108-112805/`. The accepted importer also creates a pre-import database backup. The original simulator repository and source files are untouched.

Browser screenshots and JSON checks: `output/plant-images-qa/`. The relocated installation is under its `portable/` folder. Portability verification denies filesystem access to the entire old repository via an audit hook and checks all registered media variants and all sources.

Run checks with the project Python and Node:

```powershell
.venv\Scripts\python.exe -m pytest tests/test_backend.py tests/test_plant_media.py -q
npm test
npm run build
.venv\Scripts\python.exe scripts/plant-images-qa-server.py
## In another terminal, set KGB_PLAYWRIGHT_MODULE to the installed Playwright index.mjs.
npm run test:plant-images
.venv\Scripts\python.exe scripts/verify-plant-portability.py
```

### Historical acceptance (8 November 2026)

Published locally at knowledge revision 5. All 281 prior topics, 329 prior relationships and 140 prior
findings retain their existing factual fields; thirteen topics additionally receive illustration notes.
The nine original source checksums and all 46 original image checksums remain unchanged. All ten new
species have recorded connections. At that acceptance the store had 295 topics, 345 relationships, 147 findings,
21 sources, 71 curated PDF positions and 46 plant-image records.

A full post-import snapshot is `backups/knowledge-r5-20261108-114920-203462.sqlite`, paired with
`backups/knowledge-r5-20261108-114920-203462.media.zip`. At publication the live server was restarted, and its actual
Carob viewer was opened and decoded successfully after publication.

Final validation passed: 43 backend tests, 48 frontend tests, 39 image browser checks,
20 PDF-viewer checks and 22 hover/picking/domain checks. Production build and file-integrity
checks passed.
