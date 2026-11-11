# Architecture and exploration contracts

Current reference, reconciled 10 November 2026. The v6 workflow approved on 8 November
replaces the independent-pane and ten-perspective prototypes. Historical proposals and
acceptance logs are indexed in [Verification](VERIFICATION.md#historical-records).

One offline Windows app uses React/TypeScript, react-force-graph-3d/Three.js,
FastAPI, authoritative SQLite/FTS5 and bundled PDF.js. Dependency versions belong in
the lockfiles and [third-party notices](../THIRD_PARTY_NOTICES.md).
Read [Community planning](COMMUNITY_PLANNING.md) for the Evidence desk and revision-checked
organization services; [Sources and media](SOURCES_AND_MEDIA.md) covers managed files.

## Direct-topic circle update

The user's later circle request supersedes the original all-grid layout only for direct
`neighbors` exploration with a live centre. The centre is at the origin; unique related cards
are ordered clockwise on viewport-adaptive upper/lower arcs with clear card and label surfaces.
Odd member counts place the extra topic below: nine means four above and five below.
All central spoke labels are visible, use larger wrapped text, and preserve factual arrow
direction. Group summaries distinguish relationship wording and direction. Parallel or
secondary label callouts have explicit leader lines where needed. Labels and cards contribute
to Fit and layer bounds. Selection, zoom and turn do not change arc geometry.
The connection-layer frame matches the current graph canvas proportions. Shared
sceneFrame bounds drive its border, title and Fit. Resizing reflows topics and labels into
compact upper/lower arcs whose content aspect stays between 0.8 and 1.5. Grow their
radius only until cards and labels fit; leave margins in taller/wider frames instead
of stretching the content. Larger labels are placed first, with intermediate spoke
positions and size-aware secondary callouts. Semantic layer keys preserve offsets, closing and opening-source
references while legacy geometry aliases support older saves. Current presentation positions
are retained in the browser session without appending history or rewriting saved DB payloads.
Pending domain previews retain their displayed arcs and labels until Update.
Every active foreground layer has a theme-matched 70%-opaque background filling its
sceneFrame bounds, behind all cards, links and labels. Historical snapshots retain their
existing darkening. The surface follows layer movement and resize, does not write depth,
and does not participate in topic/heading picking or opaque-control occlusion.
The renderer uses logarithmic depth precision to prevent the translucent plane from
painting over closely spaced cards, labels or lines when angled or zoomed out.
Foreground content shares the blending queue with its backplate, which renders first;
its cards, labels and lines retain opacity 1 and depth testing/writes. This also protects
screen-space line widths at steep angles while preserving ordinary card occlusion.

Overview, search and membership retain the compact grid; removing the centre returns its
remaining neighbours to that grid. The shared builder translates saved old grids in memory,
retaining old geometry aliases, moved offsets, closed-state keys and opening references.
Pending domain previews preserve their current arrangement. No database migration or
knowledge changes are involved. `npm run test:relationship-circle` verifies the real browser.

Historical source/build recovery snapshots are recorded in the archived verification log.

## Canonical exploration

State version6 holds scope (overview/group/neighbors/search), groupId, centre, captured query anchor,
search, domain, kinds, grouping, expandedRoutes, alternatives, depth, comparison IDs,
positions, camera, revision and the accepted query snapshot. Remove centre removes its card and
attached lines and repacks the remaining cards on a deterministic grid in the same history entry.
Preserve camera, layer movement, opening source and backgrounds. The captured anchor retains the
surrounding query results for refresh and serves as the omitted former centre while centre is
null. Apply that omission after expanding routes and before grouping, so neither matching itself
nor route reveal can reinsert it. Direct topic exploration uses the relationship arcs described above;
overview, membership and search use ordinary grid slots. Reconcile older
saved positions containing a removed centre by clearing those stale slots once. Explicit scope
changes reset the query anchor to the current centre choice.

Membership opening clears inherited centre/anchor and positions, requesting complete organized
membership without an unrelated centre. Backend group queries ignore centre; scene projection
also avoids injecting it from cached old group views. Reconcile old group centre state and layout
in memory. A legitimate member remains part of membership even if it was the old exploration
centre. Historical snapshots and original saved payloads are preserved.
Selection, hover, active inspector tab, theme and fullscreen remain outside history.
An additive layerRoot flag marks a single-layer overview boundary. Return to overview keeps the
selected domain/type filters but renders no previous planes. Subsequent browsing never looks
past that boundary. A domain-filtered overview omits out-of-domain centre cards.
Changing Group by replaces the current entry in place, preserving camera/layer offset and
existing background snapshots. Opening group membership or a display group is instead an
explicit foreground exploration: its original layer remains behind it, darkened. Selection
alone still only inspects. Overview boundaries survive saved views/reloads; new group opening
can retain the new overview but cannot resurrect layers from before that boundary.

exploration.ts owns the reducer. scene.ts owns projection and deterministic packing. Only successful
queries/layouts enter history. Requests use generations plus AbortController. Graph failures retain
accepted state. History caps100, truncates its forward branch on new actions, and restores camera.

Stored groups optionally set `presentation: hierarchy` (default `standard`). Their projection
uses the same compact grid with direct members and child folders, suppressing factual links,
internal-link summaries and stale route expansions only in that hierarchy layer. Grouping is
normalized to None on open/restore and cannot override the stored organization. A child folder
also represents its anchor when that topic is an explicit visible parent member. About exposes
the canonical anchor topic and evidence without inserting it into its own membership. Ordinary
topic exploration retains real relationships. The sidebar expands the active hierarchy path;
represented-topic/research accounting deduplicates shared member IDs. No topic-specific renderer
rules, endpoint changes or saved-history rewrites are involved.

Overview and the nine root scopes now use folder presentation as well. Catalogue groups set
`catalogue: true` to declare genuine peers; this is an advisory-audit exemption, not a display
limit. `organization_review` in the catalog supplies authoritative `topic_roots`, advisory
`warnings` and read-only `pending_groups`. The frontend consumes those roots rather than guessing
from context categories. Legacy catalogs have an explicit base-category compatibility map, with
unplaced context going to review instead of a catch-all. Existing `/api/explore` group queries
accept `review:ecosystem|technology|funding`, returning current pending IDs with normal filters.
These derived scopes never enter stored group definitions or editor destinations. Older saved
views normalize in memory against the current catalog; working community workflows stay intact.

## Funding navigation and project context

An unanchored hierarchy group can explicitly set `navigation: transparent` (default `normal`).
Its children and direct members appear at its visible parent, with the same identities and evidence.
This is opt-in presentation metadata, never automatic single-child flattening. Funding structure
retains its stored ID and metadata as such a container. The shared scene builder and sidebar use
the same child projection; old group queries resolve to the visible parent. Old saved root/container
histories normalize and adjacent equivalent steps collapse in memory, retaining cameras and moved
offsets. Original stored explorations are not rewritten.

Project ideas are editable user plans, not scientific topics. `project_ideas`, `funding_reviews` and
`funding_assessments` are additive SQLite collections. `/api/projects/edit` uses the global revision
and records project versions/history separately from community edits. Checked imports own funding
reviews and curated assessments. Catalog and inspection expose them with computed `funding_state`
warnings: project version, review version and evidence-fingerprint changes require reconsideration.
Old reasoning remains stored. Availability and relevance stay independent; dates passing never
manufacture verified closure. The frontend project selector is presentation state, not a graph filter.

Topic `funding_role` and `funding_context_ids` are additive curated presentation metadata.
Inspection follows explicit transitive contexts with a visited set; neither common source editions
nor folder membership transfers an assessment. Route summaries require their own review. Reference
cards show supporting-reference labels and linked-review buttons. Framework summaries expose missing,
failed and stale project comparisons without inheriting availability. Evidence fingerprints omit
exactly these two topic metadata fields; factual topic/source changes retain normal staleness checks.

`paymentTiming` projects only the explicit first-line `Payment timing: …` heading in a review's
existing `financial_summary`. Unmarked text is unverified; no keyword/rate inference is performed.
Actual route cards use their own review, framework/folder cards link to route terms and supporting
references have no cash-payment badge. The 3D texture reserves the third summary line within the
existing card dimensions, retaining source/camera/history geometry. Payment edits are factual review
changes and therefore preserve the normal dependent-assessment staleness checks.

## Domain preview and in-place Update

State.pendingDomain is an optional staged choice; State.domain remains the applied query domain.
previewDomain changes no accepted records or query, preserves geometry/source/camera and replaces
the current history entry. Scene projection darkens only cards with no matching member or required
context; mixed-domain cards show a matching-member count. Selecting the applied domain cancels.
updateDomain accepts the staged domain, invalidates the query snapshot and clears old alternatives,
then reuses the canonical /api/explore and scene builder. Commit by replacing the same history
entry only after success. Clear old card positions and tightly repack the remaining cards using
the canonical deterministic layout. Preserve expansions that survive reconciliation, camera,
layer offset, source reference and original history snapshots. Preview/failure retain the last
working positions; successful Update persists the new arrangement. Direct neighbours use a
centred relationship circle; other scopes use the compact grid. Both layouts reserve actual
card dimensions and clearance. Failed requests retain
preview and working graph; subsequent preview choices cancel in-flight updates and reject stale responses.
In-place edits after Back discard forward history without appending a view. New explicit scope
explorations and Return to overview consume the pending domain for their new query. Route reveal,
selection and grouping do not silently apply it. Preview state is additive v6 data, retained by
saved views/research and the existing browser-storage fallback. Research filters distinguish the
applied domain from pending_domain; capture the currently displayed records.

When an accepted overview has domain All, reconciliation rebuilds its complete deterministic
grid rather than retaining slots from a smaller domain. This also repairs older scattered saved
positions on reopen/refresh. Before normalizing, recover the prior scene's layer offset and carry
it to the corrected geometry key. Preserve camera/history. Pending previews retain their current
positions. Original saved database payloads are read and normalized only in memory.

The foreground Update control sits immediately beside X. Both use the same depth-aware projected
HTML positioning/occlusion, pointer isolation and disabled/loading behaviour; a toolbar fallback
covers off-screen headings. Remove Update when there is no pending domain.

## Query model

GET /api/explore accepts scope, group_id, centre, search, domain, comma-separated kinds, depth6/8.
It returns canonical nodes/edges, endpoint_ids, matches, passages, routes, notices, revision and
route_search completeness. Endpoints are filtered; centre/intermediates remain context. Searches
never add unrelated domain support branches. Organization and non-traversable classification hubs
never shorten factual routes. Direct-neighbour and membership scopes are complete without display caps.

GET /api/routes accepts centre/target/depth and returns at most3 bounded simple routes. It shares
Graph.traverse with exploration. A10000-expansion work budget reports budget_exhausted explicitly.
GET /api/comparison accepts up to4 topic IDs, returning original aspects and source/trial context.
No legacy /api/view or old perspective-generation implementation remains.

## Single scene and renderer

Foreground cards have one live representative per identity. Group summaries and internal lists
retain real factual IDs; abbreviated routes remain display objects. One expanded-route set powers
individual and all-route reveal. One grouping control governs foreground organization.

At most2 previous distinct graph states are rebuilt from history as snapshots, separated by1560
world units. Their cards are opaque and darkened65%, with Previous view labels. Background facts
are excluded from picking and factual/research accounting. Labels alone support presentation-only
XY dragging. An additive layerOffsets map in v6 state stores world-XY offsets by stable graph key;
content identity, local card positions and plane Z do not change. Escape/cancel restores the move.
Label drag captures the pointer and disables camera controls; Ctrl/Shift takes rotation priority.

SceneView uses the existing react-force-graph-3d/Three renderer with an empty force dataset and one
owned scene group. Ordinary meshes, straight Line2 segments and depth testing replace postprocessing.
Textures use sRGB. Retired resources are disposed. Camera gestures are pan by default and rotation
with Ctrl/Shift. Default tilt25; both tilt and sideways are allowed from -60 to +60. Zoom never invokes semantic changes.
Camera transitions take 600 ms, or zero with reduced motion. There is no Flat camera or automatic force solver.

## Highlighting opened source nodes

openedFrom stores the source layer key/card ID as v6 presentation state when a topic/group
opens. Visible child layers mark exactly those cards in their source background layers; legacy
sessions infer a matching topic/group representative when no explicit reference exists. Only
marked background cards retain full brightness and an accent outline. Other cards, lines and
headings retain background darkening. This is independent of selection and never changes source
geometry, factual identity, source picking, depth ordering, history count or research accounting.
Closing a child removes its highlight; a visible multi-layer chain retains each surviving origin.

## Focused member layers

Group members may be a stored organization/root or the exact membership captured from a grouped
view card. groupMembers stores that stable source set; domain/type filters select current
endpoints within it. A virtual groupId records grouping dimension/key (display-group:type:event,
family or place) and resolves its heading from stored names/kinds. Opening a grouped card clears
old expansions, centre/search and local positions, defaults grouping to None, and queries exact
members through the same GET /api/explore with member_ids. Return canonical topics and factual
edges whose endpoints both belong to the selected result; never create organization/factual
records for display membership. Type groups reject mismatched kinds; missing IDs produce notices.
Grouping, domain Update, reload and research preserve captured member IDs and knowledge revision.

The old cumulative toggleGroup and Collapse controls are removed. On activation, translate an old
expandedGroups snapshot's last card into the focused scope using the parent grouping's actual
member IDs, without mutating its original payload. Preserve source/camera/layer offset/history;
repack the focused layer. Read-only historical snapshots can still represent their original
mixed display with the shared scene builder. Back activates and translates those scopes in turn.

## Place membership and restored layout validation

The place key is the place record's own ID or another topic's first explicit place_ids entry,
resolved through identity redirects. Missing annotations map to unrecorded. Referenced IDs without
a current place record display Place unavailable rather than falsely appearing unrecorded.
Do not infer new geographic facts from labels, paths, document co-occurrence or generic links.
The focused-place query applies this same rule to captured IDs, removing members assigned to a
different place. Return group_member_ids before domain/type filtering; reconcile captured source
membership to that validated set so stale IDs disappear without losing filtered-out valid members.

Focused ungrouped member scopes validate their saved positions against complete compact grid
geometry. Preserve a valid grid exactly, including across reload/Back; clear scattered, missing
or mixed positions and repack with the shared layout. Preserve old camera/layer offset when the
geometry key changes. Pending previews retain positions. Read current canvas dimensions after
async loading for layout, avoiding a stale startup aspect ratio. Original saved payloads and
factual data are not rewritten by these in-memory repairs.

## Group double-click shortcut

Group nodes accept a native double-click as an explicit Open group action. Two valid unmoved
clicks must hit the same eligible record in the same active scene. Track this transient click
identity outside history; then use groupOpeningAction/openGroup, shared with inspector/topic-list
buttons. Overview groups open complete stored membership; other grouped cards open an exact
member-ID scope with Group by None. Single clicks still inspect immediately. Ordinary topics have no Open group
action. Ignore darkened/history content, busy state, HTML controls, modifiers and invalid/draggable
clicks. Clear the click sequence after opening so each gesture commits only one exploration.

## Hover and domain-disabled nodes

Clickable foreground cards have a transient accent hover frame and pointer cursor. A hollow
rectangle mesh around the card preserves its entire text/body even at limited depth precision;
ordinary depth testing still lets nearer content occlude it. Hover has no history or selection.
The shared scene interaction policy disables cards marked outOfDomain and their attached links,
and gates inspector/topic-list selections as well. Disabled list buttons have no hover style or
keyboard focus. Clear a current selection if preview excludes its card. Cancellation restores
eligibility. Preserve disabled/background surfaces in the nearest-hit raycast to block selecting
or dragging content behind them. Frame updates follow pointer, camera, scene and theme changes;
clear on leave, gestures, loading and scene disposal. Historical cards have no hover frames.

## Closing layers

Close controls respect layer depth. Project opaque card and text surfaces through the current
camera, clipping to the camera frustum, and test their overlap with the entire 28px button. Hide
the whole control on any overlap by a nearer layer, including partial edge overlaps. Hidden
controls are excluded from pointer and keyboard targets. Process close buttons from front to back
so nearer buttons also hide overlapping farther controls. Update during camera/layer movement,
resize and fullscreen; retain the toolbar fallback.

Keyboard-accessible HTML Close layer buttons follow the actual projected 3D headings during
camera/layer movement. Their pointer events are separate from label dragging and node selection.
The toolbar provides a foreground fallback for off-screen headings. Base overview close is disabled.

closedLayers is additive v6 presentation state. Hide only the requested background snapshot after
choosing the two historical candidates; do not pull an older view into its place. Foreground close
restores the nearest visible predecessor (including offsets) in one history step, preserving the
closed original entry. Without one, return to the selected-domain single-layer overview. Reopening
an exploration explicitly clears its matching close marker. No factual or organization data changes.

## Persistence and handoff

Sessions use kgb:exploration:v6 and an IndexedDB mirror. Legacy keys remain untouched. migration.ts
reads legacy pooled histories and last active scope/positions; it contains no executable old viewer.
Old saved database payloads and research files remain immutable until the user explicitly saves a new
view or edits a task. Evidence/Time/Comparison migrate to panels; other perspectives map to filters/grouping.

New research captures foreground context only, including exact factual IDs, routes, sources, filters,
grouping, revision and version6 state/history. The existing manual prompt workflow and ingestion
boundaries remain. Rendering/presentation changes do not authorize factual or organization edits;
checked intake and explicit user organization edits use their separate maintenance services.


## Grid layouts, ordered members and compatibility

Overview, ordinary membership and search layers, including grouped cards and
read-only snapshots of those scopes, use compactGrid. Direct-neighbour exploration with a
live centre uses the adaptive arcs above; removing the centre returns the remaining cards to
a grid. An ungrouped folder with `member_layout: vertical` follows its stored member order
in one column. In grid scopes the centre is a semantic designation on an ordinary card,
not a reserved coordinate. The scene builder checks the complete visible
card set: reuse an already compact saved grid exactly, otherwise repack all cards in deterministic
order. Route reveal/hide, filtering and other membership changes therefore fill holes instead
of appending scattered fallback slots. Turning and zoom do not move local positions. Resizing
and fullscreen preserve healthy grid slots and reflow responsive arcs. Pending domain previews
keep the complete working layout until Update succeeds.

Older ring/scattered positions normalize on render/reopen without editing original saved database
payloads. A previousKey presentation alias derives from the original complete saved geometry;
use it when resolving prior layer offsets, closed history snapshots and opening-source references.
Foreground preparation carries the old offset to its corrected geometry key while preserving
camera/history. No extra state format, layout engine or API is introduced. compactRings and the
collision-fallback placer are removed. Verify with npm run test:tight-layers plus the full browser
walkthrough.


Mouse drag sensitivity is shared in interactions.ts as DRAG_SENSITIVITY=0.125. Apply it to
ray-plane label displacement, TrackballControls panSpeed and custom Ctrl/Shift rotation deltas.
A full viewport of custom rotation now means 22.5 degrees before the existing +/-60-degree clamps.
Keep the four-pixel drag threshold, pointer cancellation, saved offsets and 25-degree reset.


Timed transitions use the common camera move helper: framing a new exploration without a saved
pose, Fit, Reset view, zoom buttons and angle buttons take 600 ms. Reduced
motion uses zero duration. Saved camera restoration stays immediate. Trackball controls use
staticMoving=true to stop camera motion with the pointer rather than adding inertial drift.
Refresh the Trackball canvas dimensions after layout/resize so pointer deltas are measured
against the real graph viewport rather than the renderer's initial canvas dimensions.
Layer content changes, grouping, route reveal/hide, hover, themes and panels have no timed
fade/slide/layout animation; their updates are immediate. Do not introduce extra effects.


## Species names on canonical topic records

Species naming is stored in SQLite as separate nullable spanish_name, english_name and
scientific_name fields. Naming-only corrections retain existing topic identities and do not
change organization, ecological relationships or trial claims. name_status marks
recorded, source-spelling and genus-only concepts; name_note and HTTPS name_references preserve
provenance and uncertainty. Two unresolved source-spelling records retain null common names.

One speciesNames helper supplies ES/EN/Sci rows to the graph canvas, inspector and accessible
list. Scientific text is italic; wrapping and font fitting keep all rows above status/research
badges within unchanged card dimensions. Named plant communities show ES/EN without a Latin
row; generic habitat labels remain generic. Other non-species cards retain their layout. Cached
history keeps its membership/positions while species name metadata resolves from current catalog
IDs. FTS indexes the three stored fields alongside legacy aliases. Research contexts include
names/status/notes/references by stable ID, and prompts include names/status. Original saved
payloads/source files remain unchanged. Naming URLs supplement PDF citations without expanding
the accepted PDF-page ingestion or adding ecological assertions. Verify with npm run test:species-names.


## Source viewer isolation and rebuild resilience

A delayed import of a hashed PdfPanel chunk failed after rebuilds removed the chunk referenced
by an already open tab. The rejected React.lazy import had no error boundary and unmounted the
whole app, producing an empty black window. Server logs showed the old-asset 404; a real-browser
fault injection reproduced an empty root. PdfPanel/PDF.js now ship in the main bundle. The PDF
worker/fonts/document still load only when a source is opened; no obsolete viewer chunk request
is made on first source click. This trades an approximately 135-kB gzip startup increase for a
single reliable viewer implementation.

PdfBoundary contains unexpected viewer render/effect failures in a closable panel, with Retry
source and an original-PDF link. Ordinary PDF errors also expose Retry source. Abort/destroy
cleanup ignores late completions and expected cancellations. Repaint waits for the previous
cancelled render task to settle before assigning canvas dimensions or reusing the canvas; only
the active task commits rendered-page/status. The graph, camera, selection, saved exploration,
knowledge revision and source/ingestion metadata remain unchanged. The focused browser suite
covers exact citations, actual rendered pixels, registered editions, retries and forced failures.


## Plant media intake

The 8 November plant intake extends the existing source registry with managed PDF/image/web
records and a separate SQLite plant_images collection. Media never becomes factual graph edges.
Catalog/inspection/exploration enrich species with current public image metadata; restored scenes
resolve it from canonical topic IDs. Cards remain 234×124; async artwork changes only their canvas
texture. See [Sources and media](SOURCES_AND_MEDIA.md) for storage, endpoints, source contracts,
evidence scope and recovery. Current check commands are in [Verification](VERIFICATION.md).
