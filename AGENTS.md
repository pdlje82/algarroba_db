# Project instructions for Codex Desktop

The user approved the v6 consolidation on 8 November 2026. This supersedes the ten-perspective,
independent-pane and dual-view requirements in earlier briefs. README.md and PROTOTYPE_TWO.md
describe the current implementation. Historical briefs and the EPUB remain historical references.

One local Windows app: React/TypeScript, react-force-graph-3d 1.29.2 / Three.js 0.187.0,
Python/FastAPI, SQLite and PDF.js. Browsing is offline. No Cytoscape/fCoSE worker, react-rnd,
Flat view, blur/frosting, independent panes or autonomous research system remain.

## Knowledge maintenance

- SQLite (`data/knowledge.sqlite`) is authoritative. Use `backend.cli`; never treat an export or
  JSON batch as an independently editable master. Imported batch IDs are immutable; corrections
  use new batch IDs and existing record IDs. Preview/validate before applying, with base_revision.
- The old `C:\Users\JanEngelke\git_private\algarrobos\doc_library` is READ-ONLY. Never write,
  rename, move, delete or update originals there. New sources and all generated artifacts belong
  to this project. Verify registered editions before using their page scopes.
- Initial extraction is exactly the selected 68 PDF positions from nine originals. Other pages
  are accessible for viewing; factual ingestion beyond that scope needs an explicit later task.
- A task directs priorities, not ingestion filters. Capture all useful supported discoveries in
  the material actually inspected across the agreed domain, including discoveries outside the
  original question. Inspect the wider existing graph, reuse identities, and connect relevant
  old and new topics beyond the visible neighbourhood. Never create isolated task graphs.
- Preserve sources/pages, original plant names and checked identities, trial conditions, units,
  places, dates, applicants and territory. A common name or misspelling is not a new species or
  permission to merge different source concepts. Keep unresolved correspondences explicit.
- Distinguish source observations, source guidance and explained curated associations. Document
  co-occurrence is not a domain connection. Citrus spraying is not carob establishment evidence.
  A funding activity connection is not eligibility or an award; availability remains unverified.
- Ordinary in-domain additions need no extra approval per topic. A material domain extension is
  recorded for a simple user decision before expanding research/factual ingestion into it.
- Read saved research brief AND context.json, reconcile captured revisions/IDs, and follow the
  README ingestion procedure. Report the task answer, additional discoveries, wider connections,
  actual/unfinished coverage and unresolved items. Complete the task record and preserve its view.
- Codex Desktop is the maintainer. Do not add an AI API, autonomous agent system, crawler or
  background researcher. Research prompts are editable fixed-template manual handoffs.

## Consolidated exploration contracts (v6)

- All clickable foreground cards, including groups, show an opaque accent hover outline and
  pointer cursor. Hover is transient and never selects/navigates/changes history. Domain-excluded
  darkened nodes have no hover or picking, and their keyboard list/open actions are disabled.
  Clear a selection when it becomes excluded; cancelling preview restores interaction. Keep opaque
  disabled/background cards as depth blockers so clicks cannot pass through to content behind.
  Share eligibility across hover, graph/inspector selection and keyboard topic lists. Use a hollow
  outline geometry so limited depth precision can never cover the node's text with highlight.
- One explicit reducer, one scene builder and one active foreground graph. Selection only inspects.
  Explore sets the centre and opens direct neighbours, or routes when a search is present.
- Keep centre designation separate from the captured query anchor. Remove centre removes the
  card and attached lines, retains surrounding results, and repacks the current layer with no
  extra history/layer. Preserve camera/layer offset/source; route reveal must never reinsert the
  removed origin. The retained anchor supports refreshing this scope and persisted omission.
  A new explicit scope uses the current designation. Membership opening clears inherited centre/
  anchor, packs only genuine members, and must not inject an unrelated prior centre. Normalize
  older group sessions and stale centre slots without rewriting saved database payloads.
  Scope, filters, grouping, routes, positions, camera and comparison belong to exploration state.
