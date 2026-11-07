import {GROUP_LABELS,type State,type Catalog,type LayerScope,type LayerExploration,type ExplorationLayer,type Point,type View,type Route} from './types.ts';

import {browseGroups,rootGroup,primaryGroup,directNeighbours} from './organization.ts';
import {PLANE_GAP} from './depth.ts';



export const ROOT_GROUPS=['ecosystem:species','ecosystem:habitats','ecosystem:restoration-methods','technology:irrigation','technology:drones','technology:monitoring','funding:programmes','funding:activities','funding:requirements'];

const copy=<T,>(x:T):T=>structuredClone(x);

export const layerName=(id:string,c:Catalog)=>c.browse_groups?.find(g=>g.id===id)?.label||GROUP_LABELS[id.split(':').at(-1)!]||id;

const base=():ExplorationLayer=>({id:'overview',kind:'overview',label:'Overview',subtitle:'Available knowledge',parentId:'',scope:{kind:'root',key:'overview'},band:0,open:true,order:0,display:'groups',offsets:{layered:{x:0,y:0},flat:{x:0,y:0}},slots:{layered:{},flat:{}},signatures:{}});

export function newLayers():LayerExploration{return {version:5,layers:{overview:base()},currentId:'overview',serial:0,hosts:{},aspect:16/9}}

export const nextBand=(v:LayerExploration)=>Math.max(0,...Object.values(v.layers).filter(l=>l.open).map(l=>l.band))+1;

export function members(scope:LayerScope,c:Catalog):string[]{

 if(scope.kind==='root')return c.topics.filter(t=>rootGroup(t.id,c)===scope.key&&!primaryGroup(t.id,c)&&!browseGroups(c).some(g=>g.anchor_topic_id===t.id&&g.parent_id.startsWith('browse:'))).map(t=>t.id);

 if(scope.kind==='group')return (c.browse_groups?.find(g=>g.id===scope.key)?.members||[]).map(m=>m.topic_id);

 if(scope.kind==='neighbors')return directNeighbours(scope.anchorId!,c).map(t=>t.id);

 return [...new Set(scope.memberIds||[])].filter(id=>id!==scope.anchorId);

}

