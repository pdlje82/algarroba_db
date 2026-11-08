import React, { useEffect, useRef, useState } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFDocumentLoadingTask,
  type RenderTask,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { type Ref, type Catalog } from "./types";
GlobalWorkerOptions.workerSrc = pdfWorker;
/** A source-viewer failure must never unmount the working exploration. */
export class PdfBoundary extends React.Component<{
  children: React.ReactNode;
  source: Ref & {page:number};
  close: () => void;
}, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) { return { error: String(error) }; }
  render() {
    if (!this.state.error) return this.props.children;
    const { source, close } = this.props;
    return (
      <div className="source-shade">
        <section className="source-panel" role="dialog" aria-modal="true" aria-label="Source inspection">
          <header><h2>Source viewer</h2><button onClick={close} className="close" aria-label="Close source">×</button></header>
          <div className="notice error" role="alert">
            <p>The source viewer could not open this document. Your graph is still available.</p>
            <p>{source.source_id} · PDF page {source.page}</p>
            <details><summary>Error details</summary>{this.state.error}</details>
            <div className="actions">
              <button onClick={() => this.setState({ error: null })}>Retry source</button>
              <a href={`/api/sources/${source.source_id}/file#page=${source.page}`} target="_blank" rel="noreferrer">Open PDF ↗</a>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
export default function PdfPanel({
  source,
  catalog,
  close,
}: {
  source: Ref & {page:number};
  catalog: Catalog;
  close: () => void;
}) {
  const record = catalog.sources.find((s) => s.id === source.source_id);
  const [page, setPage] = useState(source.page),
    [rotation, setRotation] = useState(0),
    [scale, setScale] = useState(1.2),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [pages, setPages] = useState(record?.pdf_pages || 1),
    [painting, setPainting] = useState(false),
    [renderedPage, setRenderedPage] = useState(0),
    [attempt, setAttempt] = useState(0);
  const doc = useRef<PDFDocumentProxy | null>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const render = useRef<RenderTask | null>(null);
  useEffect(() => {
    let active = true;
    let loading: PDFDocumentLoadingTask | undefined;
    doc.current = null;
    setPage(source.page);
    setBusy(true);
    setPainting(false);
    setRenderedPage(0);
    setError("");
    const load = async () => {
      try {
        loading = getDocument({
          url: "/api/sources/" + source.source_id + "/file",
          standardFontDataUrl: "/pdf-assets/standard_fonts/",
          cMapUrl: "/pdf-assets/cmaps/",
          cMapPacked: true,
          wasmUrl: "/pdf-assets/wasm/",
        });
        const pdf = await loading.promise;
        if (!active) return;
        doc.current = pdf;
        setPages(pdf.numPages);
        setPage(source.page);
        setBusy(false);
        setScale(1.2);
      } catch (e) {
        if (!active) return;
        let message = String(e);
        try {
          const response = await fetch(
            "/api/sources/" + source.source_id + "/file",
          );
          if (!response.ok) message = (await response.json()).detail;
        } catch {}
        if (!active) return;
        setError(message);
        setBusy(false);
      }
    };
    void load();
    return () => {
      active = false;
      render.current?.cancel();
      void loading?.destroy().catch(() => {});
      doc.current = null;
    };
  }, [source.source_id, attempt]);
  useEffect(() => {
    setPage(source.page);
  }, [source.page]);
  useEffect(() => {
    if (!doc.current || busy || !canvas.current) return;
    let active = true;
    let task: RenderTask | undefined;
    const pdf = doc.current, previous = render.current;
    setPainting(true);
    setRenderedPage(0);
    setError("");
    previous?.cancel();
    Promise.resolve(previous?.promise).catch(() => {})
      .then(() => active ? pdf.getPage(page) : null)
      .then((p) => {
        if (!active || !p || !canvas.current) return;
        const viewport = p.getViewport({
          scale,
          rotation: (p.rotate + rotation) % 360,
        });
        const ctx = canvas.current.getContext("2d")!;
        canvas.current.width = viewport.width;
        canvas.current.height = viewport.height;
        task = p.render({
          canvas: canvas.current,
          canvasContext: ctx,
          viewport,
          background: "rgb(255,255,255)",
        });
        render.current = task;
        return task.promise.then(() => {
          if (active) setRenderedPage(page);
        });
      })
      .catch((e) => {
        if (active && e.name !== "RenderingCancelledException")
          setError(String(e));
      })
      .finally(() => {
        if (active) setPainting(false);
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [page, rotation, scale, busy]);
  const processed = catalog.coverage.find(
    (c) => c.source_id === source.source_id && c.page === page,
  );
  return (
    <div className="source-shade">
      <section
        className="source-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Source inspection"
      >
        <header>
          <div>
            <span className="eyebrow">
              ORIGINAL SOURCE · {source.source_id}
            </span>
            <h2>{record?.filename || source.source_id}</h2>
          </div>
          <button onClick={close} className="close" aria-label="Close source">
            ×
          </button>
        </header>
        <div className="pdf-controls">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </button>
          <label>
            PDF page{" "}
            <input
              aria-label="PDF page"
              type="number"
              min={1}
              max={pages}
              value={page}
              onChange={(e) =>
                setPage(
                  Math.max(1, Math.min(pages, Number(e.target.value) || 1)),
                )
              }
            />{" "}
            / {pages}
          </label>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
          <button onClick={() => setRotation((r) => (r + 90) % 360)}>
            Rotate ↻
          </button>
          <button
            aria-label="Zoom source out"
            onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
          >
            −
          </button>
          <button
            aria-label="Zoom source in"
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          >
            +
          </button>
          <a
            href={"/api/sources/" + source.source_id + "/file#page=" + page}
            target="_blank"
            rel="noreferrer"
          >
            Open PDF ↗
          </a>
        </div>
        <div className="source-locator">
          {record?.author_issuer && (
            <div>
              {record.author_issuer} ·{" "}
              {record.dates
                ?.map((d: any) => d.meaning + ": " + d.value)
                .join(" · ") || "Publication date unknown"}
            </div>
          )}
          {source.locator && <strong>{source.locator} · </strong>}
          {processed
            ? `Curated page · ${processed.note}`
            : "Source material only · this page has not been curated."}
          <small>
            PDF positions are one-based and can differ from printed page labels.
            Viewing a page does not import it.
          </small>
        </div>
        <div
          className="pdf-scroll"
          aria-busy={busy || painting}
          data-rendered-page={renderedPage}
        >
          {(busy || painting) && (
            <p role="status">
              {busy ? "Opening the registered edition…" : "Drawing PDF page…"}
            </p>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              <p>
                Locator: {source.source_id}, PDF page {page}. {record?.filename}
              </p>
              <button onClick={() => setAttempt((n) => n + 1)}>Retry source</button>
            </div>
          )}
          <canvas ref={canvas} />
        </div>
      </section>
    </div>
  );
}
