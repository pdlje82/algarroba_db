export type Ref = {source_id:string;page:number;locator?:string;source_text?:string};
export type Item = {id:string;label:string;kind:string;domain:string;description?:string;aliases?:string[];group_id?:string;record_type?:string;source_refs?:Ref[];place_ids?:string[];dates?:{value:string;meaning:string}[];[key:string]:any};
export type Edge = {id:string;source:string;target:string;label:string;explanation?:string;basis?:string;source_refs?:Ref[];record_type?:string;[key:string]:any};
export type Route = {id:string;endpoint:string;nodes:string[];edges:string[];why:string};
export type Point = {x:number;y:number};
export type Camera = {zoom:number;pan:Point;reference:number};
export type State = {layoutVersion?:2|3|4;centreFirst?:boolean;centreVisible?:boolean;centreSession?:number;resultsOpen?:boolean;directLimit?:number;otherConnections?:boolean;centreLevel?:number;centreSource?:{label:string;level:number};retainedLayers?:RetainedLayer[];centre:string|null;search:string;perspective:string;detail:'abbreviated'|'full';overview:boolean;overviewDepth?:0|1;expandedGroups:string[];groupLimits:Record<string,number>;expandedRoutes:string[];alternatives:Route[];branches:string[];selected:string|null;selectedEdges:string[];compare:string[];limit:number;depth:number;positions:Record<string,Point>;camera?:Camera;trail:{label:string;index:number}[];markers:boolean;scene?:SceneMemory};
export type View = {revision:number;centre:string|null;search:string;perspective:string;nodes:Item[];edges:Edge[];routes:Route[];matches:Item[];passages:{id:string;excerpt:string}[];notices:string[];total_results:number;shown_results:number;limits:Record<string,number>;depth:number};
export type Catalog = {revision:number;topics:Item[];relationships:Edge[];findings:Item[];sources:Item[];coverage:any[];unresolved:any[];perspectives:{id:string;label:string}[];limits:Record<string,number>;domain:string;batches:any[];browse_groups?:BrowseGroup[]};
export const initialState:State={layoutVersion:2,centre:null,search:'',perspective:'combined',detail:'abbreviated',overview:true,expandedGroups:[],groupLimits:{},expandedRoutes:[],alternatives:[],branches:[],selected:null,selectedEdges:[],compare:[],limit:12,depth:6,positions:{},trail:[],markers:true};
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

export type Vec3={x:number;y:number;z:number};
export type DisplayMode='layered'|'flat';
export type CameraPose={position:Vec3;target:Vec3;quaternion:[number,number,number,number];focalScale:number;reference:number};
export type SceneContext={centreSession?:number;layerCeiling?:number;returns?:LayerReturn[];returnSerial?:number;homes:Record<string,Vec3>;flat:Record<string,Vec3>;owners:Record<string,string[]>;planes:Record<string,number>;cameras:Partial<Record<DisplayMode,CameraPose>>;routes?:Record<string,Route>;signature?:string;signatures?:Partial<Record<DisplayMode,string>>;laidOut?:Partial<Record<DisplayMode,string[]>>;revealed?:Record<string,number>;focus?:{id:string;position:Vec3};references?:Record<string,SceneReference>;flatArea?:'centre'|'results';reflow?:string[];layers?:Record<string,LayerDescriptor>};
export type SceneMemory={version:3|4;centres?:Record<string,{homes:Record<string,Vec3>;flat?:Record<string,Vec3>}>;mode:DisplayMode;presentation?:'foreground';collapse?:{id:string;parentId:string|null;level?:number};planeGap?:number;focusOffset?:number;focus?:string|null;contexts:Record<string,SceneContext>;revision?:number};

export type LayerReturn={id:string;owners:string[];parentId:string|null;label:string};

export type BrowseGroup={id:string;label:string;parent_id:string;anchor_topic_id:string;members:{topic_id:string;role:'primary'|'shared'}[];maintenance_rule:string};
export type LayerDescriptor={level:number;kind:'overview'|'centre'|'detail'|'results';label:string;shortLabel?:string;anchorIds:string[]};
export type RetainedLayer=LayerDescriptor&{id:string;x:number;y:number;width:number;height:number;members:{id:string;home:Vec3}[]};

export type SceneReference={id:string;topicId:string;owner:string;position:Vec3;label:string;width:number;height:number};