export function ensureLayers(s:State,c:Catalog):State{

 if(s.layerView?.version===5)return s;

 const legacyRecords=[...c.topics,...c.findings.map(r=>({...r,id:'finding:'+r.id,record_id:r.id,record_type:'finding',domain:'source'})),...c.sources.map(r=>({...r,id:'source:'+r.id,record_type:'source',kind:'source',domain:'source'}))],legacyMap=new Map(legacyRecords.map(r=>[r.id,r]));const result=copy(s),v=newLayers(),key=s.perspective+':'+(s.centre||'overview')+':'+s.search,ctx=s.scene?.contexts[key];

 const add=(id:string,scope:LayerScope,band:number,label:string,kind:ExplorationLayer['kind']='contents',parentId='overview')=>{const layer:ExplorationLayer={...base(),id,kind,scope,band,label,parentId,anchorId:scope.anchorId,order:++v.serial,display:'topics',subtitle:'',offsets:{layered:{x:0,y:0}},slots:{layered:{},flat:{}},signatures:{}};v.layers[id]=layer;for(const member of members(scope,c)){const p=ctx?.homes[member]||s.retainedLayers?.flatMap(l=>l.members).find(m=>m.id===member)?.home||Object.entries(s.positions||{}).find(([key])=>key.endsWith(':'+member))?.[1];if(p){layer.slots.layered[member]={x:p.x,y:p.y};v.hosts[member]??=id}const f=ctx?.flat[member];if(f)layer.slots.flat[member]={x:f.x,y:f.y}}return layer};

 for(const retained of s.retainedLayers||[]){const anchor=retained.anchorIds[0],gid=anchor?.replace(/^group:/,'');let scope:LayerScope;if(gid&&ROOT_GROUPS.includes(gid))scope={kind:'root',key:gid};else if(c.browse_groups?.some(g=>g.anchor_topic_id===anchor))scope={kind:'group',key:c.browse_groups.find(g=>g.anchor_topic_id===anchor)!.id,anchorId:anchor};else scope={kind:'members',key:retained.id,memberIds:retained.members.map(m=>m.id)};add('retained:'+retained.id,scope,retained.level,retained.label)}

 for(const gid of s.expandedGroups){const g=c.browse_groups?.find(g=>g.id===gid);let scope:LayerScope={kind:g?'group':'root',key:gid,anchorId:g?.anchor_topic_id};if(!g&&!ROOT_GROUPS.includes(gid)){let ids=Object.entries(ctx?.owners||{}).filter(([,owners])=>owners.includes('group:'+gid)).map(([id])=>id);if(gid==='source:findings')ids=legacyRecords.filter(r=>r.record_type==='finding').map(r=>r.id);else if(gid==='source:sources')ids=legacyRecords.filter(r=>r.record_type==='source').map(r=>r.id);else if(!ids.length)ids=c.topics.filter(r=>r.domain+':'+r.group_id===gid).map(r=>r.id);scope={kind:'members',key:gid,memberIds:ids,records:ids.map(id=>legacyMap.get(id)).filter(Boolean) as any[],perspective:s.perspective}}add(g?'group:'+gid:'root:'+gid,scope,ctx?.planes['group:'+gid]||1,'Detail · '+layerName(gid,c))}

 for(const id of s.branches)add('connections:'+id,{kind:'neighbors',key:id,anchorId:id},ctx?.planes['topic:'+id]||2,'Detail · '+(c.topics.find(t=>t.id===id)?.label||id),'connections');

 if(s.centre&&!s.overview){let host=v.hosts[s.centre];if(!host){const origin=add('origin:'+s.centre,{kind:'origin',key:s.centre,memberIds:[s.centre]},Math.max(0,(s.centreLevel||1)-1),'Topic · '+(c.topics.find(t=>t.id===s.centre)?.label||s.centre),'origin');const p=s.retainedLayers?.flatMap(l=>l.members).find(m=>m.id===s.centre)?.home||ctx?.homes[s.centre];if(p)origin.slots.layered[s.centre]={x:p.x,y:p.y};host=origin.id;v.hosts[s.centre]=host}add('connections:'+s.centre,{kind:'neighbors',key:s.centre,anchorId:s.centre},s.centreLevel||1,'Centre · '+c.topics.find(t=>t.id===s.centre)?.label,'connections',host)}

 const oldRoutes={...ctx?.routes,...Object.fromEntries(s.alternatives.map(r=>[r.id,r]))};
 for(const id of s.expandedRoutes){const r=oldRoutes[id];if(r)add('route-layer:'+id,{kind:'route',key:id,anchorId:r.nodes[0],memberIds:r.nodes.slice(1),routes:[r]},ctx?.planes['route:'+id]||Math.max(1,...r.nodes.map(id=>(ctx?.homes[id]?.z||0)/PLANE_GAP)),'Route · '+(c.topics.find(t=>t.id===r.endpoint)?.label||r.endpoint),'route',v.hosts[r.nodes[0]]||'overview')}
 if(s.resultsOpen&&ctx){const ids=Object.keys(ctx.homes).filter(id=>legacyMap.has(id)&&id!==s.centre),l=add('results:'+(s.centre||'overview'),{kind:'results',key:'results:'+(s.centre||'overview'),anchorId:s.centre||undefined,memberIds:ids,records:ids.map(id=>legacyMap.get(id)) as any[],perspective:s.perspective,search:s.search,routes:Object.values(oldRoutes)},Math.max(1,...ids.map(id=>(ctx.homes[id]?.z||0)/PLANE_GAP)),'Results · '+(s.search||'Connected knowledge'),'results');(l.scope as any).detail=s.detail}
 for(const [owner,band] of Object.entries(ctx?.planes||{})){if(owner.startsWith('visit:')){const id=owner.slice(6);if(c.topics.some(t=>t.id===id)&&!v.hosts[id])add('origin:'+id,{kind:'origin',key:id,memberIds:[id]},band,'Topic · '+c.topics.find(t=>t.id===id)!.label,'origin')}}

 v.currentId=Object.values(v.layers).filter(l=>l.open).sort((a,b)=>b.band-a.band||b.order-a.order)[0]?.id||'overview';

 if(result.selected?.startsWith('more:')){const gid=result.selected.slice(5);result.selected=c.browse_groups?.find(g=>g.id===gid)?.anchor_topic_id||'group:'+gid;}

 result.layerView=v;result.layoutVersion=5;result.scene={...s.scene,version:5,mode:s.scene?.mode||'layered',contexts:copy(s.scene?.contexts||{}),presentation:'foreground',planeGap:PLANE_GAP,focusOffset:0,focus:null};return result;

}

