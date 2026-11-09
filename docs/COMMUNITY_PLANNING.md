# Groups, community plans and the Evidence desk

Current reference, reconciled 10 November 2026. This combines the former community,
Evidence desk and irrigation-lifecycle guides. Commands and local paths are relative
to the repository root. [Verification](VERIFICATION.md) owns current QA instructions;
[the import contract](../imports/CONTRACT.md) owns checked intake fields.

## Permanent organization

Select a permanent group and choose **Edit group**, or use **Manage groups**. The selected
record takes precedence over the open graph layer. Temporary display groups have no
permanent-edit action; **Group by** remains a presentation control.

Rename folders, create subgroups, or move folders between permitted parents. The nine roots
retain their IDs and can be renamed, but not deleted or reparented. Only empty user-created
folders can be deleted; roots and source-anchored groups are protected.

**Move to…** changes selected topics' primary folder; **Also show in…** adds shared references.
**Remove from selected group** removes membership without deleting the topic. Removing a
custom primary membership restores its recorded base category. Each topic has at most one
primary custom membership. Membership is organization, not ecological evidence or a route shortcut.

The stored definitions, anchors, complete membership lists and maintenance rules are authoritative.
Inspect them with `python -m backend.cli groups`, `inspect` and `export` before maintenance.
Group edits preserve descriptions, citations and member layout. `member_layout: vertical`
opens members in stored order in one column; the default is a grid. Reader-facing descriptions
and maintenance rules have separate purposes. Rendering must not hardcode topic-specific groups.

## Working and source-described communities

Choose **Edit community** on a working community, or **Manage communities** to choose/create one.
Create a working community from existing plants using Spanish, English or scientific names
and aliases. Each species occurs once; plant counts and notes are optional. Region and local
context are planning annotations. Community and plant forms have explicit Save/Cancel controls.

**Create editable community from this** on a habitat reference opens recorded species associations
for explicit selection, with no plants preselected. The working copy retains origin, captured
revision, citations and source context. Its membership is a user choice, not proof of a beneficial
planting recipe. Source-described communities remain read-only; make a working copy to edit.
Community graphs contain member species and genuine existing internal relationships.

## Evidence desk: review, adopt, save

Working communities open a full-window workspace. The left column selects plants and shows
site context. The center compares four watering phases and offers phase tabs. The right column
shows checked evidence, applicability review, related knowledge and a manual research handoff.
Group organization remains in its separate dialog.

Amount, frequency and period are read-only. Selecting evidence never fills a value. Review its
original wording, species, age/stock, method, soil/site, units and limitations; check **Source
conditions reviewed** and explain applicability. **Adopt reviewed amount/frequency/period**
adds only that parameter to the selected plant's draft. **Save changes** commits the complete
plant edit once. No irrigation values are inferred from prose.

Amounts require a finite nonnegative number in **L/plant/event**; legacy L/plant/watering is
equivalent. Frequency and period require explicit text evidence for that species, phase and
parameter. General advice, ranges, seasonal totals, reservoir fills and unquantified evidence
remain guidance. Unknown is distinct from zero. Shared pages do not establish compatible regimes
or doses for companion plants.

Existing manual/adjusted values, phase notes, source snapshots, original units and histories remain
readable and labeled. A retained citation records a basis for review, not support for an adjustment.
New manual irrigation entry/adjustment controls are unavailable in this workspace. Each parameter
retains its own origin and baseline; new research never silently changes an active decision.
**Source basis & change history** exposes edition hash, exact passage, wording, applicability,
limitations, adjustment rationale, actor and timestamp.

One draft covers count, notes and all phases for the selected plant. Comparison cells distinguish
draft from saved values. **Cancel changes** restores saved values. Leaving a dirty plant offers
**Save and continue**, **Discard changes** or **Keep editing**. Unsaved drafts do not survive reload;
the browser warns before leaving. **Community details & members** retains metadata and plant editing.

Configured, unconfigured and not applicable are distinct. Inactive phases retain earlier values
for reactivation; unconfiguring removes active fields while preserving audit history. Failed saves
and HTTP 409 conflicts retain the draft. Refresh and review current records before saving again.
**Refresh evidence** does not adopt candidates. If plant notes or site context changed, pending
adoptions need another applicability review. Session Undo/Redo keeps separate group/community
histories, rejects conflicting intervening changes and is separate from graph Back/Forward.

## Sources and manual research

Source links visibly name the passage/section or subject first, followed by document title and
PDF page. Links to one document remain distinguishable. Use checked `SourceRef.label`, or checked
source `page_labels` and meaningful locator for legacy refs. Missing headings are stated explicitly.
Changing PDF pages must not carry the previous page's heading onto a new one. These display labels
never extract/adopt irrigation values. See `imports/CONTRACT.md`.

Source links open the registered PDF at the exact one-based position while preserving the workspace
and draft. Related-node details appear in the guidance column. Closing either restores the selected
plant and phase. Edition hashes and retained baseline details remain inspectable.

**Request research** captures community/site context, stable species identity, phase/parameter,
evidence, current revision, draft operations and the original exploration. Library and web is
suggested; the user can change the boundary and edit the handoff. Preparing it performs no research.
Checked Codex intake adds evidence; refresh reveals candidates without applying them to plans.

