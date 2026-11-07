# Project instructions for Codex Desktop

The current prototype brief and README.md govern this project. The user confirmed one local
Windows browser app: React/TypeScript, react-force-graph-3d 1.29.2 and Three.js 0.187.0,
Python/FastAPI, SQLite, and PDF.js. Prototype two was approved on 6 November 2026.
Cytoscape/fCoSE 2.2.0 calculates XY placements off screen in a disposable worker; it is not
the interactive renderer. react-rnd 10.5.3 supplies the single fullscreen inspector. Hosting,
additional library ingestion and peripheral project/simulation tools remain later work.

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

## Implementation

Keep all ten perspectives on the same identities. Positions, transient display memberships,
abbreviated spokes, research markers and history are interface state, not new knowledge.
Keep centre/search visible, preserve working views on failure, and make navigation reversible.
Run proportionate backend integrity and headless graph checks plus browser checks for interactions.
Do not overwrite the user's existing brief or EPUB edits. Do not publish or expand the corpus
before the user's separate confirmation of demonstrator comfort.

## Prototype two rendering

Read PROTOTYPE_TWO.md for state and renderer contracts. The overview is a stable XY base map;
Z means opened detail, never evidence strength or subject category. Keep application-owned
coordinates, ownership and route IDs authoritative. Disable continuous forces and node dragging.
Layered and Flat use the same Three renderer with independent cached layouts and cameras.
Logical homes stay stable; the layered display subtracts the foremost ordinary plane's depth,
keeping new detail at the reading plane while the overview recedes. Cameras use this foreground
frame. Preserve the idempotent presentation migration and expansion return steps in snapshots.
Back to parent/Earlier layers close ownership contributions, never delete knowledge or shared
cards still needed by an earlier expansion. Minimap rays intersect the actual receded base plane.
Clicking/expanding a topic or group pans it toward the usable graph centre, excluding actual
inspector/control bounds. Keep homes, angle and zoom intact; do not recenter on history/mode
restoration, theme changes, resizing or click-to-collapse.
Empty layer surfaces/borders highlight on hover and return to that depth on click, folding all
deeper expansions. Preserve card/link picking priority, drag-to-pan and keyboard Layers controls.
Keep cached deeper members folded under layerCeiling until an explicit new reveal; summaries
must still account for hidden members, and displayed routes must remain complete.
Internal same-representative relationships use inspectable card badges, not aggregate self-loops.
Count real IDs exactly once across links and internal summaries; preserve aggregate IDs on restore.
Replace complete LineGeometry atomically when segment counts change. Render/depth proxies must
follow replacements; do not modify Three's private capacity cache. Clip at actual card borders,
keep routing clearance separate, and interpolate inter-layer depth by distance along the path.
Draw one labelled frame per real plane; group headings must not introduce competing rectangles.
Layer hover uses its own plane-only hit path (100ms entry/150ms exit/120ms fade), independent of
card/link click priority. Hover never changes blur, camera or exploration. Clear it during dragging.
Cards/badges/headings are XY-oriented plane meshes. Route/pick/project the same actual card
quadrilaterals, using separate padded obstacles. Keep intra-layer links on their plane.
Depth effects use per-layer half-float buffers, depth blur, independent darkness/half opacity,
then physical world-Z clipping and a finite-plane frosting mask. Selected and front-leading
connections skip depth blur but receive frosting behind the surface. Foreground stays sharp.
Empty surfaces never stamp focus depth; stencil lines behind card shapes. Preserve averaged RGBA
in the Bokeh shader; its stock forced alpha one is unsuitable for transparent layer buffers.
Blur/Darken/Transparency are independent preferences (default off/on25%/on50%). Flat and the base
overview stay sharp. Dispose owned resources without disposing shared graph assets.
Pass disposable data to the renderer. A card, group, tether, plane, evidence projection or research
marker is a view object, never permission to invent a factual topic or relationship.
Keep unrelated connections faint on selection and all card backgrounds opaque. Use 300 ms
transitions or immediate reduced-motion updates. Resize, theme, fitting and state restoration
must never cause semantic zoom/collapse. Preserve original v1 browser storage during migration.
Before replacing this architecture, retain the local prototype-one snapshot listed in
PROTOTYPE_TWO.md. Do not alter the authoritative database to accommodate a renderer change.


## Permanent browsing organization and v4 centre views

- Read `python -m backend.cli groups` and current rules before importing knowledge. Reuse the
  Cocoon identity/group for specific components, operation/refill, limitations, requirements and
  findings. Shared equipment/general methods keep their wider context. Capture other useful
  in-domain discoveries too; membership never implies a factual relationship or route shortcut.
- Optional `browse_groups` changes use the same checked batch, base_revision, transaction and
  backup process. Keep stable IDs, primary/shared membership, valid anchors/parents and an
  acyclic hierarchy. The approved metadata migration is intentionally an organization change;
  renderer work alone must not change facts. Never edit the old source library.
- Make centre collapses child expansions but RETAINS named layer surfaces and cached contents;
  open the clean direct-neighbour star ahead of them from the selected topic's ordinary layer.
  Preserve full Back history. Immediate repeats reuse the current clean centre plane. Reopen
  retained layers explicitly. Search/perspective results occupy separate arrangements.
- Shared topics keep one factual card; thin Shared labels are orientation aids, excluded from
  factual IDs. Root XY caches remain independent of search/perspective. Keep endpoint/scene
  budgets, route ownership and meaningful perspective ordering.
- State v4 uses a new browser key, preserving v3/v1. Legacy geometry remains until explicit
  Make/Rebuild centre. Effects/hover/fullscreen remain outside exploration history. Camera
  limits are tilt15–60 degrees, sideways +/-60; default25/0; Flat perpendicular. Ctrl/Shift-drag
  gestures and angle buttons use the same limits. No roll or continuous force simulation.

Centre sessions invalidate stale owner/visit/depth caches across search/perspective contexts while
retaining usable XY homes. Returning to overview starts a fresh phase; a closed centre plane stays
closed during new child expansion until Show/Make centre. Include centre visibility/session and
retained surfaces in scene invalidation dependencies. Keep inspected evidence when Make centre
uses the already selected identity; resetting it without a refetch would lose findings/actions.

## Pending user preference — 7 November 2026

For the next interaction revision, opening a group/detail layer should show all its topics at
once, without a More topics node, pagination or a replacement Show more button. See the pending
revision in PROTOTYPE_TWO.md. This note does not itself authorize implementation now.
