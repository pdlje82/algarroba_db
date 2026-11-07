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

## Independent layers and renderer contracts (v5)

Read PROTOTYPE_TWO.md. Keep semantic records separate from surfaces, cards, references, handles
and summaries. The nine-area overview stays on Plane0 and reflows its grid/spacing with usable
viewport proportions. Its coordinates stay stable through navigation at the same proportions;
window resizing must not move manually positioned detail layers or collapse branches. Stable layer IDs
identify expansions; dependency parents determine collapse, and presentation bands determine Z.
Keep the selected anchor in its source layer. Connections and permanent-group contents are
separate expansions. New Layered panes use separate front bands and centre their area on the
source card's XY position; Flat packs panes beside one another. Children open at the next band.
Use the shared1560-unit PLANE_GAP in rendering and legacy band recovery; do not hardcode old gaps.
Returning folds only descendants; unrelated branches survive. Return to overview closes all.
One canonical card per identity; shared members use labelled navigation references. When a host
closes, surviving memberships rehost into reserved slots. Never leave an apparently empty layer
when it has references or cached source members. Group mode is local to each layer.

Every pane wraps its own visible cards/references with small margins and a heading/control band;
do not stretch pane bounds to the window ratio. Compact new/changed contents with readable card
clearance, keeping rings, native perspective groups and manual pane offsets. Compact this layer
is a reversible action for existing/saved arrangements. Ordinary selection must not repack.
Adopt older saved coordinates until reopening, changing their contents or explicit compaction;
complete new packing snapshots restore directly. Empty panes retain controls.

All scopes are complete, without More nodes, endpoint pagination or 120/240 display caps.
The frontend requests all_results=true. Route reach remains six/eight steps, up to three
alternatives; comparison still uses explicitly chosen methods. Admit candidates atomically,
cancel superseded workers and apply a 20-second deadline. Never silently truncate a layer.
Deterministic reading slots and native perspective groups are fixed fCoSE constraints; completed
v5 snapshots skip layout. Preserve offsets committed while requests are pending.

Cards/badges/headings follow their XY plane. Connections are straight 3D segments, attached at
actual projected quadrilateral edges using ray/plane intersections. No obstacle detours. Render
all constituent facts exactly once as links, summaries or internal badges. Replaced geometry
must update drawing, picking and blur proxies together. Use only public Three APIs.

Four corner handles translate an opened layer in XY, never resize or change depth. Pointer
capture, four-pixel threshold and ray/plane movement suspend camera controls; cancel restores
the starting offset and release commits one history step. Keyboard arrows move 20 projected
pixels, Shift-arrows 60. The overview has no handles. Preserve stabilized independent hover
(100ms entry,150ms exit,120ms fade). Hover never changes focus, blur, camera or exploration.

Selection focus adds 25% darkening and half opacity only to unrelated cards/labels. Active lines
can cross muted cards; protected active cards hide lines under labels. This selection effect
also works in Flat. Keep background effects independent (default Blur off, Darken25%, alpha50%).
Render each background layer into reusable half-float targets, then physical world-Z clipping and
finite-surface frosting. Selected/background-to-front lines skip depth blur, never frosting.
Empty planes must not stamp focus depth. Preserve averaged RGBA in the Bokeh shader. Restore a
sharp usable view if effects fail; PDF/HTML colours stay outside graph effects.

Keep disposable renderer data AND root GPU objects stable when reusing ForceGraph objects;
rebinding a reused object to a new data identity before the old mapping is removed corrupts its
mapper. Swap changed child assets, dispose retired resources, and reuse textures/lines during
layer movement. Disable continuous forces and node dragging. Camera limits: tilt15–60 degrees,
sideways +/-60, default25/0; Ctrl/Shift-drag and angle buttons share limits, with no roll/rear view.
Flat is perpendicular and has independent positions/cameras. Fit, resizing, theme and restore
must never invoke semantic collapse. Keep 300ms transitions or immediate reduced-motion changes.

State/history v5 uses kgb:exploration:v5 and preserves original v4/v3/v1 keys. Pool repeated scopes
and layout caches; mirror sessions in local IndexedDB so a full localStorage does not lose a
working exploration. Fullscreen, appearance, effects, selection focus and inspector bounds stay
outside exploration history. Saved-view/research payloads include full structured scene state.

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
