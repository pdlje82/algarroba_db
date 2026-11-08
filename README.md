# Algarroba Knowledge Browser

A local, offline browser for connected restoration, water, drone and LEADER knowledge.
The v6 workflow, approved 8 November 2026, replaces independent panes and ten perspectives
with one active Layered 3D graph, filters, grouping and a docked inspector.

## Start

Double-click **Start Knowledge Browser.cmd**. It opens http://127.0.0.1:8765.
Use **Stop Knowledge Browser.cmd** to stop the local server. Knowledge and saved explorations persist.
For a fresh checkout run **Setup Knowledge Browser.cmd** once. Existing source PDFs must remain
at their registered paths. After this upgrade the backend must restart and the browser reload.

## Explore

**Groups & communities** opens permanent group editing and the community planner.
Create/rename folders, move or share topics, build communities from existing plants,
and enter irrigation values per member and lifecycle stage. Source values and user
adjustments retain separate origins and history. See [Community planning](COMMUNITY_PLANNING.md)
for controls, maintenance, conflicts, Undo/Redo and recovery. Source-backed topic names
remain under Codex maintenance; Group by still changes presentation only.

1. Open one of the nine sidebar groups. Its complete organized contents open in the foreground; the original layer remains darkened behind.
2. Click a card or line to inspect it. Selection never opens, closes, recentres or rearranges.
3. Choose **Explore this topic** to make it the centre. Without search, all direct neighbours open.
   The Centre dropdown invokes the same action. Anchored groups also offer Members / Connections.
4. Enter a search to find stored matches and explainable routes from the centre. Names, aliases,
   findings and curated page text are searched; no research starts automatically.
5. Domain and Topic type filter endpoints. The centre and required connecting context remain visible.
   Group by None, Browsing family, Topic type or Place. Changing Group by updates the current
   layer in place, preserving its camera and position. Opening a group is separate: use Open group
   (or Members) to bring its contents forward and retain the original layer darkened behind it.
6. Select a route for its explanation; **Show steps / Hide steps** unfolds it. **Show all route steps**
   uses the same mechanism. Shared intermediate topics appear once. Alternative routes retain
   source evidence. Reach starts at six steps; **Look farther** extends to eight, with up to three
   alternatives. Reaching the route work budget is explicitly reported, never treated as proof
   that a connection does not exist.

**Remove centre** removes its card and attached lines, then repacks the remaining cards to fill
its space in the current layer. The surrounding neighbour/search results and captured query
origin remain available; no extra layer is created. Camera and layer movement stay unchanged.
The next explicit exploration uses the current centre choice. Opening a membership group clears
the previous centre and shows only that group's members; an unrelated Drones centre cannot be
injected into Species. Clearing search returns to direct neighbours,
or to the overview when no centre exists. Return to overview shows a single layer, keeping the
selected domain/type filters and centre/search marker. Other-domain centre cards are omitted
from a domain-filtered overview. Closed layers stay closed when you start exploring again.

**Place not recorded** means no explicit primary place annotation is stored on that topic.
Place entries belong to their own place group; other topics use the first recorded place ID,
with identity redirects resolved. Opening a place group validates its members again, so records
assigned elsewhere cannot leak into the opened layer. Unknown referenced place IDs are labelled
Place unavailable, separately from genuinely unrecorded places. Grouping does not infer or write
geographic facts from a topic's name, source co-occurrence or arbitrary relationships.

Opening a grouped card creates a focused, compact member layer. It contains exactly the topics
represented by that card, with Group by initially None. Other group cards and previously opened
groups stay in history, outside the new layer. For example, Event in Habitats & conditions opens
its three Event records; it does not retain the previously opened Aspect or the Condition/Habitat/
Place browsing cards. Grouping and domain changes remain within that captured membership.
Use Back or Close layer to return. Older cumulative group expansions reopen as the last focused
group, without changing their original saved database payloads.

**Double-click a group node** to run the same **Open group** action offered in the inspector
and topic list. A single click still only shows details. Double-clicking an ordinary topic
keeps inspection; it does not invent a group or change the centre. Darkened/read-only nodes,
layer labels, modifiers and drag gestures cannot trigger this shortcut. Each double-click
opens one exploration and retains the original layer behind it.

Clickable foreground topic and group cards show an accent outline and pointer cursor on hover.
Hovering only previews interaction; it does not select, navigate or enter browsing history.
Domain-excluded darkened cards cannot be hovered, selected or opened, including through the
Visible topics list. Cancelling the domain preview restores interaction. Previous-view cards
remain read-only, including the bright source card of an open child.

