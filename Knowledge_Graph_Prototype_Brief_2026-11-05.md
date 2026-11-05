# Knowledge Graph Browser: Prototype Brief for the Codex Plan Session

**Date:** 5 November 2026  
**Purpose:** Define the product, the small first document collection, and the knowledge-ingestion procedure before Codex chooses and implements one design.  
**Project folder:** `C:\Users\JanEngelke\git_private\algarroba_db`  
**Existing source library:** `C:\Users\JanEngelke\git_private\algarrobos\doc_library`  
**Companion:** `Knowledge_Graph_Browser_User_Overview_2026-11-05.epub`

## 1. The product in one paragraph

Build a fully functional, highly interactive browser for ecosystem, technology and funding knowledge. A user who does not yet know what to search for starts with a readable overview of the available knowledge. The user explores connections, changes perspective, moves between broad groups and detail, and finds patterns without losing their location. The same underlying knowledge remains connected throughout. This reduces how much a person must remember at once and supports the later development of fundable projects.

The first demonstrator must implement the complete browsing behaviour and every perspective defined below, using a deliberately small source collection. Expand the document collection only after the user confirms that the demonstrator is comfortable to use.

## 2. People and boundaries

Assume no knowledge of graphs, databases, query languages or information science. Use short explanations, familiar connection labels and progressive disclosure. The user should not configure software components or interpret technical error messages.

The initial knowledge area is dryland and Mediterranean restoration, especially carob and associated vegetation; establishment water and irrigation technologies; drone-related monitoring and water-delivery knowledge; and the selected Andalusian LEADER funding material. Include places, organizations, findings, documents, dates and requirements needed to connect those subjects.

### In the first demonstrator

- One graphical frontend, one backend application and one chosen database.
- One connected source collection, the same stable topic identities across all perspectives, and persistent imported knowledge.
- Overview-first exploration, contextual search, perspective changes, abbreviated and full connections, source inspection, orientation aids and reversible navigation.
- Codex Desktop ingestion and a manual, graph-guided handoff of research tasks to Codex.
- Free/community software with no required software licence fees or separately integrated AI API. Codex checks the actual licences of the chosen dependencies.

### Outside this demonstrator

Project assembly, site design, planting layouts, budgets, simulations, games, aircraft control, eligibility calculations, grant scoring calculators, collaborative editing, autonomous agents and background research. Technology components and funding requirements are browsable knowledge. Their existence does not require implementing an engineering editor or project workflow.

No extra field experiments, hardware trials or comparative software prototypes are prerequisites. Use the scientific and practical guidance already available. Additional learning can occur within later funded projects. Complete proportionate checks that the delivered application and ingestion procedure actually work.

## 3. Four independent controls

| Control | Meaning | Example |
|---|---|---|
| Centre | The topic the user is exploring from | Carob tree |
| Optional search term | The subject to explore in the centre's surroundings | Drone |
| Perspective | The way selected knowledge is organized and emphasized | Funding |
| Connection detail | Shortened routes or complete connecting routes | Abbreviated / Full |

At the opening overview there need not be a centre. Selecting a topic establishes one.

With a centre, search narrows the surroundings while preserving the centre. `Carob + Drone + Funding` means: explore funding-related information within the drone-related knowledge connected to carob. A perspective may reveal supporting topics needed to explain that relationship; the active search and centre remain visible.

Without a search term, the perspective uses the general surroundings of the centre. Searching from the overview reveals and highlights matching topics within it. Multiple matches are offered as choices in context. Explicit **Make this the centre** changes the anchor; entering a search term alone does not silently recenter an existing exploration.

Search initially uses the stored topics, alternative names and indexed text. A search creates a temporary view over stored knowledge. It does not start research or generate new factual connections. Unknown terms and missing routes provide useful entry points for a manual Codex task.

## 4. Opening overviews and continuous navigation

Open with a combined overview containing meaningful ecosystem, technology and funding groups and their principal connections. Provide direct access to ecosystem-, technology- and funding-led overviews of that same knowledge. Readability determines what appears as a group and what appears individually.

Clicking a group expands it in place. Clicking a topic smoothly brings it into focus and reveals connected detail. Previously visible landmarks remain recognizable. Avoid replacing the display with an unrelated partial graph or globally rearranging every node after each click.

### Location must always remain clear

