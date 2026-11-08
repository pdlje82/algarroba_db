# Curated import batches

SQLite is authoritative. JSON batches are proposed mutations, not editable database mirrors.
Only the backend importer may apply accepted knowledge. The original library is read-only.

Each JSON batch: batch_id, summary, topics[], relationships[], findings[], coverage[], unresolved[].

Topic: id, label, kind, domain (ecosystem|technology|funding), description, aliases[], group_id,
source_refs[]. Optional scientific_name, identification, place_ids[], dates[], aspects{}.
Species names are separate nullable `spanish_name`, `english_name`, `scientific_name` fields on
the same stable topic ID. Preserve `label`, source spellings, aliases and source-specific concepts.
`name_status` is recorded|source-spelling|genus-only; `name_note` explains uncertainty/context.
Missing names are null, never invented translations. Optional `name_references[]` contains
`title`, HTTPS `url`, `fields` (spanish_name|english_name|scientific_name), `accessed` date and
optional `note`. These naming-only citations supplement existing PDF source_refs; they do not
authorize importing additional ecology, trial claims, PDF pages or geographic assignments.
Kinds: species, habitat, method, equipment, place, organization, programme, activity, condition, aspect, event, family.
Source reference: {source_id, page (one-based PDF position), locator, optional source_text}.
Relationship: id, source (topic ID), target (topic ID), label, explanation,
basis (source|curated), source_refs[], optional context{}, traversable (default true).
Curated links require a clear explanation and backing source references; no invented trials or eligibility.
Finding: id, label, text, topic_ids[], kind (finding|recommendation), source_refs[],
optional conditions[], place_ids[], dates[], aspects{}.
Date: {value: ISO date or year, meaning: publication|experiment|signature|trial|legal-deposit|period|...}.
Coverage: {source_id, page, status: inspected|unresolved, note: meaningful summary of what was inspected}.
Unresolved: {id, text, source_refs[], optional topic_ids[]}.

Stable shared topic IDs: carob, kermes-oak, restoration, water-harvesting, monitoring,
drones, cocoon, leader, al20, demonstration, heritage-conservation.
They may be referenced across batches; the combined initial import resolves all endpoints atomically.
Prefer only one owning batch per shared topic: ecology owns carob, kermes-oak, restoration,
water-harvesting; water/technology owns monitoring, drones, cocoon; funding owns leader, al20,
demonstration, heritage-conservation. Other batches may reference those IDs.
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

A batch may contain only browse_groups, or organization plus supported factual discoveries.
Use current `base_revision`, `--check`, then import. Existing accepted batch digests remain
unchanged. Migration/import backups and stale-revision protection apply. Browser controls
cannot modify these definitions. Group rules do not narrow the wider discovery obligation.


## Plant media and non-PDF sources

The plant-image intake authorizes new focused botanical knowledge beyond the original 68-page scope.
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
Media records are not graph topics or factual relationships. See PLANT_IMAGES.md.
