# Demonstrator verification — 6 November 2026

The complete demonstrator is implemented locally. User acceptance of browsing comfort is the
next step; the remaining source library has not been ingested and nothing has been hosted.

## Selected knowledge

- Nine exact original editions verified against SHA-256 and total PDF page counts.
- All 68 selected one-based PDF positions inspected and recorded individually.
- 281 topics, 329 meaningful relationships, 140 findings/source-guidance records.
- 19 explicit source uncertainties or incomplete areas retained with their references.
- A repeated real bootstrap returned **unchanged** at knowledge revision2, with no duplicate records.
- Original PDFs, the updated brief and companion EPUB were not changed by implementation.

The ecology, water/drone and funding batches cover18,31 and19 pages respectively. Funding's
seven image-table pages were read visually; important scientific tables and diagrams were
checked visually. All useful in-domain observations encountered were curated, including plant
biology, other trial species, soil organisms and AL30 territorial context beyond the starting
user questions. Cross-source records share stable IDs and meaningful connections.

## Automated verification

`python -m pytest -q`: **13 passed**. Covers exact coverage, evidence references, safe repeat,
invalid/stale imports, rollback during a failed transaction, all ten perspectives, anchor/search
preservation, route bounds and cycle avoidance, excluded provenance/classification shortcuts,
method-specific comparison values/missing data, unknown terms, branch reveal, multilingual
aliases/accents, saved state, edited/idempotent research handoff, stale identity reconciliation,
wider-graph additions, source access and original-file integrity.

`npm run test:layout`: **17 passed**. Covers nine opening groups/three areas, valid unique bounded
networks for all perspectives, complete unfolding with one shared intermediate identity, pinned
endpoints, reversible group reveal, separate research indications, and updates within the same
viewer without stale edge endpoints or obsolete layout flags.

The added checks run fCoSE on all ten perspectives, verify stable endpoints, non-overlapping
group frames across successive openings and More topics, reversible collapse, and bounded
canvas sizes. They check relationship accounting through partial groups, both theme palettes,
at least 4.5:1 topic-label contrast, panel clamping, rejected invalid coordinates, and selected
connection detours around unrelated cards with the original relationship identity retained.

`npm run build`: TypeScript check and production build passed. PDF.js fonts, CMaps, workers and
decoders are bundled locally. Installed dependency licences are inventoried with their notices.

## Browser walkthrough

Completed through the actual interface at desktop and narrow panel sizes, using an isolated
test database for saved views/research records:

1. A combined landscape appears before search; its species group opens and Carob tree can be
   selected directly from the canvas.
2. Searching Drone keeps Carob tree as centre. Technology and Funding retain the search;
   all other perspectives were exercised with the same centre/search visible.
3. The Carob→restoration→monitoring→drone-imagery→Drones route unfolds with source-backed steps.
   Full mode and the connection inspector work together; shared nodes use one identity.
4. An IRR-003 link opened PDF position84 in the bundled viewer. FUND-004 opened position15;
   its image table rotated to readable orientation. Viewing did not ingest extra pages.
5. Back/Forward restored the previous perspective. A saved exploration restored Drone search
   and full-route mode. Zoom out returned to Landscape while retaining the centre/search.
6. An unmatched search retained the centre and displayed a useful missing-knowledge message.
7. The research panel captured that context, accepted a custom soil-microorganism topic, kept
   Library only as default, generated a static prompt, preserved a manual edit, and copied/saved
   the prompt and structured context. No research was dispatched.
8. Selecting Kermes oak from carob's connected-topic list opened its branch without recentering.
   Refresh retained the same exploration and selected topic.
9. The local Windows launcher starts a hidden server, recognizes an already running instance,
   and stops only this project's server. Knowledge persisted across actual server restarts.

## Graph and workspace update — 6 November 2026

Pinned free/community additions: Cytoscape fCoSE 2.2.0 for placement and react-rnd 10.5.3 for the
floating inspector. Layout candidates are computed in a disposable local worker; superseded
work is cancelled. Application state retains group/route meaning and history. Selected edges
use Cytoscape's segmented routing to detour around unrelated topic cards. Other edges remain
faint while the selection is active. Group summaries retain their constituent relationship IDs;
undisplayed members connect through More topics. No backend or ingestion code changed.

Actual browser verification used the isolated `data/graph-ui-qa.sqlite` for saved-view writes:

- All ten perspectives completed with Carob as centre and Drone as search, without browser
  errors. Back/Forward and source-backed route unfolding worked.
- Light, Dark and the initial System theme rendered successfully; dark persisted across reload.
  The source viewer retained the original white PDF page and coloured content.
- Fullscreen removed the branding/sidebar and retained the controls. Escape and the exit
  button restored the docked inspector. Zoom buttons remain clear of the default panel.
- Mouse dragging and corner resizing changed one floating panel; keyboard move/resize worked.
  Clicking Carob on the canvas updated the same panel without changing its bounds. Close,
  same-topic reopening and Reset position worked. At a 1000×720 viewport the panel stayed
  entirely inside the workspace; source and manual research dialogs appeared above it.
- Saved snapshots before/after fullscreen and theme changes had identical node positions and
  zoom, with **0.0 model-unit error** in the world location at the viewport centre.
- Reopening a saved view restored centre, search, perspective, detail, expansion, selection,
  positions and camera exactly. The independently selected dark theme remained active.
- Cocoon comparison and AL20 funding opened their existing findings and source references.
  Four zoom-out steps from AL20 detail restored Landscape with AL20 and Funding retained.
- Final close-up verified the highlighted Carob→restoration→monitoring→drone imagery→Drones
  route detoured around the intervening Cocoon card. Final browser error/warning log was empty.

Production SQLite remained at 281 topics and 329 relationships, with no test saved views.
Read-only integrity check returned `ok`; foreign-key check returned no violations. The backend,
accepted imports, specification and EPUB have no changes from this update.

Earlier saved view formats retain their exploration context; their coordinates are regenerated
on opening because card geometry changed. New-format complete snapshots restore directly.
Save an adapted older view to retain the new coordinates. Dense general views can still have
line crossings; the selected path and its complete inspector make individual routes readable.

Local visual records: `output/graph-expansion-before.jpg`, `output/graph-expansion-after.jpg`,
`output/graph-routes-before.jpg`, `output/graph-routes-after.jpg`,
`output/knowledge-browser-fullscreen-dark.jpg` and `output/dark-source-fullscreen.jpg`.

## Deliberate boundaries

Funding availability remains unchecked. Observed plant accompaniment is separate from planting
benefit; citrus canopy spraying is separate from carob establishment irrigation; source-summary
and dated trial-table scopes remain distinct. Missing information is not evidence of impossibility.

The app uses stored knowledge and static manual Codex prompts. There is no AI API integration,
autonomous research, project editor, simulation, eligibility/scoring calculator or hosting.


## Prototype two: layered 3D, 6 November 2026

The second prototype replaces the interactive Cytoscape renderer with react-force-graph-3d
1.29.2 and Three.js 0.187.0. fCoSE 2.2.0 remains in a disposable XY-layout worker. The prototype-one
source/build snapshot and SHA-256 are recorded in PROTOTYPE_TWO.md.

### Automated and integrity checks

- Production build and TypeScript check passed. The local JS bundle is approximately 2.29 MB
  before gzip; Vite emits its ordinary large-chunk advisory. No external runtime assets are required.
- **42 graph checks passed:** 17 baseline projection/layout/theme/routing checks and 25 layered
  scene/state checks. They cover independent Plane 0, all perspectives, shared ownership,
  six/+six expansion, relationship accounting, complete routes and pinned XYZ endpoints, focus
  geometry, both mode caches, additions made in Flat, direct v3 restoration without a Worker,
  cancellation/termination, actual fCoSE candidate placement, research gaps, limits and legacy state.
- **13 backend regression checks passed.** The existing Starlette/httpx deprecation advisory
  remains; there were no failures. No backend/API/schema changes were made.
- `npm ls three` confirms one shared Three.js 0.187.0 installation. All direct npm versions are
  pinned; npm audit reported zero vulnerabilities. 131 installed npm licence entries and their
  available licence texts were refreshed.
- All nine originals were accessible and matched their registered SHA-256 editions. The selected
  scope remains 68 PDF positions. Production SQLite returned integrity `ok` and no foreign-key
  violations: 281 topics, 329 relationships, 140 findings/guidance, 68 coverage rows, zero test
  explorations and zero research tasks.

### Browser observations on this Windows computer

Browser writes used `data/prototype2-ui-qa.sqlite` at localhost:8766, separate from production.
The isolated database contains eight QA explorations and one prepared manual research task.
Its source content is the same nine-document corpus. No proposed research was executed.

- WebGL rendering and immediate card picking worked, with continuous physics and node dragging
  disabled. A clicked Drones card moved forward while Carob remained the centre. Shared topics
  stayed single cards. Opening topic detail and alternative routes demonstrated three and four
  detail levels without continuous scattering or duplicated identities.
- All ten perspectives were exercised in Layered and Flat with Carob/Drone controls preserved.
  No-centre Sources exposes all nine editions; FOREST-002 expands into findings and opens its
  first curated page 13. Time exposes ordered years and Undated; zoom-out restores the base map
  while retaining the Time control. Families, places and dependencies have grouped entry points.
- The full Carob → Dryland restoration → Restoration monitoring → Drone restoration imagery →
  Drones route exposed all five topics and four relationships in the inspector. Two additional
  complete alternatives unfolded. Selected connections remained traceable against faint context.
- Three-forcegraph assigns link objects drawing priority 10. Cards now have their own priority-20
  groups, with opaque surfaces, so links cannot show through their text. Picking rechecks the
  actual click ray and prioritizes cards over links, avoiding stale hover hits. Active routes
  detour around projected card rectangles after geometry/camera changes.
- Flat/Layered round trips restored homes and camera values exactly. Opening nine additional
  items in Flat retained every pre-existing layered home on return. Complete saved-view reopening
  also had **0.0 world-unit position/target error and 0.0 focal-scale error**.
- Before/after fullscreen and theme snapshots had identical homes, camera pose, target and focal
  scale. Gentle turning and Reset worked. Back/Forward and reload restored the current exploration.
  Explicit zoom-out from AL20 detail reached level 0 while retaining AL20 and Funding.
- One inspector supported native mouse dragging/corner resizing, keyboard movement/resizing,
  Close/reopen and Reset. It stayed inside a smaller workspace. Viewport clamping is temporary,
  preserving the preferred bounds when room returns. Source open/close retained panel position
  and size exactly. A topic/connection update resets content scroll without moving the panel.
- Fullscreen retained controls and permitted Escape/Exit. Source and research dialogs stayed above
  the graph/panel. System/Light/Dark remained independent of the view history.
- PDF 130 of FOREST-002 finished rendering with original white paper, photographs and table
  colours in dark mode. Page locators, rotation and zoom were exercised. Loading now distinguishes
  edition loading from actual page drawing; exact-page readiness is exposed for reliable checks.
- Manual research preview/save retained v3 scene/history, actual constituent relationship IDs and
  Library only scope. Its static prompt explicitly required useful in-domain discoveries outside
  the original task and connections beyond the visible graph. Two-existing-topic and new-term
  research focuses were previewed without creating established knowledge.
- The comfort walkthrough covered Carob plant communities (centre retained), Cocoon comparison
  with its 26 inspector findings and explicit source-scope qualifications, Drones' monitoring vs
  citrus-spraying evidence, and AL20's dated budgets/conditions. Unknown/missing-content research
  entry points remain available. Final browser warning/error logs were empty.

### Visual records and remaining limitations

Prototype-one examples remain in `output/graph-expansion-before.jpg`,
`output/graph-expansion-after.jpg`, `output/graph-routes-before.jpg`,
`output/graph-routes-after.jpg` and `output/knowledge-browser-fullscreen-dark.jpg`.
Prototype-two examples are `output/prototype2-layered-route.jpg`,
`output/prototype2-foreground-focus.jpg`, `output/prototype2-flat-view.jpg` and
`output/prototype2-dark-source.jpg`. The JSON verification record contains their hashes.

Depth can still produce card occlusion and crossing connections in dense views. Gentle turning,
zoom, Flat and the complete route inspector remain useful reading tools. This prototype requires
WebGL 2; an error boundary/context-loss handler preserves HTML controls and offers a graph retry.
Forced GPU-context loss was not tested. No hosting, extra ingestion, project assembly, simulations,
eligibility calculations, AI API or autonomous research was introduced. The user's comfort
judgement remains the separate gate before expanding the library.

The final fast-interaction pass also confirmed that a typed, unsubmitted search survives a graph
refresh/perspective change. The opening guidance and Visible topics control sit above the base-map
cards. Inspector bounds remained byte-for-byte equal across a fully rendered source open/close.
The main app was left at localhost:8765 with Layered mode, Combined overview, no centre and an
empty search. The temporary QA server was stopped; the ordinary local app remains running.