- Keep the centre highlighted and display the current centre, search, perspective and detail mode in plain language.
- Use a small, stable overview map with a marker for the current focus and visible region.
- Keep a clickable browsing trail. It records the route taken, not an invented single-parent hierarchy.
- Provide zoom in, zoom out, **Back**, **Forward** and **Return to overview**.
- Zooming out progressively groups detail and restores broader connections. It must work after search, path expansion and perspective changes.
- Back/Forward restore the prior centre, search, perspective, expanded groups, selected paths, positions and zoom. Return to overview preserves a marker for the explored topic.
- Keep arrangements stable when revisiting an overview. Store view positions separately from knowledge.
- Use animated transitions to make correspondence clear. Respect reduced-motion preferences while preserving orientation through highlights and stable landmarks.

An ordinary diagram overview cannot be an accurate spatial map of every different arrangement simultaneously. During a perspective change, keep the old overview stable and mark the same selected topic and its context; update the overview deliberately with the transition. Never present a miniature of a different layout as if its viewport rectangle were the current canvas.

The application may load detail progressively. Loading must preserve the visible context. A failed load keeps the last working view and offers a clear retry.

## 5. Complete perspective set for prototype one

These ten entries are the complete initial set, including the combined default. They use one viewer and shared records. Each must work on the selected collection; placeholders do not satisfy the scope.

| Perspective | User question | Required representation |
|---|---|---|
| Combined overview | What knowledge is here, and how do the areas connect? | Collapsible ecosystem, technology and funding groups with cross-area connections. |
| Ecosystems | Which species, habitats, conditions and methods belong together? | Species, environment and restoration relationships, with contextual findings available. |
| Technology | Which techniques and components connect to this subject? | Methods, equipment, requirements and source-described components. Include irrigation and drone topics. |
| Funding | Which programmes, activities, organizations and requirements connect here? | Programme-to-activity and requirement relationships. Preserve place, applicant and date context. |
| Sources and findings | Where does this information come from? | Topics connected to short findings and their document/page references. |
| Hierarchy | What groups contain these topics? | Expandable topic families and sourced classifications; show cross-links and multiple memberships when needed. |
| Comparison | How do selected methods or findings differ? | A graph arrangement around shared comparison aspects, such as establishment water, reuse or trial conditions. Missing information remains visible. |
| Places | Where was something studied, described or applicable? | Place-grouped graph, connecting trial sites, ecological areas and funding territories. A geographic map is outside this prototype. |
| Time | When were documents, events or conditions relevant? | Date-ordered graph using recorded dates and periods, with undated items in an explicit group. |
| Conditions and dependencies | What does this connection depend on? | Paths through conditions, components or requirements. Display the chain rather than computing a project decision. |

Perspective and representation are related but distinct. A hierarchy or date arrangement is a way of looking at selected knowledge. Choosing Funding emphasizes funding connections. Define sensible combinations in the Plan; do not add every possible combination as another application.

Perspective changes preserve the anchor and search. Results without content for a particular perspective remain identifiable with an explanation, such as **No funding connection recorded**. They must not vanish in a way that implies that the search was cleared.

## 6. Abbreviated stars and full connecting networks

The abbreviated view places relevant results around the centre. Each spoke represents either a real direct relationship or a shortened connecting route. Shortened routes use a distinct style and a label such as **via 2 topics**. They are view objects, not new knowledge relationships.

Selecting a shortened route unfolds every intermediate topic and relationship on that route. Provide **Expand this connection**, **Expand all displayed connections** and their collapse equivalents. Keep the centre and endpoints stable during expansion. Shared intermediate topics appear once, which can reveal a common dependency or activity across several results.

Full means complete intermediate detail for the included routes. Additional branches and alternative routes are available explicitly; cyclic graphs must not trigger unbounded expansion. The Plan must define concrete result and route limits, meaningful connection types, ordering and an explicit **More connections** action. Display limits must be visible.

Exclude document-co-occurrence shortcuts and generic all-topic hubs from meaningful route selection. Two topics appearing in the same PDF does not by itself establish a useful domain connection. Opening a source remains available in the Sources perspective.

Every route must explain why its steps connect. A topic association, a source finding and a practical recommendation have different meanings. Use plain relationship labels and source-backed explanations rather than treating all lines as a recommendation.

## 7. Small first document collection

Use exactly the following **nine existing PDFs**, with **68 numbered PDF pages** as the first extraction scope. Register metadata for each complete document; record which pages were processed. Other pages remain accessible as source material and are imported later only through an explicit task. Page numbers below are one-based PDF positions, not necessarily the printed page numbers.

