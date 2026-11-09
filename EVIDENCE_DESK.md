# Evidence desk community editor

Open a working community and choose **Edit community**, or use **Manage communities**
from the overview. Existing communities open a full-window workspace. Group editing
remains a separate organization dialog.

## Layout and decisions

- The left column selects member plants and exposes recorded community/site context.
- The center compares all four phases, then shows phase tabs and read-only irrigation
  parameters. Selecting a comparison cell opens that phase and parameter.
- The right column shows checked evidence, applicability review, related existing
  knowledge nodes and an editable research handoff. A shared page never implies a
  compatible regime or a dose for companion plants.

Selecting evidence does not fill values. Review its original wording, species, age,
method, site conditions, units and limitations; check **Source conditions reviewed**
and explain applicability. **Adopt reviewed amount/frequency/period** adds only that
parameter to the selected plant's local draft. No values are inferred from prose.

Amounts require a finite nonnegative numeric value in L/plant/event (legacy
L/plant/watering remains equivalent). Frequency and period require explicit text
values from species-specific evidence for the selected phase and parameter. General
guidance, ranges, reservoir fills, seasonal totals and unquantified evidence remain
visible guidance. They cannot supply an event dose. Unknown is distinct from zero.

Existing manual or adjusted planning values remain labeled and preserved. Their
retained citation is a basis for review, not proof of an adjustment. Existing phase
notes, source snapshots, original units and change histories remain readable. New
manual irrigation-value entry and adjustment controls are not part of this editor.

## Drafts, saving and recovery

One draft covers the selected plant's count, notes and all four phases. Comparison
cells distinguish draft and saved values. **Save changes** commits the complete plant
edit once; **Cancel changes** restores saved values. Changing plants, choosing another
community, opening community settings or returning to the graph with a dirty draft
offers **Save and continue**, **Discard changes** or **Keep editing**. Unsaved drafts
do not survive a browser reload; the browser warns before leaving with changes.

Configured, not configured and not applicable remain distinct. Inactive phases retain
earlier saved values for reactivation; unconfiguring removes active values while audit
history remains intact. Support watering can overlap other field phases.

Failed saves and HTTP 409 conflicts retain the draft. **Refresh evidence** updates
saved values and candidates without adopting new evidence. If plant notes or site
context changed, pending source adoptions require another applicability review before
saving. Changes to existing accepted decisions are always explicit.

**Community details & members** preserves community metadata editing, plant addition
and removal. Source-described communities stay read-only and offer a working copy.
Undo/Redo uses the existing revision-checked community history, separate from groups.
Returning to the graph preserves its query, camera, layer offsets and history entry.

## Sources and research

Friendly source links open the existing PDF/source viewer at the exact registered
page while keeping the workspace mounted. Related-node details open in the guidance
column. Closing these views restores the selected plant, phase and pending draft.
Edition hashes and retained baseline details are expandable.

**Request research** opens the existing editable manual research panel. It includes
the community/site context, stable species identity, phase, parameter, values needing
source review, existing evidence and related nodes, captured revision, unsaved draft
operations and original exploration. Library and web is suggested; users can change
the source boundary and edit the prompt. Preparing a handoff does not perform research.
Codex intake registers/validates new evidence; refresh reveals it without applying it.

## API contract

`POST /api/communities/edit` accepts `plant-plan-set` using the existing request envelope:

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

The IDs/revision above are placeholders. `changes`, `stages` and `fields` are optional
patches; at least one change is required. Stage statuses are configured, unconfigured
or not-applicable. Field operations target amount, frequency or period and use source
or clear mode. Clear operations omit evidence_id. Unknown payload fields, supplied
irrigation values, duplicate field operations, incompatible evidence and missing
applicability review are rejected. The server obtains values directly from checked
evidence IDs and retains immutable baseline snapshots. All operations validate before
one transaction, revision increment and append-only audit event. Failed writes roll
back every plant detail, stage and field change.

No schema migration is required. Existing maintenance/legacy operations remain
compatible; the Evidence desk uses the stricter atomic action. Research context is
added to the existing research handoff, not a new research service.

## Verification

Run `npm test`, `python -m pytest -q` and `npm run build`. Prepare/serve a fresh isolated
QA database (never the accepted database or production port):

```powershell
python scripts/evidence-desk-qa.py --database output/planning-qa/evidence-desk/fresh.sqlite --serve
```

With Playwright importable or `KGB_PLAYWRIGHT_MODULE` pointing to its installed
`index.mjs`, run `npm run test:planning`, `npm run test:browser` and
`npm run test:source-viewer`. The helper refuses existing destinations for preparation
and only serves databases containing its synthetic fixture batch. All writes use 8769;
8765 remains the accepted app. Reports/screenshots live under output/planning-qa/ and
output/consolidation-qa/. Synthetic fixture quantities are not recommendations.