Changing **Domain** previews the choice in the current layer: topics outside that domain and
links attached to them become dark, while all cards stay in place. Click **Update** beside the
layer heading's X to remove those topics and repack the remaining nodes tightly in this same
layer. The toolbar has an **Update layer** fallback. Returning to All domains rebuilds the
complete overview as a compact grid. Older scattered overview layouts are repaired on reopening,
while preserving the layer movement and camera. This never adds a view or background layer. Choosing the already-applied domain cancels
the preview; choosing All and Update restores the scope's full membership. Centres and required
route steps remain as connecting context. Mixed-domain group cards show how many members match.
Pending choices survive reload and saving; a failed Update retains the working graph and preview.

## Navigation and reading

Layer headings display the opened group/node name, such as Species & companions or Cocoon planting reservoir.
The active heading has a subtly tinted background so it stands apart from the window in light and dark themes.
Use the **× Close layer** button beside a layer heading to close it. The toolbar's **Close layer**
button closes the foreground when its heading is off screen. Closing a previous-view snapshot
hides only that snapshot; it does not replace it with an older one. Closing the foreground restores
its nearest visible previous layer, or the selected-domain overview when none remain. The base
overview stays open. Browsing history is retained; Back can restore a closed foreground view.

One live foreground graph is accompanied by at most two **Previous view** snapshots behind it.
These are read-only history, not additional live knowledge. Back/Forward restores complete views;
a new exploration after Back replaces the forward branch. Up to100 history entries are retained.
The active layer has a theme-matched background at 70% opacity across its entire frame,
including connection-layer gaps. Topic cards, headings and connection labels remain opaque.

Drag a layer label to move the entire layer in X–Y, including previous-view snapshots.
Escape cancels a move. Placements are saved without adding an exploration-history step.
Mouse dragging uses 12.5% sensitivity for layer movement, panning and rotation,
with no camera drift after release.
Drag empty space to pan. Ctrl/Shift-drag or angle buttons turn up to60 degrees in either
direction around both X and Y; the initial tilt is25 degrees. Zoom changes magnification only.
Fit and Reset view frame the current graph. **Explore this topic** without a search places
the centre in the middle, with its neighbours on upper and lower arcs fitted to the layer.
Nine neighbours use four positions above and five below; other counts split as evenly
as possible. The arcs reflow with the window proportions and reserve clear space for
cards and readable, wrapped connection labels. Incoming/outgoing arrows
retain their direction; grouping keeps different relationship meanings and directions
separate. Parallel or secondary labels can have short leader lines into clear space.
Overview, membership and search scopes retain the compact grid. Removing the centre repacks
its remaining neighbours as a grid. Topic membership and order stay stable during reload,
turning and zoom. Resizing and fullscreen adapt the arcs without adding a history entry
or losing layer offsets. Domain preview retains positions until **Update layer** succeeds.
Older direct-exploration grids translate to circles in memory while retaining layer offsets,
opening highlights and closed-layer references; saved database payloads are not rewritten.
Camera framing, Fit, Reset view, zoom buttons and angle buttons transition over 600 ms.
Reduced motion removes camera animation. Dense graphs still benefit from
filters, grouping, zoom and the keyboard-accessible **Visible topics** list.

Foreground cards and labels are opaque. Previous snapshots are darkened65%, except the source node of an open child layer: it stays
at full brightness with a highlighted outline so the connection to the foreground is visible.
The highlight follows the chain of open layers and disappears when its child closes; selecting
another topic in the sidebar does not change it. Selected cards
use an outline and active lines are stronger. Blur, frosting, transparency controls, Flat mode,
independent panes, the miniature map and corner pane handles have been removed.
Layer-label dragging is retained as a simple presentation control.

The inspector stays docked in both normal and full screen. Appearance offers System/Light/Dark.

## Evidence, dates and comparison

- **Details** explains the selection and its real relationships. Group summaries/internal lists
  preserve the actual constituent IDs. Organizational membership does not establish a fact.
- **Evidence** shows findings, guidance, conditions and sources for the selection, or the current
  graph when nothing is selected. Source buttons open exact one-based PDF positions, which can
  differ from printed page labels. PDF navigation, zoom and rotation remain available.
  The viewer is bundled with the app so an already open tab does not request an obsolete
  viewer chunk after a rebuild. Loading/rendering errors stay in a closable source panel;
  **Retry source** retries without refreshing the graph. The original-PDF link remains available.
- **Dates** distinguishes topic/event dates from source publication and edition dates. Unknown
  dates stay unknown. A document date is never assigned to every finding in it.
