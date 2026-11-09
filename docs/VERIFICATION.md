# Verification, acceptance history and documentation map

Current command reference, reviewed 10 November 2026. Commands run from the repository root
with the working project Python environment. Dated results below describe previous runs;
they are not a claim that the application suites were rerun during documentation cleanup.

## Current checks

After material code changes, run:

```powershell
npm test
python -m pytest -q
npm run build
```

Choose focused real-browser checks for the changed behavior. Browser tooling requires Microsoft
Edge and importable Playwright, or `KGB_PLAYWRIGHT_MODULE` pointing to its installed `index.mjs`.
These are test dependencies, not runtime services. Browser mutations must use isolated databases;
port 8765 is the accepted app and must not receive test saves, tasks or synthetic evidence.

For general v6 browser scenarios, start `python scripts/qa-server.py` in a separate terminal.
It creates `output/consolidation-qa/knowledge.sqlite` from accepted SQLite only if absent and serves
port 8769. An existing QA store is reused, so confirm it is suitable for the scenario; preserve
previous evidence rather than silently overwriting it. Then run `npm run test:browser` and the
appropriate focused scripts from `package.json`.

For the **current Evidence desk** use its dedicated fixture instead of the older planning fixture:

```powershell
python scripts/evidence-desk-qa.py --database output/planning-qa/evidence-desk/fresh.sqlite --serve
```

Choose a new destination for a fresh run. The helper creates synthetic fixtures in a copied database
and serves port 8769; it reuses an existing destination only with `--serve` and its fixture marker.
Stop any other QA server on that port first. Run `npm run test:planning`, plus relevant navigation
and source-viewer checks. Reports are under `output/planning-qa/` and `output/consolidation-qa/`.
Synthetic amounts are test data, not irrigation recommendations.

| Behavior | Available focused npm scripts |
| --- | --- |
| Navigation, evidence and PDF failures | `test:browser`, `test:source-viewer` |
| Descriptive passage labels, exact pages and both themes | `test:citations` (fresh Evidence desk fixture) |
| Community drafts and atomic source adoption | `test:planning` (Evidence desk fixture) |
| Direct-neighbour arcs and opacity | `test:relationship-circle`, `test:layer-opacity` |
| Camera and layer interactions | `test:gestures`, `test:close-layers`, `test:opening-highlight` |
| Domain, centre and interaction policy | `test:domain-update`, `test:remove-centre`, `test:hover` |
| Groups and layouts | `test:overview`, `test:all-domain-layout`, `test:double-click`, `test:focused-group`, `test:tight-layers`, `test:unrecorded-place` |
| Names and plant media | `test:species-names`, `test:plant-images` |
| Lifecycle and contextual evidence | `test:irrigation-lifecycle` (isolated current-intake store on 8771) |

Individual browser scripts have fixture assumptions; inspect the relevant script/helper before
running it on a newer collection. In particular `test:close-occlusion` still expects a 36-species
button label and is a known historical-fixture limitation, not an unqualified current acceptance
check. The archived log records its earlier outcome and later limitation.

For the lifecycle scenario, first prepare an isolated SQLite copy with the current accepted intake,
then serve it with `python scripts/irrigation-qa-server.py --database <isolated.sqlite>` on port 8771.
The helper requires that copy to exist. `scripts/verify_irrigation_intake.py` is the historical
pre-intake audit, not a routine operation to reapply its old proposal on current knowledge.

## Source, media and recovery checks

```powershell
python scripts/document_library.py verify
python -m backend.cli media-integrity
python -m backend.cli export --output data/current-snapshot.json
python -m backend.cli backup-media
```

Library verification compares against the ownership inventory; new weekly files are reported as
differences and need separate reconciliation. The library has its own backup command/archive;
`backup-media` covers the database and registered sources/media. See
[Sources and media](SOURCES_AND_MEDIA.md) for exact scopes, archive hashes and recovery steps.

Plant-media browser preparation uses `python scripts/plant-images-qa-server.py` with
`npm run test:plant-images`. `python scripts/verify-plant-portability.py` performs the documented
relocation check that denies old-repository access. Inspect these helpers' fixture assumptions
before reuse. Original source hashes, accepted batches and user plans must remain intact.

## Last recorded application acceptance

The 9 November Evidence desk record reports 62 frontend passes, 89 backend passes with one existing
skip, a production build, 49 editor browser checks, 37 navigation checks and 23 source-viewer checks.
It records byte-identical accepted SQLite at revision 11 and unchanged fingerprints for 18 tables.
These are historical results. They do not establish the current server's loaded code or that every
optional historical browser script passes. That record also notes a server restart did not execute;
check runtime health before making a new deployment claim.

