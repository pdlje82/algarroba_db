# Verification, acceptance history and documentation map

Current command reference, reviewed 10 November 2026. Commands run from the repository root
with the working project Python environment. Dated results below describe previous runs;
they are not a claim that the application suites were rerun during documentation cleanup.

## Current checks

10 November 2026 habitat/community navigation cleanup: revision 28 to 29 through a scoped,
revision-checked CLI organization edit (event `ca58d655cd3f45ea95a87885475a90ad`). Renamed
`browse:habitat-types` to **Habitats & site conditions**, added descriptions/maintenance rules
to it and **Plant communities**, and removed 15 redundant shared references from the habitat
folder. Its three existing primary members and all community memberships remain intact.
The organization advisory for removed memberships was reviewed as the intended cleanup;
pre-existing mixed-context advisories were unchanged. CLI dry-run passed, SQLite integrity was
`ok`, and the running app's catalog returned both updated definitions at revision 29. Snapshot
comparison confirmed all other collections unchanged; table fingerprints changed only for
`browse_groups`, `meta` and the appended `planning_events` history. Backup:
`backups/knowledge-r28-20261110-111916-081801.sqlite`. No application code changed.

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

For funding folders, run `python scripts/funding-qa-server.py --database
output/funding-hierarchy-qa/knowledge.sqlite`, then `npm run test:funding-hierarchy`.
The helper copies accepted SQLite only if the destination is absent, validates/applies the
checked funding batch idempotently, and serves port 8774. Existing QA data is preserved.
The browser check covers the four branches, every hierarchy folder, AL20/AL30, About,
ordinary factual exploration, keyboard source opening, Back, refresh and reload.

For the complete tree, run `python scripts/tree-organization-qa.py --database
output/tree-organization-qa/knowledge.sqlite`, then `npm run test:tree-organization` with
`KGB_PLAYWRIGHT_MODULE` configured. Port 8775 uses a separate database and applies the checked
organization batch idempotently. The check audits every root/folder projection and representative
browser journeys, including read-only review folders through a network fixture with no DB writes.

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

## Existing project summaries: 10 November 2026

Five checked project-profile batches advanced revision 20 to 25. Nineteen project/study/trial/case
profiles and two delivery activities now expose source-backed purpose, work, methods, principal
findings, conditions, status and explicit gaps. The Cocoon Jordan–Lebanon assessment is distinct
from Menaqua; Hiroshima parents the citrus study; eight observational farm cases have dedicated
profiles; the nature-credit pilot remains document-stated planned work.

The update adds 17 topics, 81 source-backed relationships, ten findings/guidance records and
19 inspected PDF positions, while revising 19 existing topics. The resulting graph has 373 topics,
560 relationships, 195 findings and 130 folders. All 356 previous topic IDs, 479 previous
relationships, 185 previous finding texts and original attachments, source records and 113 previous
folder IDs remain. Three direct memberships intentionally move beneath documented parents;
the manifest records all role, description, citation and placement changes.

Validation: 98 backend passes and one existing skip; all five batches checked, audited, applied to
an isolated copy and retried idempotently before accepted application. Thirteen browser checks
cover all 139 root/folder projections, all 21 profiles with findings/connections and keyboard
exact-page citations, project/study/trial filters, Menaqua search, both project hierarchies, Back,
refresh/reload, factual arrows and older saved-folder reopening without changing stored payloads.
Eighteen rendered source pages verify important tables, column boundaries and project credits.

Eleven database tables and all 657 baseline library/source/media/research/import file hashes remain
unchanged, including working plans, immutable irrigation evidence, tasks and saved explorations.
Nine mixed-context advisories are reviewed intentional shared references inside named trial/case
folders; there are no ambiguous placements or crowded branches. Evidence gaps and contradictions
remain explicit. No API, schema or rendering code changed, so frontend/build suites were not
repeated. Run records, the full change manifest and continuation report are retained under
`research/project-summaries-2026-11-10-01/`; the running app reports revision 25.

## Project ingestion rules: 10 November 2026

The shared policy, project instructions, reusable full-library/incremental prompt, maintenance
procedure, import guidance and newly generated research handoffs now require explicit project
identities, cited summaries, scoped findings, meaningful detail organization and connection review
during intake. Project/study/trial classifications use the existing string kind field. Source-based
completeness remains curator review, not an automatic PDF check or a new import blocker.

Validation: three existing backend research/handoff checks passed. An isolated accepted-store copy
verified both source-boundary choices, the new prompt content, saved brief guidance, exact editable
prompt/context preservation and unchanged knowledge revision. All 42 local documentation links and
anchors resolved. All 24 accepted database table fingerprints and 657 library/source/media/research/
import file hashes remained unchanged. The running app was restarted and its read-only research
preview confirmed the new guidance at revision 20. Frontend/build/browser suites were not repeated
for this documentation and prompt-text change; no rendering or database schema changed.

## Complete-tree organization: 10 November 2026