### Stronger depth follow-up

Layer spacing is now 520 rather than 260 world units; foreground focus is 120 rather than 24.
Existing v3 caches migrate depth once, preserving XY coordinates, Flat layouts/cameras, ownership,
camera angle and focal scale. The migration is idempotent and leaves the original input intact.
Production build and 43 graph checks passed (17 baseline, 26 scene/state). Browser comparison
confirmed a larger foreground card and stronger separation; Flat/Layered preserved Carob, Drone
search, selection and the 25° camera angle, with no console errors. The overview itself stays on
one plane until detail is opened. Local before/after images are
`output/prototype2-depth-before.jpg` and `output/prototype2-depth-after.jpg`.

### Foreground workspace and parent returns follow-up

New detail stays at display Z=0; a focused card normally sits at Z=120. Older layers and the
overview recede by 520 units per detail level. Logical XYZ homes remain stable; the camera uses
the foreground frame. Old saved cameras migrate once, with Flat caches and angle/focal scale
preserved. The minimap footprint intersects the actual receded overview; clicks pan only XY.

- **52 graph checks passed:** 17 baseline and 35 scene/state checks. New checks cover fixed
  reading depth, the smaller receded overview, exclusive/shared ownership on parent return,
  batched route returns, earlier-layer jumps, additions while full routes are open, idempotent
  camera migration, Flat coordinates and cached focus depth after general zoom-out.
- Production build/TypeScript passed. The existing large-bundle advisory remains.
- **13 backend checks passed**, using temporary databases, with the existing Starlette/httpx
  deprecation advisory. No backend, API, schema or factual knowledge changes were needed.
- Read-only production integrity check returned `ok` and no foreign-key errors. Counts remain
  nine sources, 68 coverage rows, 281 topics, 329 relationships, 140 findings, zero saved
  explorations and zero research tasks. No browser saves or research writes were used this turn.
- In the Windows browser, opening Species & companions showed level 1 / overview Z=-520;
  opening Carob's connected topics showed level 2 / overview Z=-1040. Back to Carob returned
  to level 1 with the group and Carob retained. Returning through Earlier layers closed both
  expansions to the nine-card overview, and history Back restored all 22 detail cards.
- Parent return retained 25° tilt and a tested 10° sideways turn. Reload preserved return
  controls and the turned viewpoint. Flat/Layered switched without losing the exploration,
  and returning to Layered restored its angle. Legacy full routes also returned as one batch.
- Fullscreen used one inspector; Back to parent kept its Carob content while geometry closed.
  Enter/exit retained the working view. Final browser warning/error logs were empty.
- Matched screenshots: `output/prototype2-receding-overview.jpg` and
  `output/prototype2-return-parent.jpg`. The ordinary app remains open at localhost:8765 with
  Carob, Combined overview, empty search, two detail levels and Back to Carob tree available.

Dense views can still contain card occlusion and crossing connections; Flat, gentle turning
and the inspector remain useful. The source library and curated ingestion scope are unchanged.

### Click-to-collapse follow-up

Expanded topic cards and open group headers now toggle their own expansion closed on a second
click. A popped-out topic without an open branch returns to its ordinary home. Other branches,
shared identities, the centre and inspector findings stay available. More topics and unexpanded
children keep their existing actions. Card captions and Visible topics indicate the fold action.

- Production build/TypeScript and **57 graph checks passed** (17 baseline, 40 scene/state).
  Five additional checks cover group close/reopen coordinates, branch-local collapse in Layered
  and Flat, focus-only folding, children/More, input immutability and independent shared owners.
- Windows browser: actual canvas clicks on expanded Carob changed 22 cards / detail level 2
  into 16 cards / level 1. Species & companions stayed open. The inspector retained all 29
  findings. Repeated focus-only clicks returned the card home and brought it forward again
  without dropping findings. Clicking an open group header through Visible topics reached
  the nine-card overview; clicking it again restored its six topics and More representative.
- The full-screen canvas click used the same action, retaining one inspector and the camera
  angle. Before/after screenshots are `output/prototype2-card-toggle-before.jpg` and
  `output/prototype2-card-toggle-after.jpg`. No backend or knowledge changes were made.

### Active-card centring follow-up

Clicking a new topic or expanding a topic/group now pans it toward the centre of the usable
graph workspace. The largest free rectangle accounts for actual controls and the floating
inspector, including its saved position/size. Camera and target move together in the screen
plane, preserving angle, zoom, projected card scale and canonical homes. Geometry and pan use
the same 300 ms transition (immediate with reduced motion). Collapse and view restoration do
not force centring.

- Production build/TypeScript and **63 graph checks passed** (17 baseline, 46 scene/state).
  Added checks verify the actual Three.js projection after a tilted camera pan, unchanged
  camera direction/focal depth, clearance from moved inspectors/controls, centring when an
  already focused topic expands, group opening and suppression on collapse/restoration/modes.
  Camera frames are tagged with their actual exploration/mode so a late Flat frame cannot
  replace a Layered camera. Saving a current pose retains newer independent camera caches.
- Windows browser: clicking the off-centre Maysara trial card moved it into the usable centre
  while Carob stayed the knowledge centre. Expanding that same topic in fullscreen opened
  level 3 and placed its card in the free central area beside the single inspector. The angle
  remained 25° / 0°. Back/Forward restored levels 2 and 3. Browser error/warning logs were empty.
  Flat selection/reselection and rapid mode switching retained a tested 25° tilt / 10° turn
  after a timing issue in camera persistence was corrected.
- Screenshots: `output/prototype2-centering-before.jpg`, `output/prototype2-centering-after.jpg`
  and `output/prototype2-centering-fullscreen.jpg`. No backend, corpus or source changes.

### Clickable layer surfaces follow-up

Layered mode now has finite surfaces around the ordinary cards on each visible plane. Hover
adds a light fill, stronger border and a clear layer-name hint. Empty surfaces/borders return
to that depth on click: deeper expansions fold away and the selected layer comes forward.
Cards and connections retain click priority; rear borders remain independently selectable
through overlapping transparent surfaces. Layers provides an equivalent keyboard action.

- Production build/TypeScript and **69 graph checks passed** (17 baseline, 52 scene/state).
  Six new checks cover middle-layer return with shared nodes and stable homes, all-ten-perspective
  overview return, full routes and reversible snapshots, current-layer focus folding, finite
  surface/border geometry, and preventing deeper cached members from reopening unexpectedly.
  More topics explicitly reveals capped members again with correct summary relationship counts.
- Windows browser: native pointer hover identified levels 0, 1 and 3 independently. Clicking
  the highlighted rear level-1 border changed 27 cards / level 3 into 16 cards / level 1,
  retaining Species & companions. Back restored the 27-card scene. The Layers control returned
  to level 2 with 22 cards and kept the Maysara inspector. Tilt/turn stayed 25° / 10°.
- Dragging an empty surface panned without collapsing. Flat hid layer controls and switching
  back retained the viewpoint. Screenshot records: `output/prototype2-layer-hover.jpg` and
  `output/prototype2-layer-return.jpg`. Source files, knowledge and backend remain unchanged.

### BokehPass follow-up

The standard Three.js BokehPass now runs through the graph's existing composer with disposable
billboard/line depth proxies. Older planes soften progressively; the active plane, focused card,
selected route and its endpoints/labels stay sharp. Off/Subtle defaults to Subtle, saves locally
and stays separate from exploration history. Flat and depth-zero overview apply no blur.

- **75 graph checks passed** (17 baseline, 58 scene/state). Six new checks cover the two-pixel
  CSS radius, route/active-plane protection, exact billboard masks and resource ownership,
  sharp-frame failure fallback, linear clear/output ordering and thick/dashed line masks.
- Production build/TypeScript passed, using the existing pinned Three.js dependency. The usual
  large-bundle advisory remains. No additional runtime service, package or API is required.
- **13 backend regression checks passed**, with the existing Starlette/httpx deprecation
  advisory. Production integrity remained `ok`, with no foreign-key errors: nine sources,
  68 coverage rows, 281 topics, 329 relationships, 140 findings and zero saved test views/tasks.
  `npm ls three` confirms the single shared Three.js 0.187.0 installation.
- Windows browser comparison: Off/Subtle preserved 22 cards, 46 relationships and the 25° / 10°
  viewpoint. Matched JPEG samples had mean RGB differences of 0.30/255 inside the active card,
  12.97/255 in an older technology card, and 0 in sampled empty background and HTML inspector
  regions. The first colour-conversion issue was fixed by binding the linear target before clear.
- Off survived reload. Subtle reactivated on return from Flat/overview; those views stayed sharp.
  Light and System themes rendered with the original palette. FOREST-002 page 13 completed its
  offline PDF rendering and retained its separate source canvas/controls. No source was imported.
- The complete Carob → Dryland restoration → Restoration monitoring → Drone restoration imagery
  → Drones route retained all five topics/four steps and a sharp selected path. Fullscreen kept
  one inspector and the blur selector. Browser warning/error logs were empty.
- Visual records: `output/prototype2-bokeh-off.jpg`, `output/prototype2-bokeh-subtle.jpg` and
  `output/prototype2-bokeh-route.jpg`. Bokeh adds GPU work and can be switched off; graph crossings
  and occlusion retain the previously documented limits. Production knowledge is unchanged.


### Readable connections and frosted layers — 6 November 2026

Implemented the approved repair in three stages: complete connection geometry/internal badges;
single plane frames and independent hover; background/frost/foreground composition.

- **83 frontend checks pass**: 17 baseline and 66 scene/state/render checks. New regressions cover
  the once-only ledger across links/badges and partial expansion/collapse, geometry growth/shrink
  and invalid-path retention, exposed attachment ports under overlapping cards, rounded routing
  clearance, distance-based labels/depth, hover hysteresis, updated depth-proxy geometry, empty
  surface exclusion, compositing/stencil separation and sharp-frame recovery after failure.
- Production build/TypeScript pass. The existing Vite large-chunk advisory remains (approximately
  2.34 MB graph bundle). The pinned dependencies are unchanged; one Three.js 0.187.0 remains.
  Backend regression checks: **13 pass**, with the existing Starlette/httpx deprecation advisory.
- The Windows WebGL regression reproduces the original bug: growing an already rendered Line2
  from one to four segments left capacity one and drew one. Replacing complete geometry through
  public APIs drew four of four after grow → shrink → grow. The private capacity is read only in
  the isolated diagnostic page, never changed by application code.
- The GPU compositor comparison renders the same card at the same position with glass away/over.
  Background horizontal edge energy falls from 2721.18 (Off) to 397.80 (depth only), then 2.64
  (frosted). Mean RGB difference is **0/255** for the foreground card, **0/255** over 1869 selected
  route pixels, and **0/255** for sampled empty canvas. No shader warnings/errors were captured.
  Half-float buffers fixed the initially observed dark-colour quantization shift.
- All ten perspectives were exercised in Layered and Flat with centre Carob/search drone retained.
  Internal badges opened actual constituent explanations. An exposed overview border folded
  detail back; keyboard Layers highlighting worked. Continuous pointer movement cannot be driven
  by this browser tool, so hover timing/repeated-hit stability are automated unit checks; a human
  pointer comfort check remains part of the user's demonstrator review.
- Fullscreen retained one inspector. Keyboard move changed x by 20px; resizing reduced height by
  20px without altering camera angle or item/link counts. Selection updated the same panel, Close
  removed it, and Show details reopened it. At 1000×720 the panel was clamped within its workspace
  (420×364, x555/y221). Source IRR-003 PDF84 rendered offline above the inspector; zoom and rotation
  worked. Research stayed above the graph, defaulted to Library only and retained the wider-domain
  discovery instructions, real route IDs and complete v3 view context.
- Isolated browser database: `data/frosted-ui-qa.sqlite`, with one named QA exploration and one
  manual research task. Save/reopen and reload retained the layered scene; fullscreen did not
  restore automatically. Back/Forward switched Cocoon/AL20 centres; Funding and progressive
  zoom-out returned to depth zero. Browser warning/error logs were empty. The temporary QA app
  and static servers were stopped after checking; the normal local app remains on port8765.
- Production SQLite remained byte-identical to its pre-change SHA-256:
  `0965bdc61ac0d2405e27380304009341ad813884a4b0f9a1e7c2424b812b978b`.
  Integrity `ok`, no foreign-key errors; nine sources, 68 coverage rows, 281 topics, 329 relations,
  140 findings and zero exploration/task writes. All nine original PDF hashes match the manifest.
- Snapshot of the current uncommitted frontend/tests/docs before this repair:
  `data/prototype1-backups/pre-frosted-20261106T203353.zip`. Existing edits were preserved.