- **Comparison** displays up to four chosen topics as a table. Missing values say Not recorded;
  each topic retains its source and trial context. It is not a controlled head-to-head trial.

The initial collection contains nine registered editions and68 selected PDF positions. The plant
intake adds twelve sources and three curated PDF positions (21 sources and71 positions in total).
Other pages can be viewed without being imported. Source findings, source guidance and curated discovery associations
remain distinct. Drone citrus spraying is not evidence for carob establishment watering, and
funding connections are not eligibility decisions or awards. Current availability is unverified.

## Save and research

**Save view** stores scope, centre, search, filters, grouping, route expansion, comparison, positions,
camera and history. **Saved explorations** reopens them. Browser sessions also use IndexedDB when
localStorage is full. Version1/3/4/5 explorations translate into v6 without modifying originals;
old multi-pane geometry is not preserved exactly. Legacy evidence/date/comparison choices open
in their corresponding inspector tabs.

**Research** captures the selection or foreground graph, exact factual IDs and routes, filters,
grouping, source context and revision. Choose research areas, optional custom topics/documents,
and Library only (default) or Library and web. Preview/edit/copy/save a static prompt; ask Codex
Desktop to perform it manually. The app does not dispatch work or call an AI API.

Tasks save brief.md, prompt.txt and context.json under research/<task-id>/. Pending questions appear
in the task list and topic badges. Reopen context uses the same migration/restore path as saved
views. Refresh preserves the exploration and highlights added topics. Material domain extensions
remain explicit questions; normal in-domain discoveries need no individual approval.

## Knowledge ownership and maintenance procedure

Species cards show three stored name rows: **ES** (Spanish), **EN** (English) and **Sci**
(scientific/Latin). The inspector and keyboard topic list show the same names; all three are
searchable and research handoffs include them keyed by stable database ID. Original topic
labels, IDs, source spellings and distinct trial/source concepts remain intact. The 8 November
2026 naming batch covers all 34 species records: 32 have all three names; the two unresolved
Chamaespartium/Whitania source spellings show explicit unconfirmed common names. Pine trial
names stay generic and Citrus is genus-only. Naming references are available in the inspector;
these name correspondences add no ecology, trial outcomes or extra PDF ingestion.

**SQLite is authoritative**, at `data/knowledge.sqlite`. JSON import batches are proposed changes;
exports and backups are recovery copies, not independently editable masters. Code, schemas,
source manifests, accepted batch inputs and this procedure use ordinary repository history.
Database, research briefs, extracted text, images and backups stay local and are ignored by Git.

Use the project's Python (`.venv\Scripts\python.exe` on Windows) for these commands:

```
python -m backend.cli search "algarrobo"
python -m backend.cli inspect carob
python -m backend.cli export --output data/current-snapshot.json
python -m backend.cli import imports/my-batch.json --check
python -m backend.cli import imports/my-batch.json
python -m backend.cli backup
python -m backend.cli groups
python -m backend.cli task-complete TASK-ID --summary "Answer; additional discoveries; links; coverage; unresolved items"
```

1. Read the task, current scope, `imports/CONTRACT.md`, source inventory and current records.
   Reconcile old IDs and the task's captured revision. Run `python -m backend.cli groups` and review
   current group membership/rules before proposing an import. Inspect the wider graph, not just its
   visible neighbourhood. Reuse checked identities, including scientific-name correspondences.
2. Verify exact source editions. Inspect the explicitly requested pages. Extract text, render
   image pages/tables and visually check important rows. Record every inspected page and any
   unresolved or unfinished coverage. Do not silently skip unreadable material.
3. Capture **all useful supported in-domain discoveries from material actually inspected**,
   including discoveries outside the original question. Connect discoveries to one another
   and to relevant existing records across the graph. A task is a flashlight, not an ingestion filter.
4. Preserve exact pages, original plant-name usage, places, units, applicant/activity/territory/date
   context and contrary findings. Curated associations need an explicit basis. Co-occurrence in
   a document alone is not a domain relationship. New plants are not created from misspellings.
5. Prepare one batch with `base_revision` set to the current revision. Validate it, then use the
   importer. An accepted batch ID is immutable. Repeating the same batch is a no-op; a correction
   uses a new batch ID and the existing record IDs. Imports are transactional, with pre-import
   backups. A stale or invalid import preserves accepted knowledge.
6. Return the requested answer, additional discoveries, wider links, actual/unfinished coverage
   and unresolved items. Complete or mark the task Needs an answer, then refresh its saved view.

