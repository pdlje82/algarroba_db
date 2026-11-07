# Curated import batches

SQLite is authoritative. JSON batches are proposed mutations, not editable database mirrors.
Only the backend importer may apply accepted knowledge. The original library is read-only.

Each JSON batch: batch_id, summary, topics[], relationships[], findings[], coverage[], unresolved[].

Topic: id, label, kind, domain (ecosystem|technology|funding), description, aliases[], group_id,
source_refs[]. Optional scientific_name, identification, place_ids[], dates[], aspects{}.
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