The 10 November ingestion-prompt assessment observed revision 11, 316 topics, 411 relationships,
171 findings, 21 mixed-kind registered sources, 100 inspected PDF positions and seven browse groups.
The owned library verified at 379 files, including 49 PDFs. These dated observations replace the old
README's misleading presentation of the revision-5, 71-page intake as current coverage. Future runs
must query SQLite/inventories rather than copying these counts into current-state assertions.

## Descriptive source links: 10 November 2026

Shared citation links now show a checked passage heading/keyword, friendly document title and
exact PDF page. Verified page descriptions distinguish the six handbook links in community
details. The checked `descriptive-citation-page-labels-2026-11-10` batch advanced revision 11 to 12
by adding only source display metadata. All 21 registered file hashes verified. Facts, coverage,
immutable evidence, working plans/baselines, organization, media, tasks and saved explorations
are unchanged. The importer rebuilt physical FTS index storage; logical search content is unchanged.

Validation: 65 frontend tests; 91 backend passes and one existing skip; production build;
21 citation browser checks; 49 editor checks; 23 source-viewer checks; 37 navigation checks.
Browser writes used isolated QA stores. Citation checks include all six exact pages, keyboard
opening, phone wrapping, both themes, heading reset after page changes and unchanged plans.
The fresh Evidence desk QA helper provides a synthetic citation community independent of user plans.
Local evidence is under `output/citation-labels/`, `output/planning-qa/citation-labels/` and
`output/consolidation-qa/`. This verifies the built app; it does not assert that an already-running
accepted server has reloaded backend code. Reload the browser for the new link display.

## Documentation cleanup: 10 November 2026

Current references have distinct responsibilities. The old-to-new map also resolves filenames in
historical research handoffs; those saved handoffs and source-library originals remain untouched.

| Former document | Current location or disposition |
| --- | --- |
| `README.md` | Setup, concise reader guide, maintenance procedure and documentation index |
| `AGENTS.md` | Durable project instructions; detailed UI contracts are in architecture |
| `PROTOTYPE_TWO.md` | [Architecture](ARCHITECTURE.md), reconciled to current arcs, ordered members and 600 ms camera moves |
| `COMMUNITY_PLANNING.md`, `EVIDENCE_DESK.md`, `IRRIGATION_LIFECYCLE.md` | [Community planning](COMMUNITY_PLANNING.md), one current UI/API/lifecycle reference |
| `DOCUMENT_LIBRARY.md`, `PLANT_IMAGES.md` | [Sources and media](SOURCES_AND_MEDIA.md), preserving intake provenance and recovery details |
| `VERIFICATION.md` | This current check reference; original chronological log archived unchanged below |
| Two 5 November architecture/prototype briefs | Archived unchanged below; proposals, not current specifications |
| `DOCUMENT_INGESTION_PROMPT.md` | Kept at the root as the reusable execution prompt, with updated reference paths |
| `imports/CONTRACT.md` | Kept next to import batches; schema links and historical bootstrap wording updated |
| `THIRD_PARTY_NOTICES.md`, `third_party/**` | Retained; licence notices are not redundant project prose |
| `public/branding/README.md` | Retained beside assets as provenance |
| `doc_library/**`, `research/**`, backups and generated outputs | Source/history artifacts, not maintained project guides; not merged or removed |

The cleanup changes documentation only. Link/path and documented-command checks, archive
fingerprints and data-preservation checks are the relevant validation. It does not ingest PDFs,
change application behavior, rerun historic intake scripts or publish a build.

Cleanup validation checked 42 local documentation links/anchors, ten referenced script paths and
documented npm commands against `package.json`, with no errors. All three archived files retain
their original SHA-256 hashes. The accepted SQLite file, document-library ownership inventory,
third-party notices and branding provenance also retain their pre-cleanup hashes. Root Markdown
files decreased from 13 to four; five overlapping feature guides became two maintained references.
Application test suites were not rerun for these documentation changes; unrelated concurrent
application edits are outside this cleanup's verification claim.

## Historical records

These files preserve their original bytes. Their layouts, counts, bundle hashes, permission
exceptions and test results describe their dates. Repository-relative names inside historical
text refer to the repository at that time; use the map above for current documentation.

- [Verification log, 6–9 November 2026](archive/VERIFICATION_2026-11-06_to_2026-11-09.md): detailed acceptance runs, backups, checksums and superseded intermediate behavior.
- [Architecture research, 5 November 2026](archive/AI_Scientific_Knowledge_Graph_Research_2026-11-05.md): alternatives and recommendations; not an implemented architecture contract.
- [Original prototype brief, 5 November 2026](archive/Knowledge_Graph_Prototype_Brief_2026-11-05.md): initial scope and ten-perspective design, superseded by the current v6 references.

The original EPUBs remain historical artifacts. Update the relevant current guide in place when
behavior changes; keep dated verification/recovery evidence separate from current instructions.
