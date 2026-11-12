# Verification, acceptance history and documentation map

## Compact tree and resizable inspector — 12 November 2026

Implemented the 260 px navigation tree and 360 px default inspector using the irrigation editor's
opaque light/dark palette. The tree separates expansion, group opening, inspection and tri-state
inclusion; local search preserves visibility and expansion/scroll preferences. Shared topics,
anchors, communities, Needs organization, numeric funding entries and vertical folders use their
canonical metadata. Inclusion follows the exploration and saved views. Excluding the centre removes
it atomically; hidden route intermediates suppress the entire displayed route. Complete funding
reviews and source-coverage scope remain independent of display inclusion.

The inspector has a persistent preferred width, pointer/keyboard divider, responsive clamps,
collapse/reopen and pinned heading/actions/tabs. Narrow screens use accessible drawers with touch
targets, Escape, focus containment and background isolation. Dense ellipse reflow retains all
identities, factual edges, clear labels and camera orientation during resizing.

Checks: **97 frontend tests**, **111 backend tests passed, 1 skipped**, production build and
**59 isolated Edge/API browser checks** passed. The existing backend deprecation and bundle-size
advisories remain. SQLite integrity is `ok`; comparison with the isolated pre-change copy confirms
every table unchanged except the QA-only test explorations. The accepted store remains revision 61;
no source facts, registrations, memberships, working plans or original saved payloads were edited.
The live app serves the exact checked production bundle. Results, table fingerprints and desktop,
dark, dense-resize and phone screenshots: `research/sidebar-redesign-20261112/`.

To repeat the focused browser checks, start the isolated helper in the project Python environment,
then run the two browser scenarios from another terminal:

```powershell
.venv/Scripts/python.exe research/sidebar-redesign-20261112/qa.py
# In another terminal:
npm run test:sidebars
npm run test:sidebar-details
```

The helper guards its separate `qa.sqlite` destination and serves port 8788; the browser scripts
reject the accepted app and create test saves only in that QA store. `npm test` includes the eight
new unit regressions. Pre-change copies of touched frontend files are in the evidence folder's
`before/` directory. Existing unrelated changes remain in the checkout.

## Node navigation and numeric funding order — 12 November 2026

Show connected topics is pinned below the inspector tabs for a selected topic or a folder's
real topic anchor; it remains available while scrolling and on Evidence/Dates/Comparison.
The Centre dropdown and this action use the same viewport-shaped ellipse. Cards/labels keep
their dimensions and clearance in wide, square and portrait windows. Numbered funding folders
and topic cards use numeric code order, including 1.9 → 1.10 → 1.11 and 7119.2 → 7119.3 → 7119.4;
explicit vertical member order and unnumbered context slots are retained.

Checks: **89 frontend tests**, **111 backend tests passed, 1 skipped**, production build and
**20 isolated Edge/API browser checks** passed. Browser coverage includes all three AL20 lines,
the action from an anchored folder and a long scrolled node on Evidence, identical Centre/button
geometry, dense-neighbourhood resize through wide/square/portrait, complete identities/edges,
clear labels, reload and Remove centre. Existing Starlette/httpx deprecation and bundle-size
advisories remain. Screenshots/results: `research/funding-numeric-order-20261112/`.

Checked batch `funding-numeric-labels-20261112-v1` changes only seven existing labels to show
their already documented operation codes, plus descriptive labels on the same source citations.
It was accepted at revision 61 and retries unchanged. SQLite integrity is `ok`; budgets,
descriptions, factual edges, source editions/coverage, memberships, plans and saved views remain
unchanged. Official current/historical EDL PDFs FUND-013 and FUND-055 were independently hashed
against their registrations. Live health/catalog and the served production bundle were verified.
Subsequent compact-tree and inspector acceptance is recorded above.

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

For current funding navigation and project suitability, choose a fresh isolated destination:

The complete-route review has a read-only browser scenario against an isolated copy of the current
accepted catalogue:

```powershell
python scripts/funding-review-qa.py --database output/full-funding-review-qa/fresh.sqlite
# In another terminal with KGB_PLAYWRIGHT_MODULE configured:
node --experimental-strip-types tests/funding-review-browser.mjs
```