| ID and exact filename | Initial PDF pages | Role in the prototype |
|---|---|---|
| **FOREST-002** — `FOREST-002 - Andalusia - Carob Cultivation and Restoration Handbook - 2026.pdf` | 13–21; 130–134 | Carob identity, ecology, dryland restoration, water-harvesting methods, associated vegetation and Andalusian places. |
| **FOREST-003** — `FOREST-003 - Andalusia - Kermes Oak Ecology and Restoration Factsheet - Quercus coccifera.pdf` | 1–4 | A second species, habitat groupings, alternative names and ecological connections. Page 2 explicitly includes carob among accompanying species. |
| **IRR-003** — `IRR-003 - LIFE NIEBLAS - Technical Manual - 2025.pdf` | 84; 87–95; 141–143; 155–156 | Restoration monitoring, drones, establishment-water methods, Cocoon technology, comparisons and reported context. Page 84 connects restoration monitoring to drone imagery. |
| **IRR-005** — `IRR-005 - MENAQUA - Cocoon Assessment in Jordan and Lebanon - 2021-12.pdf` | 74–81; 109–112 | Carob/Cocoon field context, planting timing, sandy-soil and water-retention limitations, reservoir use and trial dates. |
| **DRONE-004** — `DRONE-004 - Miwa et al - Wire Supplied Drone Citrus Watering Experiment - 2024.pdf` | 1–4 | Drone water delivery, component connections, citrus context, locations and 2023 experiment / 2024 publication dates. |
| **FUND-004** — `FUND-004 - Alpujarra Sierra Nevada Almeriense - LEADER AL20 Selection Criteria - 2026.pdf` | 15–20 | Local Line 3 activities and criteria, including demonstration and rural environmental heritage topics. Image-based, sideways tables require visual reading. |
| **FUND-005** — `FUND-005 - Alpujarra Sierra Nevada Almeriense - LEADER AL20 Eligible Activities and Budgets - 2026.pdf` | 1 | Overview connecting funding lines, selected operation types and source-stated budgets. Image-based table. |
| **FUND-008** — `FUND-008 - Andalusia - LEADER Governing Rules - BOJA 29 - 2026-02-03.pdf` | 1–5; 120–124 | Governing source context plus sections 3.4 and 3.5: demonstration, heritage conservation, applicants and conditions. |
| **FUND-012** — `FUND-012 - Andalusia - Recognised LEADER Groups and Territories - 2025-02-13.pdf` | 1; 3 | Organization/territory hierarchy and AL20 municipalities; connects local places to the funding material. |

### Why these documents

They form overlapping topics across ecology, water, drones and funding instead of nine isolated document islands. They also provide hierarchies, components, places, dates, comparisons and source trails. The collection is small enough for Codex to curate without an AI API or automatic extraction service.

The selection is grounded in the local catalogue, extracted source passages and visual inspection of FUND-004 pages 15–20 and FUND-005 page 1. It is a source selection, not a claim that the graph records have already been created. The machine-readable appendix records the inspected file editions.

Do not initially ingest the large aircraft manuals, the full funding navigator, the extensive regional strategy, project simulations, historical research overviews or the old application's operational datasets. The nine originals above provide the starting evidence. Later graph-guided tasks can request additional library documents.

### Connections the first ingestion should make possible

- Carob → water-harvesting restoration → establishment conditions, from FOREST-002.
- Carob ↔ associated vegetation including kermes oak, through the sourced ecological community descriptions.
- Carob → Cocoon trial → Maysara → trial conditions and dates, from IRR-005.
- Habitat restoration → vegetation monitoring → drone imagery, from IRR-003 page 84.
- Drone → water delivery → hose, power supply, pump and citrus trial, from DRONE-004.
- LEADER → selected AL20 activities → demonstration / heritage conservation → documented requirements, from the funding sources.
- AL20 → named territory → municipalities, from FUND-012 page 3.

Cross-source discovery links may use an explicitly curated shared topic, such as restoration monitoring. They must explain the association. Carob-to-drone browsing does not create a carob drone-watering result, and an activity-to-funding connection does not create a species-specific funding award. Preserve the original scope through concise labels and details.

### Edition details to preserve

IRR-003 has 224 PDF pages. Its filename/hosting path uses 2025 while its legal-deposit information says 2024; keep both with their meanings. FUND-008 is an order dated 3 February 2026 published in BOJA on 12 February 2026. FUND-004 and FUND-005 show signatures dated 16 February 2026. FOREST-003 has no verified publication date in the inspected metadata. Missing dates remain unknown.

