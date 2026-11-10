import { landscapeGroup, ROOT_GROUPS, type Catalog, type Item } from "./types.ts";
export type EditorTarget = {kind: 'group' | 'community'; id: string | null; sourceId?: string};
export function editorTarget(id: string | null | undefined, catalog: Catalog | null): EditorTarget | null {
  if (!id || !catalog) return null;
  if (catalog.communities.some(g => g.id === id)) return {kind: 'community', id};
  if (catalog.browse_groups.some(g => g.id === id) || catalog.organization_roots.some(g => g.id === id)) return {kind: 'group', id};
  if (catalog.topics.some(t => t.id === id && t.kind === 'habitat')) return {kind: 'community', id: null, sourceId: id};
  return null;
}
export function groupLabel(id: string, catalog?: Catalog | null): string {
  if(!catalog)return id;
  const group=catalog.browse_groups.find(g=>g.id===id) || catalog.organization_roots?.find(g=>g.id===id) || catalog.communities?.find(g=>g.id===id);
  if(group)return group.label;
  if(ROOT_GROUPS.includes(id))throw new Error('Organization labels are unavailable. Restart the backend and refresh; no substitute label was used.');
  return id;
}
export function groupMembers(id:string,catalog:Catalog):string[]{
  const group=catalog.browse_groups.find(g=>g.id===id);
  return [...new Set([...(group?.members.map(m=>m.topic_id)||[]),...catalog.browse_groups.filter(g=>g.parent_id===id).flatMap(g=>groupMembers(g.id,catalog))])];
}
export function groupDomain(id:string,catalog:Catalog):string{
  let at=id;const seen=new Set<string>();
  while(!seen.has(at)){seen.add(at);const group=catalog.browse_groups.find(g=>g.id===at);if(!group)break;at=group.parent_id;}
  return at.startsWith('domain:')?at.slice(7):at.split(':')[0];
}
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
export function fixedGroupLayout(id: string | null, catalog?: Catalog | null) {
  const group = catalog?.browse_groups.find(g => g.id === id);
  return group?.presentation === 'hierarchy' || group?.member_layout === 'vertical';
}
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
  let last = group.id;
  const seen = new Set<string>();
  while (!seen.has(parent)) {
    seen.add(parent);
    const g = browseGroups(catalog).find((g) => g.id === parent);
    if (!g) break;
    last = g.id;
    parent = g.parent_id;
  }
  return parent.startsWith('domain:') ? last : parent;
}
