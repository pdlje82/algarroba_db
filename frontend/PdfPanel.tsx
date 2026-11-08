import React, { useEffect, useRef, useState } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { api, type Ref, type Catalog } from "./types";
GlobalWorkerOptions.workerSrc = pdfWorker;
export default function PdfPanel({
  source,
  catalog,
  close,
}: {
  source: Ref;
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
    [renderedPage, setRenderedPage] = useState(0);
  const doc = useRef<PDFDocumentProxy | null>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const render = useRef<any>(null);
  useEffect(() => {
    setPage(source.page);
    setBusy(true);
    setError("");
    const loading = getDocument({
      url: "/api/sources/" + source.source_id + "/file",
      standardFontDataUrl: "/pdf-assets/standard_fonts/",
      cMapUrl: "/pdf-assets/cmaps/",
      cMapPacked: true,
      wasmUrl: "/pdf-assets/wasm/",
    });
    loading.promise
      .then((pdf) => {
        doc.current = pdf;
        setPages(pdf.numPages);
        setPage(source.page);
        setBusy(false);
        setScale(1.2);
      })
      .catch(async (e) => {
        let message = String(e);
        try {
          const response = await fetch(
            "/api/sources/" + source.source_id + "/file",
          );
          if (!response.ok) message = (await response.json()).detail;
        } catch {}
        setError(message);
        setBusy(false);
      });
    return () => {
      render.current?.cancel();
      loading.destroy();
      doc.current = null;
    };
  }, [source.source_id]);
  useEffect(() => {
    setPage(source.page);
  }, [source.page]);
  useEffect(() => {
    if (!doc.current || busy || !canvas.current) return;
    let active = true;
    setPainting(true);
    render.current?.cancel();
    doc.current
      .getPage(page)
      .then((p) => {
        if (!active || !canvas.current) return;
        const viewport = p.getViewport({
          scale,
          rotation: (p.rotate + rotation) % 360,
        });
        const ctx = canvas.current.getContext("2d")!;
        canvas.current.width = viewport.width;
        canvas.current.height = viewport.height;
        render.current = p.render({
          canvas: canvas.current,
          canvasContext: ctx,
          viewport,
          background: "rgb(255,255,255)",
        });
        return render.current.promise.then(() => {
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
      render.current?.cancel();
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
            <div className="notice error">
              {error}
              <p>
                Locator: {source.source_id}, PDF page {page}. {record?.filename}
              </p>
            </div>
          )}
          <canvas ref={canvas} />
        </div>
      </section>
    </div>
  );
}
