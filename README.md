# Algarroba Knowledge Browser

A local, offline browser for connected restoration, water, drone and LEADER knowledge.
The updated prototype brief defines the scope. The user confirmed the initial implementation plan
in Codex on 5 November 2026 and the layered 3D second prototype on 6 November: this Windows computer only, English controls, searchable
English/Spanish names, all ten perspectives, with Codex Desktop maintaining the knowledge.

## Start and use

Double-click **Start Knowledge Browser.cmd**. It opens http://127.0.0.1:8765 in your normal browser.
No internet is needed for browsing after setup. Keep the local application running while using it.
Double-click **Stop Knowledge Browser.cmd** to stop the local server; knowledge and saved views remain.
On a fresh checkout, run **Setup Knowledge Browser.cmd** once (Python, Node.js and internet are
needed for installation). The nine original PDFs must remain at the paths in the source manifest.

Start with an overview group. Choose a topic to inspect it. The first topic becomes your centre;
later topics can be inspected without moving that centre. **Make this the centre** deliberately
changes it. Search narrows stored knowledge; it does not start research. A dashed connection
represents a shortened route. Selecting it reveals every included step. The
inspector's **Displayed connections** list provides the same actions without needing to hit a line.

**Make this the centre** returns popped-out cards home and collapses child groups, branches and
routes, while keeping their named layer surfaces open. It then opens a new **Centre · [topic]**
plane in front of those retained layers, remembering the chosen topic's ordinary source layer.
Only recorded direct neighbours appear: twelve initially, then twelve through **More direct
connections**. Nursery watering currently has just one: Dryland restoration. Repeating Make
centre on the current clean centre reuses its plane. Back restores the full preceding exploration.
Use **Layers → Reopen [name]** to restore a retained layer's cached topics. After returning to an
earlier layer, **Show centre view** deliberately reopens the direct-neighbour star.

Search and perspective keep their values when the centre changes. **Show results** opens a
separate **Results · [search] · [perspective]** arrangement; changing search or perspective opens
or updates it explicitly. **Open connected topics** opens a named detail branch. A centre's
**Other connections** badge exposes relationships among its neighbours without crowding the
initial star. One spoke can retain several actual relationship IDs for the same neighbour.

The ten perspectives share topic identities: Combined overview, Ecosystems, Technology, Funding,
Sources and findings, Hierarchy, Comparison, Places, Time, Conditions and dependencies. The
comparison starts with Cocoon, traditional pipe watering and individual fog collection; choose
other items using **Compare** in their inspectors. Missing values remain visible.

Zoom out restores broader grouped context. Back and Forward restore a previous exploration.
Return to overview restores the combined landscape and retains your centre/search marker.
Save view keeps positions, expanded routes, search, perspective and camera together.

### Layered 3D and Flat view

The browser opens in **Layered 3D**. Opening a group reveals six topics at a steady reading
distance. Opening deeper detail moves the overview and older layers backward, so they appear
smaller while the newest layer stays in the foreground. Depth only means opened detail.
It does not mean that a topic is more important,
more certain, or a different kind of knowledge.

Click a topic to bring its card forward and inspect it. The view pans smoothly to place the
clicked or expanded card near the centre of the usable graph area, clear of controls and the
floating inspector. This keeps the camera angle, zoom and saved topic homes. Expanding an
already selected topic also centres it; history restoration and mode switches retain their views.
Its small **Home** label/tether shows
where it belongs; these orientation cues are not factual connections. An already visible topic
is shared across branches, with one card. **Open connected topics** adds a branch; its **− topic**
control closes it. **Click an expanded topic or open group again to collapse its own detail.**
A second click on a popped-out topic card returns it to its home layer. Its inspector stays
available. Other branches keep the topics they still need; clicking a child keeps its parent
open. The keyboard-accessible Visible topics list uses the same click behaviour.

**Back to [parent topic/group]**, at the upper left of the graph, folds the last expansion
back into its parent and brings the earlier layer forward. **Earlier layers** lets you return
further in one action, closing that expansion and those opened after it. Shared topics remain
when an earlier branch still needs them. These actions keep your camera angle; the separate
history Back/Forward controls restore a previous complete view. Expanding all routes counts
as one return step. These controls also work in full screen and Flat view.

In Layered 3D, **hover over an empty part or border of a layer** to highlight it slightly.
**Click that layer to make it current:** deeper node expansions fold back and the chosen plane
comes forward. Its topics and shared knowledge remain available. Cards and connections retain
their own click actions, and dragging still pans. The **Layers** menu provides the same action
with keyboard controls. Clicking Overview folds all detail back to the base map. Back/Forward
can undo and restore a layer return. Flat view hides these depth controls.

