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

Groups with `presentation: hierarchy` provide folder navigation: open a child folder or inspect
a direct member. Group by stays at None and the layer draws no connection arrows. The sidebar
expands the active hierarchy branch. **About [topic]** opens a group's anchored fund, programme
or authority in the inspector; ordinary topic exploration still shows its recorded relationships.
Existing groups default to `standard`, retaining their layouts and connections. Shared references
are counted once in the layer's represented-topic total.

Under **Funding programmes**, separate branches cover FEADER/PEPAC/LEADER,
NextGenerationEU/PRTR restoration, Fundación Biodiversidad/Doñana, and the prospective Commission
nature-credit roadmap. LEADER's **Local implementation** contains AL20 and AL30, with their GDRs
kept distinct. Geographic containment alone does not add a funding authority. Documentary dates,
provisional proposals and public-contract financing retain their original scope.

The stored Funding structure container uses `navigation: transparent`, so it adds no visible graph,
sidebar or breadcrumb step. Its memberships, sources and stable ID remain available to maintenance.
Only explicitly marked unanchored hierarchy containers are skipped; actual funding levels remain.

## Project ideas and funding suitability

Within funding browsing, choose **All ideas** or one idea. **Edit project ideas** opens editable goals,
linked concepts, proposed geography, applicant options, land access, partners, budget and readiness.
The initial four ideas are exploratory user plans. Unknown facts remain unconfirmed; choosing an
applicant arrangement does not establish that an organisation, land agreement or partnership exists.

Funding cards separate project relevance and availability. The inspector provides the source-backed
call/instrument facts and a curated assessment for each idea: potential, conditional, needs review or
outside that idea's scope. Explicit exclusions retain the affected geography, activity or applicant
route. Programme folders count reviewed routes instead of inheriting a child's open/fit verdict.
Missing reviews remain visible. Source verification failures preserve last-confirmed facts.

Payment timing is a separate, manually checked heading in the existing `financial_summary`:
`Payment timing: <concise label>` followed by a newline, the dated conditions and the financial
detail. Cards and the inspector display that explicit heading; absent headings mean **Payment
unverified**. No rate, the word “lump sum”, another national route or a parent programme creates
an advance label. Frameworks direct readers to individual route terms; references receive no
standalone payment badge. Conditional advances still require eligible delivery and final
justification, and may require guarantees or a coordinator-to-partner transfer. Loan disbursement,
start-up instalments, draft provisions and non-cash assistance remain distinct. Current payment
coverage and retry actions are in
[`funding-payment-coverage-20261111.json`](../imports/funding-payment-coverage-20261111.json).

Curated funding topics use optional `funding_role: route|framework|reference` and explicit
`funding_context_ids`. Supporting references show linked, separately named reviews rather than
their own eligibility verdict. Frameworks count reviewed routes, missing reviews and incomplete
verification/idea comparisons; they never inherit an open or suitable verdict. These links describe
context, not eligibility or factual relationships. A route requires its own four-idea comparison.
Unclassified older data retains its existing presentation. The complete review's initial 128-card
dispositions, review outcomes and retry actions are in
[`funding-review-coverage-20261110.json`](../imports/funding-review-coverage-20261110.json).

Project changes increment the profile version and flag previous assessments for review without
erasing their reasoning. Funding reviews have their own version; assessments bind that version,
the project version and an evidence fingerprint. These are manual reviews, not scores or automated
eligibility decisions. Calls, grants, repayable finance, procurement and assistance stay distinct.

Changing only those two presentation fields does not invalidate an assessment. Changing factual
topic content, a cited edition, the funding-review version or the project version still does.

`POST /api/projects/edit` and `python -m backend.cli project-edit EDIT.json [--check]` accept
`{expected_revision, action: create|update, id?, changes}`. Changes may contain the editable fields
above; IDs, versions and timestamps cannot be patched. Creation may supply a stable `idea:` ID for
an explicitly authorized initial intake. Conflicts return 409; the editor preserves the draft,
supports refreshing, and requires review before overwriting a concurrently changed profile.

