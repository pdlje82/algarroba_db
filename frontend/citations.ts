import type { Ref } from './types';

type CitationSource = {id: string; title?: string; page_labels?: Record<string, string>};
const clean = (text?: string) => text?.trim().replace(/\s+/g, ' ') || '';
const meaningful = (text?: string) => {
  const value = clean(text);
  return /^(selected passage|source|document|pdf|page\s*\d*)[.!]?$/i.test(value) ? '' : value;
};

/** Labels describe reviewed passages; never infer a heading or irrigation value from prose. */
export function citationDetails(ref: Ref, sources: CitationSource[] = []) {
  const source = sources.find(s => s.id === ref.source_id);
  const heading = ref.page != null ? clean(source?.page_labels?.[String(ref.page)]) : '';
  const locator = meaningful(ref.locator);
  const caption = meaningful(ref.label) || heading || locator || 'Section heading not recorded';
  const document = source?.title || ref.source_id;
  const location = ref.page != null ? `PDF p${ref.page}` : 'Source';
  return {caption, document, location, text: `${caption} · ${document} · ${location}`};
}