It serves port 8776; stop any other owned QA fixture on that port first. The test guards the QA
project identity and makes no database edits. Its full scope walk checks route/reference labels,
four-idea comparisons, incomplete coverage, linked review navigation, loan/non-cash distinctions,
NEXT MED's contradiction, keyboard PDF positions and reload. Reports/screenshots are in
`output/full-funding-review-qa/`. For historical project-editor conflict checks, the earlier fixture
below remains available; its scenario makes writes only to that isolated store.

```powershell
python scripts/funding-suitability-qa.py --database output/funding-suitability-qa/fresh.sqlite
# In another terminal with KGB_PLAYWRIGHT_MODULE configured:
node tests/funding-suitability-browser.mjs
```

Port 8776 uses only that copy. The helper prepares the eight reviewed contexts if absent; the
browser check edits exploratory profiles and creates a QA idea, so use a new database for another
fresh run. Reports/screenshots are under `output/funding-suitability-qa/`. It covers direct funding
navigation, the selector, all four assessments, save/reload, both conflict paths, retained drafts,
scoped exclusions, real financing levels, keyboard navigation and exact PDF pages.

For the earlier, pre-transparent funding-folder fixture, run `python scripts/funding-qa-server.py --database
output/funding-hierarchy-qa/knowledge.sqlite`, then `npm run test:funding-hierarchy`.
The helper copies accepted SQLite only if the destination is absent, validates/applies the
checked funding batch idempotently, and serves port 8774. Existing QA data is preserved.
That historical browser scenario assumes a visible Funding structure step. Use the current
suitability scenario above for current collections. Its earlier check covers four branches, hierarchy folders, AL20/AL30, About,
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

### Funding navigation and project suitability, 10 November 2026

Accepted revision 31 → 36: four versioned user ideas through the revision-checked project service,
then exact checked batch `funding-suitability-20261110-v1`. Adds one CDTI funding topic, five managed
official web editions, eight funding reviews and 32 assessments. Three current web editions were
reused by identical URL/hash. The stored Funding structure container retains its identity and full
definition, gains transparent navigation and a primary CDTI member; its 16 options open directly.
All five applicant arrangements remain available; applicant, land, partners, budget and readiness
are unconfirmed. All other funding options remain visible and explicitly unreviewed. No monitoring
schedule changed. Ingestion guidance now supports checked review updates and assessment reconsideration.

Official sources were checked on 10 November. LEADER's advertised 2028 end is not a budget guarantee;
6881.4 remains forthcoming, with BINDIFO preliminary access; CDTI is partially repayable finance.
Water4All has a timed first-stage gate, Horizon a forthcoming topic, PAEAS a date-only closing date,
GroundWork an explicit Spain exclusion, and SUDOE5 a restricted original-project lineage. Complete
conditions, source sections, exact topic/review IDs and next actions are in the accepted batch.
EFSA and GDR web-reader timeouts were recovered through direct official HTTP captures; the direct
CDTI body was insufficient and recovered through the official web reader. Its managed excerpt is
labelled as such. The earlier failed attempts remain in the acquisition audit, not no-change claims.

Existing library PDFs were reused; no PDF or doc_library addition is claimed. Verified direct
document-download links below returned HTTP 200 and a PDF header on 10 November; this checks link
availability, not a new edition hash comparison:

- [PAEAS and climate-disinformation call 2026 — official PDF download](https://fundacion-biodiversidad.es/wp-content/uploads/2026/09/Convocatoria-proyectos-PAEAS-y-DC_2026.pdf), Fundación Biodiversidad, 9 September 2026; retained `KGB-SRC-0028`.
- [Water4All JTC 2026 National/Regional Regulations — official PDF download](https://www.water4all-partnership.eu/sites/default/files/2026-06/National_Regulations-Water4All_JTC2026.pdf), Water4All / participating national funders; retained edition labelled v8, 28 October 2026, `KGB-SRC-0034` (publication date unconfirmed).
- [SUDOE fifth-call valorisation rules — official PDF download](https://interreg-sudoe.eu/wp-content/uploads/2026/11/Texto_oficial_convocatoria_VALORIZACION_ES.pdf?x53234), Interreg Sudoe Monitoring Committee, approved 4 November 2026; retained `KGB-SRC-0035` (publication date unconfirmed).

Validation: 82 frontend tests; 110 backend tests passed, one existing environment-dependent skip;
production TypeScript/build passed; 19 isolated browser checks and six read-only live checks passed,
with no uncaught browser errors. Includes extra assessment-only source changes, old-store migration,
mixed call states, missing assessments, explicit exclusions, date precision, failed verification,
stale project/evidence versions and history/camera preservation. Existing bundle-size and test-client
deprecation warnings remain. A Windows temporary-preview file-handle cleanup error was corrected
and the preview rerun successfully. A browser test initially omitted parent navigation; the fixture
journey was corrected and all 19 checks rerun successfully.

Snapshot/table comparisons preserve all previous topics/sources, factual relationships/findings,
coverage, unresolved records, user communities, irrigation evidence, media, saved tasks/explorations
and planning history. All 203 previous source/image files retain their hashes; 208 current files
were verified. SQLite integrity and foreign keys passed; nine pre-existing organization advisories
are unchanged. Database and CRC/hash-checked media backup share stem
`backups/knowledge-r36-20261110-121659-607368`. Run receipts, exact before/after exports and recovery
details: `research/funding-suitability-20261110/`. The documented identity-checked launcher restarted
the local app after a direct restart command was rejected by automatic approval review; live
revision 36 returned all three collections and rendered the new funding view. No synthetic UI
writes were made to accepted port 8765; no commit, push or deployment was performed.

### Complete funding-route review, 10 November 2026

Accepted thirteen exact checked programme-family/classification/hierarchy batches at revisions
38–50. The original plan baseline was 36; concurrent drone-flight research produced revision 37.
The funding work was reconciled against that complete snapshot, with unused source IDs reassigned
before adoption. Superseded QA-only candidates remain in the ignored research archive. Each accepted
batch passed preview and an exact idempotency retry. Live and isolated accepted snapshots matched.

All 128 initially labelled cards have dispositions in
[`funding-review-coverage-20261110.json`](../imports/funding-review-coverage-20261110.json).
The catalogue now has 143 funding topics: 58 routes, 30 frameworks and 55 references. There are
64 review contexts and 256 four-idea assessments, including the unchanged eight original reviews
and 32 assessments. Forty-seven contexts have confirmed bounded evidence review; seventeen remain
explicitly incomplete with retained facts and retry actions. Neither a confirmed review nor a
context link establishes eligibility, current call access or an applicant arrangement. EIC equity/
blended-finance representation remains a review proposal; no instrument schema or monetary engine
was expanded. Other schedules and project profiles were not changed.

Fourteen official PDFs were added as FUND-029–FUND-042; two identical owned editions were reused.
The additions ledger and catalog record issuers, direct document-download links, exact hashes,
publication-date limitations and actual reviewed PDF positions. Forty-one new managed sources
(fourteen PDFs and twenty-seven web editions) were registered. PDF text extraction initially failed
because pdftotext was absent; retained original bytes were successfully extracted with pypdf and
focused passages reviewed. The credits HTTP 429 was recovered using official Green Forum evidence;
Horizon portal shells and other incomplete retrievals remain explicit gaps, not no-change findings.

Validation: 85 frontend tests passed; 111 backend tests passed with one existing Windows symlink
skip; production build passed (existing bundle-size advisory). Eighteen isolated browser checks
passed across 66 funding scopes, with no remaining “Project fit unreviewed” labels, no uncaught
errors and no database edits. They cover national/institutional gates, scoped exclusions, unknown
applicants, references, framework gaps, repayable/non-cash support and exact source positions.
Five read-only live checks passed after the identity-checked launcher restart, including rendering
the newly registered Horizontal Activities PDF at position 14. The first browser run exposed a
missing explicit incomplete-verification heading, which was corrected and checked again.

Preservation audit: all prior sources, relationships, findings, working communities, irrigation
evidence, plant media, project ideas and original reviews/assessments retained; original assessments
remain fresh. Legacy absent name metadata materialised only its existing model defaults during
topic validation. The only factual addition to a prior topic is two labelled Cluster 6 references
on the Horizon framework. All 210 pre-existing registered file hashes and all prior library bytes
except the intentionally extended catalog are unchanged. SQLite integrity/foreign keys passed;
the nine prior organisation advisories remain, with no new warnings. New Horizon calls were placed
beneath NATURE/Mission frameworks while original memberships were retained.

Recovery: paired verified database/source-media snapshots
`backups/knowledge-r50-20261110-171115-085554.sqlite` and `.media.zip`; separate verified 217-file
library archive `backups/document-library-20261110T161308395101Z.zip`. The old ownership inventory
still differs by thirty later files and the catalog; these differences include sixteen existing
additions plus this run's fourteen. No original ownership entry is missing. A dated current-library
manifest is archived for recovery without rewriting the historical ownership inventory. Audit,
receipts and manifests are in `research/funding-complete-review-20261110/`; browser reports and
screenshots are in `output/full-funding-review-qa/`. No commit, push or deployment was performed.

### Funding payment timing and nature-credit clarification, 11 November 2026

Accepted six exact checked batches `funding-payment-review-20261111-*-v1` at revisions 51–56.
Every one of the 64 existing funding contexts has a manually checked payment disposition, covering
all 58 route topics. All 143 funding topics retain their route/framework/reference role; framework
and reference cards cannot inherit an advance badge. No schema or automatic eligibility logic was
added: the existing financial summary carries an explicit heading projected onto cards and details.
The [payment register](../imports/funding-payment-coverage-20261111.json) records old/new text,
affected IDs, sources, retained availability dates and eighteen follow-up checks. Eight sources
were added (four PDFs, four web records); twenty-four newly inspected PDF positions were accepted.
Acquisition and text search alone did not become inspected coverage.

The nature-credit roadmap explicitly names Horizon Europe and LIFE as research/innovation/pilot
support and describes pilots already underway. The two existing nature-credit topics now clarify
that this is not proof of a single first market launch, an accessible Alhama call or an upfront
credit payment. The distinct planned 2025–2027 pilot retains its identity and evidence limitations.

Validation passed: 86 frontend tests, 111 backend tests with one existing Windows symlink skip,
production build and thirteen isolated browser checks. Four read-only live checks verified payment
marks, exact NEXT MED contract options and source position 9, with no writes/errors. The app was
not running on the initial live-health check; the identity-aware documented launcher started it
successfully. The first QA attempt used an Inspect button for an anchored call; the corrected About
navigation passed. No product defect or failed retrieval was converted into a successful check.

Reproduce payment QA on an isolated copy (stop another owned QA fixture on port 8776 first):

```powershell
python scripts/funding-review-qa.py --database output/funding-payment-qa/fresh.sqlite
# In another terminal with KGB_PLAYWRIGHT_MODULE configured:
node --experimental-strip-types tests/funding-payment-browser.mjs
```

Important distinctions checked: LEADER requested advances/guarantees versus its start-up instalment;
PAEAS nonprofit exemptions; LIFE normal 30% with exceptions; ESC indicative 80% versus its non-cash
Quality Label; national AEI/FB/CDTI routes; Euro-MED no implementation advance with preparation-cost
exception; NEXT MED contract choices, partner risk controls and unresolved availability; historical,
draft and framework rules that do not establish an available award. The older SUDOE 5%/20% slide
was excluded; current Fiche 7 documents reimbursement but does not establish an absolute advance ban.
CDTI direct requests returned challenge/empty content. PID terms were recovered through the official
document reader; Water4All's distinct CDTI grant payment terms remain unverified. The source/library
ledger explicitly records this recovery without claiming a CDTI PDF accession. SUDOE's obsolete
resource URL redirected to its homepage; the current guide was recovered through the correct index.

Preservation passed: existing project ideas, all 256 assessments and their reasoning, relationships,
findings, working communities, irrigation evidence, media, source editions, saved research/views,
organisation and availability/deadline facts remain unchanged. The new payment evidence flags
dependent assessments for reconsideration; none were silently rebound to the new review versions.
Two topic descriptions gained the sourced nature-credit clarification. The old LEADER overview's
four duplicate citation entries were coalesced; every distinct original reference remains intact.
SQLite integrity/foreign keys and source/media hashes passed; no new organisation warnings.

Verified recovery snapshots: `backups/knowledge-r56-20261111-094545-888808.sqlite` with companion
`.media.zip`, and the separate 221-file library archive
`backups/document-library-20261111T084614690734Z.zip`. Earlier library bytes are unchanged except
the extended catalog, which now lists 90 entries/75 PDFs. The historical ownership inventory remains
unchanged; the current recovery manifest is archived separately. Detailed receipts, source recovery,
preservation and backup checks are in `research/funding-payment-review-20261111/`; browser evidence
is in `output/funding-payment-qa/`. No commit, push, deployment or schedule change was made.

### AL20 start-up deadline, 11 November 2026

Accepted `al20-startup-deadline-20261111-v1` at revision 57. The existing 31 December 2028
deadline is now prominent in `rural-business-start-up` and precisely labelled in its funding
review, with the registered official call's PDF positions 4–6 for the deadline, budget limits
and amendment-related suspensions. The AL20 timeout and actionable retry remain explicit;
current budget/local submission status is not claimed verified. Payment terms, project profiles,
all assessments, other topics/reviews, memberships and source editions remain unchanged.
Preview, exact idempotent retry, integrity/foreign keys, source/media integrity, unchanged
organisation advisories and live catalogue/inspection checks passed. No code/build changes.
Backup: `backups/knowledge-r57-20261111-101338-891965.sqlite`. Checks and preserved baseline:
`research/al20-startup-deadline-20261111/verification.json` and `before.json`.

These files preserve their original bytes. Their layouts, counts, bundle hashes, permission
exceptions and test results describe their dates. Repository-relative names inside historical
text refer to the repository at that time; use the map above for current documentation.

- [Verification log, 6–9 November 2026](archive/VERIFICATION_2026-11-06_to_2026-11-09.md): detailed acceptance runs, backups, checksums and superseded intermediate behavior.
- [Architecture research, 5 November 2026](archive/AI_Scientific_Knowledge_Graph_Research_2026-11-05.md): alternatives and recommendations; not an implemented architecture contract.
- [Original prototype brief, 5 November 2026](archive/Knowledge_Graph_Prototype_Brief_2026-11-05.md): initial scope and ten-perspective design, superseded by the current v6 references.

The original EPUBs remain historical artifacts. Update the relevant current guide in place when
behavior changes; keep dated verification/recovery evidence separate from current instructions.


## AL20 Line 3 research acceptance — 11 November 2026

Content-only intake through checked CLI imports, revision 57 → 58 → 59: nine new library PDFs, five managed webpage captures, 90 new topics, 8 updated topics, 60 new findings, 2 updated findings, 195 new relationships and 39 new inspected positions. The second batch only records the unchanged Law 42/2007 edition's verified 31 December 2020 date and inspected metadata page. Both exact accepted payloads retry unchanged.

Focused backend tests: **67 passed, 1 skipped** (existing Starlette/httpx deprecation warning). Isolated Edge/API browser checks: **16 passed**, no browser errors; AL20 folder navigation, budget/unselected training, patrimonio recognition, historical/provisional project summaries and two exact-page new PDF citations were exercised. Running accepted app health/catalog report revision 59 and all imported groups. No application code changed or rebuild was required.

SQLite integrity is `ok`; all 13 protected tables, all earlier source registrations and every existing library document remain unchanged. Only CATALOG.md was appended; exactly nine expected PDFs were added. Historical ownership verification still reports earlier documented accessions/catalog changes; the original inventory was not overwritten. 9 organization advisories are exactly the pre-existing unrelated ones. Full before/after and preservation evidence: [intake report](../research/al20-line3-intake-20261111/report.md), `preservation-and-integrity.json`, `browser-report.json`, accession ledger and recovery-backups.json in/linked from that run. No working-plan values, funding comparison results or PDF page_text were modified.


## AL20 EDL heritage acceptance — 11 November 2026

Checked content-only intake `al20-edl-heritage-20261111-v1`, revision 59 → 60: one new historical EDL PDF (FUND-055 / KGB-SRC-0150), one reused current EDLL edition, 10 new topics, 8 enriched topics, 41 new relationships, 12 findings, 22 new inspected positions and four new hierarchy folders (two existing folders enriched). Exact accepted retry returned unchanged.

**19 isolated Edge/API checks passed**, with exact PDF openings at current positions 494, 325 and 328 and historical position 422. Live catalogue/health show revision 60; both source PDFs match their registered hashes. All 183 new/revised citations have descriptive labels, locators and inspected exact positions. SQLite integrity is `ok`; all 13 protected tables and prior document bytes remain unchanged. One PDF was added and CATALOG.md appended. The nine organization advisories are unchanged. No application code changed, broad suite rerun or rebuild was needed.

The initial preview-store setting was corrected after its read-only revision guard failed; the final full run used the isolated store. [Intake report and coverage](../research/al20-edl-heritage-20261111/report.md), browser-report.json, preservation-and-integrity.json, accession provenance and recovery-backups.json record the actual applied result and recovery checks.
