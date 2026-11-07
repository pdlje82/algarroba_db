# Prototype two: independent layered browser

Current interaction revision approved 7 November 2026. README.md describes user controls;
this file describes implementation contracts. The updated prototype brief remains authoritative.

## Architecture and boundaries

One React/TypeScript frontend, react-force-graph-3d1.29.2, one Three.js0.187.0 installation,
fCoSE2.2.0 in a disposable XY worker, PDF.js6.5.438, react-rnd10.5.3, FastAPI and SQLite.
Dependencies remain pinned and bundled for offline use. The original nine sources and selected
68 PDF positions are unchanged. Original library files remain read-only. No AI API, autonomous
researcher, new ingestion, hosting, new schema or knowledge/organization import is part of this revision.

## Layers, ownership and contents

The overview always contains nine stable knowledge areas on the base plane. Its grid and spacing
adapt to the usable viewport; at unchanged proportions navigation preserves the map. An opened
expansion has a stable ID, kind, anchor, dependency parent, scope, resolved membership, band,
local grouping mode and independent mode offsets/slots. Depth is presentation order, not layer
identity or evidence strength. Bands are 1560 units apart (three times the earlier520-unit gap).
New detail opens at the next front band.

Opening a centre preserves source cards/slots/membership. The centre retains its source card and
CENTRE badge; its connections layer contains neighbours, not a duplicate centre. An unseen centre
gets a small named origin. Permanent-group contents and connections are separate expansions with
independent front bands in Layered mode, each with its area centre at the source card's XY.
Flat mode packs panes side by side with a100-unit margin. Repeats reuse an expansion and do
not accumulate depth. Ordinary clicks open a group anchor's contents or a topic's neighbours.
Explicit Open connected topics bypasses the organized-contents default.

Dependency parents determine which descendants close. Returning brings the chosen layer forward,
folds its descendants and keeps unrelated branches in place. Zoom out follows the current branch;
at the overview it closes remaining branches. Return to overview closes all in one history step.
A single full card represents each factual identity. Existing hosts are retained when another
layer opens. Other memberships get compact dashed location links with their host name. All-shared
layers have a complete reference list/explanation; genuinely empty scopes have a research action.
Closing a host rehosts still-required cards into surviving reserved member slots.

All scopes are complete. No More nodes, pagination, endpoint48 cap or120/240 admission caps remain.
Nested permanent groups remain anchors. Per-layer All topics/Group nodes is saved independently;
the overview stays grouped. Display-only groups never recursively represent themselves.
Summaries and internal badges retain exact IDs and count factual relationships once. Group
membership is organization and never a route shortcut. Routes retain six/eight-step reach, up to
three alternatives, and every included intermediate. Existing endpoints stay fixed on route reveal.

## Layout, navigation and handles

Usable viewport aspect accounts for interface/inspector bounds. New ordinary scopes use balanced
label-sized grids; direct neighbours use elliptical rings. Native result arrangements retain
comparison columns, classifications, source groupings, dates including Undated, places and
conditions/components. Large categories use several reading columns. All panes wrap their own
visible cards, location references and optional research cards with32-unit side/bottom margins,
a100-unit heading band and a300x240 minimum. No pane stretches to match the viewport ratio.
Layer titles use30-world-unit bold text (larger than card body text), wrapping to two lines in
the available header width. Position menus10 CSS pixels above the highest projected pane edge,
including during turning/resizing. Keep menu hover and keyboard focus stable across the gap.
New/changed scopes use compact reading slots with24-unit card clearance. Connections use complete
elliptical rings with checked rectangular-card clearance; collisions never scatter nodes into a
grid. Comparison columns, classifications, dates/Undated, places and source groupings retain their
native order. Compact this layer explicitly repacks the active mode while retaining the pane's
position; ordinary selection and resizing preserve completed slots. Manual offsets survive.
The overview chooses dense rows/columns for the viewport proportions and places its
nine cards across that frame. Three-column views retain ecosystem/technology/funding columns;
narrower or wider layouts retain deterministic domain order. Resizing animates cards and their
attached lines together, never invokes automatic fitting, and preserves exploration/camera state.

Grouping toggles recompute bounds from visible cards/reference slots, excluding hidden cached
slots and the empty local origin. Group cards use compact grids rather than connection rings;
factual slots and manual layer offsets survive toggling. Frames animate their bounds over300ms,
or change immediately with reduced motion. Stable layer-ID hues tint both surface and border in
both themes; compositing keeps the finite surface tint separate from the empty canvas colour.

Each opened layer has four corner handles. Pointer capture plus ray/plane intersection translates
all its geometry in XY. Four pixels start a drag; controls are suspended; cancellation restores
the initial offset. Release commits one action. Arrow keys move20 projected pixels; Shift60.
Layers menu movement, Fit this layer, Reset position and Collapse remain reachable off screen.
The overview has no handles. Hover is independent of edge/card picking: exposed borders first,
otherwise nearest surface,100ms activation,150ms exit grace,120ms fade. Protected cards/active
connections retain click priority. Hover changes outline/tint only.

Ctrl/Shift-drag and angle buttons turn between15–60 degrees tilt and +/-60 sideways; default25/0,
no roll/rear viewing. Background drag pans. Flat uses a perpendicular camera, independent XY
slots/camera and the same identities. Restoring complete snapshots skips layout. Fit, theme,
resize and restoration never trigger zoom-out collapse. Exploration transitions take300ms,
or are immediate with reduced motion. Handle movement follows the pointer immediately.

## Rendering and compositing