function put(s:State,c:Catalog,id:string,scope:LayerScope,label:string,kind:ExplorationLayer['kind'],source?:string,force=false,sourceId=scope.anchorId){

 const n=copy(ensureLayers(s,c)),v=n.layerView!,existing=v.layers[id];

 if(existing?.open&&!force)return closeLayer(n,id);

 const parentId=source&&source!==id&&v.layers[source]?.open?source:existing?.parentId&&v.layers[existing.parentId]?.open?existing.parentId:v.currentId!==id?v.currentId:'overview';

 const top=nextBand(v)-1,band=existing?.open&&existing.band===top?top:top+1,old=existing||{...base(),id,kind,label,scope,parentId,display:'topics',order:++v.serial,offsets:{},slots:{layered:{},flat:{}},signatures:{}};
 v.change=(v.change||0)+1;v.layers[id]={...old,label,kind,scope,parentId,sourceId:sourceId||old.sourceId,band,open:true,display:old.display};
 if(existing&&!existing.open){const mode=s.scene?.mode||'layered';v.layers[id].compactRequested={...old.compactRequested,[mode]:true};if(old.manualOffsets?.[mode]!==true)delete v.layers[id].offsets[mode]}

 v.layers[id].anchorId=scope.anchorId;v.currentId=id;n.overview=false;n.selected=kind==='route'?n.selected:scope.anchorId||n.selected;if(kind!=='route')n.selectedEdges=[];return n;

}

export function openGroupLayer(s:State,c:Catalog,gid:string,source?:string,force=false){const g=c.browse_groups?.find(g=>g.id===gid);return put(s,c,(g?'group:':'root:')+gid,{kind:g?'group':'root',key:gid,anchorId:g?.anchor_topic_id},'Detail · '+layerName(gid,c),'contents',source||(g?s.layerView?.hosts[g.anchor_topic_id]:'overview'),force,g?.anchor_topic_id||'group:'+gid)}

export function openTopicLayer(s:State,c:Catalog,id:string,source?:string,connections=false){const g=!connections&&c.browse_groups?.find(g=>g.anchor_topic_id===id);if(g)return openGroupLayer(s,c,g.id,source);return put(s,c,'connections:'+id,{kind:'neighbors',key:id,anchorId:id},'Detail · '+c.topics.find(t=>t.id===id)?.label,'connections',source)}

export function centreLayer(s:State,c:Catalog,id:string){let n=copy(ensureLayers(s,c)),v=n.layerView!;let host=v.hosts[id];if(!host||!v.layers[host]?.open){const originId='origin:'+id;v.layers[originId]={...base(),id:originId,kind:'origin',label:'Topic · '+c.topics.find(t=>t.id===id)?.label,subtitle:'Centre origin',scope:{kind:'origin',key:id,memberIds:[id]},parentId:'overview',band:nextBand(v),order:++v.serial,display:'topics',offsets:{},slots:{layered:{},flat:{}},signatures:{}};host=originId;v.hosts[id]=host}n=put(n,c,'connections:'+id,{kind:'neighbors',key:id,anchorId:id},'Centre · '+c.topics.find(t=>t.id===id)?.label,'connections',host,true);n.centre=id;n.centreFirst=true;n.centreVisible=true;n.resultsOpen=false;n.selected=id;return n}