Artifacts: `output/prototype2-connections-before.jpg`, `output/prototype2-connections-after.jpg`,
`output/prototype2-frosted-before.jpg`, `output/prototype2-frosted-after.jpg`,
`output/prototype2-frosted-off-final.jpg`,
`output/prototype2-gpu-geometry.jpg`, `output/prototype2-frosted-gpu.jpg`,
`output/prototype2-frosted-gpu-metrics.json`, `output/prototype2-frosted-ui-checks.json`, and
`output/prototype2-frosted-integrity.json`. Baseline/final captures show the inspected views at
capture time; the controlled GPU pages provide the matched-position comparison.

Remaining visual limits: faint contextual connections can cross; selected paths can make longer
rounds to avoid opaque background cards. Fully overlapping card silhouettes may have no exposed
port; their relationships remain inspectable, and selecting a topic brings it forward. Blur can
be disabled with Off. Human comfort approval still precedes any additional source ingestion.


### Clear centre views, permanent groups and layered appearance — 6 November 2026

This section supersedes older Off/Subtle, camera-facing card and v3-only descriptions above.

- **92 frontend checks pass** (17 baseline,75 scene/state/render); **19 backend checks pass**.
  Production build/TypeScript pass. Existing advisories: large Vite graph chunk (~2.36MB) and
  Starlette/httpx deprecation. No dependencies changed in this follow-up; npm confirms one shared
  Three.js0.187.0. Official PlaneGeometry,OrbitControls and EffectComposer references rechecked.
- New regressions cover the real Nursery watering direct neighbour, retained source surfaces and
  repeat centre changes, shared-topic orientation labels, once-only organized relationship ledger,
  perspective-independent centre caches, legacy/new state, independent effect defaults, steep-angle
  projected ports, stale centre-session visits/depth, overview nesting after a previous centre,
  centre-triggered camera attention and protection against an old displayed scene overwriting a
  newly requested centre while loading. Route/endpoints, ownership, budgets,history and mode caches
  retain their existing regressions.
- Windows walkthrough: Establishment water now counts22 unique descendant topics (Cocoon-specific
  records formerly in other coarse areas are organized here). Its first6 include Cocoon and Nursery
  watering without repeating the9 Cocoon-specific members. Cocoon opens6 then all9, on the next
  detail plane. Making Nursery watering centre from that parent closes child expansions while
  retaining Detail · Establishment water and Detail · Cocoon surfaces, then opens Centre · Nursery
  watering in front. The star contains Nursery and its one recorded neighbour,Dryland restoration.
  Including9 overview cards and one QA research indication gives12 display items. Source-layer
  reference and Layers/Reopen controls retain descriptive names. Immediate Make-centre repeat
  preserves evidence/findings and does not add another plane.
- All10 perspectives were exercised in both modes with Carob/search drone retained. The final
  sequential20-case run reached Flat/Time before the automation session timed out; Flat/Conditions
  was completed separately. Final fresh results occupy depth2, preserving depth1 centre. No graph
  shader warnings/errors appeared. The earlier full matrix JSON records the pre-cache-correction
  walkthrough; final observations are recorded separately below rather than changing those samples.
- Carob → Dryland restoration → Restoration monitoring → Drone restoration imagery → Drones opens
  all5 topics/4 sourced steps in the inspector. AL20 remains the centre under another perspective.
  An unrecorded watering term keeps AL20 and offers research; successive explicit Zoom-out steps
  were5→4→3→2→1→0. Fit,Reset,theme and resizing do not invoke semantic collapse.
- Camera buttons reached60° tilt/+60° turn and15° tilt/-60° turn. Cards/badges/headings follow
  their planes and route ports use the same quadrilaterals. Direct Ctrl/Shift-drag and continuous
  pointer-hover comfort cannot be driven by this DOM browser tool; both use the existing controls,
  with automated geometry/hover tests. Reduced-motion immediate paths remain implemented; no
  Windows accessibility preference was changed for testing.
- GPU regression covers8 effect combinations in both themes (16 cases). Expected 25% darkening /
  50% composed-layer opacity agrees within1/255; foreground and empty canvas mean difference0.
  Background edge energy:2721.18 off,397.80 depth-only,2.64 behind glass. Selected and unselected
  background-to-front line pixels have zero depth-only difference and zero difference outside
  glass; inside-glass differences are39.97 and39.76 respectively. This proves those lines skip depth
  blur but receive surface frosting. Warning list empty. Background-only lines receive both passes.
  The fixture assigns the real endpoint plane for each edge so crossing-order changes cannot be
  mistaken for blur. Complete GPU geometry regression from the preceding stage remains intact.
- One fullscreen inspector updates shared content. Keyboard movement changed x1475→1455 and
  resizing changed height560→580 without changing25°/0° camera or creating a second panel.
  Reset remains reachable. Offline IRR-003 PDF142 rendered; zoom/rotation worked above the graph,
  with original PDF colours. Saved view/reload retain v4 and named surfaces; fullscreen is temporary.
- Browser writes used **data/centre-ui-qa.sqlite** only: one saved exploration and one Prepared
  manual research task,KGB-2026-11-06-1f247ccc. Its context contains v4 state/history, current
  browse_groups/rules, real selected relationship IDs and wider-discovery instructions. Prompt
  preview used the fixed template, Library only; no AI/API research ran.
- Approved metadata seed applied to production after preview: revision2→3,one browse group,nine
  primary members,zero factual additions/changes. All raw factual table rows match the pre-change
  baseline, including page_text; all9 source hashes match the manifest. SQLite integrity ok and no
  foreign-key errors. Counts remain281 topics,329 relationships,140 findings,9 sources,68 coverage
  rows. Production has zero QA tasks/explorations. The database file intentionally differs because
  organization/revision changed. Pre-migration/pre-import backups and the source/build ZIP remain.
- Main server restarted safely through the project launcher; /api/catalog reports revision3 and
  the Cocoon group. Original library, brief and EPUB are untouched. See README/PROTOTYPE_TWO and
  imports/CONTRACT for current controls, state, grouping and manual maintenance rules.

Artifacts: output/prototype2-clean-centre-before.png (user-provided prior screenshot),
output/prototype2-clean-centre-after.jpg, output/prototype2-cards-60-degrees.jpg,
output/prototype2-centre-source.jpg, output/prototype2-centre-effects-gpu.json,
output/prototype2-centre-perspectives.json (earlier complete matrix),
output/prototype2-centre-groups-integrity.json and output/prototype2-centre-ui-final.json.

The walkthrough covers carob communities,Cocoon,drones,AL20 and manual handoff. Context crossings
and perspective foreshortening remain visible limits; selected routes are inspectable and opaque
cards mask internal lines. Half-opacity/darkening and blur can be independently disabled. Human
pointer/reading comfort remains the user's gate for additional ingestion; no library expansion
was performed.


## 7 November 2026 — Independent layers and complete contents

This is the current implementation. Earlier entries describe historical prototypes, including
pagination, camera-facing cards and obstacle detours that are no longer used by the v5 frontend.

Before editing, retained backups/pre-independent-layers-20261107T101700Z.zip with497 source/build
files, including uncommitted work. SHA256:
461123ac7b2008db3c7e99f0c6e55e70991fecd173fb3b8fc55fa93614dc345f.

Automated checks:

- Production build passed. The existing large bundled-renderer warning remains; dependencies
  remain pinned. npm ls three confirms one shared Three.js0.187.0 installation.
- npm test passed116 checks:17 layout/legacy,75 compatibility/render and24 v5 independent-layer
  regressions. New checks cover populated source recovery, co-front contents/connections,
  independent branches, complete scopes beyond120/240, exact relationship accounting, shared
  rehosting, grouped scopes, all ten result perspectives, viewport ratios, movements, cached mode
  restore, route completeness, batched Expand all, stable ForceGraph bindings, real fCoSE slots,
  research markers and legacy route/evidence/source migration.
- Backend suite:23 passed. Complete mode returns all281 topics/329 facts and all140 findings/nine
  sources. A150-topic synthetic search proves removal of the100/48/12 limits in complete mode.
  Legacy calls retain their bounded response. Organization discovery and pooled v5 saved histories
  are tested additively alongside old list histories and existing integrity/import regressions.
- Browser GPU fixture passed all16 combinations of Blur/Darken/Transparency in both themes.
  Colour samples were within1/255 of expected values. The same background region had edge-energy
  2721.18 sharp,397.80 depth-blurred,2.64 frosted. Selected/inter-layer lines stayed sharp outside
  the finite surface and softened behind it. Selected-line visibility over a muted card changed
  by128.67/255 in the sampled region; active-card protection differed by0. No compositor warnings.

Browser checks used isolated data/independent-layers-qa.sqlite, never production writes:

- Establishment water shows its13 direct browsing members, including the Cocoon anchor; the
  overview count22 includes its nine organized descendants. Making Cocoon centre keeps source
  cards/coordinates and opens22 recorded neighbours. Organized contents have their own co-front
  surface and nine labelled location references because those members already have cards in
  the connections surface. One Cocoon card remains. Returning restores the populated source
  immediately. Layer labels and four corner controls remain attached after fitting/turning.
- All four corner controls were exercised using arrow keys; grouping toggles and layer controls
  worked. Combined60-degree tilt/60-degree sideways limit was reached without collapse; Reset
  returned25/0. Native pointer-drag testing was stopped by the Windows browser automation policy
  because URL-policy enforcement is unsupported for that browser. Native mouse drags therefore
  remain a hands-on verification item; keyboard movement and ray/plane/cache behavior were checked.
- All ten perspectives were exercised in both Layered and Flat with centre preserved. Focused
  Sources reached428 visible cards. The running normal server also returned430 semantic records
  in an uncentred complete Sources response. No More nodes or display admission caps were used.
- Carob plant communities retained source-specific ecological wording. Offline PDF inspection
  rendered FOREST-002 page18. The complete Carob → Dryland restoration → Restoration monitoring
  → Drone restoration imagery → Drones route exposed all steps/evidence. Alternatives and the
  combined complete-route expansion worked. Expand all creates one complete combined scope.
- Cocoon and AL20 were explored; original source IRR-003 page92 opened above the fullscreen
  inspector. One inspector remained after topic changes; keyboard movement/resize worked,
  and bounds stayed reachable across fullscreen size changes. Light/dark and Blur controls
  preserved the exploration. Fullscreen was temporary and was not restored after reload.
- Saved exploration “QA · independent Cocoon layers” reopened with its independent surfaces,
  grouping/offsets, selected knowledge and pooled full history. Reload restored the v5 session.
- Static handoff KGB-2026-11-07-e81d0ca6 was saved only in the isolated database. It captured AL20,
  Library only, revision3, seven layer definitions, full v5 state/history and current organization
  rules. Its editable prompt explicitly retained wider supported discoveries. No research or
  AI API was executed. Synthetic-group tests prove new stored rules are discovered generically.
- A task marker is excluded from factual placement and cannot attach another task to the current
  centre. Saving a task no longer breaks subsequent scene preparation.
- The normal application at127.0.0.1:8765 was restarted through its project-checked launcher.
  Its existing Carob/drone exploration migrated successfully with the selected route and no
  displayed errors. The existing normal application tab was retained.

Integrity and boundaries:

Raw production topics, relationships, findings, sources, coverage, page_text, browse_groups and
meta rows equal the pre-change baseline. Revision remains3; factual counts281/329/140, nine
originals and68 curated pages are unchanged. All nine source hashes match the registered
manifest. No organization import, schema migration or source-library write occurred.
Project maintenance instructions now require inspecting current stored organization generically;
specific Cocoon guidance remains in its existing database definition.

Artifacts: docs/screenshots/independent-layers/before.png and after-carob-route.png show the old
and migrated Carob/drone views. paired-cocoon.png shows independent co-front surfaces;
after-source-return.png shows the populated source and CENTRE anchor after return.
light-frosted.png and camera-60-degrees.png record appearance/turning checks. The user's original
empty-source screenshot, when available, is retained as before-empty-source.png.
Detailed local test metrics are in data/independent-layers-*-check.json and
independent-layers-gpu-metrics.json; source/table integrity is in independent-layers-integrity.json.

Remaining practical limits: complete broad scopes are dense. Global fitting can make labels small;
use Fit this layer, zoom, Group nodes, individual relationship inspection and Flat view. Initial
large scene/theme renders may pause while GPU resources compile. Crossings remain in general
context. Human comfort, including native handle dragging, is still the gate before more ingestion.

QA browser tabs and the three project-owned QA services were closed after verification. The normal
8765 service remains available. Its source counts distinguish281 topic endpoints from430 complete
source-perspective records (including140 findings and9 source documents); comparison counts reflect
the explicitly chosen methods. Background test processes did not remain active.


### Remove centre control

Added a visible × button beside Centre, with the accessible name Remove centre. The No centre
menu option uses the same action. It clears the designation/badge without closing layers,
rerunning their layout, changing search/perspective or restoring an older camera. Other inspected
records remain selected; Back restores the centre. The25 v5 regressions and production build
passed. Browser verification kept34 cards/four layers, search drone, Technology and25/0 camera
through removal; Back restored Carob and the button. No displayed errors. Screenshot:
docs/screenshots/remove-centre.png. No database or source changes were required.


