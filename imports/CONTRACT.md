# Curated import batches

Current schema reference, reviewed 10 November 2026. Code-formatted paths are relative to the
repository root. See the [maintenance procedure](../README.md#knowledge-ownership-and-maintenance-procedure)
and [reusable ingestion prompt](../DOCUMENT_INGESTION_PROMPT.md) for execution, and the current
models/validation in `backend/store.py`, `backend/planning.py` and `backend/funding.py` for exact accepted fields.

SQLite is authoritative. JSON batches are proposed mutations, not editable database mirrors.
Only the backend importer may apply accepted knowledge. The original library is read-only.

Each candidate has `batch_id`, `summary` and current `base_revision`. Collections may include
`topics[]`, `relationships[]`, `findings[]`, `coverage[]`, `unresolved[]`, `sources[]`,
`browse_groups[]`, `plant_images[]`, `communities[]` and `irrigation_evidence[]`.
The model also supports checked identity `redirects`; never use them for an uncertain merge.
It also accepts `funding_reviews[]` and `funding_assessments[]` as described below. User-owned
project ideas are edited separately, never replaced by a knowledge import.
Unknown top-level batch fields are rejected. Inventory/workflow fields belong in sidecar audit files.
Imports replace complete records, not partial patches: preserve existing optional metadata,
citations and context when updating a record. Accepted batch IDs/digests are immutable.

Topic: id, label, kind, domain (ecosystem|technology|funding), description, aliases[], group_id,
source_refs[]. Optional scientific_name, identification, place_ids[], dates[], aspects{}.
Species names are separate nullable `spanish_name`, `english_name`, `scientific_name` fields on
the same stable topic ID. Preserve `label`, source spellings, aliases and source-specific concepts.
`name_status` is recorded|source-spelling|genus-only; `name_note` explains uncertainty/context.
Missing names are null, never invented translations. Optional `name_references[]` contains
`title`, HTTPS `url`, `fields` (spanish_name|english_name|scientific_name), `accessed` date and
optional `note`. These naming-only citations supplement existing PDF source_refs; they do not
authorize importing additional ecology, trial claims, PDF pages or geographic assignments.
Topic `kind` is a string. Curated kinds: species, habitat, method, equipment, place, organization,
programme, project, study, trial, activity, condition, aspect, event, family. Use project/study/trial
for explicitly represented examples as supported by the source; keep implementers as organizations
and genuine funding/programme frameworks as programmes. Reuse IDs when deliberately correcting a
legacy classification; never relabel all events or programmes automatically.
Source reference: {source_id, page (one-based PDF position), locator, label, optional source_text}.
Relationship: id, source (topic ID), target (topic ID), label, explanation,
basis (source|curated), source_refs[], optional context{}, traversable (default true).
Curated links require a clear explanation and backing source references; no invented trials or eligibility.

For chat/report intake, follow the [claim and proposal procedure](../DOCUMENT_INGESTION_PROMPT.md#chat-claims-proposals-and-synthesis).
The input classifications live in run sidecars, not new batch fields or source kinds. A proposed
integration may use an existing method topic with its user origin, assumed parameters and untested
status explicit in description/aspects; citations support component facts only. Proposed links use
`basis: curated`. Unsupported proposals remain in the handoff and `unresolved` rather than bypassing
source requirements. Calculations retain inputs/units/assumptions; none of these supplies adoptable
irrigation evidence or a measured experimental outcome.

Finding: id, label, text, topic_ids[], kind (finding|recommendation), source_refs[],
optional conditions[], place_ids[], dates[], aspects{}.
Date: {value: ISO date or year, meaning: publication|experiment|signature|trial|legal-deposit|period|...}.
Coverage: {source_id, page, status: inspected|unresolved, note: meaningful summary of what was inspected}.
Unresolved: {id, text, source_refs[], optional topic_ids[]}.

## Descriptive source links (all new and revised intake)

Every citation must tell the reader what to expect before opening it. Supply `label`: a concise
section heading, table/figure subject or descriptive keyword (nonempty string, at most 240 characters).
The app displays it visibly with the friendly document title and exact PDF page, rather than only
in a tooltip. This applies to topic/relationship/finding/group refs, community basis/member refs,
irrigation evidence and other source links. Naming-reference `title` and media-reference `label`
must also describe the relevant content. Whole-document links identify document browsing.

Use a checked heading or faithful descriptive paraphrase. In English labels translated from
Spanish, retain original section/table identifiers in `locator`; do not present a paraphrase as a
verbatim heading. Multiple links to one document need passage-specific labels. Include a site/
model/table qualifier where "Results" would be ambiguous. Keep page, edition hash and locator intact.

Example:
```json
{"source_id":"FOREST-002","page":135,"label":"La Alcantarilla: interventions and current state","locator":"Parcela demostrativa MR2, finca La Alcantarilla; Actuaciones; Estado actual; Tabla 5.20"}
```

Source metadata may include `page_labels`, e.g. `{"135":"La Alcantarilla: interventions and current state"}`.
Keys are exact one-based PDF positions in that edition. Values are checked headings or short page
descriptions, not inferred claims; inspect the page before adding them. They provide page-level
context when a legacy citation has no `label`; otherwise its meaningful locator is the fallback.
A reference's own `label` takes priority because it can identify a narrower passage. Original
locators remain available in the source viewer. Sources are replaced as whole records: retain prior
metadata, path, hash and existing labels.

Legacy batches and immutable evidence/snapshots remain readable without `label`; absence does not
authorize rewriting them. Without a label, checked page context or useful locator, the app shows
"Section heading not recorded". Do not fabricate headings or automatically extract them from prose
to hide missing review. Add verified metadata through a new revision-checked batch. Labels never
supply irrigation values or make evidence compatible/adoptable.

## Shared identities and view categories

Stable shared topic IDs: carob, kermes-oak, restoration, water-harvesting, monitoring,
drones, cocoon, leader, al20, demonstration, heritage-conservation.
They may be referenced across batches. The combined initial import resolved their endpoints
atomically; its subject-based ownership was bootstrap organization, not a restriction on future
corrections. Reconcile the current graph and reuse these identities rather than duplicating them.
Use group_id: species, habitats, restoration-methods, irrigation, drones, monitoring,
programmes, activities, requirements, places, organizations, dates. These are view groups,
not factual relationship hubs. Keep source-specific context and all useful in-domain discoveries.


## Persistent browsing organization

Optional `browse_groups[]` in an import batch updates organization in the same SQLite store.
A definition has `id` (stable `browse:` namespace), `label`, `parent_id` (one of the nine root
view-group IDs or another custom group), `anchor_topic_id`, `members` and `maintenance_rule`.
Members are `{topic_id, role: "primary" | "shared"}`. A topic has at most one primary custom
membership; shared membership is allowed. All anchors/members must resolve to existing or
same-batch topic IDs, parents must exist, and the group hierarchy must be acyclic. Duplicate
members/definitions and own-anchor membership are rejected. Definitions are replaced as a whole;
include the full intended membership list when updating one.

Run `python -m backend.cli groups`, inspect the catalog/export, and read applicable maintenance
rules before imports. `inspect <topic-id>` returns memberships, parent paths, anchored groups,
member IDs, rules and current revision; export includes `topic_organization` plus all definitions.
Research context captures the current definitions automatically. Discover and follow the stored
organization generically, reusing existing identities and distinguishing permanent groups from
perspective-only headings. Keep shared/general context accessible and preserve wider discoveries.
Do not invent factual relationships from organization.

All project-related intake must follow
[Project intake and summaries](../docs/COMMUNITY_PLANNING.md#project-intake-and-summaries).
Represent a project with a topic, not just a folder, source or implementing organization. Its
`description` carries the cited purpose/work, techniques, key findings, conditions/limits and
dated status, with explicit gaps where evidence is absent. Detailed results use `findings[]` with
their actual project/trial `topic_ids` and scope; reusable concepts retain canonical identities.
Use anchored hierarchy folders for meaningful project details and make Project/Study/Pilot visible
in their labels. Review and add justified missing `relationships[]` to existing knowledge in the
same checked intake; no connectivity quota or invented edge is permitted. Keep the project
inventory, completeness/link review and pending work in run sidecars, not new batch fields.
These are required curator checks, not automatic PDF/summary validation or new import blockers.

All funding intake must follow [Funding hierarchy maintenance](../docs/COMMUNITY_PLANNING.md#funding-hierarchy-maintenance),
including the live named-folder paths, explicit hierarchy presentation and evidence for participating
levels. This is a semantic intake requirement in addition to schema validation. Keep placement/path
audits in run sidecars; they are not new top-level batch fields.

A batch may contain only browse_groups, or organization plus supported factual discoveries.
Use current `base_revision`, `--check`, then import. Existing accepted batch digests remain
unchanged. Migration/import backups and stale-revision protection apply. Browser organization
controls now use the shared revision-checked service; source-backed knowledge remains checked
Codex maintenance. Group rules do not narrow the wider discovery obligation.

Anchors may be null for organizational folders. `user_created` defaults to false for legacy
groups; only empty user-created folders can be deleted through browser controls. Root labels
are stored in `organization_roots`, retaining the nine stable root IDs. Top-level custom folders
use `parent_id: domain:ecosystem|domain:technology|domain:funding`.

Checked batches may also include `communities[]` (kind source) and immutable
`irrigation_evidence[]`. Community and member references need source-specific context;
evidence refs must resolve to registered editions and inspected PDF positions. Do not prefill
planning values through source-community intake, replace working plans, or overwrite an
existing evidence ID. See [Community planning](../docs/COMMUNITY_PLANNING.md) for interfaces,
applicability review, atomic plan saves and maintenance boundaries.


## Plant media and non-PDF sources

The current models support managed PDF/image/web sources. The user's task defines authorized
review scope; a historical intake's page count is not the current coverage or a standing new task.
Optional `sources[]` registers managed PDF/image/web sources atomically with their referenced records.
Each source needs id, title, kind, filename, managed_path and SHA-256. Managed paths must remain under
`sources/`. PDFs require verified page counts and inspected initial ranges; web sources require HTTPS
URL, retrieval date and reviewed excerpt. Unknown publication dates stay unknown. Edition hashes are
immutable for an existing ID. SourceRef.page is required for PDFs; other source kinds prohibit page and
require a meaningful locator. Original undifferentiated sources are treated as PDFs.

Optional `plant_images[]` registers PlantImage records: id, species topic_id, whole/detail role, alt,
caption, provenance, botanical references and per-variant files. Each file has a path under
`media/plants/`, SHA-256, width, height and PNG/WebP MIME. Original/preview are mandatory; only whole
images also require thumbnail. Validate decoded pixels, dimensions, transparency, hashes, species
association, unique role and complete whole/detail pairs before import. Existing images remain valid
when later batches change unrelated facts; a species with artwork cannot become a non-species.
Media records are not graph topics or factual relationships. See
[Sources and media](../docs/SOURCES_AND_MEDIA.md) for provenance, checked identities and recovery.


## Reader-facing group guides

BrowseGroup optionally stores description (default empty), source_refs (default empty)
and member_layout (grid|vertical, default grid). References receive the same registered-
edition/page/coverage validation as topic references. Vertical groups use member array
order for graph and keyboard-list presentation; membership remains organizational.
Group edits must preserve optional metadata. Do not repurpose maintenance_rule as a
reader-facing explanation.

`presentation` is `standard` (default) or `hierarchy`. Hierarchy folders retain child groups
and direct members, lock Group by to None and omit graph connections without deleting factual
relationships. Existing anchor_topic_id supports an About action. When an anchor is also an
explicit member of its parent hierarchy folder, its child folder represents it without a duplicate
topic card. An anchor remains forbidden in its own group's members. Preserve presentation during
renames, moves and membership edits; it does not change the meaning of primary/shared roles.

`catalogue` is an optional boolean, default false, identifying a genuine peer list. It suppresses
size-only crowding warnings, not source/identity validation or ambiguous placement. Optional
`navigation: normal|transparent` defaults to normal. Transparent groups must be unanchored hierarchy
containers. They retain stored IDs, members and sources while their contents appear at the visible
parent. Preserve this field on whole-record updates. Every intake
follows [Knowledge tree organization](../docs/COMMUNITY_PLANNING.md#knowledge-tree-organization).
CLI `audit-organization [--batch <file>]` is read-only. Import check/application returns advisory
`organization_warnings`; schema/source/cycle/endpoint/revision failures remain blocking.

The catalog's `organization_review` contains computed `topic_roots`, `warnings` and non-empty
`pending_groups`. Review scopes `review:ecosystem|technology|funding` use the existing exploration
API but are not accepted browse groups or editable destinations. This review payload and placement
manifests are read-only/sidecar data, not additional top-level batch fields.

New irrigation dose candidates use L/plant/event; L/plant/watering remains a compatible
legacy spelling. Original immutable candidates and retained baselines are not rewritten.
Do not convert seasonal/area totals to event doses without a documented denominator.

## Project ideas and funding reviews

`project_ideas`, `funding_reviews` and `funding_assessments` are typed SQLite collections,
included in exports, backups, catalog and topic inspection. Older collections default to empty.
User-owned project ideas are created/edited through revision-checked `/api/projects/edit` or
`backend.cli project-edit`, never by research imports. All applicant arrangements are exploratory
until the user confirms them. Profile versions are maintained by the service.

Checked batches may contain `funding_reviews` and `funding_assessments`. A review references an
existing funding topic and records instrument type, independently verified availability, dated
conditions, deadlines, verification outcome and labelled source references. Use the same registered
edition and genuinely inspected page/section validation as other factual records. Increase a
changed review's version; failed checks preserve last-confirmed facts and identify the problem.
Timed dates require an offset and timezone; date-only deadlines must not acquire an invented time.
Use deadline `kind: opening` for an opening date. A passed deadline is a warning, not verified closure.

An assessment references exact project/review versions, contains reviewed reasons, possible
applicant route, unresolved requirements and a next action. Relevance is `potential`, `conditional`,
`needs-review` or `outside-scope`, independently of availability. Exclusions require an exact
location/activity/applicant-route scope supported by evidence; unknown facts are not exclusions.
One assessment is permitted per project/review pair. The importer binds an evidence fingerprint;
changes to the project, review, funding topic or cited source edition flag earlier assessments for
review without replacing their conclusions. Reconsideration requires a new manually checked batch.
No numerical suitability score, automatic eligibility engine or automatic project-plan adoption
is provided. Full model fields and validation are defined in `backend/funding.py`.

Funding topics may additionally carry `funding_role: route|framework|reference` and
`funding_context_ids: string[]` (default empty). Contexts must be unique existing funding topics;
self-links and explicitly classified reference targets are rejected. These fields are restricted to
funding topics. They explain navigation/coverage, not applicant eligibility, factual relationships
or assessment inheritance. A genuine route needs its own review and project comparisons; references
receive supporting-reference labels. Older unclassified topics retain existing behaviour. Only
these two presentation fields are excluded from assessment evidence fingerprints.

`funding-review-coverage-20261110.json` and document-library addition ledgers are audit sidecars,
not checked import payloads. Their disposition/retry fields must not be submitted as new schema fields.
