# Project instructions for Codex Desktop

This is one local offline Windows app: React/TypeScript, react-force-graph-3d/Three.js,
FastAPI, SQLite/FTS5 and PDF.js. Codex maintains knowledge manually; do not add an AI API,
autonomous agent system, crawler or background researcher.

## Read the relevant current reference

- `README.md`: setup, reader workflow and the maintenance procedure used in research handoffs.
- `docs/ARCHITECTURE.md`: exploration state, layouts, interaction and source-viewer contracts.
  Read it before changing graph behavior, persistence or rendering.
- `docs/COMMUNITY_PLANNING.md`: permanent organization, Evidence desk, irrigation semantics,
  immutable evidence and revision-checked working plans.
- `docs/SOURCES_AND_MEDIA.md`: managed editions, library preservation, plant identities/media,
  file integrity, backup scopes and recovery.
- `imports/CONTRACT.md`: checked import schema. `DOCUMENT_INGESTION_PROMPT.md` supplies the
  reusable full-library/weekly workflow when invoked.
- `docs/VERIFICATION.md`: current check commands and dated acceptance evidence.

Historical briefs and verification logs under `docs/archive/`, old research handoffs and the
EPUB document earlier designs/decisions; they are not current implementation instructions.
Do not restore independent panes, ten perspectives, Flat mode, blur/frosting, Cytoscape/fCoSE,
react-rnd or an old executable viewer. Dependency versions are in the lockfiles and notices.

## Knowledge and source maintenance

- SQLite (`data/knowledge.sqlite`) is authoritative. Use `backend.cli`; an export or candidate
  JSON is never an editable master. Preview/validate with current `base_revision` before
  application. Accepted batch IDs/digests are immutable; corrections use new batch IDs and
  existing record IDs where identity is unchanged. Reconcile stale revisions before retrying.
- The old `C:\Users\JanEngelke\git_private\algarrobos\doc_library` is read-only. Preserve all
  original bytes and existing citation paths. New managed sources/artifacts belong here.
  Different edition hashes require different source IDs. Verify exact editions and page counts.
- The original bootstrap reviewed 68 positions in nine PDFs; subsequent accepted intakes expanded
  coverage. Read current SQLite coverage, not an old numeric limit. A copied/registered PDF is
  not fully ingested. Further review follows the user's requested scope; invoking the reusable
  full-library/weekly prompt authorizes its specified in-domain intake. Documentation or rendering
  cleanup alone does not authorize factual changes, source registration, OCR or indexing.
- Read a saved research task's brief AND context.json. Reconcile captured IDs/revision and current
  stored organization using CLI groups, inspect and export. Follow full memberships, primary/shared
  roles, parents, anchors and maintenance rules generically; no hardcoded subject-specific rules.
- A task directs priorities, not extraction filters. Capture all useful supported in-domain
  discoveries from material actually inspected, including outside the question/visible graph.
  Reuse checked identities and connect useful old/new topics across the wider graph.
- Preserve exact one-based PDF positions, source wording/name usage, units, denominators, trial
  conditions, places, dates, applicants and territories, and contrary findings. Record inspected,
  unresolved and unfinished coverage honestly; render/check important tables and image pages.
- Every new/revised citation needs a short, checked section heading or descriptive keyword in
  SourceRef.label, plus its precise locator. Show label, friendly document title and exact page/
  section visibly everywhere. Distinguish links to one document by passage/table/subject. Faithful
  translated paraphrases are allowed; retain original identifiers in locator. Never invent headings
  or use "Selected passage" as a new label. Checked source page_labels can add legacy page context
  without rewriting immutable snapshots; use a new checked metadata batch. Naming/media links
  follow the same descriptive-label rule. See imports/CONTRACT.md.
- A common name, misspelling or illustration is not permission to infer/merge species. Preserve
  unknown names, source spellings, generic pine and genus-only Citrus/Tamarix. Naming references
  do not independently authorize ecological claims. Preserve checked taxonomic distinctions in
  the source/media guide, including Q. rotundifolia versus Q. ilex and the two Rhamnus species.
- Distinguish source observations, source guidance and explicitly explained curated associations.
  Co-occurrence/membership is not a scientific connection. Citrus spraying is not carob
  establishment or reservoir-refilling evidence. A funding connection is not eligibility,
  selection or an award; current availability needs verification when requested.
- Ordinary in-domain additions need no topic-by-topic approval. Record genuinely material domain
  extensions for the user's decision and continue independent in-domain work.
- Return the answer, additional discoveries, wider connections, actual/unfinished coverage and
  unresolved items. Complete a real task appropriately and preserve its exploration. Manual
  research handoffs remain editable fixed-template prompts, not automatic dispatch.

## Organization, community plans and media

- Browsing membership is organization, never a factual edge or route shortcut. Distinguish
  permanent groups from temporary display headings. Preserve full definitions, optional cited
  descriptions/layout metadata, unique primary memberships and acyclic parents.
- User-requested organization/working-plan edits use the shared revision-checked service. Source
  topics, relationships, findings, source communities and evidence use checked Codex intake.
- Source communities are read-only and require an explicit working copy. Intake/refresh never
  changes active working plans, plant counts, retained baselines or immutable evidence. Evidence
  corrections use new IDs. Generic lifecycle phases stay plant-neutral; concrete species/community
  recommendations and project schedules retain their own context.
- L/plant/event and legacy L/plant/watering are compatible event units. Reservoir capacities,
  fills, seasonal totals and ranges do not become species event doses without the required evidence.
- The Evidence desk's amount/frequency/period are read-only. Explicit applicability review and
  source adoption precede one atomic `plant-plan-set` save using evidence IDs, never client-supplied
  irrigation numbers. Preserve drafts on conflicts/failures and require review again after context
  changes. Legacy values/history remain readable; no inferred profiles, inheritance or scheduling.
- SQLite `plant_images` owns media associations. Use checked importer validation, not frontend
  filename mappings. Preserve source/media hashes and compact card geometry during async loads.
  Interface branding has separate provenance in `public/branding/README.md`.

## Changes and verification

- Preserve unrelated work, saved payloads and local collections. Translate legacy sessions in
  memory; never rewrite saved knowledge/history to repair presentation. Rendering changes alone
  do not authorize factual/organization changes or knowledge revision increments.
- Keep one reducer, one scene builder and one active foreground graph. Preserve canonical state,
  real factual identities/directions, context/route accounting and the detailed interaction/depth
  contracts in `docs/ARCHITECTURE.md`. Direct neighbours use adaptive arcs; ordinary scopes use
  compact grids; stored vertical folders preserve order.
- Keep PdfPanel/PDF.js bundled with the app and failures inside the source panel. Preserve Retry,
  Close source, original-PDF access, exact citation pages, cancellation and safe canvas reuse.
- After material code changes run `npm test`, the backend suite, production build and appropriate
  real-browser checks from `docs/VERIFICATION.md`. Test browser writes only against isolated QA
  stores, never accepted port 8765. A documentation-only change needs link/path/command validation
  and preservation checks; do not create synthetic knowledge or rebuild unnecessarily.
- Keep current documentation concise: update the relevant reference instead of appending a new
  top-level feature report or historical permission exception. Put dated test outcomes/recovery
  evidence in verification records. Keep source-library documents, saved research and third-party
  licence texts separate from maintained project instructions.