## 8. Minimum knowledge to keep

Use a small shared model with readable records:

- **Topics:** species, environments, techniques, equipment, organizations, places, funding programmes, activity categories and conditions. Each has a stable ID, a familiar label, alternative names and a short explanation.
- **Connections:** two topic references, a meaningful relationship label, a short explanation and source references or an explicit curated-topic basis.
- **Findings and recommendations:** what a source reports; what practical guidance is justified; the conditions that affect it. Keep detailed numbers only when useful and preserve units and scope.
- **Sources:** existing library ID, exact file, title, author/issuer, edition/date, processed pages and specific page/table references.

Views, positions, collapsed groups and shortened routes are interface state. Research requests are task records. Neither should be stored as established findings.

### Species names and the taxon concept

Explain **taxon concept** as **the particular group a source means when it uses a name**. In everyday use, the interface can simply say Species. Keep the scientific name, source of the identification and alternative names so different plants are not mixed up. A changed name or misspelling should not create another plant automatically.

For this collection, resolve carob using the handbook's species description and retain the spelling used by each source. The MENAQUA table uses a variant spelling for carob; preserve it as source text linked to the checked carob identity. Do not derive botanical naming authorities from an apparent typo. Keep unresolved species correspondences for focused follow-up.

The Plan session should explain this with a simple example and ask whether the user understands before proceeding. It should not require the user to learn taxonomic standards.

### Practical language for uncertainty

Prefer short guidance such as **Useful in these conditions**, **Results depend on soil and planting time**, or **Information is missing for this combination**. Keep the reason and source one click away. Do not add a routine requirement for another experiment to every recommendation.

For funding, preserve applicant, activity, territory and date conditions. Show source dates; only show current availability when it has actually been checked. Discovery is the prototype's function. Project scoring and eligibility decisions remain later work.

## 9. Ingestion method A: the initial library import

Codex Desktop is the only initial knowledge maintainer. The user-facing browser performs stored-knowledge search. No OpenAI API integration, background crawler, agent framework or multi-agent service is required.

1. **Inspect first.** Read the repository instructions, the small knowledge model, source inventory and relevant existing topics. Match source IDs, names and aliases before adding records.
2. **Register the nine exact editions.** Keep original PDFs in the old library, read-only. Record file paths, hashes and the 68-page extraction scope. Do not import legacy application behaviour.
3. **Read the selected pages.** Extract text from text PDFs. Render image-based pages and tables; use Codex's visual reading or available local OCR, followed by a check against the rendered page. An unreadable table becomes an explicit unresolved item.
4. **Write connected knowledge.** Produce short topic descriptions, meaningful connections, findings and practical conditions with exact page/table references. Reuse existing identities and preserve independent sources.
5. **Check the candidate additions.** Required fields, source locations, valid endpoints, duplicate identities and units where used. Visually check important table rows. No fabricated values or hidden skipped records.
6. **Apply through one importer.** The same backend codebase owns import and browsing. Repeating an import must update matching records without creating duplicates. Failed imports leave the last accepted knowledge intact.
7. **Summarize and refresh.** Record the processed pages, additions, updates and unresolved items. Refresh the browser while preserving the user's focus and perspective.

Choose one authoritative knowledge representation during Plan. If repository files are authoritative, treat database content as their controlled imported representation. If the database is authoritative, exports are not independently editable masters. Implement only the chosen ownership model.

Use normal repository history, a short batch record and a recoverable import. Do not transplant the old simulator's registry, approval machinery or operational-rule adoption process into this new project. The old repository is a read-only source library for this task.

## 10. Ingestion method B: graph-guided user indication

The graph is also a way for a non-expert to point out what Codex should research or add.

Provide **Ask Codex to research here** from the current view and from a selected topic, relationship or path. For a gap, allow the user to select two existing endpoints or keep the centre plus an unmatched search term. This creates a research request, not a factual graph connection.

The user adds one short instruction: find more information, explain this connection, check this finding, or connect a named document. Offer source scope **Library only** by default; **Library and web** is explicit. Browser search and research handoff remain separate actions.

Prepare a readable task brief plus structured context in the new project. Include:

- Task ID and creation date.
- Centre ID/label, raw search term and any matched topic IDs.
- Perspective and abbreviated/full mode.
- Selected topic IDs, real relationship IDs and the constituent routes behind shortened connections.
- Relevant existing findings, source IDs and page references.
- The requested outcome, source boundary and any selected library filenames.
- The knowledge revision and enough view state to return to the same exploration.

