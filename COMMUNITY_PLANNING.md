# Editable organization and community plans

Open **Groups & communities** in the sidebar. The editor works locally and offline.
Successful edits are saved in SQLite. Group by, graph movement and topic inspection
remain presentation actions, separate from permanent organization.

## Groups

Select a group to rename it, open it, create a subgroup or move a folder. Parent
choices include top-level folders in each domain. The nine existing roots retain
their IDs: they can be renamed, but not deleted or reparented. Only empty user-created
folders can be deleted. Root and source-anchored groups are protected.

Search and select multiple topics. **Move to…** changes their primary folder;
**Also show in…** adds a shared reference. **Remove from selected group** removes
direct membership without deleting the underlying record. Removing a custom primary
membership restores the topic's recorded base category. Membership is never evidence.

The original Cocoon group retains its identity, anchor, members and maintenance rule,
and is named **Cocoon irrigation** under **Irrigation**. The four existing watering
activities belong to **Irrigation lifecycle**. Habitats & conditions now contains
Plant communities, Habitats & vegetation types, Site & establishment conditions,
and Places & field trials. Shared references keep overlapping collections accessible.

## Communities

Create a working community and add existing plants using Spanish, English, scientific
names or aliases. Each species occurs once per community; counts and notes are optional.
Region and local context are planning annotations. Community and plant forms have
explicit Save/Cancel controls.

**Create editable community from this** on a habitat reference opens its recorded
species associations for explicit selection. No plants are preselected. The working
mix records its origin, captured revision, citations and source context. Its membership
is a user-defined selection, not proof of a documented or beneficial planting recipe.
Source-described communities imported later are read-only; make a working copy to edit.

Community graphs contain member species and genuine existing internal relationships.
Membership never creates scientific statements or route shortcuts.

## Irrigation

Choose a plant, lifecycle stage and **Configure values**. Stages are nursery,
settlement, summer maintenance and support. Unconfigured, configured and not applicable
are distinct. Not applicable retains earlier values for possible reactivation;
unconfiguring a stage retains previous values in history.

Amounts use L/plant/event: litres per plant for one watering application. Legacy L/plant/watering baselines remain compatible and are preserved unchanged. Frequency/trigger, applicable period and
notes are text. Blank means unknown. Zero requires explicit entry. There are no plant
profiles, inheritance, inferred amounts, schedules or budget calculations.

Each field independently shows Not set, Using source value, User-set or User-adjusted.
**View evidence & changes** exposes the retained baseline, edition SHA-256 and exact
passage, source wording/units/context/applicability/limitations, adjustment reason,
actor, timestamp and change history.

**Use source value** requires compatible, quantified, species-specific evidence.
Ranges, general guidance and incompatible units remain visible candidates. Select
such a candidate and save an explicit user value to retain it as the basis of a
User-adjusted planning decision. A citation to the original does not imply that it
supports the adjustment. Clear value retains the baseline. Source restoration is
explicit; new research never silently replaces an active value or retained baseline.

## Persistence and recovery

The additive migration records `meta.planning_schema=1` and backs up existing stores
first. Unsupported versions or incomplete required root metadata are errors.
`organization_roots` owns labels; `browse_groups` retains existing folders with nullable
anchors. `user_created` defaults to false for legacy definitions. `communities` stores
typed member/irrigation records. `irrigation_evidence` contains immutable candidates.
`planning_events` retains append-only before/after snapshots and compensating edits.

Every mutation requires `expected_revision`, runs atomically and advances the global
revision once. HTTP 409 preserves the draft when data changed. Refresh the editor,
review the current records and explicitly save. Unsaved drafts do not survive browser
reload. Session Undo/Redo survives closing/reopening the editor, is separate from graph
Back/Forward, and rejects conflicting intervening changes. Audit history stays in SQLite.

## Maintenance interfaces

- `POST /api/organization/edit`: group-create, group-rename, group-move, group-delete,
  members-move, members-share, members-remove, revert.
- `POST /api/communities/edit`: community-create, community-copy, community-edit,
  plants-add, plant-remove, plant-edit, stage-set, field-set, revert.