Drag empty space to pan. **Ctrl-drag or Shift-drag** turns the view; the visible angle buttons do the same.
The view starts at 25° tilt, limited to 15–60° tilt and 60° left/right. **Reset view** restores the
initial angle and frames the current knowledge. The overview map shows the last topic's home,
the active named layer and the camera's actual footprint on the base plane.

**Flat view** shows the same open knowledge with a perpendicular camera and its own arrangement.
Changing modes preserves the centre, search and routes. Returning to Layered restores its
positions and viewpoint; additional items opened in Flat are placed without moving old anchors.
**Visible topics** is a keyboard-accessible alternative to clicking a card.

### Graph clarity and workspace controls

Topic cards are opaque. Open a group to reveal six topics, use **More topics** for another six,
and use its **− group name** control to collapse it. Expansion keeps the current zoom and makes
room locally. Selecting a topic or connection emphasizes its connections; surrounding connections
remain faint. Highlighted connections detour around unrelated cards where space permits.
Click empty canvas to clear that emphasis. **Fit current context** explicitly fits
the displayed graph without collapsing it; **Zoom out** progressively restores broader context.

**Appearance** offers System, Light and Dark. System follows the Windows/browser setting.
Your choice is saved in this browser, independently of saved explorations. PDF pages retain
their original colours while the viewer controls follow the chosen theme.

**Background effects** offers independent Blur, Darken and Transparency switches. The initial
setting is **Blur off, Darken on at 25%, Transparency on at 50%**. Darkening adjusts from 0–60%.
Each older layer is composited at half opacity; cards remain opaque within that layer, so its own
connections cannot show through its labels. All effects are disabled in Flat view and the base
overview. Preferences are local and separate from exploration history.

With Blur enabled, background cards and connections between older planes receive depth blur,
then extra frosting where physically behind the finite front surface. Background-to-front
connections and selected routes remain sharp outside that surface and receive frosting behind
it. Content physically in front remains sharp. Hover only changes outline/tint. PDF pages and
HTML controls remain outside these effects. Cards, badges and headings follow their layer's
orientation; they no longer turn independently toward the camera.

**Full screen** gives the graph the available screen area and retains the exploration controls.
Click a topic or connection to open one floating details panel; selecting another updates that
same panel. Drag its title bar, resize its edges/corners, or focus its title and use arrow keys
to move it (Shift + arrows resize). The bottom-right resize handle also accepts arrow keys.
Close preserves the selection; click a topic or **Show details** to reopen it. **Reset position**
restores its initial size and position. Panel bounds are remembered locally and kept inside the
workspace. **Exit full screen** or Escape returns to the normal docked inspector. Source and
research dialogs remain available in full screen. Unsupported browser windows explain how to
open the local app in Edge or Chrome.

The 3D renderer is react-force-graph-3d 1.29.2 with one shared Three.js 0.187.0 installation.
The XY layout runs locally in a background worker using Cytoscape fCoSE 2.2.0. The floating panel
uses react-rnd 10.5.3. Every dependency and PDF asset is bundled locally; no online service is
required. WebGL 2 must be available in the browser. If graphics initialization fails, the HTML
controls and inspector retain the exploration and offer a retry.

Version-four explorations retain named layers, centre pagination, shared memberships, XYZ homes,
independent Flat/Layered layouts and cameras, routes and history. New browser storage uses
`kgb:exploration:v4`, preserving original v3/v1 keys. Older views retain their positions and
camera; **Rebuild centre view** or Make this the centre applies the clean arrangement.
See [PROTOTYPE_TWO.md](PROTOTYPE_TWO.md) for the state, renderer and backup contracts.

Depth does not remove all overlap or crossings. Use gentle turning, zoom, Flat view and the
selected route's complete inspector when a dense view is hard to read. Source PDF colours remain
unchanged. Comfort should be assessed with the walkthrough below before expanding the corpus.

Useful walkthroughs:

1. Open Species & companions and select Carob tree. Inspect Carob plant communities and Kermes oak.
2. Keep carob as the centre, search Drone, and change Technology then Funding. Open the recorded
   routes and their sources. A connection does not imply a carob drone-watering result or award.
3. Explore Cocoon, compare water methods, and inspect the different trial conditions and dates.
4. Explore AL20 activities, its territory and requirements. Source budgets/criteria are knowledge,
   not an eligibility or scoring calculator. Current funding availability is unverified.

## Sources and evidence

Exactly nine registered editions and 68 selected one-based PDF positions are curated. The old
`algarrobos/doc_library` is read-only. Metadata for the complete PDFs is registered; only inspected
coverage is indexed. The source panel opens the exact PDF page, supports rotation, and explains
which pages are curated. Opening other pages does not ingest them.

