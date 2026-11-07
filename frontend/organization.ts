import {landscapeGroup,type Catalog,type Item} from './types.ts';
export const browseGroups=(catalog:Catalog)=>catalog.browse_groups||[];
export function primaryGroup(id:string,catalog:Catalog){return browseGroups(catalog).find(g=>g.members.some(m=>m.topic_id===id&&m.role==='primary'))}
export function rootGroup(id:string,catalog:Catalog):string{
 const item=catalog.topics.find(t=>t.id===id),group=primaryGroup(id,catalog);if(!group)return item?landscapeGroup(item):'';
 let parent=group.parent_id;const seen=new Set<string>();while(!seen.has(parent)){seen.add(parent);const g=browseGroups(catalog).find(g=>g.id===parent);if(!g)break;parent=g.parent_id}return parent;
}
export function directNeighbours(id:string,catalog:Catalog):Item[]{
 const edges=catalog.relationships.filter(e=>e.source===id||e.target===id),ids=[...new Set(edges.map(e=>e.source===id?e.target:e.source).filter(other=>other!==id))];
 return ids.map(id=>catalog.topics.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>Number(!edges.some(e=>e.basis!=='curated'&&[e.source,e.target].includes(a!.id)))-Number(!edges.some(e=>e.basis!=='curated'&&[e.source,e.target].includes(b!.id)))||a!.label.localeCompare(b!.label)||a!.id.localeCompare(b!.id)) as Item[];
}
export function groupLabel(id:string,catalog:Catalog){return browseGroups(catalog).find(g=>g.id===id)?.label}