/** Remove the centre designation without closing or rearranging the exploration. */
export function withoutCentre(s:State):State{
 const n=copy(s),previous=n.centre;if(!previous)return n;
 const oldKey=n.perspective+':'+previous+':'+n.search,newKey=n.perspective+':overview:'+n.search;
 n.centre=null;n.centreFirst=false;n.centreVisible=false;n.resultsOpen=false;
 if(n.selected===previous){n.selected=null;n.selectedEdges=[]}
 if(n.scene){if(n.scene.focus===previous)n.scene.focus=null;const context=n.scene.contexts[oldKey];if(context)n.scene.contexts[newKey]=copy(context)}
 return n;
}

export function resultLayer(s:State,c:Catalog,view:View){

 const n=ensureLayers(s,c),id='results:'+(s.centre||'overview'),visible=new Set<string>();

 if(!s.centre||['comparison','sources','time'].includes(s.perspective))view.nodes.forEach(r=>visible.add(r.id));

 else {for(const r of [...view.routes,...s.alternatives]){visible.add(r.endpoint);if(s.detail==='full'||s.expandedRoutes.includes(r.id))r.nodes.forEach(id=>visible.add(id))}for(const r of view.nodes)if(r.missing||r.perspective_support||r.record_type!=='topic')visible.add(r.id)}

 const records=view.nodes.filter(r=>visible.has(r.id)&&r.id!==s.centre),scope:LayerScope={kind:'results',key:id,revision:view.revision,anchorId:s.centre||undefined,memberIds:records.map(r=>r.id),records,edges:view.edges,routes:[...view.routes,...s.alternatives],perspective:s.perspective,search:s.search};

 const next=put(n,c,id,scope,'Results · '+(s.search||'Connected knowledge')+' · '+(c.perspectives?.find(p=>p.id===s.perspective)?.label||s.perspective),'results',s.centre?'connections:'+s.centre:'overview',true),layer=next.layerView!.layers[id],old=n.layerView!.layers[id];

 const key=(scope.perspective||'combined')+':'+scope.search+':'+s.detail,oldKey=old&&(old.scope.perspective||'combined')+':'+old.scope.search+':'+(old.scope as any).detail;

 (layer.scope as any).detail=s.detail;

 if(old&&oldKey!==key){layer.arrangements={...old.arrangements,[oldKey]:{slots:old.slots,offsets:old.offsets,signatures:old.signatures,packing:old.packing,centres:old.centres,manualOffsets:old.manualOffsets}};const cached=layer.arrangements[key];layer.slots=cached?.slots||{layered:{},flat:{}};layer.offsets=cached?.offsets||{};layer.signatures=cached?.signatures||{};layer.packing=cached?.packing;layer.centres=cached?.centres;layer.manualOffsets=cached?.manualOffsets}

 next.selected=s.selected;next.selectedEdges=[...s.selectedEdges];return next;

}

export function routeLayer(s:State,c:Catalog,r:Route){return put(s,c,'route-layer:'+r.id,{kind:'route',key:r.id,anchorId:r.nodes[0],memberIds:r.nodes.slice(1),routes:[r]},'Route · '+c.topics.find(t=>t.id===r.endpoint)?.label,'route',s.layerView?.layers[s.layerView.currentId]?.kind==='route'?s.layerView.layers[s.layerView.currentId].parentId:s.layerView?.currentId,true)}

export function routesLayer(s:State,c:Catalog,routes:Route[],key='all'){if(!routes.length)return s;const parent=s.layerView?.layers[s.layerView.currentId],anchor=routes[0].nodes[0];return put(s,c,'route-batch:'+key+':'+(s.centre||'overview'),{kind:'route',key,anchorId:anchor,memberIds:[...new Set(routes.flatMap(r=>r.nodes))],routes},key==='all'?'Routes · All displayed connections':'Routes · Alternatives','route',parent?.kind==='route'?parent.parentId:parent?.id,true)}
export function memberLayer(s:State,c:Catalog,scope:LayerScope,label:string,source:string,sourceId=scope.categoryKey?'viewgroup:'+source+':'+scope.categoryKey:undefined){return put(s,c,'members:'+scope.key,scope,label,'contents',source,false,sourceId)}

export function descendants(v:LayerExploration,id:string){const found=new Set<string>();let changed=true;while(changed){changed=false;for(const l of Object.values(v.layers))if(l.id!==id&&l.open&&(l.parentId===id||found.has(l.parentId))&&!found.has(l.id)){found.add(l.id);changed=true}}return found}