- Domain changes are staged in place via pendingDomain: darken excluded cards, preserve all
  current content/positions until Update beside the foreground X is clicked. Update reuses the
  canonical query and replaces the current history entry, never appending a view/snapshot.
  Update clears old card positions and tightly repacks survivors with the canonical layout,
  filling gaps from removed nodes. Preview retains all original positions until Update succeeds.
  Accepted All-domain overviews normalize to a complete compact grid, including old saved
  scattered/partial slots. Preserve their old layer offset when the corrected geometry key
  changes. Pending previews keep their current layout. Do not rewrite stored legacy payloads.
  Preserve camera, layer offset, source and backgrounds. Retain required context; show matching
  counts for mixed groups. Cancel preview by selecting the applied domain. Save staged choices;
  retain them and the working graph on failure. Reject cancelled/stale updates. The Update control
  shares close-control depth occlusion and has a toolbar fallback. Topic-type filters stay separate.
- Domain/type filters affect endpoints; connecting context and the centre remain identifiable.
  Membership is never a factual edge. Grouping never creates permanent organization records.
- Route reveal uses one expanded-ID set. Share intermediates. Preserve every constituent factual
  ID exactly once as a line, summary or internal-connection list. Shortcuts are view objects.
- Return to overview establishes a persisted single-layer boundary, retaining domain/type filters.
  Overview cards must belong only to the selected domain; an out-of-domain centre stays a context
  marker rather than creating an extra card/group. Earlier layers never leak past this boundary.
- Changing Group by only reorganizes the current layer in place, preserving camera/offset and
  existing background snapshots. It does not append a view. Opening a Members/sidebar/display
  group is a separate explicit foreground exploration: preserve the original layer behind it,
  darkened. Single group-node clicks only inspect. Double-clicking an eligible foreground group
  runs the same canonical Open group action as the inspector/topic-list buttons, exactly once.
  Require two valid clicks on the same node/layer. Darkened/background cards, ordinary topics,
  modifiers, controls, cancelled clicks and drag gestures cannot trigger group opening.
  Return to overview still establishes a single-layer boundary; closed earlier episodes stay closed.
- Open group on a grouped card captures its exact member IDs into groupMembers and opens a
  Group members scope with a typed display-group ID. Clear earlier expansions, centre, search
  and local card positions; default Group by to None and pack all members tightly. Do not retain
  sibling cards or previously expanded types in the active layer. All entry points share this
  action. Domain/grouping changes stay within captured membership. GET /api/explore accepts
  member_ids for virtual display groups; return canonical records and real internal edges only.
  These view groups never create database organization definitions. Translate the last old
  expandedGroup into focused membership on activation, preserving camera/offset/history/source.
  expandedGroups is read-only legacy snapshot data; no toggle/Collapse workflow remains.
- Place grouping and focused place queries use the same explicit primary-place rule: a place
  topic anchors itself; other topics use their first place_ids entry, resolving redirects. Null
  means unrecorded; a missing referenced place is separately unavailable, not unrecorded. Never
  infer geography from names/co-occurrence or alter factual place assignments for presentation.
  Revalidate place membership server-side, including old captured IDs. group_member_ids returns
  the validated unfiltered source set; endpoints apply domain/type filters without erasing it.
  On restore/refresh, repair incomplete/scattered focused-member slots to a compact grid, while
  preserving healthy grids exactly, camera, layer offset and history. Pending previews keep
  positions. Measure the current canvas for packing after async loads instead of stale aspect.
- Opened group layer headings use the opened node/card name, resolved from current stored labels,
  rather than a generic Group members label. Keep names consistent in heading/context/close controls.
- Each heading has an accessible Close layer button; the toolbar has a foreground fallback.
  HTML controls must respect depth: hide the entire button when a nearer opaque card, heading
  or close control overlaps its footprint. Hidden buttons must not intercept pointer/keyboard
  input; refresh occlusion during camera/layer movement, resize and fullscreen.
  Closing a previous snapshot only hides it and never backfills an older snapshot. Persist
  closedLayers in v6 presentation state. Foreground close restores the nearest visible previous
  view as a reversible history action, falling back to the selected-domain overview. Keep the
  base overview open. Never delete history or knowledge; single node clicks remain inspection-only.
- The active foreground layer has a theme-matched background at 70% opacity over its
  full sceneFrame, including connection layers. Keep this surface behind foreground
  cards/labels/links, depthWrite=false, and outside picking and opaque-control occluders.
  Historical snapshots keep their existing treatment without an added backplate.
  Use a logarithmic renderer depth buffer to distinguish the close layer elements at
  oblique angles and across the zoom range. Keep the renderer configuration stable.
  Composite the foreground in the same blending queue after its backplate (renderOrder=-1),
  retaining opacity=1 and depth testing/writes for its cards, labels and lines. This keeps
  screen-space thick-line fragments clear at steep angles; depth precision alone cannot.
  test:layer-opacity compares actual foreground pixels with the backplate drawn/omitted;
  it must never change opaque card, label or fully covered connection-line pixels.