The user asks Codex Desktop to perform that task. The app does not dispatch another agent or call an AI API. Codex checks the current records, uses the relevant existing knowledge, reads the indicated sources and follows method A from extraction onward. If the graph changed after the brief was created, Codex reconciles the stable IDs against the current version rather than applying a stale view blindly.

For web-authorized work, use relevant primary sources and offer verifiable document links. New source files receive library IDs and metadata under the chosen new-project convention; do not modify the old library automatically. External material joins the graph through the same ingestion procedure.

After ingestion, provide a short task result and let the user refresh the original view with additions highlighted. Task tracking needs only clear statuses such as Prepared, Completed and Needs an answer, not a task-management platform.

## 11. Architecture decisions belong in the Plan session

This brief fixes product behaviour and scope. It does not select competing software implementations. Preserve the existing preference for a Python backend and a browser-based frontend unless the simple requirements discussion reveals a concrete reason to change it.

Begin Plan with a few plain questions whose answers affect the design:

1. Will the first browser be used only on this Windows computer, or must another device access it?
2. Is English the right interface language, with Spanish and English source names searchable?
3. Should the browser work without internet once the selected documents are imported?
4. Which two or three example discoveries would make the demonstrator feel useful?

Ask only what remains unanswered; use this conversation's accepted decisions. Explain taxon concepts simply and check understanding. Do not ask the user to choose a database, query language, rendering library or agent framework.

ChatGPT/Codex then selects and records one winning design: named frontend renderer, named backend framework, one database, data ownership, view/route rules, position persistence, source opening, import structure and manual task handoff. Specify sensible numeric display/path limits and how additional results are revealed. Verify the selected software's current maintenance and free/community terms from official sources. Remove unchosen components from the implementation plan.

The Plan should define how perspective transitions preserve orientation and why a result appears, rather than merely promise attractive animation. A browser that searches records and redraws unrelated partial graphs does not meet this brief.

## 12. Implementation sequence and completion checks

### A. Agree the winning design

Complete the simple questions and record one concrete architecture and the interaction rules. Obtain confirmation of the resulting prototype plan before implementation.

### B. Deliver the complete demonstrator

Implement the shared graph model, import the selected passages, and deliver all ten perspectives and the four controls. Add navigation continuity, abbreviated/full paths, source inspection and the graph-guided Codex brief. Provide a straightforward Windows start procedure.

Use a compact practical walkthrough and necessary automated integrity checks. Do not build a research benchmark programme. Demonstrate:

1. A useful combined overview appears before any search is entered.
2. A user can discover and focus carob by browsing groups.
3. Changing the search to Drone keeps carob centred and exposes explainable stored routes.
4. Funding and Technology reorganize that selection while keeping the active context visible.
5. Every other perspective in section 5 also works on the same collection.
6. Shortened spokes unfold into complete routes; shared intermediate topics appear once; they collapse again.
7. Zoom out works from each state; Back/Forward restore it; the overview map and trail remain coherent.
8. A result, connection or recommendation opens its exact source page or shows a useful locator if the viewer cannot jump directly.
9. An unknown term, disconnected result, absent perspective content or missing source gives a clear message while preserving the current exploration.
10. The user can prepare a research task from a selected connection or gap and hand it to Codex Desktop.
11. Reimporting the same material produces no duplicates. A failed import preserves accepted knowledge and reports the problem.
12. Knowledge survives restart; a saved exploration reopens with its context intact.

User acceptance concerns comfort and understanding: can someone without a search question discover a topic, find a connection, recognize a pattern through a perspective change and return to the bigger picture?

### C. Expand the library after user confirmation

Process all intended documents in the old `algarrobos/doc_library` through the same importer, in manageable batches. Inventory originals separately from generated companions and earlier syntheses so independent evidence is not double-counted. Extend page coverage explicitly and report imported, duplicate, unreadable and unresolved material. Keep the browsing behaviour stable as the corpus grows.

### D. Add peripheral functionality only when requested

The next step can package selected knowledge, conditions and source references as components for projects. Project assembly, simulations and other tools require their own clear scope and confirmation. The first prototype only preserves the stable references needed for that later reuse.

## Appendix: source-edition manifest

