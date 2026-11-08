import { landscapeGroup, type Catalog, type Item } from "./types.ts";
export function recordedPlaceId(topic: Item, catalog: Catalog): string | null {
  let id = topic.kind === "place" ? topic.id : topic.place_ids?.[0];
  const seen = new Set<string>();
  while (id && catalog.identity_redirects?.[id] && !seen.has(id)) {
    seen.add(id);
    id = catalog.identity_redirects[id];
  }
  return id || null;
}
export function placeLabel(id: string | null, catalog?: Catalog | null) {
  return !id || id === "unrecorded"
    ? "Place not recorded"
    : catalog?.topics.find((t) => t.id === id)?.label ||
        "Place unavailable (" + id + ")";
}
export const browseGroups = (catalog: Catalog) => catalog.browse_groups || [];
export function primaryGroup(id: string, catalog: Catalog) {
  return browseGroups(catalog).find((g) =>
    g.members.some((m) => m.topic_id === id && m.role === "primary"),
  );
}
export function rootGroup(id: string, catalog: Catalog): string {
  const item = catalog.topics.find((t) => t.id === id),
    group = primaryGroup(id, catalog);
  if (!group) return item ? landscapeGroup(item) : "";
  let parent = group.parent_id;
  const seen = new Set<string>();
  while (!seen.has(parent)) {
    seen.add(parent);
    const g = browseGroups(catalog).find((g) => g.id === parent);
    if (!g) break;
    parent = g.parent_id;
  }
  return parent;
}