- Previous views are derived from at most two distinct earlier history entries. They are opaque,
  darkened 65%, with read-only content excluded from factual accounting and research capture.
  Their labels, like the foreground label, allow presentation-only XY dragging.
  Exception: the node/card that opened a visible child layer stays at full brightness with an
  accent outline in its source background layer. Store openedFrom presentation references;
  derive highlights from the visible chain, not transient selection. Closing a child removes
  its opening highlight. Highlighted background facts remain excluded from picking/accounting.
- Keep straight links attached to actual card edges. Opaque cards occlude labels and lines with
  ordinary Three depth testing. Only foreground facts participate in picking; all layer labels have separate drag-only picking.
- Zoom, pan and turn never change semantic content. Keep 25-degree initial tilt and symmetric +/-60-degree limits
  around both X (tilt) and Y (sideways). Shared camera moves (framing/Fit/Reset/zoom/angle
  buttons) take 600 ms, or zero with reduced motion. Saved camera restoration stays immediate. All scopes and previous layers
  use one compact grid: no neighbour rings, reserved centre slots or scattered fallback slots.
  The centre retains its semantic marker in an ordinary grid slot. Repack changed membership,
  including route reveal/hide, to fill gaps; reuse complete healthy grids exactly across reload,
  camera, resize and fullscreen changes. Preserve pending preview geometry until Update succeeds.
  Read-only previousKey aliases preserve moved offsets, source highlights and closed-state keys
  when rendering older scattered/ring snapshots. Preserve camera/offset when activating repairs.
  Update layer, Remove centre and Tidy explicitly repack.
- Prepare data/layout before committing history. Cancel stale requests; failures retain the last
  working view. Back/Forward restores complete states; new actions cut the forward branch; cap100.
- Drag unmodified left-mouse on a label to translate its complete layer in XY at fixed Z.
  Use shared DRAG_SENSITIVITY=0.125 for label XY deltas, Trackball panSpeed and Ctrl/Shift rotation
  deltas (22.5 degrees per viewport span). Keep Trackball staticMoving=true so camera dragging
  stops with the pointer. Refresh Trackball handleResize after the graph canvas lays out or
  changes size; its constructor can cache the initial 300x150 canvas and amplify pointer motion.
  Retain the +/-60-degree bounds and 25-degree reset.
  Ctrl/Shift-drag takes rotation priority. Suspend camera controls, use pointer capture and a
  4px threshold, and restore the original offset on Escape/cancel. Persist layerOffsets by stable
  graph key in the current exploration, without adding semantic history or moving local cards.
- State/session format6 uses kgb:exploration:v6 plus IndexedDB fallback. Leave legacy storage keys,
  old saved-view payloads and old research contexts untouched. Compatibility is read/translate
  only, implemented in migration.ts; do not restore a second executable viewer.
- Evidence, Dates and Comparison are docked inspector panels in normal and fullscreen modes.
  Research is one manual static-prompt handoff; pending questions are task-list items/badges.
- Run npm test, the backend integrity suite, production build and real browser checks after
  material changes. Use isolated QA databases for browser saves/tasks. Preserve sources and
  factual/organization table signatures; no ingestion is part of this rendering consolidation.

## Self-describing knowledge organization

Before maintenance, inspect current stored organization using backend.cli groups, inspect and
export. Read memberships, primary/shared roles, parent paths, anchored groups, member IDs and
maintenance rules at the current revision. Follow those definitions generically; do not add
hardcoded topic-specific rules to application code or this file. The rules belong to the database
and are included automatically in research handoffs. Distinguish permanent groups from temporary
perspective headings. Membership is organization, never a factual edge or route shortcut.

Optional browse_groups changes use checked import batches, base_revision, preview, transactions,
duplicate checks and backups. Preserve unique primary memberships and acyclic parents. Capture
all useful supported discoveries across the agreed domain, including outside the task and visible
layers. This rendering revision must not change factual records, organization definitions,
knowledge revision or original source hashes. Browser writes use isolated QA databases.


## Species naming update (8 November 2026)