## Knowledge tree organization

These rules apply to full-library, incremental and task-specific intake in every domain. Before
editing, inspect the live groups and prepare a placement manifest covering affected topics:
previous/new primary homes and shared references, classification changes and supporting passages
or recorded relationship IDs. Preserve stable identities and source-specific applicability.

- Give reusable concepts a canonical general home. Put project-specific trials, participants,
  locations, components and dated events beneath the actual project or system, using role folders
  where useful. Use shared references for reusable concepts and for project context available
  through another route. Neither a shared PDF nor co-occurrence proves ownership or association.
- Use `presentation: hierarchy` for curated browsing folders. Root and overview browsing also
  use folders without factual arrows; explicit topic exploration keeps the real connections.
  Preserve meaningful single-child stages, ordered lifecycle sequences and full memberships.
- Set `catalogue: true` only for an intentional list of peers, such as species, municipalities,
  habitats or operation types. Catalogues retain all entries and existing search access; do not
  invent taxonomy or arbitrary alphabetic folders to meet a size target. Four to eight immediate
  choices is a review target for decision branches, never a display cap or import blocker.
- Keep findings on their existing topic IDs and in Evidence panels. Navigation is not permission
  to rewrite claims, infer ecological associations, transfer another project's results, adopt
  irrigation evidence or modify working plans. Correct classification metadata deliberately and
  record it separately from scientific changes.

Run `python -m backend.cli audit-organization` for the current tree, or append `--batch <file>`
to validate and review a proposed overlay without applying it. Import preview/application also
returns `organization_warnings`: ambiguous placement, crowded branches, mixed context and potential
loss of memberships, primary homes or metadata. Warnings are advisory; existing schema, source,
cycle, endpoint and revision checks remain blocking. Disposition each warning as corrected,
an intentional reviewed catalogue/context, or unfinished work in the run report.

The backend resolves canonical topic roots from explicit primary folders or recognized base
categories. Unplaced context categories (places, organizations, events and unknown categories)
are not routed to Monitoring or Requirements. Non-empty `review:ecosystem`, `review:technology`
and `review:funding` scopes appear as **Needs organization**. These are read-only derived views:
they do not create folders, facts, memberships or knowledge revisions and cannot be selected in
group-edit controls. They disappear when placement is resolved. Do not persist their IDs as
ordinary group/topic identities or include read-only catalog review data in an import batch.

The existing nine root IDs stay stable. Species and habitat peers remain catalogues; methods
and systems have distinct component roles; projects retain their own sites/trials/participants;
territorial coverage stays outside funding responsibility chains. Keep uncertain plant names,
project status and source wording intact. This policy supplements the funding-specific rules below.

Within **Habitats & conditions**, **Habitats & site conditions** holds broad ecological settings;
**Plant communities** holds source-described vegetation types and plant associations, with carob
examples in its existing subfolder. Do not mirror the community catalogue into the habitat folder.
Detailed soil, climate and planting constraints retain their homes under **Site & establishment
conditions**. These are browsing distinctions, not new botanical classifications. Source-described
associations remain separate from editable community plans and do not establish planting recipes.

## Project intake and summaries

This is a required semantic review for full-library, incremental and task-specific intake in every
domain. Apply it to project examples as well as the main subject of a document. Use the current
topic, description, finding, relationship and browsing-group fields; no new batch fields are needed.

**Identity and completeness.** Inventory each useful source-described project, study and pilot/trial
in the run sidecar, with its source passages, existing/new topic ID, documented umbrella project,
summary/finding/link disposition and remaining gaps. Reconcile against the whole graph, including
previously inspected material with known representation gaps. Reuse stable IDs. Give each distinct
project a real topic; a source registration, company name, project folder or scattered trial details
does not substitute for that identity. Use `kind: project`, `study` or `trial` as the evidence supports,
and explicitly identify its role in the description. Preserve genuine programmes, implementing
organizations and sites as distinct entities. A pilot/trial has an umbrella only when documented;
neither a shared PDF, author, acronym nor place establishes one. A descriptive project name is
acceptable when no official name is recorded; explain that naming limit rather than invent an acronym.