Camera-facing sprites are not used for cards. Textured XY meshes/badges/headings stay aligned
with their plane. Project actual corners to quadrilaterals. Straight lines attach to their screen
boundary and intersect camera rays with each owning plane; arrows meet the target. Routes are
multiple straight factual steps. No obstacle detours remain. Complete LineGeometry replacements
update render/pick/depth proxies together and dispose retired geometry.

Selection focus defaults on, independently saved. Inactive cards/labels receive extra25% darkness
and half alpha, also in Flat. Active lines overlay muted cards; protected active cards mask their
labels. Context lines stay faint with suppressed labels. GPU cache entries retain BOTH disposable
ForceGraph data identities and root Object3D identities. Changed visual children are replaced;
movement reuses card textures and line objects without another layout.

Background effects remain independent: Blur off, Darken on25% (0–60), Transparency on50% initially.
Background layers use reusable half-float buffers with opaque interiors before layer alpha.
Apply darkening to pane tint/area, border, headings and content. For faint background surfaces,
include a black shadow coverage of the selected strength while retaining premultiplied tint
colour; do not leave the area below the tint undarkened. Surface coverage and RGB then receive
the layer's50% opacity once. Keep own-card interiors opaque before that operation. Cached frame
materials follow hover colour/opacity updates without changing source materials or textures.
Surface shading does not punch holes over cards hosted in older layers.
Depth blur grows1.25 CSS pixels per older plane, capped4. Surface blur has sigma2 and is clipped
to the finite current surface using a separate world-Z test. Selected and background-to-front
segments skip depth blur but still receive frosting physically behind the surface. Foreground
content stays sharp. Empty surfaces never overwrite focus depth. Flat and the bare overview
have no background effects; selection focus remains available. Preserve averaged RGBA in Bokeh,
linear composition and OutputPass colour management. Dispose targets/material variants/workers;
fall back to a sharp usable graph on failure. PDF pages and HTML panels remain outside effects.

## State, requests and maintenance

Version5 state and history use kgb:exploration:v5. Original v4/v3/v1 keys remain untouched. Migration
recovers retained source memberships, anchor homes and usable XY/cameras into independent owner
surfaces; obsolete More selection resolves to its group. Named descriptors, modes, hosts,
references, parents/bands, slots/offsets/grouping, cameras, routes, selected facts and revision are
saved. Additive v5 metadata stores source-card IDs, packing stamps, compact requests, local pane
centres and per-mode manual-position flags, including perspective arrangement caches. Old saved
coordinates are adopted intact; opening a cached pane or Compact applies the new packing policy.
New automatic Layered placements align the final pane bounds, including references/research
cards, to the actual source card. Reopening automatic panes realigns to a moved source; explicit
manual positions stay put. Unseen centres get a separate origin plane. Scene commit generations
prevent stale frames from overwriting a move. Scope/layout
pooling keeps history compact; a local IndexedDB mirror covers localStorage capacity failures.
Appearance/effects/selection focus/hover/fullscreen/panel bounds remain separate preferences;
fullscreen never restores automatically. Saved-view and research payloads capture full v5 state.

The frontend always requests /api/view?all_results=true. This additive mode removes match,
endpoint, branch, finding, provenance and display-count truncation. Legacy callers retain bounded
responses. Prepare the full candidate off screen; cancel superseded work and commit only success.
A20-second overall placement deadline terminates the worker and preserves the last working view.
Fixed semantic reading slots are fCoSE constraints; completed caches do not rerun placement.

Topic inspection includes current organization revision, primary/shared memberships, parent paths,
anchored groups, member IDs and maintenance rules. CLI inspect and exports expose the same context;
research handoffs capture current definitions/rules automatically. Maintenance instructions require
reading current stored organization generically. Specific rules belong in group definitions, not
hardcoded topic-specific project instructions. Distinguish permanent organization from temporary
perspective groupings. Capture useful supported discoveries across the agreed domain, including
outside the question and visible scene. Keep validated transactional imports, reconciliation,
duplicate prevention, backups and the manual Codex Desktop handoff.

## Modules and recovery

- layerState.ts: v5 migration, complete scopes, independent commands, dependency returns and moves.
- layerScene.ts: canonical hosting/references, complete ledger, native reading slots and candidates.
- compactLayout.ts / overviewLayout.ts: dense grids and non-overlapping rings, with responsive overview ordering.
- scene.ts: shared types/snapshot capture and retained legacy projection regressions.
- SceneView.tsx / rendererCache.ts: Three objects, stable disposable bindings, picking and controls.
- cardGeometry.ts / connectionGeometry.ts: card-plane projection, ports and complete GPU paths.
- bokeh.ts / backgroundEffects.ts: depth/surface composition, selection focus and preferences.
- explorationStorage.ts: pooled history and local storage/IndexedDB session recovery.
- main.tsx / workspace.tsx: independent controls, shared inspector, fullscreen, PDFs and research.

Pre-revision source/build snapshot, including uncommitted files:
backups/pre-independent-layers-20261107T101700Z.zip (497 files), SHA256
461123ac7b2008db3c7e99f0c6e55e70991fecd173fb3b8fc55fa93614dc345f.
Earlier snapshots remain in data/prototype1-backups, documented in VERIFICATION.md.

See VERIFICATION.md for actual test results and browser limitations. Before/after examples live
in docs/screenshots/independent-layers. Dense complete scopes can still have crossings/overlap;
use layer movement, Group nodes, filtering, Flat view, zoom and individual relationship inspection.
Human comfort with carob communities, Cocoon, drones and AL20 gates any additional ingestion.
