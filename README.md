# Algarroba Knowledge Browser

A local, offline browser for connected restoration, water, drone and LEADER knowledge.
The updated prototype brief defines the scope. The user confirmed the implementation plan
in Codex on 5 November 2026: this Windows computer only, English controls, searchable
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
represents a shortened route. Inspect it, then expand it to reveal every included step. The
inspector's **Displayed connections** list provides the same actions without needing to hit a line.

The ten perspectives share topic identities: Combined overview, Ecosystems, Technology, Funding,
Sources and findings, Hierarchy, Comparison, Places, Time, Conditions and dependencies. The
comparison starts with Cocoon, traditional pipe watering and individual fog collection; choose
other items using **Compare** in their inspectors. Missing values remain visible.

Zoom out restores broader grouped context. Back and Forward restore a previous exploration.
Return to overview restores the combined landscape and retains your centre/search marker.
Save view keeps positions, expanded routes, search, perspective and camera together.

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
custom topics prioritize research. Library only is the default; web use is explicit. Preview the
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
python -m backend.cli task-complete TASK-ID --summary "Answer; additional discoveries; links; coverage; unresolved items"
```

1. Read the task, current scope, `imports/CONTRACT.md`, source inventory and current records.
   Reconcile old IDs and the task's captured revision. Inspect the wider graph, not just its
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

- Frontend: React/TypeScript, one Cytoscape.js graph viewer, PDF.js source panel, Vite build.
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
Checks: `.venv\Scripts\python.exe -m pytest -q` and `npm run test:layout`.
Dependency versions are locked in `package-lock.json` and `requirements-lock.txt`.
See `THIRD_PARTY_NOTICES.md` and `third_party/` for actual installed licences.