export function closeLayer(s:State,id:string){const n=copy(s),v=n.layerView!;if(id==='overview')return overviewLayers(n);v.change=(v.change||0)+1;const gone=descendants(v,id);gone.add(id);for(const key of gone)v.layers[key].open=false;v.currentId=v.layers[id]?.parentId&&v.layers[v.layers[id].parentId]?.open?v.layers[id].parentId:'overview';n.selectedEdges=[];if(n.selected&&gone.has(v.hosts[n.selected])&&!Object.values(v.layers).some(l=>l.open&&l.memberIds?.includes(n.selected!)))n.selected=null;if(id==='connections:'+s.centre)n.centreVisible=false;return n}

export function returnLayer(s:State,id:string){if(id==='overview'){const n=copy(s),v=n.layerView!;let branch=v.currentId;while(v.layers[branch]?.parentId&&v.layers[branch].parentId!=='overview')branch=v.layers[branch].parentId;if(branch!=='overview')return closeLayer(n,branch);return n}const n=copy(s),v=n.layerView!,l=v.layers[id];if(!l?.open)return n;v.change=(v.change||0)+1;for(const key of descendants(v,id))v.layers[key].open=false;const old=l.band,top=nextBand(v)-1,band=old===top?old:top+1;for(const other of Object.values(v.layers))if(other.open&&other.band===old)other.band=band;v.currentId=id;n.selectedEdges=[];return n}

export function closeRouteLayers(s:State){const n=copy(s),v=n.layerView!;const gone=new Set<string>();for(const l of Object.values(v.layers))if(l.open&&l.kind==='route'){gone.add(l.id);descendants(v,l.id).forEach(id=>gone.add(id))}for(const id of gone)v.layers[id].open=false;while(v.currentId!=='overview'&&!v.layers[v.currentId]?.open)v.currentId=v.layers[v.currentId]?.parentId||'overview';v.change=(v.change||0)+1;n.expandedRoutes=[];n.alternatives=[];n.selectedEdges=[];n.detail='abbreviated';return n}
export function overviewLayers(s:State){const n=copy(s),v=n.layerView!;v.change=(v.change||0)+1;for(const l of Object.values(v.layers))if(l.id!=='overview')l.open=false;v.currentId='overview';n.overview=true;n.resultsOpen=false;n.centreVisible=false;n.expandedGroups=[];n.branches=[];n.expandedRoutes=[];return n}

export function zoomLayer(s:State){const v=s.layerView!;if(v.currentId!=='overview'&&v.layers[v.currentId]?.open)return closeLayer(s,v.currentId);const top=Object.values(v.layers).filter(l=>l.open&&l.id!=='overview').sort((a,b)=>b.band-a.band||b.order-a.order)[0];return top?closeLayer(s,top.id):null}

export function moveLayer(s:State,id:string,offset:Point,mode=s.scene?.mode||'layered'){const n=copy(s);if(id!=='overview'&&n.layerView?.layers[id]){n.layerView.layers[id].offsets[mode]={...offset};n.layerView.layers[id].manualOffsets={...n.layerView.layers[id].manualOffsets,[mode]:true};n.layerView.change=(n.layerView.change||0)+1}return n}

export function layerDisplay(s:State,id:string,display:'topics'|'groups'){const n=copy(s);if(id!=='overview'&&n.layerView?.layers[id]){const l=n.layerView.layers[id];if(l.display!==display&&display==='groups')for(const mode of ['layered','flat'] as const){for(const key of Object.keys(l.slots[mode]))if(key.startsWith('viewgroup:'+id+':'))delete l.slots[mode][key];delete l.signatures[mode]}l.display=display;n.layerView.change=(n.layerView.change||0)+1}return n}


/** An explicit, reversible tidy action; only the active mode's contents move. */
export function compactLayer(s:State,id:string){const n=copy(s),l=n.layerView?.layers[id];if(l){l.compactRequested={...l.compactRequested,[s.scene?.mode||'layered']:true};n.layerView!.change=(n.layerView!.change||0)+1}return n}