## Plant-neutral irrigation lifecycle

Open the stored **Irrigation lifecycle** folder. Its cited guide and vertical member order are
Nursery, Settlement, Summer maintenance, Support. These explain purpose, units, timing, age/stock
and monitoring for any plant; they do not prescribe numerical regimes. Support is triggered by
conditions and can overlap earlier field phases. Nursery age differs from time since field planting.
There is no automatic dose curve, universal stopping age, inheritance, scheduling or budget calculation.

An event dose differs from reservoir capacity/fill, seasonal totals and annual area allocations.
Keep original wording and the calculation for any normalization; do not derive an event dose without
the denominator and event count. Ranges remain ranges. General LIFE NIEBLAS schedules belong with
the project/method, not as generic lifecycle or carob prescriptions. Its nursery batch average retains
the documented quantity and plant count. IND/IFWC and AFDS are explained in the stored guide;
the source's SAD label has a curated operational correspondence with AFDS, not an invented expansion.

**Plant communities → Carob plant communities** separates Mediterranean carob associations
(`carob-community`) from Almería-specific evidence. Potential vegetation, observed companions,
restoration models and production practices retain separate meanings. Las Labores, La Alcantarilla
and La Tórtola keep their municipality/case context; the wider finca examples remain with the
general carob community. Neither community assigns carob quantities to all associated plants.

Historical intake: `imports/irrigation-lifecycle-carob-context-2026-11-08-v2.json` advanced revision
6 to 7. Its earlier candidate was isolated QA only. The context-separation batch
`imports/irrigation-context-separation-2026-11-08.json` advanced 9 to 10 and supersedes the original
placement of concrete doses on generic phases. Original finding wording and immutable evidence
were retained. Audit records remain under `output/irrigation-audit/` and `output/irrigation-context/`.
These are historical acceptance records, not current collection counts or a whole-manual coverage claim.

## Persistence and maintenance interfaces

SQLite is authoritative. `organization_roots` owns root labels; `browse_groups` stores folders and
nullable anchors; `communities` stores typed working/source records; `irrigation_evidence` stores
immutable candidates; `planning_events` stores append-only before/after snapshots and compensating
edits. The planning migration records `meta.planning_schema=1`, backs up existing stores, and rejects
unsupported versions or incomplete required root metadata.

Each mutation requires `expected_revision`, validates before one transaction and advances the global
revision once. Initial recovery metadata is `backups/community-editor-baseline.json`. Preserve SQLite
with managed sources/media; stop the app before replacing live data and test restoration separately.

| Interface | Purpose |
| --- | --- |
| `POST /api/organization/edit` | group-create, group-rename, group-move, group-delete, members-move, members-share, members-remove, revert |
| `POST /api/communities/edit` | community-create/copy/edit, plants-add, plant-remove/edit, plant-plan-set, legacy stage-set/field-set, revert |
| `GET /api/communities/{id}/history?topic_id=…&stage=…&field=…` | Retained field changes, including removed stages/members |
| `python -m backend.cli edit EDIT.json --check` | Validate a shared-service edit with actor Codex; omit `--check` to apply |

Edit envelopes are `{expected_revision, action, data}`; responses include revision/event ID. Browser
actor is Local user. Catalog, inspection, export and research handoffs include organization/community
data from a consistent snapshot. Browser endpoints cannot execute `organization-initialize`.
`scripts/prepare_community_organization.py --output NEW_EDIT.json` is a historical initialization
helper with explicit inventory checks, not a routine reset command. Do not rerun it over accepted plans.

The current Evidence desk uses the stricter atomic `plant-plan-set` action:

```json
{
  "expected_revision": 123,
  "action": "plant-plan-set",
  "data": {
    "id": "community:<existing-id>",
    "topic_id": "<member-species-id>",
    "changes": {"count": null, "notes": "Local plant notes"},
    "stages": {"settlement": "configured"},
    "fields": [{
      "stage": "settlement", "field": "amount", "mode": "source",
      "evidence_id": "irrigation-evidence:<checked-id>",
      "reviewed": true, "rationale": "Why this source applies here"
    }]
  }
}
```

IDs/revision above are placeholders. `changes`, `stages` and `fields` are optional patches; at least
one change is required. Stage statuses are configured, unconfigured or not-applicable. Field
operations target amount, frequency or period using source or clear mode; clear omits evidence_id.
Unknown fields, client-supplied irrigation numbers, duplicate operations, incompatible evidence and
missing reviews are rejected. The server obtains values from checked evidence IDs, preserves baseline
snapshots and rolls back the whole plant edit on failure. Legacy maintenance actions remain supported;
they are not a description of controls available in the current Evidence desk.

Checked intake may add source-described `communities[]` and `irrigation_evidence[]`. Cite the source
context for each community/member; PDF refs must resolve to registered editions and inspected pages.
Evidence uses an `irrigation-evidence:` ID, stage, field, optional species, value/units, original wording,
context, applicability and limitations. Corrections use new evidence IDs. Intake must not replace
working communities, prefill plan values or overwrite immutable candidates/baselines.

Use the current Evidence desk fixture, general checks and focused lifecycle commands in
[Verification](VERIFICATION.md). Synthetic QA evidence must never enter accepted knowledge.
