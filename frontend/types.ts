export type Ref = {source_id:string;page:number;locator?:string;source_text?:string};
export type Item = {id:string;label:string;kind:string;domain:string;description?:string;aliases?:string[];group_id?:string;record_type?:string;source_refs?:Ref[];place_ids?:string[];dates?:{value:string;meaning:string}[];[key:string]:any};
export type Edge = {id:string;source:string;target:string;label:string;explanation?:string;basis?:string;source_refs?:Ref[];record_type?:string;[key:string]:any};
export type Route = {id:string;endpoint:string;nodes:string[];edges:string[];why:string};
export type Point = {x:number;y:number};
export type Camera = {zoom:number;pan:Point;reference:number};
export type State = {centre:string|null;search:string;perspective:string;detail:'abbreviated'|'full';overview:boolean;expandedGroups:string[];groupLimits:Record<string,number>;expandedRoutes:string[];alternatives:Route[];branches:string[];selected:string|null;selectedEdges:string[];compare:string[];limit:number;depth:number;positions:Record<string,Point>;camera?:Camera;trail:{label:string;index:number}[];markers:boolean};
export type View = {revision:number;centre:string|null;search:string;perspective:string;nodes:Item[];edges:Edge[];routes:Route[];matches:Item[];passages:{id:string;excerpt:string}[];notices:string[];total_results:number;shown_results:number;limits:Record<string,number>;depth:number};
export type Catalog = {revision:number;topics:Item[];relationships:Edge[];findings:Item[];sources:Item[];coverage:any[];unresolved:any[];perspectives:{id:string;label:string}[];limits:Record<string,number>;domain:string;batches:any[]};
export const initialState:State={centre:null,search:'',perspective:'combined',detail:'abbreviated',overview:true,expandedGroups:[],groupLimits:{},expandedRoutes:[],alternatives:[],branches:[],selected:null,selectedEdges:[],compare:[],limit:12,depth:6,positions:{},trail:[],markers:true};
export const COLORS:Record<string,string>={ecosystem:'#49765b',technology:'#3e7d90',funding:'#b78132',source:'#806f96',comparison:'#5e7891'};
export const GROUP_LABELS:Record<string,string>={species:'Species & companions',habitats:'Habitats & conditions','restoration-methods':'Restoration methods',irrigation:'Establishment water',drones:'Drones & components',monitoring:'Monitoring',programmes:'Funding programmes',activities:'Activities',requirements:'Requirements',places:'Places',organizations:'Organizations',dates:'Dates',findings:'Findings',sources:'Source documents',other:'Other connections'};
export function landscapeGroup(t:Item){
 const group=t.group_id||'other';
 if(t.domain==='ecosystem')return 'ecosystem:'+(group==='species'?'species':group==='restoration-methods'||group==='monitoring'?'restoration-methods':'habitats');
 if(t.domain==='technology')return 'technology:'+(group==='irrigation'?'irrigation':group==='drones'||group==='requirements'?'drones':'monitoring');
 if(t.domain==='funding')return 'funding:'+(group==='activities'?'activities':group==='requirements'||group==='places'?'requirements':'programmes');
 return t.domain+':'+group;
}

export async function api<T=any>(url:string,options?:RequestInit):Promise<T>{
 const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options?.headers}});
 if(!response.ok){let detail='The request could not be completed. Your exploration is preserved.';try{detail=(await response.json()).detail||detail}catch{}throw new Error(typeof detail==='string'?detail:JSON.stringify(detail))}return response.json();
}
