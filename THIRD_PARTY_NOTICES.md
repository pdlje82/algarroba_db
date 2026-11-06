# Third-party software

Installed dependencies were checked on 5 November 2026. The application requires no software
licence fee for its chosen components. This does not include the user's existing Codex service.
Retain the upstream licence notices when distributing source or compiled application assets.

| Component | Installed version | Licence |
| --- | --- | --- |
| React / React DOM | 19.3.1 | MIT |
| Cytoscape.js | 3.34.4 | MIT |
| TypeScript | 6.0.3 | Apache-2.0 |
| Vite | 8.3.6 | MIT |
| PDF.js | 6.5.438 | Apache-2.0, with separately licensed bundled fonts/decoders |
| FastAPI | 0.162.0 | MIT |
| Pydantic / pydantic-core | 2.14.3 / 2.50.4 | MIT |
| Uvicorn | 0.54.0 | BSD-3-Clause |
| pypdf | 6.21.4 | BSD-3-Clause |
| FontTools | 4.68.0 | MIT |
| SQLite | Supplied with Python; FTS5 checked | Public domain |

`third_party/npm-licenses.json` and `third_party/python-licenses.json` inventory the actual
installed direct/transitive packages, including development tools. Their licence texts are in
the accompanying subdirectories. Transitive terms include MIT, BSD, ISC, Apache, MPL, CC-BY
and PSF licences. Their original notices are preserved; upstream code was not modified.

PDF.js's `standard_fonts`, `cmaps` and `wasm` folders are copied intact into locally served
assets with their licence files. These include Foxit, Liberation, OpenJPEG, QCMS, JBIG2 and
QuickJS notices. No remote font/decoder service is needed. The original source PDFs remain in
the user's existing library and retain their own rights; they are not redistributed in Git.

Official references checked:

- https://js.cytoscape.org/ and https://github.com/cytoscape/cytoscape.js/releases
- https://react.dev/versions and https://github.com/react/react/blob/main/LICENSE
- https://fastapi.tiangolo.com/release-notes/ and https://fastapi.tiangolo.com/#license
- https://sqlite.org/fts5.html and https://sqlite.org/copyright.html
- https://mozilla.github.io/pdf.js/
- https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt
- https://github.com/vitejs/vite/blob/main/LICENSE
- Actual installed distribution licence files in third_party/.