### Adaptive overview format

The overview frame now uses the same content-bounds and viewport-aspect calculation as detail
frames, rather than a fixed2160×1200 rectangle. All nine overview cards keep their coordinates.
The26 v5 checks and production build passed. The new regression covers16:9,4:3,9:16 and2.6:1
in Layered and Flat, checking complete card containment and unchanged node positions. Browser
checks showed all nine overview cards with no displayed errors in normal/fullscreen workspace
sizes; the preceding exploration was restored afterward. Screenshot:
docs/screenshots/adaptive-overview.png. No backend or knowledge changes.

### Topic counts on separate lines

The shared card renderer preserves explicit label line breaks and reserves a separate line for
the topic count, including when a long title needs truncation. Production build and diff checks
passed. Browser inspection confirmed separate count lines on overview cards and no displayed
errors; the preceding 34-card/four-layer exploration was restored afterward. Screenshot:
docs/screenshots/topic-count-newline.png. No backend, knowledge or layout changes.

### Group-dependent frame sizing and layer colours

Group nodes uses compact reading slots and frames use only visible content bounds. Switching
back restores factual slots, offsets and full frame size. Frames resize over300ms (immediate
with reduced motion); picking, corner controls and frosting follow the same animated geometry.
Each stable layer ID supplies a faint surface/border hue, with theme-specific strength. The
current surface colour is composited independently of the empty canvas, including co-front layers.

All105 scene/render checks and the production build passed. New regressions cover shrinking and
restoring frames in Layered/Flat, unchanged other layers/offsets, complete relationship accounting,
cached coordinates away from the origin, stable theme hues and compositor resize invalidation.
Browser checks showed Establishment water changing1514x658 to1007x438 when grouped and restoring
on Back, with no displayed errors. Checked dark Layered, light Flat and fullscreen. The prior
34-card/four-layer exploration, Layered mode and System appearance were restored. Screenshots:
docs/screenshots/grouped-layer-colour.png and docs/screenshots/grouped-layer-colour-light.png.
No backend, database, organization or original-source changes.

### Grouping availability on leaf layers

Reproduced the screenshot path: Species & companions -> Group nodes -> Species (34 topics).
That leaf has no additional subgroup headings, so Group nodes was deliberately disabled to
prevent opening Species recursively. Both the surface controls and Layers menu now replace the
misleading dropdown with No further groups and offer Parent groups where its parent is grouped.
The action folds the leaf and returns to the existing Families/Species cards.

Production build and all30 v5 checks passed, including the leaf/parent return regression with
complete relationship accounting. Browser verification confirmed no disabled Group nodes options
in that leaf, a working parent return (11 cards/two layers), and no displayed errors. The prior
34-card/four-layer exploration was restored. Screenshot: docs/screenshots/leaf-layer-grouping.png.
No knowledge, organization, source or backend changes.

### Responsive overview card arrangement

The overview now rearranges its nine area cards as well as its frame. A deterministic reading
grid chooses rows/columns using card sizes and clearances, then spreads cards across the frame.
At three columns the ecosystem/technology/funding columns remain familiar; other grids keep
domain order. Opened detail slots/offsets, membership and cameras remain independent of this
overview-only reflow. Existing300ms/reduced-motion transitions update attached lines and minimap.

All106 scene/render checks and the production build passed. The responsive regression covers
Layered/Flat at ratios0.3,9:16,1:1,4:3,16:9,2.6:1 and4:1: nine identities, containment, clearances,
use of frame area, exact relationship accounting, unchanged detail positions and deterministic
return to earlier proportions. Browser checks showed2x5 in a750x1100 portrait fullscreen viewport
and5x2 in a wide1800x800 viewport, with no displayed graph errors. The temporary viewport override
was reset and the original34-card/four-layer exploration restored. Portrait screenshot:
docs/screenshots/responsive-overview-portrait.png. No backend, database or source changes.

### Tight grouped-layer bounds

Grouped frames now wrap visible nodes without the window-aspect stretch. They use32-unit side/
bottom margins,100 units above for the heading/controls and a300x240 minimum. Headings remain
inside the compact frame, including during resizing. Overview/ordinary-topic proportions and
cached factual positions/manual offsets stay intact.

Production build and all107 scene/render checks passed. The new two-group regression covers
very tall through very wide aspects in both modes, bounded margins, full relationship accounting,
unchanged offsets and exact return to All topics. The Families/Species frame is300x380 for the
portrait case; the live normal-window check showed558x240, with no displayed graph errors.
Screenshot: docs/screenshots/tight-grouped-frame.png. The preceding34-card/four-layer exploration
was restored. No backend, database, organization or source changes.

### Tight bounds for every pane

The same content-bounds policy now applies to overview, ordinary topics, connections, centres,
results, routes and grouped views. Margins are32 at the sides/bottom and100 above; empty/minimal
panes keep300x240 for controls. Actual reference heights and optional research cards are included.
No viewport-aspect padding is added. Circular connection slots, existing card/reference positions,
manual offsets and cameras are preserved. Finite frosting surfaces, borders and handles use the
same bounds and existing transitions.

All109 scene/render checks and the production build passed. Every v5 ledger check now also
checks tight pane containment across all perspectives and expansion types. New checks cover
unchanged circular slots/reference positions/cameras across five tall-to-wide ratios in both
modes, plus moving an empty pane without losing its position. Browser comparison retained34
cards/four layers: the Carob origin shrank from640x450 to300x240, its connections from1794x1262
to1678x1120, and the route frame from1063x748 to718x680. No displayed graph errors. Screenshot:
docs/screenshots/tight-all-layer-panes.png. No backend, factual, organization or source changes.

### Compact contents and source-aligned opening

New/reopened scopes and changed memberships use compact grids or complete, collision-checked
elliptical rings. Clearance is24 world units around rectangular cards; native comparison, date,
classification, place and source groupings retain their order. Compact is available on each pane
and in Layers; it preserves manual pane position, affects only the active mode and is one Back
step. Older cached coordinates are adopted intact until reopening or explicit compaction.

New Layered panes align their area centre to their source card's actual XY position, including
overview cards and temporary group cards. Separate expansions get separate front depth bands;
source cards remain at home. Flat retains side-by-side placement and its own caches. Additive v5
packing/source/manual-position metadata is saved with history and perspective arrangements.

The17 layout and114 scene/render checks passed; two additional targeted checks passed for moving
a source before reopening its automatic child and restoring per-perspective manual positions.
That covers133 frontend checks. All23 backend tests and the production build passed. Tests cover
the watering-hose outlier, tight bounds, card clearance, all ten perspectives, stable selection,
history round trips, exact source alignment, shared identities and research-card bounds. Ring
packing took2-17ms for14-281 cards in the local Node check.

Browser checks showed Establishment water at992x666 with Watering hose close to the other topics.
Its pane centre and overview source were both(0,-142). The newly opened Cocoon pane centre and
its source card were both(-119,-316). Compact preserved the parent pane's position, and the
normal/angled views showed no displayed graph errors. Screenshots:
docs/screenshots/compact-establishment-water.png and docs/screenshots/source-aligned-cocoon.png.
The original34-card/four-layer route exploration was restored. No backend/API, database,
organization, factual records or source-file changes.

Pre-change source/build snapshot, including uncommitted work:251 files in
backups/pre-compact-alignment-20261107T143708Z.zip. Earlier snapshots remain available.

### Tripled layer spacing

PLANE_GAP increased from520 to1560. The shared camera zoom-out range increased from20000 to60000
to accommodate the deeper scene. Legacy route/result band recovery and migrated scene metadata
use the shared gap instead of hardcoded520 values. Current v5 bands, compact XY slots, source
alignment, manual offsets, cameras and Flat caches remain intact; the foremost plane stays at
the reading distance and earlier planes recede three times as far.

Production build and all118 scene/render checks passed. New regressions cover restoring old
v5 spacing without changing XY/cameras/Flat, repeat restoration without compounding depth, and
correct legacy fallback band numbers. Browser verification retained34 cards/four panes at depth
level2: the overview moved fromZ=-1040 toZ=-3120, exactly threefold, without displayed graph
errors. Screenshot: docs/screenshots/tripled-layer-spacing.png. No knowledge/backend changes.


### Layer menu clearance and readable headings — 7 November 2026

Dynamic pane menus now sit10 CSS pixels above the highest projected pane border rather than
inside its heading band. Their bottom anchor follows camera changes and frame resizing;
wrapping does not push them down over titles. Hover retention and focus capture keep controls
available while moving into the toolbar or using the keyboard. Existing Layers-menu access remains.

Plane-aligned titles use a dedicated30-world-unit bold font, exceeding the largest current card
body font (about26 world units). Titles wrap to two lines within their pane rather than shrinking
or using the small connection-label texture. Title positioning follows animated frame changes,
and the compositor protects title surfaces from highlighted lines.

Production build and all118 scene/render checks passed. Browser checks covered the existing
34-card/four-layer route view, the longer Establishment water title, All topics/Group nodes,
turning, fullscreen and Tab access from grouping to Compact. Measured menu clearance was10.00–10.02
CSS pixels before/after grouping and turning. Screenshot: docs/screenshots/layer-title-menu.png.
The original route exploration was restored after checks. No backend, database, factual or source
changes; no additional tests were added for this presentation-only adjustment.


### Background frame darkening and transparency — 7 November 2026

Darkening now includes the finite area behind a background pane's faint tint, alongside its
border, heading and content. Surface shading preserves premultiplied tint colour while adding
the selected dark shadow coverage. The existing layer compositor then applies RGB darkening
and50% opacity once to each layer. Transparency reduces the whole rendered layer's coverage;
it does not expose that layer's own lines through opaque card interiors. Surfaces no longer
use the global card stencil to punch holes over cards in older layers. Current-plane content,
HTML/PDF colours, Flat and the bare overview retain their intended behaviour.

Cached material variants now refresh source colours and opacity on hover without allocating
new geometry/textures, and shader keys distinguish cards from surface shading. Added a headless
regression for material reuse, source preservation, layer alpha and disabling effects in Flat.
Production build and119 scene/render checks passed. The separate tests/effects-gpu.html harness
passed103 actual WebGL pixel checks: both themes, all eight effect combinations, mapped heading
text, borders, surfaces, unchanged foreground, overlapping older planes, selection alpha, hover
updates, Flat and bare overview. Samples use linear RGB with a0.014 tolerance. The probe performs
no API calls, imports or browser-storage writes. Results: output/effects-gpu-checks.txt.

Browser comparison images at fixed camera/geometry: docs/screenshots/background-effects-50.png
and docs/screenshots/background-effects-opacity-off.png (extra selection dimming temporarily off).
Final restored preferences: Blur off, Darken25%, Transparency50%, Selection focus on, System theme.
Screenshot: docs/screenshots/background-effects-updated.png. The original34-card route exploration
was restored and the isolated GPU tab closed. No backend, knowledge, organization or source changes.


### Follow-up: overlapping labels and independent switches — 7 November 2026

The user reported failures missed by the preceding verification. The running8765 page loaded
index-DZlxGhsB.js, matching dist; this was not stale code or a backend restart problem. The103
previous GPU checks sampled solid colour areas and did not prove contrast-edge blur or nested
badge occlusion. New probes reuse the application's actual sceneMeshes factories.

Reproduced before the fix:
- A background internal-connection badge changed a muted foreground-card sample from[3,6,8]
  to[16,22,22] in linear-byte RGB.
- Ordinary rendering let farther nodes overwrite437 pixels inside a nearer heading.
- Enabling Blur changed an empty surface sample from[8,8,4] to[15,14,7], due to an extra6% tint.

Fixed card/badge/heading depth testing in source meshes and the postprocessing prepass. This
blocks background label bleed even under dimmed front cards while preserving the selected-line
exception. Headings are slightly ahead of their own card plane. Removed the extra blur tint and
the redundant current-plane hover hint. Extracted existing mesh factories for shared app/test use;
no exploration, layout, camera, database or API-format changes.

Production build and119 scene/render checks passed, with depth-mask/tint assertions added to
existing regressions. Both GPU probes passed (103 colour/opacity checks plus7 actual-mesh,
occlusion and contrast-edge checks). The blur test measures102 changed pixels along a known
edge, rather than testing uniform colours. Fixed occlusion samples match the unobstructed card,
ordinary heading changes are0, and empty-surface Blur off/on samples both read[8,8,4].
Results: output/effects-overlap-gpu-checks.txt.

A separate8776 browsing session opened Establishment water then Cocoon and kept camera/geometry
fixed for individual Off/Transparency/Blur/Darken screenshots. In a215x94 exposed-background region,
mean RGB changes versus Off were8.41/9.08/8.25 for Transparency,9.59/9.18/9.25 for Blur and
5.21/6.05/5.52 for Darken25%. Foreground card, heading and empty-surface comparison regions had
exactly0 changed pixels. Images: docs/screenshots/effects-repair-off.png and corresponding
-transparency.png, -blur.png and -darken.png. Final view: effects-repair-fixed.png.