- Requests are `{expected_revision, action, data}`. Responses include revision/event ID.
  Field editing identifies community, plant, stage and field; mode is user, source or
  clear, with optional evidence_id and rationale. The browser actor is fixed as Local user.
- `GET /api/communities/{id}/history?topic_id=...&stage=...&field=...` returns retained
  field changes, including values removed with stages/memberships.
- Catalog, inspect, CLI export and research handoffs include organization and community
  data. Research capture uses one knowledge snapshot.
- `python -m backend.cli edit EDIT.json --check`, then without `--check`, uses the shared
  service with actor Codex. Browser endpoints cannot execute organization-initialize.

Checked research batches may include source-described `communities[]` and immutable
`irrigation_evidence[]`. Communities require source-specific context and citations for
the community and each member. Import irrigation evidence separately, without prefilling
planning values. Evidence needs an irrigation-evidence: ID, stage, field, optional species,
documented value/units/wording, context, applicability, limitations and checked references.
PDF refs must identify inspected pages. Corrections use new IDs. Working communities
cannot be replaced through intake. Evidence baselines retain snapshots when later research
is added.

Prepare the initial mapping with
`scripts/prepare_community_organization.py --output NEW_EDIT.json`. It captures the current
revision and explicit record IDs, checks the known inventory, and preserves existing primary
homes and Cocoon members. Review and apply with the CLI edit command. It imports no new facts
or numeric irrigation defaults.

## Verification

Run `npm test`, the complete Python pytest suite and `npm run build`. The focused real-browser
test is `npm run test:planning`, against the isolated QA server on port 8769 with the documented
Playwright module and synthetic QA evidence. Never point browser writes at 8765. Keep existing
navigation/source-viewer suites green. Artifacts are in `output/planning-qa/`; synthetic
amounts must never enter accepted knowledge.

Initial fingerprints and backup location are in `backups/community-editor-baseline.json`.
Keep SQLite backups with managed sources/media. Verify restoration separately and stop the
app before replacing live data. Do not modify the old application's library.


## Lifecycle guide and carob evidence (8 November 2026)

The Irrigation lifecycle folder has a cited reader outline and the stored sequence
Nursery, Settlement, Summer maintenance, Support. Its graph and accessible list use
one vertical column. Support is event-triggered and can overlap earlier field phases.
Phase descriptions explain purpose, amount, timing, age, context and limitations;
Source findings and guidance exposes the underlying passages beside each topic.

The Carob plant communities folder separates the Mediterranean overview (same
carob-community ID) from regional Almería examples. Potential vegetation, observed
companions and restoration/production practices are distinct. La Alcantarilla,
Las Labores and La Tórtola retain their municipality and case evidence.

Optional browse-group description, source_refs and member_layout metadata travels
through checked intake, catalog, inspection and export. member_layout defaults to
grid; vertical uses stored member-array order and opens without grouping. The generic
renderer repairs historical layouts in memory and retains offsets/history. Group
metadata and references survive rename/move/membership edits. Source-backed metadata
is maintained through the checked importer, not invented from folder membership.

New amount evidence uses L/plant/event. Generic evidence cannot supply a species-
specific baseline automatically; ranges, unquantified guidance, seasonal totals and
reservoir capacity remain separate. Every normalized value keeps original wording
and calculation. Irrigation evidence never configures a working plan during intake.

The SAD maintenance label is retained separately and linked to AFDS by an explicit
curated operational correspondence. No unverified expansion is assigned to SAD.
Source inconsistencies and historical coverage limitations remain inspectable.
See IRRIGATION_LIFECYCLE.md and output/irrigation-audit/ for the intake and checks.


## Plant-neutral lifecycle definitions

The lifecycle describes purposes and recording units for any plant. Numerical doses,
species-specific nursery/age recommendations and finca schedules belong to their
species/community or project context. The carob community records now hold the carob
recommendations and site examples; LIFE project schedules remain with LIFE and its
methods. Context links explain which phase applies without assigning a dose to the
phase itself. This presentation correction does not change immutable evidence or any
user-configured irrigation value.