**Required project summary.** Each new or substantively revised project/study/trial topic needs a
concise, source-backed overview in `description`, normally about 100–250 words where useful:

- Purpose and work: what was done or proposed, why, and the question or problem addressed.
- Techniques and scope: methods used, treatments/comparators, sites, participants and dates where
  documented. Connect named techniques and other entities to their canonical topics.
- Key findings: the most useful results in plain language, including negative or conflicting
  findings. Give an outline here; retain detailed evidence in cited findings.
- Conditions and limits: species/stock, site, planting season, treatment, comparison, duration,
  denominator and uncertainty where consequential. Keep each takeaway within its evidenced scope.
- Status and evidence gaps: distinguish proposed, tendered, awarded, implemented, monitored and
  evaluated work, with an as-of date when known. Planned targets are not measured outcomes.

Refresh the summary in the same checked intake whenever new evidence materially changes the
project's known work, results, conditions or status, even if the topic was not initially selected.
Use only reviewed evidence and exact passage-specific references. If a summary element is absent,
say "Not reported in the reviewed material" and record the gap; do not imply it does not exist or
fill it by analogy. Even a sparsely documented example should explain its known role and limits.
Conditional results must retain their conditions. A benefit observed for one planting season does
not justify "only works if" or a general recommendation without evidence for that stronger claim.
Separate source-reported observations, source guidance and explicitly explained curator interpretation.

**Details inside the project.** Anchor its browsing folder to the real project topic and make the
role visible in new/revised folder labels, for example "[Name] · Project", "[Name] · Study" or
"[Name] · Pilot". About exposes the topic summary; the folder description provides navigation.
Use meaningful child folders for trials, interventions, sites, participants or evaluation only when
there is actual content. Create independent detail topics when they merit explanation/connections;
keep small details in the summary or findings. Do not create empty template levels, a node for each
sentence, or duplicate species/methods/equipment beneath every project. Keep reusable topics in
their canonical general homes with shared project memberships. Preserve existing finding IDs and
attachments; put new detailed results on their actual project/trial via `topic_ids`, with conditions
and exact citations. A project overview must not erase differences between its trials.

**Connections during ingestion.** For every project intake, search the wider graph for existing
techniques, species, conditions, equipment, monitoring methods, participants, places and documented
funding. Reuse identities and existing valid edges; add all useful justified missing relationships
in the same checked intake as the project evidence, rather than postponing cross-linking. Record
direction, meaning, source/curated basis, explanation, applicability and citations. Folder membership
is not a factual link. No edge quota applies: when evidence cannot support a useful connection,
record it as unresolved rather than inventing ownership, ecological transfer, eligibility or success.

Before declaring intake complete, reconcile the project inventory with accepted topics, summaries,
trial homes, findings and relationships. Review a journey from the project folder through About to
its summary, key findings, linked techniques and exact source passages. Report missing identities,
umbrella context, summary elements, unreviewed links and unfinished placements as continuation work.
This checklist is curator review; `audit-organization` and `import --check` do not read PDFs or verify
project-summary completeness. Organization warnings remain advisory, not new import blockers.

## Funding hierarchy maintenance

This is the required organization for future full-library, incremental and task-specific funding
intake. Discover the current definitions with CLI `groups`, `inspect` and `export` before each
batch. SQLite is authoritative; extend its live IDs, anchors and memberships rather than replaying
the original hierarchy batch or recreating the tree from this guide.

For maintenance, use **Funding programmes > Funding structure** (`browse:funding-structure`). This
stored container is transparent in reader navigation; preserve `navigation` during full-record updates.
The established branches include:

| Branch entry ID | Documented browsing path |
| --- | --- |
| `browse:funding-feader` | FEADER · EU / PEPAC · Spain / LEADER / Andalusian LEADER authority |
| `browse:funding-nextgenerationeu` | NextGenerationEU · EU / PRTR · Spain / Ecosystem restoration · C4.I3 / Regional delivery · Andalusia |
| `browse:funding-biodiversidad` | Fundación Biodiversidad · Spain / Doñana restoration grants 2025 |
| `browse:funding-commission` | European Commission · EU / Nature-credit roadmap · prospective |

- Under the LEADER authority, preserve **Interventions**, **Local implementation** and **Rules and
  calls**. Add a newly documented ZRL alongside AL20/AL30 under Local implementation, not under a
  province inferred from a table heading. Under AL20, preserve **Managing GDR**, **Funding lines**
  and **Local strategy and criteria**, including the existing criteria groups. Other ZRLs receive
  only their own documented content; never copy AL20's criteria, activities or calls by analogy.
- Use actual funds, national frameworks, responsible authorities and local delivery participants
  as anchors or members. Distinguish a ZRL, its managing GDR, strategy, intervention and local
  funding line. Skip absent levels and begin at the earliest documented participant; do not force
  every branch through EU, Spain, region, province and ZRL. Keep geographic coverage in territorial
  context and topic details unless a source establishes a real financing/administrative role.
- Represent financing, implementation and programme structure with named child groups throughout
  the funding hierarchy, including groups such as Local implementation or Funding lines. Set
  `presentation: hierarchy` explicitly on every new funding-structure folder and retain it on
  updates. A chain of arrow labels alone is not acceptable browsing organization. Keep independently
  supported factual relationships for details and ordinary topic exploration; never delete them
  just to hide arrows, or create a factual edge solely from folder membership.
- Reuse existing branch/group/topic IDs and full current records, preserving descriptions,
  citations, maintenance rules, member layouts, anchors and complete primary/shared memberships.
  Each topic has at most one primary custom membership. Use shared references for cross-cutting
  rules, activities and projects; do not duplicate the underlying records. An anchor may be an
  explicit parent member represented by its child folder, but never its own group's member.
- The usual shallow-tree and 4–8-choice targets do not override a documented responsibility chain.
  Retain necessary single-child levels. Avoid empty placeholder folders; a genuinely different
  documented financing mechanism may receive its own branch under Funding structure using the
  same conventions, without inventing intermediaries or forcing it into LEADER/PRTR.
- Preserve documentary edition, territory, applicant/operation scope and status. A project-specific
  financing percentage is not a general aid rate; a provisional proposal is not an award; prospective
  nature finance is not an open grant. Unsupported placement stays explicitly unresolved rather
  than becoming a fabricated funding path.

Before applying a funding batch, record each new/revised funding concept's intended path, anchor
or membership role and supporting passage in the run's sidecar audit. Check the proposed tree
against live definitions: every participating concept is reachable, parents are acyclic, primary
memberships are unique, existing members/metadata remain, hierarchy presentation is retained,
and no geographic intermediary or other-ZRL rule was inferred. `import --check` validates the
schema, not these semantic requirements. Review the affected folder openings and About/source
links; an unresolved path is reported as a gap, not as completed hierarchy integration.

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

Chat/report intake uses the reusable prompt's
[claim and proposal procedure](../DOCUMENT_INGESTION_PROMPT.md#chat-claims-proposals-and-synthesis).
Keep a user's proposed integration and assumptions explicit in its concept description/aspects,
with verified component citations and curated links; retain unsupported questions as unresolved.
Conversation prose, manufacturer specifications, patents and theoretical calculations do not become
measured trial outcomes or species watering recommendations. Research intake never adopts assumed
parameters into a community plan. Focused research-results mode leaves unrelated library work pending.

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