The8765 user tab was reloaded to index-y9XkHqAm.js with its34 cards/four layers, route:drones
selection and System/Blur off/Darken25%/Transparency50% preferences retained. No backend restart
was required. Original sources, factual/organization data and knowledge revision were not changed.
Source/build snapshot before repair: backups/pre-render-effects-repair-20261107T220458Z.zip.


### Single opening links between layers — 7 November 2026

Added renderer-neutral layerConnections projection and a straight source-edge/docking-point geometry
helper. Each contents/connections pane gets one blue dashed navigation link; canonical scene facts,
layouts, histories and knowledge remain unchanged. Uninspected cross-layer factual lines are hidden
in drawing, picking and postprocessing together. Internal links, complete expanded routes,
abbreviated entry points and research markers remain visible. Source anchors opening a pane keep
their fan folded. Line/ring or Layer link controls inspect actual relationship IDs and reveal lines;
selecting one fact traces its endpoints, and clearing selection folds again. Shared neighbours hosted
elsewhere remain in the opening inspector. Hidden/grouped sources use a representative or parent
origin ring. Movement/turning uses current card/frame geometry, including animated frame sizes.

Production build and124 scene/render checks passed. Five added regressions cover once-only fact
accounting and nonmutation, independent contents/neighbour links, shared/restarted inspection,
source selection versus explicit inspection, routes, all ten perspectives, both modes, exact
source-boundary attachment at60-degree limits, moving docks, grouping and closed-branch cleanup.
The geometry tolerance is1e-8 for floating ray/plane arithmetic. Results: output/layer-link-scene-tests.log.

Browser checks used a separate8776 session, without database writes. Establishment water then Cocoon
showed31 cards, two opening links and26 folded strokes. Inspecting Cocoon exposed10 real relationships
and reduced folded strokes to16. Reduce restored26; selecting cocoon-degradation revealed one real
relationship and left25 folded. Native clicking on the docking ring opened the same inspector.
A page reload restored aggregate:layer:group%3Abrowse%3Acocoon without an inspection API request.

A Cocoon centre/Connected topics pane alongside its contents produced four panes, three opening
links and45 folded strokes. Its inspector included52 related facts, including shared neighbours;
clearing selection restored45. Flat/Layered and Back/Forward retained the three links, folded count
and usable panels. No graphics/effects notices appeared. Screenshots: docs/screenshots/layer-links-reduced.png
and docs/screenshots/layer-links-inspected.png. The original8765 route exploration is retained.

No backend/API, database schema, knowledge/organization revision, ingestion scope or source changes.
Source/build snapshot including earlier uncommitted rendering work:
backups/pre-layer-links-20261107T222937Z.zip (259 files).

Final124-check run also covers retiring an opening selection when its pane closes or navigation
returns to an ancestor. Production reload verified index-zABb34Sk.js,34 cards/four layers and the
original route:drones selection, with one opening link and41 folded strokes; no graphics notices.
The isolated browser tab was closed afterward.

A final dev-browser log also exposed an existing LayerHover default-timer receiver error (Illegal
invocation) while moving across the new links. Bound setTimeout/clearTimeout to globalThis and
added a regression that enforces the browser receiver contract. Final scene/render total:125 passed.


## 8 November 2026 — Consolidated v6 workflow

The user-approved consolidation replaces independent panes with one live Layered 3D graph
and at most two read-only previous views. Selection only inspects; Explore is explicit.
Domain/type filters, local grouping, one route-expansion set, docked Evidence/Dates/Comparison,
and the existing manual research handoff replace the ten-perspective workflow.

Removed Flat mode, pane ownership/rehosting/handles, legacy scene/navigation engines, blue
pane links, blur/frosting/transparency postprocessing, the miniature map and floating inspector.
Cytoscape/fCoSE and react-rnd were removed from dependencies and lockfile; deterministic grids,
rings and grouped layouts replace the all-fixed-position layout worker. One Three0.187.0
runtime remains. PDF.js loads on demand.

Validation:
- 22 backend checks pass, including import integrity/rollback, unchanged source hashes, complete
  scopes, membership versus connectivity, exact routes, explicit traversal-budget exhaustion,
  comparison gaps, redirects, saved histories and version6 research payloads. One pre-existing
  Starlette/httpx deprecation warning remains.
- 15 frontend checks pass: explicit actions, clear-centre retention, shared route intermediates,
  position stability/collision clearance, grouping fact accounting, capped/branching history,
  history snapshots, pooled v3/v4/v5 and v1 migration, redirected IDs, legacy-key preservation,
  IndexedDB fallback and retired-source/dependency guards.
- 37 real Microsoft Edge browser assertions pass, with zero JavaScript exceptions. They cover
  actual canvas picking without navigation, Carob/direct neighbours, Drone search, route selection
  and reveal, domain filters, grouping, Cocoon Members versus Connections, comparison, rendered
  exact PDF pages/rotation, saving, remove-centre/reload, research preview/edit/save, failed and
  superseded requests, Back/Forward, light/dark, turning, portrait/reduced motion, fullscreen,
  and reopening a legacy v5 saved view without rewriting its original database payload.
- Production TypeScript/Vite build succeeds; git diff --check passes. The main bundled graphics
  chunk remains about1.76MB and triggers Vite's existing1.5MB size advisory; PDF code is a
  separate on-demand chunk. The app remains locally bundled/offline.
- All10 baseline factual/organization table signatures match after implementation and restart;
  revision remains3. The nine source editions passed hash verification. No ingestion or source
  mutation occurred. Browser writes used output/consolidation-qa/knowledge.sqlite and its own
  research directory; the user database was not used for test saves/tasks.

Recovery snapshot, including pre-existing uncommitted source/build work:
C:\Users\JanEngelke\git_private\algarroba_db\backups\pre-consolidation-20261107T230542Z.zip
SHA256 c6056936b8f1eafea25765a8da84074e439e6f5fcd96a983bd2978af4d7ab8ad
Baseline signatures: backups/consolidation-baseline.json. Legacy storage keys and saved
payloads remain untouched; old multi-pane geometry translates approximately into one active view.

Browser artifacts: output/consolidation-qa/browser-results.json, routes.png, dark-angled.png
and portrait.png. The repeatable isolated helper is scripts/qa-server.py; run npm run test:browser
with Playwright importable or KGB_PLAYWRIGHT_MODULE pointing to its installed index.mjs.

The normal local server was restarted and read-only smoke checks confirm /api/explore and
/api/comparison are live at http://127.0.0.1:8765. Existing tabs need a reload.


## 8 November 2026 — Layer-label movement, symmetric Ctrl rotation and darker history

Restored dragging foreground and previous-view labels to translate their complete layer in
world X–Y at fixed Z. Cards, lines, arrows, borders and headings move together; local card slots,
semantic memberships and the camera stay unchanged. Separate drag-only label picking preserves
read-only background facts. Pointer capture, a4px threshold and suspended camera controls
prevent accidental panning/selection; Escape and cancellation restore the starting offset.
An additive layerOffsets map in v6 state persists placements, including research/saved-view
contexts, without adding exploration-history entries or migrating knowledge.

Ctrl/Shift-left drag now has explicit bounded rotation handling, taking priority over label
movement. Both X tilt and Y sideways rotation clamp symmetrically to[-60,+60] degrees, with
no roll/rear view. Buttons use the same limits; Reset retains25-degree tilt/zero sideways.
The actual browser test exposed a conflict in default native modifier handling; explicit
rotation fixed it. Background card, line, arrow, border and title brightness is0.35 (formerly
0.75), with opaque surfaces and ordinary depth testing retained.

Validation:19 frontend checks,22 backend checks, 15 focused real-browser gesture assertions
and 37 complete browser regression assertions pass. Gestures verify foreground/background
movement, unchanged camera/local slots/memberships, cancellation, reload persistence, both
rotation extremes and Reset. Zero JavaScript exceptions. TypeScript/Vite build and
git diff --check pass; the existing bundle-size and Python deprecation advisories remain.
All10 factual/organization table signatures still match the consolidation baseline; revision3
and registered source editions remain unchanged. The normal8765 server serves the new build.

Recovery snapshot: C:\Users\JanEngelke\git_private\algarroba_db\backups\pre-layer-gestures-20261108T073111Z.zip
SHA256 4ab89fc86e52014af1777d6366eff6f1707c2b41f5e18930e556d6051a407607
Artifacts: output/consolidation-qa/gesture-results.json and layer-gestures-dark.png.
Reproduce with scripts/qa-server.py and npm run test:gestures using the documented Playwright
configuration. Tests use the isolated QA store; existing browser tabs need a reload.


## 8 November 2026 — Single-layer overview and in-place grouping

Return to overview now establishes a single-layer boundary while preserving the selected
domain/type filters and centre/search markers. An out-of-domain centre no longer adds an
extra domain card to the overview. Previous planes are omitted, and earlier closed layers
cannot reappear after group membership browsing or subsequent exploration. Back still restores
prior explorations explicitly. The additive v6 layerRoot flag persists this boundary through
saved views, reloads and in-place replacements; old v6 overviews infer the boundary on read.

Changing Group by, opening Members/sidebar groups, and expanding/collapsing display groups
replace the current entry instead of appending a new exploration. Camera, foreground layer
offset and pre-existing background snapshots are retained. No new layer/view is created by
grouping. Return to overview clears obsolete placements and frames only its own content.

Validation:22 frontend checks,22 backend checks, 13 focused browser assertions and
37 complete browser regression assertions pass, with zero JavaScript exceptions. The
focused browser checks cover the single-domain overview, no extra centre group, no new
history/layer on grouping or membership opening, preserved camera, no closed-layer leakage,
Back, and reload persistence. Production build and git diff --check pass. Accepted knowledge
and organization table signatures remain unchanged at revision3. The normal8765 server serves
index-BNtBeGrV.js; existing tabs need a reload. Existing non-blocking build/deprecation
advisories remain.

Recovery snapshot: C:\Users\JanEngelke\git_private\algarroba_db\backups\pre-overview-grouping-20261108T073943Z.zip
SHA256 d251128763f74f77210b7266191883b23ab6659dedc513bd445d9c28f4ffe3c8
Artifacts: output/consolidation-qa/overview-grouping-results.json and single-domain-overview.png.
Reproduce against scripts/qa-server.py with npm run test:overview and the documented Playwright
configuration. Browser writes remain isolated from the accepted store.


## 8 November 2026 — Close layer controls and clarified group opening

Added keyboard-accessible × Close layer buttons beside every projected layer heading, plus
a toolbar Close layer fallback for the foreground. Buttons follow camera/layer movement and
do not initiate label dragging or node selection. The base overview close control is disabled.
Background close hides only that snapshot, preserving the current graph/camera and not pulling
an older snapshot into its place. Foreground close restores its nearest visible predecessor
or the selected-domain single-layer overview, preserving the closed original in browsing
history. Back can restore it. Additive closedLayers v6 presentation state survives reload/saving.

The user clarified a prior misunderstanding: changing Group by is an in-place reorganization;
OPENING a group is an explicit new foreground exploration that keeps the original layer visible
and darkened behind it. Sidebar/Members and display-group opening now use that behaviour.
Node clicks remain inspection-only. Return to overview still yields a single layer, retains
the selected domain, and prevents closed earlier episodes reappearing. Snapshot selection now
deduplicates against the active graph as well as other snapshots, preventing repeated-view
keys and duplicate active/background layers when a close restores a previous exploration.

Validation:26 frontend checks,22 backend checks and 41 focused real-browser assertions
pass (13 layer-closing, 13 overview/group-opening and 15 gesture checks). Zero browser
JavaScript exceptions. Checks cover heading/toolbar buttons, background persistence, foreground
restoration without history deletion, node inspection, retained/darkened original group layers,
in-place Group by, overview boundaries, drag cancellation/persistence and both rotation limits.
Production build and git diff --check pass; existing non-blocking bundle/deprecation advisories
remain. All10 baseline factual/organization table signatures still match at revision3. Normal
8765 serves index-D1qcC-o9.js; existing tabs need a reload. Test writes use the isolated QA store.

Recovery snapshot: C:\Users\JanEngelke\git_private\algarroba_db\backups\pre-close-layer-20261108T074533Z.zip
SHA256 e1ff169d7f720a5810f9b056496f25bd0f1b9dcd863219e88d2773c5c63e72ee
Artifacts: output/consolidation-qa/close-layer-results.json and close-layers-open.png.
Reproduce with the isolated QA helper and npm run test:close-layers, test:overview, test:gestures
using the documented Playwright configuration.


## 8 November 2026 — Name opened layers after their source node

