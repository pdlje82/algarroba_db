# Prototype two: layered knowledge browser

Approved 6 November 2026, including clearer exploration, persistent organization and independent
background effects. The updated brief and user corrections govern this implementation.

## Architecture

One offline React/TypeScript frontend, one FastAPI application and one authoritative SQLite store.
Pinned react-force-graph-3d 1.29.2 / shared Three.js 0.187.0 render the scene; fCoSE 2.2.0 calculates
candidate XY positions in disposable workers. PDF.js handles local sources; react-rnd 10.5.3
supplies the single fullscreen inspector. Continuous forces and node dragging are disabled.

Application code owns identities, expansion ownership, geometry, routes and history. The renderer
receives disposable copies. Failed/superseded layout never replaces a working scene. There is no
AI API, autonomous classification/research, browser group editor, new backend service or hosting.

Current official references: [PlaneGeometry](https://threejs.org/docs/pages/PlaneGeometry.html),
[Mesh](https://threejs.org/docs/pages/Mesh.html),
[OrbitControls](https://threejs.org/docs/pages/OrbitControls.html),
[LineMaterial](https://threejs.org/docs/pages/LineMaterial.html),
[EffectComposer](https://threejs.org/docs/pages/EffectComposer.html),
[BokehPass](https://threejs.org/docs/pages/BokehPass.html),
[react-force-graph](https://github.com/vasturiano/react-force-graph),
[fCoSE](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose).
Installed APIs and official references verified 6 November 2026.

## Centre, layers and knowledge ownership

The base map is nine stable knowledge areas independent of centre/search/perspective. Depth means
opened detail only. Logical homes are positive multiples of 520; rendering subtracts the foremost
plane's Z so new detail stays at reading distance and older planes recede. Focus normally moves
120 units ahead, with a home label/tether. Those aids are not factual connections.

Make centre collapses child groups/branches/routes and returns focus home, but KEEPS the existing
named surfaces and cached contents. A clean Centre plane opens ahead of them from the chosen
card's ordinary source layer. Back restores the complete prior exploration. Layers/Reopen restores
a retained layer's cached topics explicitly. Repeating Make centre on the current clean star reuses
its plane. A new child exploration followed by Make centre retains that child surface too.

Only recorded direct neighbours enter the centre star: 12 initially, +12, stable label-sized rings.
One spoke per neighbour retains every applicable relationship ID. Other connections among these
neighbours are initially an inspectable badge. Nursery watering has one direct neighbour, Dryland
restoration. Indirect irrigation/query results must not become direct spokes.

Search/perspective/detail keep their values during centre changes. Show results opens a separate
arrangement; changing search/perspective explicitly opens/updates it. All ten perspectives retain
meaningful native arrangements: comparison columns, multiple classifications, places, dated order,
provenance, dependency chains, ecological/technology/funding families. Centre caches are shared
across search/perspective; Flat results have independent arrangements.

Ordinary clicks inspect/focus without changing centre. Open connected topics opens detail; declared
group anchors expose Open/Collapse group. First six group members, +6 through More. Clicking an
expanded anchor closes its own contribution; shared topics needed elsewhere remain. One factual
card per identity. Thin Shared labels preserve membership/reading slots in another arrangement;
they select the same canonical card and never enter factual routes/imports.

Every relationship is accounted once: individual/route edge, inter-group aggregate or internal badge.
Unrevealed members use More or their anchor. Summaries retain constituent IDs. Complete/alternative
routes preserve existing endpoints and shared intermediates, revealing every admitted step.

Limits: direct and result endpoints share maximum48, first/+12; routes6 or explicitly8 steps,
up to3 alternatives;120 factual/display cards and240 links. Complete expansions are admitted or a
working view is retained with an explanation. Orientation labels are not factual endpoint cards.

Names: Overview / Centre · [topic] / Detail · [owner] / Results · [search] · [perspective]. One frame
per actual plane; shared headings show two names plus a count, full names in Layers/accessibility.
Numeric depths stay internal. Return to parent/earlier plane closes deeper ownership contributions,
not knowledge. Hover is plane-only (100ms entry,150ms exit,120ms fade), independent of edge picking;
cards/links take click priority, exposed borders precede nearest surfaces. Hover never changes blur,
camera, exploration or focus. Clear it during dragging/leaving.

## Geometry and camera

Cards, badges, labels, home markers and collapse ghosts are textured XY plane meshes, not
camera-facing sprites. Project the actual four corners for picking, attachment and occlusion.
Separate padded convex polygons provide route clearance. Screen rays intersect actual card planes
for world endpoints. Intra-layer paths remain on their plane; inter-layer depth follows travelled
distance. Ordinary paths use stable shallow curves; selected paths round clear detours. Full paths
replace LineGeometry atomically when capacity changes; render/picking/depth share the replacement.

Camera:25° default tilt,0° sideways;15–60° tilt,±60° sideways;upright,no rear viewing. Background drag
pans;Ctrl/Shift-drag turns; angle buttons use identical constraints. Flat is perpendicular. Fit
frames at the current angle;Reset restores default and frames. Expansion pans only enough to reveal
focus around actual HTML overlays. Resize preserves target/focal scale. Fitting, restoring, resizing,
theme changes and mode switches do not trigger semantic zoom. Zoom out closes deepest displayed
detail, then broader context. Back/Forward restore complete geometry/camera, with300ms transitions
or immediate reduced-motion updates. The minimap intersects the actual receded base plane.

## Independent background effects

`backgroundEffects.ts` stores Blur/Darken/Transparency under `kgb:background-effects:v1`, separately
from exploration. Initial values:Blur false,Darken true/.25,Transparency true/.5. Darkness0–60%.
The old bokeh preference key is preserved. Flat/unexpanded overview disable every effect.

`FrostedGraphPass` uses the existing composer and reusable half-float targets:

1. Render each older plane's content into transparent scratch buffers. An all-card alpha stencil
   masks its connections beneath labels; cards stay opaque within the layer.
2. Background cards/background-only links receive depth blur when enabled. Selected and
   background-to-front links skip that pass. Apply darkening and half layer opacity after drawing
   the whole layer; each older layer uses the same50%, never progressively multiplied by depth.
3. Composite in plane/depth order. Shader world-Z clipping compares actual displayed geometry
   against the physical front surface; focused card positions matter. Inter-layer paths interpolate
   actual depth. The finite projected plane polygon limits frosting, with antialiased boundaries.
4. Behind that finite surface, apply the extra Gaussian blur. Selected routes ALSO receive it.
   Physically foreground content is drawn last, fully sharp. HTML/PDF/inspector stay outside effects.

Depth blur1.25CSSpx per older plane,capped4; surface sigma2,6px kernel radius. Background-only
connections are blurred once outside/twice behind. Front-leading and selected links are sharp
outside, frosted behind. Empty planes never overwrite focus depth. Preserve averaged RGBA in the
Bokeh shader: the stock forced alpha1 would make transparent layer buffers opaque. Linear clear,
linear composition and OutputPass retain theme colours. Reuse/resize targets; dispose owned clones,
targets/workers/geometries/textures, never shared source assets. Failures retain a usable sharp graph.

## State and modules

Version4 state/new browser key `kgb:exploration:v4` preserves original v3/v1 storage. Contexts retain
XYZ homes, Flat XY positions, owners/planes, named descriptors, centre-session ownership, route records, visits, focus, both
camera poses, signatures, laid-out IDs, retained layer bounds/members and centre pagination/cache.
Research context includes the complete state/history and real knowledge IDs. Full matching snapshots
restore without a worker. Older saved geometry/cameras remain until explicit Make/Rebuild centre.
Centre visibility is explicit after a layer return; new child expansions do not reopen a closed
centre plane. Show centre view opens it deliberately. Returning to overview begins a fresh
organization phase so old centre depth does not leak into nested overview groups.
A new centre session invalidates old visit/owner/depth caches when another perspective/search is
revisited, retaining usable XY coordinates. The foreground-frame/depth-spacing migration is idempotent. Effect preferences/hover/fullscreen are
not exploration history; fullscreen never restores automatically.

- scene.ts: pure semantic projection, ledger, owners, named layers and direct/result separation.
- centreView.ts / organization.ts: centre transition and persistent organization projection.
- sceneLayout.ts / layoutRequest.ts / layout.worker.ts: isolated candidate placement/cancellation.
- layers.ts / layerNavigation.ts / layerHover.ts: finite surfaces, ownership returns and hover.
- cardGeometry.ts / polygonRouting.ts / connectionGeometry.ts: consistent geometry/ports/routes.
- SceneView.tsx / cameraFocus.ts / bokeh.ts: GPU objects, picking, camera and composition.
- explorationStorage.ts: pooled complete history; main.tsx/workspace.tsx: shared details/dialogs,
  independent controls, appearance/fullscreen, floating bounds and static research UI.

## Persistent groups and maintenance

The same SQLite store now has organization metadata `browse_groups`. It is not a second graph and
does not limit editing factual records. `BrowseGroup` has stable browse:ID,label,parent,anchor,
primary/shared members and maintenance_rule. Import validates IDs, references, unique primary
membership, duplicate entries and acyclic parents. Definition updates replace the whole group.
Optional browse_groups in existing batches use preview/current revision/transaction/backups;
existing batch digests remain unchanged. Migration creates a backup before DDL.

The approved seed is browse:cocoon beneath technology:irrigation, anchor cocoon, nine specific
members. Their primary browsing location is Cocoon, not duplicated flat parent entries; counts use
unique descendants. General equipment/methods/species/trials retain wider factual context. Group
membership is organizational and cannot create a factual edge or route shortcut.

Catalog/export/read-only CLI groups and research context/prompts expose current definitions/rules.
Codex Desktop must review/reconcile them before imports and reuse Cocoon for specific components,
operation/refill, limitations, requirements and findings. Still capture ALL useful supported
discoveries from inspected material across the agreed domain, including outside the task and
visible neighbourhood. Preserve checked plant identities, source spellings, conditions, units,
dates, conflicting evidence and unresolved items. Never classify/research autonomously.

Nine originals/68 selected PDF positions remain the entire ingestion scope. The original library
is read-only. No additional ingestion, project assembly, simulations, eligibility calculations or
hosting is included. User comfort approval still gates later library expansion.

## Recovery and verification

Prototype-one snapshot: data/prototype1-backups/prototype-one-20261106T121303Z.zip (376 files,
SHA256 b6af66f9c1dfc3be70317c41141d638f013503271d6fffd1e31ac532cead0889).
Before the organization/centre change: data/prototype1-backups/pre-centre-groups-20261106T212750.zip,
plus data/pre-centre-groups-20261106T212750.sqlite and the raw factual-table baseline.
Existing uncommitted work was retained in the same checkout. See VERIFICATION.md for current
checks, isolated browser data, source/fact comparisons and visual artifacts. The comfort walkthrough
covers carob communities,Cocoon,drones,AL20 and a manual research handoff with wider discoveries.

## Pending interaction revision — preference recorded 7 November 2026

When opening a group or detail layer, display all its topics at once. Remove the "More topics
remaining" node and the six-at-a-time pagination. The user chose showing all members instead of
the suggested replacement Show more button. Preserve overview-first discovery and one factual
card per shared identity. Reconcile scene-limit handling explicitly during implementation;
do not silently truncate the group or restore pagination. This is a recorded preference for the
next revision, not a change already implemented.