Accepted `knowledge-tree-organization-2026-11-10-01` at revision 20 after isolated verification.
All 356 topic IDs and their factual content remain; 58 records receive classification-only
corrections. The tree has 113 hierarchy folders, including 18 genuine peer catalogues. The
placement manifest records every topic's previous/new home, shared references and source basis.

Validation: 77 frontend passes; 98 backend passes and one existing skip; production build;
20 browser checks and all 122 root/folder projections. Checks cover the nine roots, nested
project/system roles, uncapped species catalogues and distinct Rhamnus records, exact-page source
opening, ordinary factual exploration, Back, refresh and reload. A read-only network fixture
verifies Needs organization appearance/resolution without modifying knowledge. The current
accepted catalog has no pending topics or organization warnings. Existing build-size and
test-client deprecation warnings remain.

Preservation checks retain all 479 relationships, 185 findings, source/citation records,
coverage, working plans, immutable irrigation evidence, media associations, root IDs, tasks,
saved explorations and logical search rows. Fifteen tables and all 372 library/source/media
file hashes remain unchanged. Every previous group member reference remains accessible;
intentional primary/shared and classification changes are recorded in the manifest. The importer
created a revision-19 backup and repeat validation is idempotent. The local app was restarted
with the new placement resolver and advisory ingestion checks.

## Funding hierarchy: 10 November 2026

Accepted `funding-hierarchy-2026-11-10-01` at revision 19 after validation and isolated-browser
verification. It adds six documented participant topics, seven source-backed relationships and
22 folders, and reparents/configures seven existing funding groups. The resulting 29 hierarchy
folders navigate the four funding branches without arrows; ordinary topic exploration retains
factual connections. No provincial intermediary was introduced into the LEADER chain.

Validation: 75 frontend passes; 93 backend passes and one existing skip; production build;
13 browser checks, including opening all 29 hierarchy folders, AL20/AL30, About, an exact-page
keyboard citation, Back, refresh and reload. The existing bundle-size warning remains.
QA screenshots and the browser report are in `output/funding-hierarchy-qa/`.

Accepted-store verification retains all 350 original topics and 472 original relationships
exactly, all original group memberships/descriptions/citations/rules, and all 36 registered
source-file hashes. Thirteen other tables remain identical, including community plans, immutable
irrigation evidence, media, root IDs, findings, coverage, tasks and saved explorations. The importer
created the pre-application revision-18 SQLite backup; repeat validation is idempotent.

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

## Research-handoff ingestion workflow: 10 November 2026

The reusable prompt now accepts chat/report leads, explicitly web-authorized official-document
acquisition, managed webpage evidence and per-lead reconciliation through checked imports.
README and source-maintenance guidance point to the same procedure. This is a documentation-only
workflow update; no ingestion, source download, source registration or knowledge batch was executed.

Validation checked 33 local links/anchors across the three changed workflow references, the
documented tool/reference paths, source-boundary and preview instructions, and `git diff --check`.
The accepted SQLite file and ownership inventory retain their baseline SHA-256 hashes; the library
and managed-source collections remain at 187 and 47 files. Existing unrelated bytecode files were
preserved. Application tests/builds were not rerun for these documentation changes.

## Focused chat-research intake: 10 November 2026

The reusable prompt now has a focused `research-results` mode and an explicit
`library-and-primary-web` boundary for original papers, patent documents and manufacturer sources.
It preserves user proposals, assumed parameters, calculations and scoped knowledge gaps separately
from verified findings and plans. Shared maintenance/source/import guidance follows that procedure.
A portable drone-reservoir handoff with ten source leads and companion context was prepared under
`research/chat-drone-reservoir-20261110/`; it is not a registered task or scientific source.

Validation checked 46 local links/anchors, referenced workflow/input paths, ten matching lead IDs,
thirteen current topic IDs, five source editions and `git diff --check`. Original library, managed
source and media bytes were preserved. Of 679 pre-existing protected files, only the deliberately
updated import contract changed. No source download, registration, importer or plan save was run by
this update. Accepted SQLite advanced from revision 20 to 25 through concurrent intake, so no claim
is made that all accepted tables remained unchanged; the prepared context captures revision 25 and
requires fresh reconciliation. Check evidence is under `output/chat-research-workflow-20261110-093221Z/`.
Application tests/builds were not repeated for this documentation and handoff-only update.

## Historical records

These files preserve their original bytes. Their layouts, counts, bundle hashes, permission
exceptions and test results describe their dates. Repository-relative names inside historical
text refer to the repository at that time; use the map above for current documentation.

- [Verification log, 6–9 November 2026](archive/VERIFICATION_2026-11-06_to_2026-11-09.md): detailed acceptance runs, backups, checksums and superseded intermediate behavior.
- [Architecture research, 5 November 2026](archive/AI_Scientific_Knowledge_Graph_Research_2026-11-05.md): alternatives and recommendations; not an implemented architecture contract.
- [Original prototype brief, 5 November 2026](archive/Knowledge_Graph_Prototype_Brief_2026-11-05.md): initial scope and ten-perspective design, superseded by the current v6 references.

The original EPUBs remain historical artifacts. Update the relevant current guide in place when
behavior changes; keep dated verification/recovery evidence separate from current instructions.