Replaced generic Group members headings with the actual opened node/card label. Sidebar
groups use their familiar labels; anchored membership layers use the anchor topic name;
expanded display groups use the displayed category/place/family label. The context strip,
suggested saved-view name and heading close-button accessibility labels use the same resolver.
Names are derived from current stored records, so old sessions need no migration or data edit.

Validation:26 existing frontend checks and the production build pass. A real Edge browser
probe verified Species & companions, Cocoon planting reservoir and preserved naming after
session reload. git diff --check passes. The normal8765 server serves index-B6LuxqlH.js.
Screenshot: output/consolidation-qa/opened-node-title.png. No factual knowledge was modified.

## 8 November 2026 — Keep opened source nodes highlighted in previous layers

Opening a topic/group records its displayed source card and source-layer identity. Each visible
child keeps that card at full brightness with an accent outline in its parent snapshot, while
other background cards retain the existing 65% darkening. A chain of open layers can highlight
each corresponding parent source. These highlights are independent of sidebar selection and
are removed when their child is closed. Background cards remain read-only, excluded from picking
and factual accounting. The reference survives v6 saving/reload; older sessions infer a usable
source from their exploration scope. Geometry signatures, positions and factual records do not
change. README, interaction documentation and project instructions describe the exception.

Validation: 29 frontend tests and the TypeScript/production build pass. Eight focused real-Edge
browser assertions pass with zero runtime exceptions, covering source identity, only-the-source
highlighting, reload, unrelated selection, nested openings and closing. Actual screenshot pixel
sampling confirms the source card interior RGB (229,238,229), versus (143,149,143) for an unrelated
background card with the same original fill. Light and dark theme screenshots were inspected.
All 10 baseline knowledge/organization table signatures remain unchanged. git diff --check passes.
Normal port 8765 serves index-Cjdktx8t.js; existing tabs need a reload. Browser writes used the
isolated QA store. Existing non-blocking bundle-size advisory remains.

Recovery snapshot: backups/pre-source-highlight-20261108T075854Z.zip
SHA256 5b97e76725052b2d2a6c4b236ecf1edf94ca10f6865bb68d3b5c2a06fec17c82
Artifacts: output/consolidation-qa/opening-highlight-results.json, highlight-pixel-results.json,
opening-highlight-light.png and opening-highlight-dark.png. Reproduce with the isolated QA
helper and npm run test:opening-highlight using the documented Playwright configuration.

## 8 November 2026 — Depth-aware layer close controls

The HTML X controls now respect the opaque 3D surfaces in nearer layers instead of always
painting above WebGL. Project current card/heading surfaces through the camera, clipping against
the frustum before testing the full button footprint. Any overlap, including an edge overlap,
hides the whole close target; it reappears when clear. Process controls front-to-back so nearer
X buttons also take precedence. Hidden controls are excluded from pointer and keyboard targets.
Visibility follows camera changes, live layer dragging, resize, themes and fullscreen. The
foreground toolbar fallback and all existing closing/history behaviour remain available.
Updated README, interaction documentation and project instructions; no state/schema migration.

Validation: 31 frontend tests, 22 backend tests, production TypeScript/Vite build and git diff
--check pass. Ten focused real-Edge occlusion assertions and all 13 existing layer-closing
browser assertions pass with zero runtime exceptions. Browser checks physically drag a background
button behind a foreground card, verify that clicking its old position selects the foreground
card without closing the background, then move the foreground clear and close the revealed
button. Dark theme/fullscreen were checked; screenshots inspected. Pure geometry coverage
includes partial overlap, own/farther surfaces, all nine combinations of +/-60/0-degree X/Y
turning and near/behind-camera clipping. All 10 baseline factual/organization signatures remain
unchanged. Browser writes used the isolated QA store. Normal port 8765 serves index-D8yWqNw-.js;
existing tabs need a reload. Existing non-blocking bundle-size and testclient advisories remain.

Recovery snapshot: backups/pre-close-occlusion-20261108T080532Z.zip
SHA256 32f764a2e04d0f41dd5e14071475a265ccb493dc8a8b636555590a998ad32644
Artifacts: output/consolidation-qa/close-occlusion-results.json, close-occlusion-hidden.png,
close-occlusion-revealed.png and close-layer-results.json. Reproduce with the isolated QA helper,
npm run test:close-occlusion and npm run test:close-layers using the documented Playwright setup.

## 8 November 2026 — Preview Domain and Update the current layer

Domain changes now stage a pendingDomain on the current exploration rather than immediately
querying or creating another history entry. Retain every current card, factual link and position;
darken excluded cards and their attached links. Mixed-domain group cards show a matching member
count. Keep centres and required expanded-route intermediates as connecting context. Selecting
the applied domain cancels preview. Show an Update button beside the foreground X, using the
same projected positioning, depth occlusion and input isolation, with a toolbar Update layer
fallback. Update reuses /api/explore and the canonical scene builder, replacing the current
history entry after success. It removes excluded endpoints, retains valid expansions, surviving
positions, camera, layer offset, opening source and previous snapshots. No new view is appended.
Old alternatives are cleared so they cannot restore excluded endpoints. In-place edits truncate
forward history after Back. Topic-type filtering remains separate; removed the unused immediate
domain path from its action. New explicit scope exploration/overview consumes pending domain;
selection, route reveal and grouping do not apply it silently.

Pending preview is additive v6 state: session/saved-view translation retains it, and research
captures applied versus pending filters alongside the displayed graph. Failed Update retains the
working graph and pending choice. A new domain preview cancels in-flight Update and rejects its
stale response. README, project instructions and interaction documentation explain this workflow.

Validation: 35 frontend checks, 22 backend checks, TypeScript/Vite production build and git diff
--check pass. All 21 focused domain-browser assertions and the updated 37-check full walkthrough
pass with zero JavaScript exceptions. Real Edge checks cover adjacent X/Update targets, unchanged
history/backgrounds, no query on preview, cancelling preview, reload, failure/retry, expansion to
All, stale Update cancellation, protected centre context and Back/Forward. The full walkthrough
also covers routes, grouping, evidence/dates/PDF, comparison, saved/research views, legacy reading,
resize/themes/fullscreen and request failures. Before/preview/applied screenshots were inspected.
Actual GPU pixels: excluded card RGB (229,238,229) becomes (143,149,143); matching card remains
(226,238,242). All 10 baseline factual/organization signatures remain unchanged. Browser writes
used the isolated QA store. Port 8765 serves index-CsauJc0g.js; reload existing tabs. Existing
non-blocking bundle-size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-domain-update-20261108T081004Z.zip
SHA256 9755ea7a961d2b27f4cb7bfd37be9986b95dc3cff39981627e0663622e04c3cd
Artifacts: output/consolidation-qa/domain-update-results.json, domain-pixel-results.json,
domain-before.png, domain-preview.png, domain-applied.png and browser-results.json.
Reproduce using the isolated QA helper, npm run test:domain-update and npm run test:browser
with the documented Playwright configuration.

## 8 November 2026 — Membership-only layers and physical centre removal

Opening Species or any other membership scope now clears the inherited centre/anchor and packs
only its genuine members. The previous exploration remains in history/background. Group queries
omit centre; backend group exploration ignores an unrelated centre parameter as well. Scene
projection avoids injecting a centre into cached group views, and reconciliation normalizes old
group state/layout in memory without rewriting saved database payloads.

Remove centre now removes its card and attached lines and repacks remaining cards onto the
existing deterministic grid, filling the former centre gap. It replaces the current exploration
entry rather than appending a layer/view, preserving camera, layer offset, source and snapshots.
The captured anchor retains surrounding query results and the omitted-origin identity while the
centre is null. Apply omission after route expansion, so endpoint self-matches and Show all route
steps cannot reinsert the removed card. With no centre there is no reserved centre ring/slot.
Reload/Back/Forward preserve omission and arrangement; old stored centre slots are repacked once.
README, project instructions, interaction documentation and obsolete centre-retention assertions
were updated to this user-requested behaviour.

Validation: 37 frontend tests, 22 backend tests, production TypeScript/Vite build and git diff
--check pass. All 16 focused real-Edge assertions and the updated 37-check full browser walkthrough
pass with zero runtime exceptions. Focused checks reproduce Drones -> Species (exactly 36 actual
members), old v6 inherited centre restoration, Cocoon removal (23 cards -> 22 compactly packed
neighbours), unchanged history/backgrounds/camera/offset, reload/Back/Forward and route expansion
without resurrection. Screenshots of Species and the filled centre gap were inspected. Backend
checks reinforce strict group membership even with a supplied unrelated centre. All 10 baseline
factual/organization table signatures remain unchanged. Browser writes used the isolated QA
store. The normal app backend was restarted without opening another browser; port 8765 serves
index-H5QbKl7Y.js and its live group endpoint returns Species without Drones. Reload existing tabs.
Existing non-blocking bundle-size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-remove-centre-20261108T081812Z.zip
SHA256 9350997ecbf52dcc6cccd73ae29589b5fda66e2951223634056f13873dec7ca2
Artifacts: output/consolidation-qa/remove-centre-results.json, species-without-drones.png,
centre-removed-packed.png and browser-results.json. Reproduce with the isolated QA helper and
npm run test:remove-centre / npm run test:browser using the documented Playwright configuration.

## 8 November 2026 — Update layer tightly repacks remaining nodes

Applying Update now clears the old card positions before the accepted filtered graph is rebuilt.
The canonical grid/ring layout closes gaps left by removed topics, while preserving camera,
layer offset, opening source, valid route expansions and original background snapshots. Preview
and failed Update still retain the working arrangement. Successful compact positions persist
through reload and Back/Forward. Both heading and toolbar Update use this same reducer action.

Fixed an exposed packing defect in fresh neighbour arrangements: reserve the centre before
alphabetical placement, include its occupied slot when spacing rings, and use actual card
width/height instead of undersized defaults. This prevents an early neighbour claiming the
centre or collisions sending cards to distant fallback slots. The single-neighbour case also
keeps distinct centre/neighbour positions. No new layout mode or rendering dependency was added.
README, interaction documentation and project instructions reflect explicit repacking on Update.

Validation: 38 frontend checks, 22 backend checks, TypeScript/Vite production build and git diff
--check pass. All 24 focused real-Edge domain checks pass with zero runtime exceptions. They
verify actual movement into a smaller footprint, centred neighbour packing, unchanged camera/
layer offset/source/backgrounds/history, compact arrangement after reload, domain preview,
cancellation, failed Update/retry and superseded responses. Unit coverage checks packed search
cards, full-size card clearance and reserved centre placement even when the centre sorts after
its neighbours. The applied screenshot was inspected. All 10 baseline factual/organization
signatures remain unchanged; browser writes used the isolated QA store. Normal port 8765 serves
index-CJxouo4A.js; reload existing tabs. Existing non-blocking build/testclient advisories remain.

Recovery snapshot: backups/pre-update-tidy-20261108T082532Z.zip
SHA256 95281522223bcd3d0b62883b6cf400a8a3732b250e3d3d4e1d3a0c9abda2d215
Artifacts: output/consolidation-qa/domain-update-results.json and domain-applied.png.
Reproduce with the isolated QA helper and npm run test:domain-update using the documented
Playwright configuration.

## 8 November 2026 — Distinct active layer heading background

The active 3D layer heading uses a subtle green surface instead of the canvas colour:
light #dce8df against #f5f4ee, dark #2c4538 against #131d1a. The shared text mesh accepts
an optional background; only the foreground heading requests this surface. Historical headings
retain their darkened background, and relationship captions retain their existing appearance.
The heading remains opaque, depth tested and draggable; projected controls are unchanged.
README describes the visual distinction. This is a visual-only adjustment with no state,
knowledge, organization or schema changes.

Validation: all 38 existing frontend checks, TypeScript/Vite production build and git diff
--check pass. Real Edge light/dark screenshots were inspected. Actual label/window pixel samples
are (220,232,223)/(245,244,238) in light and (44,69,56)/(19,29,26) in dark. A real pointer drag
moves the heading/layer, and there are zero runtime exceptions. Browser verification used the
isolated QA store. Normal port 8765 serves index-KSKTxptq.js; reload existing tabs. Existing
non-blocking bundle-size advisory remains.

Recovery snapshot: backups/pre-label-contrast-20261108T083032Z.zip
Artifacts: output/consolidation-qa/label-contrast-light.png, label-contrast-dark.png,
label-contrast-pixels.json and label-contrast-samples.json.

## 8 November 2026 — Hover highlights and disabled domain-excluded nodes

All clickable foreground topic/group cards now show an accent outline and pointer cursor on
hover. The frame is hollow geometry, preserving text/body even at limited depth precision.
Hover is transient: it does not select, navigate, add history or alter factual records. It
updates on pointer/camera/scene/theme changes and clears on leave, gesture, loading or disposal.
Historical cards have no hover frame, including the bright source of an open child.