The user explicitly authorized adding Spanish, English and scientific names to existing species
records. This naming-only change is separate from the rendering consolidation's data freeze.
Use nullable spanish_name/english_name/scientific_name, name_status, name_note and name_references
on the same topic ID via a checked, revision-based batch. Original labels, aliases, source_refs,
scientific source spellings and distinct trial/source concepts stay intact. Never infer a species
from a typo/common name; preserve explicit unknowns, generic pine and genus-only Citrus.
Name references are naming-only citations, not authorization to ingest additional PDF pages,
ecological/geographic facts or trial outcomes. Current factual PDF scope remains unchanged.
Species cards across every graph/history layer show ES/EN/Sci using canonical current name
metadata; inspector, accessible lists, FTS search and research handoffs share those same fields.
Use names stored in SQLite, never frontend species-name mappings. Non-species/group cards keep
their existing labels. Keep all three rows within card bounds and existing grid geometry.

The accepted naming batch advanced knowledge revision 3 to 4. Current integrity baseline is
backups/species-names-r4-baseline.json; retain backups/consolidation-baseline.json as historical
revision-3 evidence. Only the intended naming metadata/topics and batch/search/revision records
changed. This does not authorize other factual/organization edits during rendering work.


## Source viewer failure isolation

Bundle PdfPanel/PDF.js with the main app, not a lazy import whose hashed chunk may disappear
while an old tab stays open through rebuilds. PDF documents/worker/fonts still load on demand.
Wrap only the source panel in PdfBoundary: render/effect errors must never unmount the graph.
Keep Close source, Retry source and direct original-PDF access available on failure. Ordinary
load/render errors stay inside the panel. Ignore superseded/unmounted document completions,
handle destroy rejections, and wait for cancelled paints before reusing the same canvas.
Keep exact one-based source pages, zoom/rotation and ingestion boundaries. Run the focused
npm run test:source-viewer with isolated QA data, including missing old chunk URLs, first click,
all registered documents, retry, rapid close/reopen/repaint and an injected viewer exception.


## Plant images and focused profiles (8 November 2026)

The user explicitly authorized the 46-image/23-plant intake, ten new species, focused profiles and
supported community connections, superseding the rendering-only data freeze for this specific batch.
Check the old app first; use primary external sources for remaining gaps. Preserve every original.
SQLite plant_images owns associations; use the checked importer, not frontend filename mappings.
Keep Quercus rotundifolia separate from Q. ilex, both Rhamnus species separate, Tamarix genus-level,
and esparto species separate from its habitat. Artwork and poster groupings are not ecological proof.
Keep compact card geometry, opaque depth/picking behavior, multilingual names and semantic history
unchanged when artwork loads or retries. Cancel mesh image callbacks on disposal.
Managed local sources/media travel with the SQLite backup; runtime must not read the old app.
See PLANT_IMAGES.md for maintenance, evidence limits, integrity checks and recovery.


## Owned document library (8 November 2026)

`doc_library/` now owns a byte-preserving copy of the old library plus the existing tracked EPUB.
This ownership phase does not authorize ingestion, source registration, OCR, indexing or summaries.
`imports/document-library-inventory.json` records file ownership only; it is not a graph batch.
Use `scripts/document_library.py` for checked copying, verification and separate library backups.
Keep the old repository read-only and existing registered copies/citation paths intact. Preserve
relative names, catalogue/history bytes and unrelated destination files. Do not execute copied
scripts, unpack embedded archives, deduplicate files or infer reviewed coverage from ownership.
Document bytes remain local/ignored; track inventory, tooling and docs. See DOCUMENT_LIBRARY.md.

## Editable groups and community plans (8 November 2026)

The user explicitly authorized permanent organization editing and working community
plans with per-member irrigation and field-level provenance. This supersedes the
historical rendering-only organization freeze and browser-write prohibition for
organization and working plans only. Source topics, relationships, findings,
source-described communities and irrigation evidence still use checked Codex intake.
Read COMMUNITY_PLANNING.md. SQLite is authoritative; use revision-checked shared
services, preserve factual identities and source editions, and never infer scientific
relationships from organization or community membership. Evidence is immutable;
new research does not overwrite baselines or active planning decisions. No profiles,
inherited values, scheduling or automatic research are introduced. Test browser
mutations in isolation and verify factual/source/media/saved-exploration fingerprints
across organization migrations. Preserve unrelated work.

## Relationship-circle exploration (8 November 2026)

