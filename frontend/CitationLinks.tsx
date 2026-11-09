import React from 'react';
import type {Catalog, Ref} from './types';
import {citationDetails} from './citations';

export function CitationLinks({refs, catalog, open, friendly = false}: {
  refs: Ref[]; catalog: Catalog; open: (ref: Ref) => void; friendly?: boolean;
}) {
  return <div className={friendly ? 'desk-source-links' : 'refs'}>{refs.map((ref, i) => {
    const citation = citationDetails(ref, catalog.sources);
    return <button key={i} type="button" className={friendly ? 'desk-text-link citation-link' : 'citation-link'}
      onClick={() => open(ref)} title={ref.locator} aria-label={`Open ${citation.text}`}>
      <span className="citation-heading">{citation.caption}</span>
      <span className="citation-document">{citation.document} · {citation.location} ↗</span>
    </button>;
  })}</div>;
}
