# Algarroba Knowledge Browser

A local, offline browser for connected ecosystem, restoration, irrigation, drone and funding
knowledge. One Layered 3D graph, filters, browsing groups and a docked inspector help readers
move from overviews to evidence. Community planning uses a separate Evidence desk.

## Documentation

| Need | Read |
| --- | --- |
| Install, start and explore | This guide |
| Ingest all current PDFs or weekly additions | [Reusable ingestion prompt](DOCUMENT_INGESTION_PROMPT.md) |
| Maintain imports and evidence | [Maintenance procedure](#knowledge-ownership-and-maintenance-procedure) and [import contract](imports/CONTRACT.md) |
| Understand graph behavior and persistence | [Architecture](docs/ARCHITECTURE.md) |
| Edit groups, communities and irrigation decisions | [Community planning and Evidence desk](docs/COMMUNITY_PLANNING.md) |
| Verify sources/media, backups and recovery | [Sources and media](docs/SOURCES_AND_MEDIA.md) |
| Run checks or find historical acceptance records | [Verification and documentation map](docs/VERIFICATION.md) |
| Maintain this project with Codex | [Project instructions](AGENTS.md) |
| Review dependency licences | [Third-party notices](THIRD_PARTY_NOTICES.md) |

The references above describe the current app. Earlier briefs and the chronological verification
log are preserved under `docs/archive/`; they are historical evidence, not current instructions.
Commands and code-formatted paths in these guides are relative to the repository root unless stated otherwise.

## Start

Start the app from a Conda-enabled PowerShell terminal, using the setup and Python commands below.
Open **Miniforge Prompt** if Conda is not available in your usual terminal; in that Command Prompt,
use `cd /d` instead of `cd` when changing drives. The commands create and use a dedicated environment
named `algarroba-db`; if you already have a project Conda environment, use its name consistently instead.

The earlier setup script creates `.venv\Scripts\python.exe` inside the project. That is a standard
Python virtual environment, not a Conda environment. It does not create `algarroba-db`.
Create the Conda environment below before selecting it in PyCharm.

### One-time setup

Conda and Node.js/npm must be installed. Check `conda env list` first; if `algarroba-db` is already
listed, skip only the `conda create` command below. From the project folder, create the environment
once, activate it and print its actual Python executable path:

```powershell
cd "C:\Users\JanEngelke\git_private\algarroba_db"
conda create -n algarroba-db python=3.12 pip
conda activate algarroba-db
python -c "import sys; print(sys.executable)"
```

Save the printed path for PyCharm. Conda's environment location depends on its configuration;
use the actual output rather than assuming a `miniforge3\envs\algarroba-db` location.
If activation fails because the environment is missing, complete `conda create` successfully
before continuing. In the activated environment, install dependencies and build the interface:

```powershell
python -m pip install -r requirements-lock.txt
npm ci
npm run build
```

For a fresh checkout with no accepted knowledge collection, initialize the database once:

```powershell
python -m backend.cli bootstrap
```

Existing source PDFs must remain at their registered paths. An existing database, source collection
and saved explorations can be reused when switching Python environments.

### Run the app

In each new terminal session, activate the environment and start the server from the project folder:

```powershell
cd "C:\Users\JanEngelke\git_private\algarroba_db"
conda activate algarroba-db
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8765
```

Keep the terminal open and open [Knowledge Browser](http://127.0.0.1:8765) in your browser.
Press **Ctrl+C** in that terminal to stop the server. Knowledge and saved explorations persist.
If a previous launcher instance still occupies port 8765, stop it first with
`python scripts/launch.py --stop` from the activated environment and project folder.
After frontend changes, run `npm run build` again; after backend changes, restart the server.
Reload the browser to see the updated app.

### PyCharm run configuration

Complete the one-time setup above, then open `algarroba_db` as the project in PyCharm.

1. Open **Settings** (`Ctrl+Alt+S`) and the project's Python interpreter settings
   (**Project Structure** in current versions).
2. Choose **Add Interpreter > Add Local Interpreter > Conda**, then select the existing
   `algarroba-db` environment created during setup. Use the Python executable path printed by
   `python -c "import sys; print(sys.executable)"` after `conda activate algarroba-db`.
   If the environment is missing, check `conda env list` and complete the creation step above.
   If Conda is not detected, set its executable to
   `C:\Users\JanEngelke\miniforge3\Scripts\conda.exe`.
3. Open **Run > Edit Configurations**, click **+**, and choose **Python**.
4. Enter these settings, selecting **Module name** in the target dropdown:

   | Setting | Value |
   | --- | --- |
   | Name | `Knowledge Browser` |
   | Module name | `uvicorn` |
   | Parameters | `backend.app:app --host 127.0.0.1 --port 8765` |
   | Python interpreter | The `algarroba-db` Conda interpreter selected above |
   | Working directory | `C:\Users\JanEngelke\git_private\algarroba_db` |
   | Environment variables | Keep `PYTHONUNBUFFERED=1`; no additional variables are required |

5. Click **Apply**, then **OK**. Select **Knowledge Browser** and click **Run** or **Debug**.
   Open [Knowledge Browser](http://127.0.0.1:8765) in your browser. Use PyCharm's **Stop** button
   to stop the server before starting it again elsewhere.

PyCharm uses the selected Conda interpreter directly. Terminal activation alone does not select
the run configuration's interpreter. The frontend is served from `dist/`, so run `npm run build`
after frontend edits before reloading the browser.
See JetBrains' [interpreter setup](https://www.jetbrains.com/help/pycharm/configuring-python-interpreter.html)
and [Python run configuration](https://www.jetbrains.com/help/pycharm/run-debug-configuration-python.html)
documentation for the corresponding dialogs.

## Explore and read

1. Open a sidebar group to bring its complete contents into the foreground. The previous layer
   stays darkened behind it. A single click inspects a card/line; **Open group**, **Members** or
   double-clicking an eligible group opens its members. Temporary groups keep their exact captured
   membership and start with Group by None.
2. Choose **Explore this topic** or the Centre dropdown to open all direct neighbours. The centre
   sits between compact upper/lower arcs with visible relationship labels. Overview, search and
   ordinary member layers use a grid; stored ordered folders use a vertical column.
3. Search for stored names, aliases, findings and curated page text. With a centre, results explain
   routes through the graph. **Show steps / Hide steps** reveals real intermediate topics; shared
   steps appear once. Reach starts at six steps; **Look farther** extends to eight with up to three
   alternatives. A reported search budget limit is not proof that no connection exists.
4. Filter by Domain or Topic type, and Group by browsing family, type or place. Grouping reorganizes
   the current layer in place. Changing Domain first previews darkened exclusions; **Update** beside
   the heading or **Update layer** applies the choice and repacks the same layer. Choosing the applied
   domain cancels the preview. Centres and necessary route context remain identifiable.
5. **Remove centre** removes its card/lines and repacks the surrounding results in the same layer.
   The query origin remains available for refresh without reinserting that card. Opening a member
   group clears an unrelated centre. **Return to overview** establishes a single-layer boundary,
   retaining domain/type filters.

Hover outlines do not select or navigate. Domain-excluded cards and previous-view snapshots are
read-only. Place grouping uses recorded place IDs, not guessed geography; **Place not recorded**
and **Place unavailable** have different meanings. Organization never creates scientific facts.

Drag empty space to pan; Ctrl/Shift-drag or angle buttons turn the view. Zoom changes magnification
only. Drag a layer heading to move its whole layer; Escape cancels. Fit/Reset and camera buttons
use 600 ms moves, with no animation for reduced motion. Direct-neighbour arcs adapt to the window
without stretching to fill it. Cards, labels and source highlights remain readable in both themes.

The foreground shows at most two read-only **Previous view** snapshots. Its opening card stays
highlighted in the source layer. **Close layer** restores the nearest visible predecessor or the
filtered overview; closing a background snapshot hides only that snapshot. Back/Forward restores
complete views, with up to 100 history entries. New exploration after Back replaces the forward
branch. Grouping, pending domain choices, camera and layer offsets are preserved appropriately.

The docked inspector works in normal/fullscreen modes:

- **Details** explains the selection and its actual relationships.
- **Evidence** shows source findings, recommendations and conditions. Citations open the exact
  one-based PDF position, which may differ from printed numbering. Loading failures stay in the
  source panel with **Retry source**, Close and original-PDF access.
- **Dates** distinguishes experiments/events from publication/edition dates; unknown stays unknown.
- **Comparison** displays up to four topics with their own conditions and citations. Missing values
  are Not recorded; the table does not imply a controlled comparison.

Species show stored Spanish, English and scientific names; named plant communities show Spanish
and English without a Latin row. Original labels and unresolved identifications are retained.
Illustrated plants offer **View plant images** for whole/detail views, Original size/Fit and botanical
references. Artwork is representative AI-generated illustration, not to a common scale or ecological
proof. See [Sources and media](docs/SOURCES_AND_MEDIA.md) for provenance and checked identities.

WebGL2 is required for the 3D view; the accessible **Visible topics** list and inspector remain
available if graphics initialization fails. Appearance offers System/Light/Dark.

## Community plans and research

**Edit group** opens permanent organization controls. **Edit community** opens the full-window
Evidence desk: select a plant, compare watering phases, review compatible source evidence and
explicitly adopt a parameter into the draft. **Save changes** commits the plant edit atomically.
Amount/frequency/period cannot be freely entered in this workspace. Existing manual/adjusted
values and provenance remain readable. **Manage groups** and **Manage communities** are separate
entry points when no record is selected. See [Community planning](docs/COMMUNITY_PLANNING.md)
for lifecycle meanings, applicability review, drafts, Undo/Redo, conflicts and the API.

**Save view** stores exploration scope, filters, grouping, routes, comparison, positions, camera
and history. Browser sessions use IndexedDB as a localStorage fallback. Older saved formats are
translated in memory; the original payloads are preserved.

**Research** captures foreground factual IDs/routes, source context, filters, current organization,
revision and the exploration. Choose Library only or Library and web, preview/edit the static prompt,
then ask Codex to execute it manually. The app does not dispatch research or call an AI API.
Tasks retain `brief.md`, `prompt.txt` and `context.json` under `research/<task-id>/`; pending questions
appear in the task list and topic badges. Refresh preserves the exploration and highlights additions.
New evidence is never automatically adopted into a working plan.

## Knowledge ownership and maintenance procedure

**SQLite is authoritative** at `data/knowledge.sqlite`. Import JSON is a proposed mutation, not an
editable master. Code, schemas and accepted batch inputs are versioned; database, research, raw
extraction, media and backups stay local. A code-only checkout does not carry the accepted collection.

For complete-library and weekly intake, invoke the [reusable ingestion prompt](DOCUMENT_INGESTION_PROMPT.md).
File ownership, source registration, inspected coverage and full-text indexing are separate states;
query current SQLite coverage instead of treating historical counts or a copied file as completeness.
The general importer refreshes topic/finding search but does not automatically extract all new PDF
page text. Historical bootstrap limits do not replace a later task's explicitly requested review scope.

For any checked research/maintenance intake:

1. Read the task brief **and** `context.json`, [import contract](imports/CONTRACT.md), current source
   registry and current records. Reconcile captured IDs/revision. Inspect groups, memberships,
   parent paths, anchors and maintenance rules across the wider graph.
2. Verify editions and inspect the requested material. Extract text, render important tables/image
   pages, and record exact one-based page coverage, unresolved items and unfinished work.
3. Capture all useful supported in-domain discoveries from inspected material, including outside
   the initial question. Reuse identities and explain meaningful old/new connections. Preserve
   species spellings, conditions, places, dates, units, applicants and territories. Co-occurrence
   is not a domain relationship; a funding link is not eligibility or an award.
4. Prepare a coherent batch with the current `base_revision`. Stage new verified managed sources
   under `sources/`; use the next unused `KGB-SRC-####` IDs for new editions and prefer atomic
   `sources[]` registration. Follow the current source and batch models.
   Every new/revised source link needs a checked section heading or descriptive keyword in
   `source_refs[].label`, plus its precise `locator`. Display label, friendly document title and
   exact page/section throughout the app. Distinguish links to the same document by passage/table/
   subject; a page number or "Selected passage" alone is insufficient. Translate faithfully,
   preserve original identifiers in `locator`, and never invent headings. See the
   [citation-label contract](imports/CONTRACT.md#descriptive-source-links-all-new-and-revised-intake).
5. Preview with `--check`, review the evidence and proposed diff, then apply through the importer.
   Accepted batch IDs are immutable; corrections use new batch IDs and existing record IDs when
   identity is unchanged. Stale revisions require reconciliation. Imports have transactional
   protection and pre-import backups.
6. Report the answer, additional discoveries, wider links, actual/unfinished coverage and unresolved
   issues. Complete a real task or mark Needs an answer, preserving its exploration for refresh.
   Ordinary in-domain additions need no per-topic approval; material domain extensions need a decision.

From the project folder, use the activated project Python (add `-X utf8` if Windows console symbols fail):

```powershell
python -X utf8 -m backend.cli search "algarrobo"
python -X utf8 -m backend.cli inspect carob
python -X utf8 -m backend.cli groups
python -X utf8 -m backend.cli export --output data/current-snapshot.json
python -X utf8 -m backend.cli import imports/my-batch.json --check
python -X utf8 -m backend.cli import imports/my-batch.json
python -X utf8 -m backend.cli backup-media
# Only for a real supplied task; replace TASK-ID and summary:
python -X utf8 -m backend.cli task-complete TASK-ID --summary "Answer; discoveries; links; coverage; unresolved"
```

The old `algarrobos/doc_library` is read-only. Preserve current registered copies, source hashes and
original citation paths. Explicitly web-authorized research uses relevant primary sources; keep
edition/retrieval context and unknown dates. Source observations, guidance and curated associations
stay distinct. Species-specific irrigation decisions require compatible evidence and explicit review.

The owned `doc_library/` and its ownership inventory have a separate verification/backup workflow
from registered `sources/`, `media/` and SQLite. See [Sources and media](docs/SOURCES_AND_MEDIA.md).
Current test commands, QA isolation, last recorded acceptance and historical recovery records are
centralized in [Verification](docs/VERIFICATION.md). Dependency versions and applicable notices
remain in the lockfiles, [Third-party notices](THIRD_PARTY_NOTICES.md) and `third_party/`.
