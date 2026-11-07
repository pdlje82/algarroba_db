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
