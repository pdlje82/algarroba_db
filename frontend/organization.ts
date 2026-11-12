import { landscapeGroup, ROOT_GROUPS, type Catalog, type Item } from "./types.ts";
/** Reorder numbered funding entries in their existing slots; leave other context in place. */
export function orderFundingNumbers<T>(items:T[], label:(item:T)=>string, funding:(item:T)=>boolean):T[] {
  const code=(item:T)=>funding(item) ? (label(item).match(/^(\d+(?:\.\d+)*)(?=\s|[·:–-]|$)/)?.[1] || label(item).match(/\b(?:Line|Línea)\s+(\d+(?:\.\d+)*)(?=\s|[·:–-]|$)/i)?.[1] || label(item).match(/\b(\d+(?:\.\d+)+)(?=\s|[·:–-]|$)/)?.[1]) : undefined;
  const numbered=items.filter(item=>code(item)).sort((a,b)=>code(a)!.localeCompare(code(b)!,undefined,{numeric:true}));
  let next=0;
  return items.map(item=>code(item)?numbered[next++]:item);
}
export type EditorTarget = {kind: 'group' | 'community'; id: string | null; sourceId?: string};
export function editorTarget(id: string | null | undefined, catalog: Catalog | null): EditorTarget | null {
  if (!id || !catalog) return null;
  if (catalog.communities.some(g => g.id === id)) return {kind: 'community', id};
  if (catalog.browse_groups.some(g => g.id === id) || catalog.organization_roots.some(g => g.id === id)) return {kind: 'group', id};
  if (catalog.topics.some(t => t.id === id && t.kind === 'habitat')) return {kind: 'community', id: null, sourceId: id};
  return null;
}
export function groupLabel(id: string, catalog?: Catalog | null): string {
  if(isReviewGroup(id))return {'ecosystem':'Needs organization · Ecosystems','technology':'Needs organization · Technology','funding':'Needs organization · Funding'}[id.slice(7)]!;
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
  if(isReviewGroup(id))return id.slice(7);
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
/** Explicit navigation containers are skipped; real single-child levels remain. */
export function navigationGroup(id:string|null,catalog?:Catalog|null):string|null {
  const seen=new Set<string>();
  while(id&&!seen.has(id)){
    seen.add(id);const g=catalog?.browse_groups.find(g=>g.id===id);
    if(g?.navigation!=='transparent')break;
    id=g.parent_id;
  }
  return id;
}
export function navigationChildren(id:string,catalog:Catalog):Catalog['browse_groups'] {
  const children=catalog.browse_groups.filter(g=>g.parent_id===id).flatMap(g=>g.navigation==='transparent'?navigationChildren(g.id,catalog):[g]);
  return orderFundingNumbers(children,g=>g.label,g=>groupDomain(g.id,catalog)==='funding');
}
export function navigationContainers(id:string,catalog:Catalog):Catalog['browse_groups'] {
  return catalog.browse_groups.filter(g=>g.parent_id===id&&g.navigation==='transparent').flatMap(g=>[g,...navigationContainers(g.id,catalog)]);
}
export function isReviewGroup(id:string|null|undefined):boolean {
  return !!id && ['review:ecosystem','review:technology','review:funding'].includes(id);
}
export function isHierarchyGroup(id:string|null,catalog?:Catalog|null) {
  return ROOT_GROUPS.includes(id||'') || isReviewGroup(id) || catalog?.browse_groups.some(g=>g.id===id&&g.presentation==='hierarchy') || false;
}
export function fixedGroupLayout(id: string | null, catalog?: Catalog | null) {
  const group = catalog?.browse_groups.find(g => g.id === id);
  return isHierarchyGroup(id,catalog) || group?.member_layout === 'vertical';
}
export function primaryGroup(id: string, catalog: Catalog) {
  return browseGroups(catalog).find((g) =>
    g.members.some((m) => m.topic_id === id && m.role === "primary"),
  );
}
export function rootGroup(id: string, catalog: Catalog): string {
  if(catalog.organization_review?.topic_roots[id])return catalog.organization_review.topic_roots[id];
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