One shared scene interaction policy rejects domain-excluded cards, internal-group actions and
links attached to excluded cards. Graph raycasts retain opaque disabled/background cards as
nearest-hit blockers, preventing click-through to content behind. Darkened nodes neither hover
nor select/open. Their keyboard topic-list actions are disabled and have no focus/hover style.
Inspector reference selection uses the same eligibility check; a selection is cleared when
preview excludes it. Cancelling preview restores normal interaction. README, project instructions
and interaction documentation describe these semantics. No migration/schema/data edits.

Validation: 40 frontend checks, 22 backend checks, production TypeScript/Vite build and git diff
--check pass. All 20 focused real-Edge hover assertions and the 37-check full walkthrough pass
with zero runtime exceptions. Focused checks cover clickable groups/topics, no selection/history
from hover, domain preview clearing stale selection, disabled graph and keyboard actions, no
click-through, cancellation and dark theme. Actual before/after GPU samples show hover outlines
for groups/topics in both themes; disabled-node patches have zero pixel changes. Node-body
patches also have zero changes, confirming hover never paints over names. Screenshots inspected.
All 10 baseline factual/organization signatures remain unchanged. Browser writes used the isolated
QA store. Port 8765 serves index-DBGIP9PI.js; reload existing tabs. Existing non-blocking bundle
size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-node-hover-20261108T083357Z.zip
SHA256 0b22ec6ec7246c7f4977e902cfecd959b0a2cba88f6e85ce4fdb9726fe8ab8ee
Artifacts: output/consolidation-qa/node-hover-results.json, node-hover-pixels.json,
hover-group-on.png, hover-topic-on.png, hover-disabled-on.png, hover-dark-on.png and matching
off screenshots. Reproduce using the isolated QA helper, npm run test:hover and the documented
Playwright configuration.

## 8 November 2026 — Compact overview when returning to All domains

Accepted All-domain overviews now rebuild their complete deterministic grid rather than retaining
partial/scattered card slots from a smaller domain view. This also repairs old saved/browser
layouts reproducing the supplied L-shaped screenshot on reopen/refresh. Pending previews retain
the currently displayed arrangement. Preserve the old layer offset across the corrected geometry
key, along with camera/history; do not append another view or rewrite original saved database
payloads. Other exploration layouts continue using the shared existing packing workflow.
README, project instructions and interaction documentation explain restoration/repair semantics.

Validation: 41 frontend checks, 22 backend checks, TypeScript/Vite production build and git diff
--check pass. All 13 focused All-domain browser assertions and 24 existing domain-update browser
assertions pass with zero runtime exceptions. Actual Edge scenarios cover Technology -> All via
heading Update, Ecosystems -> All via toolbar Update, all nine cards in a tight 3x3 grid, unchanged
history/camera, an old scattered v6 session, retained layer offset (190,110), and a second reload.
The unit regression reproduces the old fallback layout before normalization and confirms a
complete compact grid afterward without mutating original data. Tight/repaired dark screenshots
were inspected. All 10 baseline factual/organization signatures remain unchanged. Browser writes
used the isolated QA store. Port 8765 serves index-CTEk1-8J.js; reload existing tabs. Existing
non-blocking bundle-size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-all-domain-grid-20261108T084341Z.zip
SHA256 157cd314e268a14a360e3247ad1273901e9e8cef73720580b5c25edc9ce90b1a
Artifacts: output/consolidation-qa/all-domain-layout-results.json, domain-update-results.json,
all-domain-tight-overview.png and all-domain-repaired-overview.png. Reproduce with the isolated
QA helper, npm run test:all-domain-layout / npm run test:domain-update, and the documented
Playwright configuration.

## 8 November 2026 — Double-click group nodes to Open group

Eligible foreground group cards now accept a native double-click shortcut for the existing
Open group action. Single click still only selects/inspects immediately. Track two valid unmoved
clicks on the same record and active scene, then invoke the same groupOpeningAction/openGroup
used by inspector and topic-list buttons. Overview cards open membership; grouped cards use the
existing toggleGroup expansion. Clear the click sequence after opening so one gesture creates
exactly one exploration and retains the original layer behind it. Ignore disabled/background
content, modifiers, layer-label gestures, HTML controls and busy state. Ordinary topics without
Open group remain inspection-only. No additional state format, API or rendering workflow.
README, project instructions and interaction documentation describe the shortcut.

Validation: 42 frontend checks, 22 backend checks, TypeScript/Vite production build and git diff
--check pass. All 11 focused real-Edge double-click assertions plus 13 existing overview/group
browser assertions pass with zero runtime exceptions. Focused checks cover single-click details,
Species membership (36 cards), exactly one request/history entry, retained source/background,
ordinary topic inspection, grouped-card expansion, darkened group rejection, Ctrl-double-click
rejection and restored opening after preview cancellation. Original button workflows still pass.
All 10 baseline factual/organization signatures remain unchanged. Browser writes used the isolated
QA store. Normal port 8765 serves index-DP2ovL15.js; reload existing tabs. Existing non-blocking
bundle-size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-double-click-group-20261108T085000Z.zip
SHA256 8e55d3f2dc3f518e7071ca33f5ba096b947d739ed6c632e86c15ac21615be2ff
Artifacts: output/consolidation-qa/double-click-results.json, double-click-expanded-group.png and
overview-grouping-results.json. Reproduce with the isolated QA helper and npm run test:double-click
/ npm run test:overview using the documented Playwright configuration.

## 8 November 2026 — Focus grouped-card openings on their actual members

Investigated the supplied Event screenshot against the accepted store. Habitats & conditions
contains 58 topics: 3 events, 1 aspect, 24 conditions, 12 habitats and 18 places. The Event entries
are Al Faisal planting pilot, Canal flooding at Al Faisal and Maysara carob establishment trial.
Their stored types are correct. The UI was cumulatively expanding Aspect and Event inside the
same broader query, retaining sibling browsing cards and survivor positions; this caused mixed
content under an Event heading and large fallback-position gaps.

Grouped-card Open group/double-click now captures that card's exact stable member IDs into an
additive v6 groupMembers field and opens a Group members scope with a typed virtual group ID.
Clear old expansions, centre/search and positions; default Group by to None and pack tightly.
Stored/root overview groups still use their complete existing organization. GET /api/explore
accepts member_ids for virtual display groups and returns canonical members/internal factual
edges, subject to domain/type filters. Type groups reject mismatched record kinds; missing IDs
produce explicit notices. These display groups never create database organization definitions.
Grouping and domain changes stay within captured membership rather than broadening to unrelated
records of the same type elsewhere in the database. Research captures group ID/label/member IDs.
The old toggleGroup action and Collapse buttons were removed; all opening paths share openMembers.

On activation, old cumulative expandedGroups data translates its last selected card into focused
membership, preserving camera/offset/source/history and original saved database payloads. Read-only
historical snapshots can still show their original mixed content with the shared scene builder.
Event restores as exactly three compact Event cards; Back restores/normalizes Aspect to its one
member. README, project instructions and interaction documentation describe the corrected scope.

Validation: 43 frontend checks, 23 backend checks, production TypeScript/Vite build and git diff
--check pass. All 18 focused membership browser assertions, 11 double-click assertions and the
37-check full walkthrough pass with zero runtime exceptions. Focused Edge checks reproduce the
reported mixed legacy scene, verify exact Event IDs/kinds, compact layout, factual-only internal
links, retained parent/source, grouping/domain changes, reload and Back conversion without new
history entries. Event screenshots were inspected. All 10 baseline factual/organization table
signatures remain unchanged; browser writes used the isolated QA store. The normal backend was
restarted without opening another tab; port 8765 serves index-CD_yT8FG.js and its live focused
Event endpoint returns exactly the three canonical Event records. Reload existing tabs. Existing
non-blocking bundle-size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-focused-members-20261108T085856Z.zip
SHA256 eb0de20578b4e17f1f94092a611ec8a616435715a1d174505c5909ba3c35746b
Artifacts: output/consolidation-qa/focused-group-results.json, event-focused-layer.png,
event-legacy-repaired.png, double-click-results.json and browser-results.json. Reproduce using
the isolated QA helper, npm run test:focused-group / test:double-click / test:browser and the
documented Playwright configuration.


## 8 November 2026 — Validate place membership and repair scattered focused layouts

Investigated Habitats & conditions -> Group by Place -> Place not recorded against the accepted
store. Its 58 members partition into 18 place anchors, three explicitly placed events, and 37
entries without an explicit place assignment (12 habitats, 24 conditions, one aspect). Place
anchors group under their own identity; other entries use their first explicit place_ids value.
No geographical inference from labels, related records or shared sources is made. Redirected
place references resolve consistently; unavailable references are labelled Place unavailable,
not mistaken for absent place assignments.

The backend now validates captured virtual place membership, removing records that no longer
match the selected place, with explicit notices. It returns the validated group_member_ids
universe before domain/type filtering so an empty domain result cannot lose its source scope.
The frontend reconciles captured membership to that universe. Opening remains one canonical
members action, with the original source visible behind it. Existing cumulative group expansions
translate through the same focused-members adapter.

Focused ungrouped membership views detect incomplete/scattered saved slots and repack to the
canonical compact grid. Healthy compact positions survive reload unchanged; pending domain
previews retain all existing positions. Preserve camera, moved layer offset and history during
repair. Asynchronous preparation uses the current mounted canvas dimensions for new layouts,
avoiding stale initial aspect ratios. README, project instructions and interaction documentation
record place semantics and restore behaviour. No factual or organization record was changed.

Validation: 45 frontend checks, 24 backend checks, production TypeScript/Vite build and git diff
--check pass. The 17 new place-scope browser assertions, 18 focused-group regression assertions
and 37-check full walkthrough pass with zero runtime exceptions. Edge checks cover the exact
37/21 partition, named Al Faisal membership, double-click opening, dense grids, source background,
domain-empty/All restoration, unchanged healthy positions, old cumulative expansions, malformed
focused memberships, reload stability, and preserved camera/offset/history. Both new screenshots
were visually inspected. All 10 baseline factual/organization table signatures remain unchanged;
browser writes used the isolated QA store. The normal backend was restarted without another tab;
port 8765 serves index-DqWPO051.js and its live endpoint validates all 58 parent IDs down to exactly
37 unrecorded-place members. Existing non-blocking bundle-size/testclient advisories remain.

Recovery snapshot: backups/pre-unrecorded-place-20261108T091008Z.zip
SHA256 88eb4e5571b29e8f596412114416af0b641929dbefebe1ccb4b5333f1d8679bc
Artifacts: output/consolidation-qa/unrecorded-place-results.json, unrecorded-place-tight.png,
unrecorded-place-repaired.png, focused-group-results.json and browser-results.json. Reproduce
with the isolated QA helper, npm run test:unrecorded-place / test:focused-group / test:browser
and the documented Playwright configuration.


## 8 November 2026 — One tight layout for every layer

Topic Explore previously used neighbour rings, while surviving positions and collision fallback
slots could leave gaps during search route expansion/hiding. All scopes now use the same compact
grid in the shared scene builder: overview, full/focused membership, direct neighbours, search,
grouped cards and previous snapshots. The explored topic keeps its centre designation in an
ordinary grid slot. Removed compactRings and the collision-fallback placer. Complete healthy grids
are reused exactly; changed/incomplete/scattered layouts repack all visible cards to fill gaps.
Pending domain previews preserve their working positions until Update succeeds.

Older complete scattered/ring layouts retain a read-only previousKey alias for their original
geometry. Resolve historical moved offsets, source highlights and closed-layer state through
that alias; carry the old offset to the corrected foreground key during preparation. Original
saved database payloads remain untouched. No new storage version, endpoint or layout engine.
README, project instructions and interaction documentation describe the shared layout and replace
obsolete survivor-position/ring requirements.

Validation: 47 frontend checks, 24 backend checks, production TypeScript/Vite build and git diff
--check pass. Replaced the obsolete ring/survivor tests with compact exploration/route checks;
added all-scope/all-grouping/viewport cases and legacy background-presentation preservation.
The 21 new actual Edge browser assertions and the existing 37-check full walkthrough pass with
zero runtime exceptions. Browser checks cover overview, Species membership, Carob exploration
(all 22 cards), background grids, old scattered topic restoration with camera/offset/history,
route expansion/hiding with exact factual IDs, Back/Forward, grouping, staged domain Update,
centre removal, reload and fullscreen/resize stability. Visually inspected topic-tight-grid.png.
All 10 baseline factual/organization table signatures remain unchanged. Browser writes used the
isolated QA database. Normal port 8765 serves index-B5NkiDdG.js; reload existing tabs. Existing
non-blocking bundle-size and testclient deprecation advisories remain.

