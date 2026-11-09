import React, { useEffect, useState } from "react";
import type { Ref, Catalog } from "./types";
import PdfPanel, { PdfBoundary } from "./PdfPanel";
import {citationDetails} from './citations';

export function SourcePanel({
  source,
  catalog,
  close,
}: {
  source: Ref;
  catalog: Catalog;
  close: () => void;
}) {
  const record = catalog.sources.find((s) => s.id === source.source_id),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const citation = citationDetails(source, catalog.sources);
  if (
    record &&
    (record.kind === undefined || record.kind === "pdf") &&
    source.page != null
  ) {
    const pdfSource = { ...source, page: source.page };
    return (
      <PdfBoundary source={pdfSource} catalog={catalog} close={close}>
        <PdfPanel source={pdfSource} catalog={catalog} close={close} />
      </PdfBoundary>
    );
  }
  return (
    <div className="source-shade">
      <section
        className="source-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Source inspection"
      >
        <header>
          <h2>{record?.title || source.source_id}</h2>
          <button className="close" aria-label="Close source" onClick={close}>
            ×
          </button>
        </header>
        <div className="source-document">
          {!record ? (
            <p role="alert">This source is not registered.</p>
          ) : record.kind === "image" ? (
            <>
              <p>{record.note}</p>
              {failed ? (
                <div role="alert">
                  Source image unavailable.{" "}
                  <button
                    onClick={() => {
                      setFailed(false);
                      setAttempt((x) => x + 1);
                    }}
                  >
                    Retry source
                  </button>
                </div>
              ) : (
                <img
                  key={attempt}
                  src={"/api/sources/" + record.id + "/file?retry=" + attempt}
                  alt={record.title}
                  onError={() => setFailed(true)}
                />
              )}
            </>
          ) : record.kind === "web" ? (
            <>
              <p>{citation.caption}</p>
              <p>{source.source_text || record.excerpt}</p>
              <p>
                Retrieved {record.retrieved_on}. Publication date:{" "}
                {record.dates?.length
                  ? record.dates.map((d: any) => d.value).join(", ")
                  : "not verified"}
                .
              </p>
              <a href={record.url} target="_blank" rel="noreferrer">
                Open original website · {citation.caption} ↗
              </a>
              <p>
                <a
                  href={"/api/sources/" + record.id + "/file"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open archived source text · {citation.caption} ↗
                </a>
              </p>
            </>
          ) : (
            <p role="alert">A PDF citation requires its exact page number.</p>
          )}
        </div>
      </section>
    </div>
  );
}