Source findings, recommendations and curated discovery associations retain different meanings.
Carob companion vegetation means reported accompaniment, not proof of planting benefit. The
drone study concerns citrus canopy spraying, not carob root-zone establishment irrigation.
Source contradictions and unfinished questions are retained in `unresolved` records.

## Research handoff

**Research this area** captures the centre, raw search, matched IDs, perspective, detail, selected
topics/relationships, complete routes, relevant findings and the view state. Suggested areas and
custom topics prioritize research. **Research focus** can also capture a question between two existing
topics or a starting topic and a new term; this creates a research indication, not an established
relationship. Library only is the default; web use is explicit. Preview the
fixed-template prompt, edit it if needed, and copy/save it. The task's `brief.md`, `prompt.txt` and
`context.json` are written under `research/<task-id>/` in this project. The app does not dispatch
work or call an AI API. Ask Codex Desktop to read the task and perform it manually.

Outlined To research markers and Investigate connection links are questions, not facts. A material
domain extension is recorded as Needs an answer; ordinary in-domain discoveries require no
separate permission. Refresh after ingestion to retain the exploration and highlight additions.

## Knowledge ownership and maintenance procedure

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

## Architecture and implementation

- Frontend: React/TypeScript, one Three.js graph viewer through react-force-graph-3d,
  offscreen fCoSE placement, PDF.js source panel and Vite build.
- Backend: one Python/FastAPI application with Uvicorn; CLI imports reuse its store/model code.
- Database: one SQLite store with FTS5 indexed labels, aliases, findings and inspected page text.
- Local-only binding: `127.0.0.1:8765`. No cloud, AI API, agent framework or background researcher.
- Display rules: 12 initial result endpoints, +12 through More connections, up to48; 6 route steps
  initially, explicit extension to8; up to3 alternatives; 120 visible items and240 relationships.
  Routes reserve all intermediate detail before admission. Classification roots/provenance are
  excluded from domain traversal. A route is a view object, not a new factual relationship.
- Stable per-perspective positions, explicit local reveal, reduced-motion handling, saved camera
  and history. The miniature uses actual rendered coordinates and hides its viewport rectangle
  while a layout changes. Grouped edges retain their constituent real connection IDs.

Development: `npm run build`; `.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port8765`.
Checks: `.venv\Scripts\python.exe -m pytest -q` and `npm test`.
Dependency versions are locked in `package-lock.json` and `requirements-lock.txt`.
See `THIRD_PARTY_NOTICES.md` and `third_party/` for actual installed licences.


## Connection and layer readability

Collapsed cards show an **internal connections** badge instead of a loop. Click the badge, or
use its Inspect button under Visible topics, to inspect its actual constituent relationships.
Opening/closing groups transfers those facts between individual lines, inter-group summaries
and badges without duplication. Selected connections use rounded detours around cards.

Each depth plane has one labelled outline. Hovering identifies a plane without reacting to the
edges crossing it; click an exposed earlier plane/border or use Layers to fold deeper detail back.
Group headings identify branches within a plane. Clicking cards/lines retains its normal action.

Background effects follow the independent switches described above. Older-layer content stays
soft behind the current surface; selected and inter-layer connections receive only surface
frosting where physically behind it. Flat and the base overview stay sharp.

### Permanent browsing groups

The same SQLite database holds `browse_groups` organization metadata alongside factual records.
This is a browsing hierarchy, not another graph or a restriction on changing existing facts.
Codex can update existing topics/relationships when a supported correction is needed. Group
membership alone never creates a factual connection or a route shortcut.

**Cocoon**, under **Establishment water**, uses the existing `cocoon` anchor and nine Cocoon-specific
members. Its group opens six members, then six more. Primary members appear beneath Cocoon rather
than repeating in the parent's flat list; broader equipment, species and trial sites keep their
existing factual context. Shared membership is labelled and retains one actual card. Thin Shared
labels in a detail arrangement lead to that same card; they are orientation aids.

The catalog, CLI export and `groups` listing expose definitions and maintenance rules. Static
research prompts/context capture them. Follow their rules, reconcile revisions and propose
optional `browse_groups` in the same validated import batch as factual discoveries. Organization-only
batches are also supported. Review [imports/CONTRACT.md](imports/CONTRACT.md). A transactional
metadata migration and each import have a backup. No browser group editor or autonomous
classification/research system is included.

For local WebGL regression pages, run `node scripts/prepare-browser-qa.mjs`, then serve the project
with `.venv\Scripts\python.exe -m http.server 8767 --bind 127.0.0.1`. Open
`http://127.0.0.1:8767/tests/browser/line-geometry.html` and
`http://127.0.0.1:8767/tests/browser/frosted-compositor.html`. These pages use the installed Three
and actual production modules; they perform no database writes. Stop this test server afterward.