Later web-authorized work uses primary sources. Store new PDFs under this project's `sources/`
and assign `KGB-SRC-0001` onward. Register a manifest with `python -m backend.cli register-sources
path/to/manifest.json`; keep filename, title, author/issuer, dates, hash, total pages and explicit
page scope. Never add or modify files in the old library automatically.

The initial bootstrap combines the three curated batches atomically and verifies their nine
editions. It never migrates operational data or old application behaviour. Expanded library
ingestion awaits the user's acceptance of demonstrator comfort. Project tools and hosting remain
separate future work.

## Architecture and checks

React/TypeScript and a single Three.js scene through react-force-graph-3d; deterministic local
packing; bundled PDF.js with document/worker loading on demand; FastAPI/Uvicorn; authoritative SQLite/FTS5. All runtime assets
are bundled. No cloud or AI API is required. WebGL2 must be available; the topic list and inspector
remain available if graphics initialization fails.

The frontend uses /api/explore and /api/comparison. /api/routes shares the same bounded traversal.
/api/view and its perspective branches are retired. Saved views, inspection, source files,
research and refresh retain their existing endpoints. No database schema migration is required.

Development: npm run build; .venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8765
Checks: npm test; .venv\Scripts\python.exe -m pytest -q.
Browser scenarios: start .venv\Scripts\python.exe scripts/qa-server.py in a separate terminal,
then run tests/browser-v6.mjs against that isolated QA database on port8769 only.
Set KGB_PLAYWRIGHT_MODULE to an installed Playwright index.mjs, or make playwright importable,
and run node tests/browser-v6.mjs with Microsoft Edge installed. This is test tooling, not an app dependency.

See PROTOTYPE_TWO.md for v6 contracts and VERIFICATION.md for actual results and backup details.
Dependencies are pinned in package-lock.json / requirements-lock.txt; THIRD_PARTY_NOTICES.md
and third_party/ preserve applicable upstream notices and historical licence archives.

Layer gesture checks: with the isolated QA server running and the same Playwright configuration,
run npm run test:gestures. These exercise label dragging, cancellation, persistence and both
Ctrl-drag rotation limits in the actual browser.

Layer closing checks: run npm run test:close-layers against the documented isolated QA server
with the same Playwright configuration.

Layer close-button depth checks: run npm run test:close-occlusion against the isolated QA server
with the same Playwright configuration.

Domain preview/update checks: run npm run test:domain-update against the isolated QA server
with the same Playwright configuration.

Centre removal and group-scope checks: run npm run test:remove-centre against the isolated QA
server with the same Playwright configuration.

Node hover/domain disabling checks: run npm run test:hover against the isolated QA server
with the same Playwright configuration.

All-domain overview layout checks: run npm run test:all-domain-layout against the isolated QA
server with the same Playwright configuration.

Group double-click checks: run npm run test:double-click against the isolated QA server with
the same Playwright configuration.

Focused group membership checks: run npm run test:focused-group against the isolated QA server
with the same Playwright configuration.

All-layer packing checks: run `npm run test:tight-layers` against the isolated QA server.
Unrecorded-place membership/layout checks: run `npm run test:unrecorded-place` against that
same server with the documented Playwright configuration.


Species naming verification: run `npm run test:species-names` against the isolated QA server
with the accepted naming batch applied there and the documented Playwright configuration.


## Plant illustrations

Species cards show compact whole-plant portraits beside their Spanish, English and scientific names.
Select an illustrated plant and choose **View plant images** for paired whole-plant and botanical-detail
views, independent Original size/Fit controls and the original botanical references. Missing files show
explicit errors and Retry controls. Artwork is AI-generated, representative and not to a common scale.

The accepted collection has 46 images for 23 plant identities. The browser owns its media and source
copies; the simulator is only an intake input. Preserve `media/`, `sources/` and `data/` together.
Use `python -m backend.cli media-integrity` to verify files, and `python -m backend.cli backup-media`
for a database snapshot plus companion media archive. See [Plant images](PLANT_IMAGES.md) for exact
mappings, evidence coverage, source links, limitations and recovery instructions.


## Owned document library

The complete old library is now copied locally under `doc_library/`: 378 copied files plus the
pre-existing knowledge-graph EPUB. This collection is owned storage only; it does not add graph
knowledge, source registrations or search-index content. Existing registered source paths remain
unchanged. The document bytes are local and ignored by Git; preserve their verified backup alongside
the tracked `imports/document-library-inventory.json`.

Run `python scripts/document_library.py verify` for file integrity and
`python scripts/document_library.py backup` for a separate document-library archive. See
[Document library ownership](DOCUMENT_LIBRARY.md) for copy commands, recovery and verification.