Recovery snapshot: backups/pre-all-tight-layout-20261108T092243Z.zip
SHA256 c0b28e6443a01be1f22fd75da5b1e9f0ce396bd79cda382855d22e1be5c393fd
Artifacts: output/consolidation-qa/tight-layers-results.json, topic-tight-grid.png and
browser-results.json. Reproduce with the isolated QA helper and npm run test:tight-layers /
npm run test:browser using the documented Playwright configuration.


## 8 November 2026 — Reduce mouse drag sensitivity

Applied shared DRAG_SENSITIVITY=0.5 to layer-label ray-plane displacement, OrbitControls panSpeed
and custom Ctrl/Shift rotation. Layer movement and panning respond at half strength; custom
rotation now uses 90 rather than 180 degrees per viewport span. Retain +/-60-degree limits,
25-degree Reset view, pointer capture, four-pixel drag threshold, cancellation and persistence.
README, project instructions and interaction documentation describe the setting.

Validation: all 47 frontend and 24 backend checks, production TypeScript/Vite build and git diff
--check pass. All 17 targeted Edge gesture assertions pass with zero runtime exceptions,
including measured half-pointer layer movement, nine-degree rotation for a tenth-viewport drag,
both rotation limits, foreground/background movement, unchanged semantic scope/camera during
label moves, Escape cancellation, reload persistence and Reset view. All 10 baseline factual/
organization signatures remain unchanged; browser checks used the isolated QA store. Normal
port 8765 serves index-DpxA_w6k.js. Existing non-blocking build/testclient advisories remain.

Recovery snapshot: backups/pre-drag-sensitivity-20261108T100030Z.zip
SHA256 cc91cf67ea096ad76a7ec547038da9129350270cff80ba656883c37787007e2a
Artifacts: output/consolidation-qa/gesture-results.json and layer-gestures-dark.png.
Reproduce using the isolated QA helper and npm run test:gestures with the documented Playwright
configuration.


## 8 November 2026 — Slow existing camera transitions

Increased the shared camera-move duration from 300 to 600 ms. It covers framing a new exploration
without a saved pose, Fit, Reset view, zoom buttons and angle buttons. Keep reduced-motion moves
and saved camera restoration immediate. The renderer retains its existing easing and pan damping;
mouse sensitivity remains 50%. Group/layer content, layout, route reveal, hover, themes and panels
still update immediately; no additional animation pipeline was introduced. README, project
instructions and interaction documentation describe the actual transition inventory.

Validation: 47 frontend checks, 24 backend checks, production TypeScript/Vite build and git diff
--check pass. Seven focused real-Edge checks pass with no runtime exceptions: sample projected
heading controls during Zoom in, Fit, Turn left and Reset view; all four remain in motion after
300 ms and settle by 750 ms. Camera moves add no exploration history; reduced-motion zoom is
already settled at the first 100-ms sample. All 10 baseline factual/organization signatures remain
unchanged. Browser checks used the isolated QA server. Normal port 8765 serves index-BUH78HH4.js.
Existing non-blocking bundle-size and testclient advisories remain.

Recovery snapshot: backups/pre-slower-transitions-20261108T100232Z.zip
SHA256 1ea3f1ba58a27edca1812cca633a586ab1510574054540962f7431b378c9b95c
Artifacts: output/consolidation-qa/transition-results.json and check-transitions.mjs. Reproduce by
running that Node script against the isolated QA helper with KGB_PLAYWRIGHT_MODULE configured.


## 8 November 2026 — Store and display Spanish, English and scientific species names

The user explicitly authorized a naming-only database update, separate from the prior rendering
consolidation's knowledge freeze. Read current organization/records/export and prepared the
revision-based species-names-es-en-scientific-2026-11-08 batch. Validated/applied first in the
isolated QA store, then validated/applied through backend.cli to the accepted store: revision 3
-> 4, exactly 34 existing species topics updated, zero added/merged/deleted topics, relationships,
findings, coverage, unresolved records or organization changes. Original labels, aliases, source
refs, descriptions, place/date/aspect fields and every existing scientific spelling are intact.
Added scientific correspondences only for previously unnamed almond/olive and genus-only Citrus.

Separate nullable spanish_name/english_name/scientific_name fields are persisted on each stable
ID, with name_status, name_note and naming-reference metadata. 32 records have all three names.
Chamaespartium tridentantum and Whitania frutescens remain source-spelling concepts with explicit
unconfirmed common names. Trial Pinus halapensis retains that spelling and generic Pine/Pino;
Citrus spp. never implies species identification. The two Holm oak source concepts and the two
almond records remain separate. Names already supported by aliases/labels are retained; new
correspondences were checked against EPPO, CSIC, Junta de Andalucía, SANBI, the Catalan
Ornithological Institute, La Laguna's botanical guide and an original Naturetrek botanical report
for Silk vine. External citations concern names only, with field/date/context provenance. No new
ecological/locality/trial claims or PDF pages were ingested. Nine source records and 68 selected
PDF-page coverage stay unchanged; original source files were not modified.

All species cards now render ES/EN/Sci rows, scientific text italic, wrapping/font fitting inside
unchanged card geometry. Shared speciesNames supplies inspector/accessible lists and explicit
missing values. Group/non-species cards keep their labels. Historical geometry/identities stay
intact while name metadata follows the current canonical ID. FTS indexes all three fields beside
legacy aliases. Research contexts capture names/status/notes/references and prompts include names
by stable ID. Inspector exposes exact database ID and naming-reference links. README, import
contract, project instructions and interaction documentation describe the fields and uncertainty.

Validation: 48 frontend checks, 26 backend checks, production TypeScript/Vite build and git diff
--check pass; the naming backend test passed again after adding prompt names. Fourteen focused
Edge naming assertions and the full 37-check browser walkthrough pass with zero runtime
exceptions. Canvas interception verifies all 34 actual card textures contain the three expected
rows and no line exceeds available width/row bounds. Tests cover source/genus badges, unchanged
IDs, search in each name form, provenance, inspector/list/exploration/reload and explicit missing
values. Both new screenshots were visually inspected. Accepted-store pre/post comparison proves
all unrelated tables and topic fields unchanged, all existing scientific spellings preserved,
and SQLite integrity/foreign keys valid. New baseline: backups/species-names-r4-baseline.json;
original revision-3 baseline retained. Normal backend restarted without another tab, serving
revision 4 and index-BRl4BXkc.js. Existing non-blocking bundle-size/testclient advisories remain.

Database recovery: backups/knowledge-r3-20261108-110730-477417.sqlite (plus automatic pre-import
backup). Source/build recovery: backups/pre-species-names-20261108T100730Z.zip
SHA256 7c3227daa7b5afd41ad804924fc4c5db7a31486b9121c1a48a0e0de2767b698f
Pre-change export: data/pre-species-names-snapshot.json. Accepted input:
imports/species-names-es-en-scientific-2026-11-08.json (immutable batch ID).
Artifacts: output/consolidation-qa/species-names-results.json, species-names-grid.png,
species-names-exploration.png and browser-results.json. Reproduce with the isolated QA helper,
accepted naming batch in that QA store, npm run test:species-names / test:browser and the
documented Playwright configuration.


## 8 November 2026 — Prevent the source-document blank window

Found a concrete matching failure in the normal server log: an open older main bundle requested
/assets/PdfPanel-Bu3idKqY.js after a rebuild had removed that asset (404). Reload then fetched the
new main/viewer bundle and opened the document. Reproduced the same path in actual Edge by
returning 404 for the deferred PdfPanel asset: React reported Failed to fetch dynamically imported
module and #root had zero children. The blank window follows the current background theme;
the user's dark theme appears black. Baseline reproduction JSON/screenshot are retained.

Removed the deferred React.lazy/Suspense viewer import and bundled the existing PdfPanel/PDF.js
with the main app. Documents, worker, fonts and other PDF resources still load on demand; the
first source click cannot request an obsolete PDF-viewer chunk. Added PdfBoundary around only
the source panel so unexpected viewer render/effect errors cannot unmount the graph. Its error
panel keeps Close source, Retry source and direct original-PDF access. Ordinary loading/rendering
errors also have Retry source. PDF load cleanup rejects late/superseded completions, catches
synchronous initialization/destroy failures and retains the last usable app. Repaints await
cancellation completion before reusing the same canvas and only active tasks commit page/status.
No alternate viewer, automatic page reload or knowledge change was introduced.

Validation: all 48 frontend checks, 26 backend checks, production TypeScript/Vite build and git
diff --check pass. The 20 focused real-Edge source checks and full 37-check browser walkthrough
pass with zero normal-operation runtime exceptions. Focused checks block obsolete chunk URLs,
verify first-click exact citation and actual nonblank PDF pixels, exercise page/zoom/rotation,
503 failure + retry without refresh, rapid close/reopen and canvas repaint cancellation, and open
all nine registered source editions. A deliberately malformed source metadata response triggers
the viewer boundary while the graph survives; Close restores the same centre. Before/working
screenshots were inspected. All 10 revision-4 baseline knowledge/organization signatures remain
unchanged. Browser checks use the isolated QA database. Normal port 8765 serves index-8Bs1ZtCx.js,
with no PdfPanel-*.js shipped. PDF worker asset remains pdf.worker.min-CIqJB0yW.mjs. The existing
bundle-size advisory remains; startup gzip grows approximately 135 kB by bundling the viewer.
README, project instructions and interaction documentation describe the loading/recovery model.

Recovery snapshot: backups/pre-source-viewer-fix-20261108T101643Z.zip
SHA256 d247abf0e81ccd8e1fb116a0c7087621bc97f6cd24d6a8b5a8e70c9fe364812a
Artifacts: output/consolidation-qa/source-blank-before.json, source-blank-before.png,
source-viewer-results.json, source-viewer-working.png and browser-results.json. Baseline repro
script is reproduce-source-blank.mjs in that output folder. Reproduce the regression suite with
the isolated QA helper, npm run test:source-viewer / test:browser and the documented Playwright
configuration. Existing tabs need one reload to load this replacement main bundle.


## Plant illustration intake — 8 November 2026

Published checked batch plant-illustrations-and-focused-profiles-2026-11-08 at revision 5.
The 46 original RGBA PNGs are linked to 23 canonical plants, with 69 WebP derivatives.
Added 10 species, 4 habitat topics, 16 relationships, 7 findings, 12 sources and 3 factual
PDF positions. All original factual fields/relationships/findings and browse groups remain
intact; 13 existing topics gain illustration notes. Existing nine source files and all old-app
images retain their original SHA-256 hashes. Registered source files now have portable copies.

Validation: 43 backend tests, 48 frontend tests, 39 plant-image browser checks,
20 PDF-viewer regression checks, production build and git diff --check passed.
Image checks include all 23 pairs, canvas name bounds, original-size views, narrow screens,
themes, persistence, missing-image/thumbnail errors, retry and PDF/image/web source handling.
No browser JavaScript exceptions. The existing Vite main-chunk size advisory remains.

A relocated copy served 136 image/source requests with an audit hook
installed before backend import forbidding access to the old repository. Live revision-5
Carob viewer also opened and decoded on the normal server (8765). Browser writes remain isolated.
Artifacts/report: output/plant-images-qa/; PLANT_IMAGES.md.
Recovery snapshot: backups/pre-plant-images-20261108-112805/. Post-import full backup:
backups/knowledge-r5-20261108-114920-203462.sqlite and matching .media.zip.

Fine Salsola morphology was not newly verified when its old detail PDF was rejected; Kew
identity and UAL habitat evidence were used instead. Kew's archived record explicitly identifies
a reviewed excerpt, since direct webpage archiving was denied. The report preserves all
coverage limits and distinguishes old illustration-review notes from new botanical findings.

Additional live-renderer regression: 22 hover/picking/domain checks passed against the
isolated image-enabled store, including clicking artwork without navigation and rejecting
domain-excluded artwork clicks. No runtime exceptions.


## Complete document-library ownership — 8 November 2026

Copied 378 opaque files recursively (601,507,644 bytes), preserving the tracked EPUB: 379 files,
603,608,676 bytes total. Original bytes and all copied modification timestamps match. Identical
rerun returned unchanged. Ten existing graph-source matches are metadata only, not new ingestion.
The database file SHA-256, schema and accepted knowledge/source/search fingerprints remain unchanged
at revision 5. All 21 registered citation-file endpoints still return their registered hashes.
No importer, bootstrap, registration, text extraction or indexing ran; app code/server stayed intact.

21 tool tests passed; one native symlink-creation check skipped for Windows privileges (mocked
symlink and junction rejection both passed). Coverage includes partial-publication interruption,
source mutation, collisions, preserved content, low space, corruption and archive restoration.

Verified backup: backups/document-library-20261108T112426791307Z.zip
SHA256 5a0f30815699813992e47663a5307ec4594df3e158e7dab73e93a242b70aa8cd
A full restore into an empty test root verified all 379 files and the identical inventory with
old-repository access blocked by an audit hook. Full report: DOCUMENT_LIBRARY.md. Read-only
baselines and verification receipts: backups/pre-document-library-20261108T111828Z/.
