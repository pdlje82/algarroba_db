# Third-party software

The consolidated dependency inventory was updated on 8 November 2026. The application requires no software
licence fee for its chosen components. This does not include the user's existing Codex service.
Retain the upstream licence notices when distributing source or compiled application assets.

| Component | Installed version | Licence |
| --- | --- | --- |
| React / React DOM | 19.3.1 | MIT |
| react-force-graph-3d | 1.29.2 | MIT |
| Three.js (one shared runtime) | 0.187.0 | MIT |
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

Version6 pins all direct npm versions and its lockfile. `npm ls three` confirms that
3d-force-graph, three-forcegraph and three-render-objects share Three.js 0.187.0. The current
inventory is recorded in third_party/npm-licenses.json. Three.js addons (OrbitControls,
Line2/LineMaterial) are imported from that same local installation.

Official references checked:

- https://github.com/vasturiano/react-force-graph
- https://github.com/vasturiano/3d-force-graph
- https://threejs.org/docs/pages/OrbitControls.html
- https://threejs.org/docs/pages/Sprite.html
- https://threejs.org/docs/pages/LineMaterial.html
- https://github.com/mrdoob/three.js/blob/dev/LICENSE
- https://react.dev/versions and https://github.com/react/react/blob/main/LICENSE
- https://fastapi.tiangolo.com/release-notes/ and https://fastapi.tiangolo.com/#license
- https://sqlite.org/fts5.html and https://sqlite.org/copyright.html
- https://mozilla.github.io/pdf.js/
- https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt
- https://github.com/vitejs/vite/blob/main/LICENSE
- Actual installed distribution licence files in third_party/.

Cytoscape/fCoSE and react-rnd were removed from runtime dependencies in v6. Their existing
notice folders are retained as historical archives and do not indicate bundled application code.