The JSON below identifies the local files inspected for selection on 5 November 2026. During implementation, verify the hashes before using these page scopes. Changed files require an explicit edition update. Page ranges are inclusive.

```json
{
  "source_root": "C:\\Users\\JanEngelke\\git_private\\algarrobos\\doc_library",
  "selection_date": "2026-11-05",
  "documents": 9,
  "initial_pages": 68,
  "sources": [
    {
      "id": "FOREST-002",
      "filename": "FOREST-002 - Andalusia - Carob Cultivation and Restoration Handbook - 2026.pdf",
      "pdf_pages": 168,
      "initial_pdf_page_ranges": [
        [
          13,
          21
        ],
        [
          130,
          134
        ]
      ],
      "sha256": "75262e343d4d1e2f1d981b08c9e36a73c9a2c5e9130d14af951124d4cc5d84b8"
    },
    {
      "id": "FOREST-003",
      "filename": "FOREST-003 - Andalusia - Kermes Oak Ecology and Restoration Factsheet - Quercus coccifera.pdf",
      "pdf_pages": 4,
      "initial_pdf_page_ranges": [
        [
          1,
          4
        ]
      ],
      "sha256": "23c27119b7e701374383646e43069d0caa401f870833b5e4d6abea30c1da1f81"
    },
    {
      "id": "IRR-003",
      "filename": "IRR-003 - LIFE NIEBLAS - Technical Manual - 2025.pdf",
      "pdf_pages": 224,
      "initial_pdf_page_ranges": [
        [
          84,
          84
        ],
        [
          87,
          95
        ],
        [
          141,
          143
        ],
        [
          155,
          156
        ]
      ],
      "sha256": "90e6fa5730d2f3d17cc59c2e0bf3a2949ebaf65494ddbd20ed4f214dfda42ec2"
    },
    {
      "id": "IRR-005",
      "filename": "IRR-005 - MENAQUA - Cocoon Assessment in Jordan and Lebanon - 2021-12.pdf",
      "pdf_pages": 121,
      "initial_pdf_page_ranges": [
        [
          74,
          81
        ],
        [
          109,
          112
        ]
      ],
      "sha256": "c2028b3ccb69ba59890ae476c6562c3ef6cb2de82f213ad17302ae592399fc39"
    },
    {
      "id": "DRONE-004",
      "filename": "DRONE-004 - Miwa et al - Wire Supplied Drone Citrus Watering Experiment - 2024.pdf",
      "pdf_pages": 4,
      "initial_pdf_page_ranges": [
        [
          1,
          4
        ]
      ],
      "sha256": "0fcab7afd8fa10cb4b2db1a614ab124e58f6d13a04cb9b0614172dbf83bd98e4"
    },
    {
      "id": "FUND-004",
      "filename": "FUND-004 - Alpujarra Sierra Nevada Almeriense - LEADER AL20 Selection Criteria - 2026.pdf",
      "pdf_pages": 20,
      "initial_pdf_page_ranges": [
        [
          15,
          20
        ]
      ],
      "sha256": "a85c896fa800970f7bb611ab26b215db745ed26513dc30b87e509cc9da11ec64"
    },
    {
      "id": "FUND-005",
      "filename": "FUND-005 - Alpujarra Sierra Nevada Almeriense - LEADER AL20 Eligible Activities and Budgets - 2026.pdf",
      "pdf_pages": 1,
      "initial_pdf_page_ranges": [
        [
          1,
          1
        ]
      ],
      "sha256": "2c22208485e0eec8cdddeefb382539432bb0d22279a04e25a5a364f0d1fd76dd"
    },
    {
      "id": "FUND-008",
      "filename": "FUND-008 - Andalusia - LEADER Governing Rules - BOJA 29 - 2026-02-03.pdf",
      "pdf_pages": 163,
      "initial_pdf_page_ranges": [
        [
          1,
          5
        ],
        [
          120,
          124
        ]
      ],
      "sha256": "48c3cc653a5f38bae9480009873bfdb35f26133f513e8d2894d872216ccf6399"
    },
    {
      "id": "FUND-012",
      "filename": "FUND-012 - Andalusia - Recognised LEADER Groups and Territories - 2025-02-13.pdf",
      "pdf_pages": 15,
      "initial_pdf_page_ranges": [
        [
          1,
          1
        ],
        [
          3,
          3
        ]
      ],
      "sha256": "7a7501233f3e3d20b47f40b029be0b3ac5172c2c24720adb2ddcc79085dc8c28"
    }
  ]
}
```