The user explicitly requested a tight circle of connection topics around the centre,
superseding the universal compact-grid rule for `neighbors` scope with a live centre.
Use relationshipCircle.ts through the same scene builder. Keep unique topics and
actual factual directions/IDs, stable clockwise order, and clear card/label rectangles.
The user subsequently requested viewport-adaptive upper/lower arcs: floor(n/2) topics
above and ceil(n/2) below the centre. The later compactness request supersedes filling
the full frame: use a bounded content aspect (0.8–1.5), with the window guiding its
shape and the smallest safe radius. Keep the frame at the actual viewport ratio,
allowing empty margins. Preserve member order while reflowing on resize.
Place larger labels first, search intermediate spoke positions, and space secondary
callouts according to their measured size so dense relationships do not inflate the ring.
Spoke labels are visible without requiring selection and wrap without dropping words.
Connection-layer frames use sceneFrame with the actual graph canvas aspect ratio. Keep
the adaptive arcs centred inside that viewport-shaped frame. Resizing reflows their
positions and labels, without changing logical layer identity or creating history entries.
Adaptive layers use semantic keys with legacy geometry aliases. Persist responsive
presentation positions and the visible layer offset in place. Staged domain previews
retain their displayed arcs until Update. Share frame bounds between rendering, Fit,
layer headings and gesture tests so controls cannot drift away from the drawn frame.
Keep grouped relationship meanings and directions distinct. Parallel/secondary labels
may have explicit leaders. Other scopes and Remove centre retain compact grids.
Preserve saved cameras, offsets, closed layers and opening highlights via geometry aliases;
translate old snapshots in memory without modifying saved DB payloads. Domain previews
keep their positions. No knowledge, organization or community mutations are part of this change.
Run the frontend suite, backend integrity checks, production build and isolated browser
test:relationship-circle/test:browser. The circle fixture server and artifacts belong
under output/consolidation-qa, never the accepted database.


## Cited group guides and event-unit intake (8 November 2026)

The user authorized the reader-facing group metadata, ordered vertical members,
canonical L/plant/event displays and checked source intake described in
IRRIGATION_LIFECYCLE.md. The accepted batch advanced revision 6 to 7; the earlier
scope freezes do not prohibit this explicitly requested intake. Current preservation
fingerprints and checked source coverage are recorded in output/irrigation-audit/.
Keep source-backed guidance separate from organization and working planning values.
Generic source quantities, ranges, seasonal totals and reservoir fills cannot silently
become species-specific event doses. Preserve immutable legacy baselines; both event
and legacy watering unit spellings remain compatible. New corrections require a new
batch ID/current revision. Renderer behavior follows stored group metadata rather
than hardcoded topic identities. Preserve the unrelated rendering work in this checkout.


## Community common-name presentation (8 November 2026)

The user requested Spanish and English (no Latin name row) for plant-named
communities with available Spanish community names. Habitat records reuse stored
spanish_name/english_name metadata; the generic renderer reads those fields in
cards, lists, inspector and restored layers. Ordinary species keep ES/EN/Sci.
Do not infer collective community names or Latin association names from a plant
common name alone. Preserve generic habitat labels where no checked community
name is available. The checked naming-only batch advanced revision 8 to 9;
VERIFICATION.md and output/community-names/ record scope and preservation checks.


## Separate phase definitions from plant recommendations

The user clarified that irrigation lifecycle nodes are valid for any plant. Keep their
descriptions, aspects, directly associated findings and connection explanations generic:
purpose, L/plant/event units, timing/age concepts and monitoring, without concrete plant
or project doses. Put species/community recommendations and case quantities on their
proper community records, retaining site and age context. Project schedules belong to
the existing project/method records; never relabel general LIFE evidence as carob advice.
Use checked new batches and preserve original finding wording and immutable irrigation
evidence/working plans. Contextual community-to-phase links are curated organization of
source-backed advice, not a universal planting recipe or inherited dose for companions.

## Evidence desk community workspace (9 November 2026)

The user approved the full-window Evidence desk and source-led irrigation decisions.
Read EVIDENCE_DESK.md. Keep group organization separate. Amount/frequency/period are
read-only; explicit applicability review and source adoption precede one atomic plant
save. Use plant-plan-set with evidence IDs, never client-supplied irrigation numbers.
Preserve legacy values/baselines and immutable evidence; research and refresh never
overwrite active decisions. Keep citations, node inspection and manual research handoffs
inside the workspace without losing the draft. Test mutations only in isolated QA stores.
Branding is copied into public/branding; runtime never reads the old app. No factual
intake or database schema migration is part of this interface change.
