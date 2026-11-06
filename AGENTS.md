# Project instructions for Codex Desktop

The current prototype brief and README.md govern this project. The user confirmed one local
Windows browser app: React/TypeScript/Cytoscape.js, Python/FastAPI, SQLite, and PDF.js. Hosting,
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

Keep all ten perspectives on the same identities. Positions, group memberships for display,
abbreviated spokes, research markers and history are interface state, not new knowledge.
Keep centre/search visible, preserve working views on failure, and make navigation reversible.
Run proportionate backend integrity and headless graph checks plus browser checks for interactions.
Do not overwrite the user's existing brief or EPUB edits. Do not publish or expand the corpus
before the user's separate confirmation of demonstrator comfort.
