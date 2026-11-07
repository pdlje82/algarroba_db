import {GROUP_LABELS,landscapeGroup,initialState,type State,type Catalog,type View,type Item,type Route,type Vec3,type SceneContext,type CameraPose,type SceneReference,type SceneLayer,type LayerExploration} from './types.ts';
import {projectKnowledge} from './projection.ts';
import {PLANE_GAP,FOCUS_OFFSET} from './depth.ts';
import {browseGroups,primaryGroup,rootGroup,directNeighbours} from './organization.ts';
import {layerReturns} from './layerNavigation.ts';
export {PLANE_GAP,FOCUS_OFFSET} from './depth.ts';
export const MAX_ITEMS=120,MAX_LINKS=240;
export type SceneCard={id:string;record:Item;home:Vec3;position:Vec3;plane:number;owners:string[];width:number;height:number;internal?:InternalSummary;layerId?:string;dimmed?:boolean};
export type SceneLink={id:string;source:string;target:string;record:any;relationshipIds:string[];active:boolean};
export type InternalSummary={id:string;cardId:string;relationshipIds:string[];record:any};
export type Scene={layers?:SceneLayer[];layerView?:LayerExploration;activeCardIds?:string[];cards:SceneCard[];links:SceneLink[];internalSummaries:InternalSummary[];retainedLayers?:State['retainedLayers'];references?:SceneReference[];context:SceneContext;key:string;signature:string;notice:string;level:number;mode:'layered'|'flat';focused:string|null;homeMarker?:{id:string;label:string;home:Vec3};revision:number};
const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const empty=():SceneContext=>({homes:{},flat:{},owners:{},planes:{},cameras:{}});
export function sceneKey(s:State){return s.perspective+':'+(s.centre||'overview')+':'+s.search}
export function normalizeExploration(value:Partial<State>|null):State{
 const next={...copy(initialState),...copy(value||{})};
 for(const key of ['expandedGroups','expandedRoutes','branches','selectedEdges','compare'] as const)next[key]=[...new Set(next[key]||[])];
 next.positions=next.positions||{};next.groupLimits=next.groupLimits||{};next.alternatives=next.alternatives||[];
 if(!next.scene||![3,4,5].includes(next.scene.version))next.scene={version:4,mode:'layered',contexts:{}};
 if(next.scene?.version===5){next.layoutVersion=5;return next}
 const memory=next.scene!;memory.version=4;
 const oldGap=typeof memory.planeGap==='number'&&memory.planeGap>0?memory.planeGap:260;
 const oldOffset=typeof memory.focusOffset==='number'&&memory.focusOffset>=0?memory.focusOffset:24;
 if(oldGap!==PLANE_GAP||oldOffset!==FOCUS_OFFSET){
  const ratio=PLANE_GAP/oldGap;
  for(const context of Object.values(memory.contexts)){
   // Change depth only: cached XY layouts, ownership, Flat views and factual IDs are preserved.
   for(const home of Object.values(context.homes))home.z*=ratio;
   if(context.focus)context.focus.position.z=(context.focus.position.z-oldOffset)*ratio+FOCUS_OFFSET;
   const camera=context.cameras.layered;
   if(camera){const shift=camera.target.z*(ratio-1);camera.position.z+=shift;camera.target.z+=shift}
  }
 }
 if(memory.presentation!=='foreground'){
  for(const context of Object.values(memory.contexts)){
   const level=Math.max(0,...Object.keys(context.owners).map(id=>Math.round((context.homes[id]?.z||0)/PLANE_GAP)));
   const camera=context.cameras.layered;if(camera){camera.position.z-=level*PLANE_GAP;camera.target.z-=level*PLANE_GAP}
  }
  memory.presentation='foreground';
 }
 memory.planeGap=PLANE_GAP;memory.focusOffset=FOCUS_OFFSET;
 next.layoutVersion=4;return next;
}
export function rememberScene(s:State,scene:Scene,pose?:CameraPose):State{
 // A pending request still paints the last working scene; it must not overwrite new controls/caches.
 if(scene.key!==sceneKey(s))return copy(s);
 if(scene.layerView){if(s.layerView&&(s.layerView.change||0)!==(scene.layerView.change||0))return s;const context=copy(scene.context);if(pose)context.cameras[scene.mode]=copy(pose);return {...s,layoutVersion:5,layerView:copy(scene.layerView),scene:{...s.scene!,version:5,presentation:'foreground',planeGap:PLANE_GAP,focusOffset:0,revision:scene.revision,contexts:{...s.scene?.contexts,[scene.key]:context}}}}
 const memory={...(s.scene||{version:4 as const,mode:'layered' as const,contexts:{}})};
 const context=copy(scene.context);context.cameras={...context.cameras,...copy(memory.contexts[scene.key]?.cameras||{})};if(pose)context.cameras[scene.mode]=copy(pose);
 context.signature=scene.signature;context.signatures={...context.signatures,[scene.mode]:scene.signature};context.laidOut={...context.laidOut,[scene.mode]:scene.cards.map(c=>c.id)};
 if(s.centreFirst&&s.centre&&scene.cards.some(c=>c.owners.includes('centre:'+s.centre))){memory.centres={...memory.centres,[s.centre]:{...memory.centres?.[s.centre],...(scene.mode==='flat'&&!s.resultsOpen?{flat:copy(context.flat)}:{}),homes:Object.fromEntries(scene.cards.filter(c=>c.owners.includes('centre:'+s.centre)).map(c=>[c.id,{...c.home}]))}}}
 return {...s,layoutVersion:4,scene:{...memory,presentation:'foreground',planeGap:PLANE_GAP,focusOffset:FOCUS_OFFSET,revision:scene.revision,contexts:{...memory.contexts,[scene.key]:context}}};
}
export function deepestCollapse(s:State):Partial<State>|null{
 const ctx=s.scene?.contexts[sceneKey(s)],planes=ctx?.planes||{};
 const activeRouteIds=s.detail==='full'?Object.keys(ctx?.routes||{}):s.expandedRoutes;
 const candidates=[...Object.entries(ctx?.revealed||{}).map(([id,level])=>['visit:'+id,level] as const),...s.expandedGroups.map(id=>['group:'+id,planes['group:'+id]||1] as const),...activeRouteIds.map(id=>['route:'+id,planes['route:'+id]||2] as const),...s.branches.map(id=>['topic:'+id,planes['topic:'+id]||2] as const)];
 const activeOwners=new Set(Object.values(ctx?.owners||{}).flat());const displayed=candidates.filter(([owner])=>!ctx||activeOwners.has(owner));
 if(displayed.length){const max=Math.max(...displayed.map(c=>c[1])),remove=new Set(displayed.filter(c=>c[1]===max).map(c=>c[0]));const revealed=Object.fromEntries(Object.entries(ctx?.revealed||{}).filter(([id])=>!remove.has('visit:'+id)));return {scene:s.scene?{...s.scene,contexts:{...s.scene.contexts,[sceneKey(s)]:{...ctx!,revealed}}}:undefined,expandedGroups:s.expandedGroups.filter(id=>!remove.has('group:'+id)),expandedRoutes:activeRouteIds.filter(id=>!remove.has('route:'+id)),branches:s.branches.filter(id=>!remove.has('topic:'+id)),...(s.detail==='full'?{detail:'abbreviated' as const}:{})}}
 if(s.centreFirst){const highest=Math.max(0,...Object.keys(ctx?.layers||{}).map(Number));if(highest>0){const target=Math.max(0,...Object.keys(ctx?.layers||{}).map(Number).filter(level=>level<highest));const memory=copy(s.scene!);memory.focus=null;memory.contexts[sceneKey(s)].layerCeiling=target;memory.contexts[sceneKey(s)].layers=Object.fromEntries(Object.entries(ctx?.layers||{}).filter(([key])=>Number(key)<=target));return {scene:memory,resultsOpen:false,...(target<(s.centreLevel||1)?{centreVisible:false}:{}),retainedLayers:s.retainedLayers?.filter(l=>l.level<=target),...(target===0?{overview:true}:{}),selected:null,selectedEdges:[]}}}
 if(!s.overview)return {overview:true,expandedRoutes:[],alternatives:[],branches:[],detail:'abbreviated'};if(!['combined','ecosystems','technology','funding'].includes(s.perspective)&&s.overviewDepth!==0)return {overviewDepth:0};return null;
}
export function poseValid(p:any):p is CameraPose{return !!p&&p.focalScale>0&&p.reference>0&&[p.position,p.target].every(v=>v&&Object.values(v).every(Number.isFinite))&&p.quaternion?.length===4&&p.quaternion.every(Number.isFinite)}
const preferred=['carob','cocoon','drones','al20'];
const finite=(p:any):p is Vec3=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const groups=['ecosystem:species','ecosystem:habitats','ecosystem:restoration-methods','technology:irrigation','technology:drones','technology:monitoring','funding:programmes','funding:activities','funding:requirements'];
/** Pure semantic projection. It owns identities/expansions; the renderer receives disposable copies. */
export function buildScene(view:View,s:State,catalog:Catalog,tasks:any[]):Scene{
 const key=sceneKey(s),previous=s.scene?.contexts[key],ctx:SceneContext=copy(previous||empty());
 // Context-local ordinary homes preserve existing anchors; Plane 0 is always independent.
 if(s.centreFirst&&s.centreSession!==undefined&&ctx.centreSession!==s.centreSession){ctx.centreSession=s.centreSession;ctx.owners={};ctx.planes={};ctx.cameras={};ctx.revealed={};ctx.routes={};ctx.returns=[];delete ctx.focus;delete ctx.layerCeiling;delete ctx.signature;delete ctx.signatures;delete ctx.laidOut;delete ctx.flatArea}
 const all=new Map([...catalog.topics.map(t=>({...t,record_type:'topic'})),...catalog.findings,...catalog.sources,...view.nodes].map(n=>[n.id,n]));
 const nodes=new Map<string,SceneCard>(),links=new Map<string,SceneLink>(),used=new Set<string>();
 ctx.layers={};ctx.references={};for(const layer of s.retainedLayers||[])if(ctx.layerCeiling===undefined||layer.level<=ctx.layerCeiling)ctx.layers[String(layer.level)]={level:layer.level,kind:layer.kind,label:layer.label,anchorIds:layer.anchorIds};
 let notice='';const warn=()=>notice='The scene limit is reached. Collapse other detail to admit another complete expansion.';
 const ownerPlanes:Record<string,number>={};
 const plane=(owner:string,defaultPlane:number)=>ownerPlanes[owner]=ctx.planes[owner]??defaultPlane;
 const oldHome=(id:string)=>ctx.homes[id];
 const withinLayer=(id:string)=>ctx.layerCeiling===undefined||(oldHome(id)?.z||0)<=ctx.layerCeiling*PLANE_GAP;
 const add=(record:Item,owner:string,level:number,seed:Vec3)=>{
  let card=nodes.get(record.id);if(card){if(!card.owners.includes(owner))card.owners.push(owner);return card}
  if(nodes.size>=MAX_ITEMS){warn();return undefined}
  let home=oldHome(record.id);
  if((record.kind==='group'&&groups.includes(record.groupKey))||record.kind==='research')home=seed;
  // A migrated XY coordinate is useful even though the old scene had no depth.
  if(!home){const legacy=Object.entries(s.positions).find(([k])=>k.startsWith(s.perspective+(s.overview?':overview:':':focus:'+s.centre+':'))&&k.endsWith(':'+record.id))?.[1];home=legacy?{...legacy,z:level*PLANE_GAP}:seed}
  if(!finite(home))home=seed;
  if(s.centreFirst&&home&&!ctx.owners[record.id]?.includes(owner))home={...home,z:level*PLANE_GAP};
  if(ctx.layerCeiling!==undefined&&home.z>ctx.layerCeiling*PLANE_GAP)return undefined;
  card={id:record.id,record:{...copy(record),viewCentre:record.id===s.centre},home:{...home},position:{...home},plane:Math.round(home.z/PLANE_GAP),owners:[owner],width:record.kind==='group'?264:record.kind==='lane'?210:214,height:record.kind==='group'?118:record.kind==='lane'?55:98};
  nodes.set(card.id,card);return card;
 };
 const addExpansion=(records:Item[],owner:string,level:number,seeds:Record<string,Vec3>)=>{
  const fresh=records.filter(r=>!nodes.has(r.id));if(nodes.size+fresh.length>MAX_ITEMS){warn();return false}
  plane(owner,level);for(const r of records){const old=nodes.get(r.id);if(old&&old.plane!==ownerPlanes[owner]&&seeds[r.id]){const id='reference:'+owner+':'+r.id;ctx.references![id]={id,topicId:r.id,owner,position:{...seeds[r.id],z:ownerPlanes[owner]*PLANE_GAP},label:'Shared · '+r.label,width:214,height:30};if(r.layoutLane)old.record.layoutLane=r.layoutLane}add(r,owner,ownerPlanes[owner],seeds[r.id]||{x:0,y:0,z:ownerPlanes[owner]*PLANE_GAP})}return true;
 };
 const members=new Map(groups.map(g=>[g,catalog.topics.filter(t=>rootGroup(t.id,catalog)===g)]));
 const representatives:Record<string,string>={};
 for(const [i,gid] of groups.entries()){
  const items=members.get(gid)!,id='group:'+gid,p={x:(Math.floor(i/3)-1)*650,y:(i%3-1)*230,z:0},label=GROUP_LABELS[gid.split(':')[1]];
  add({id,label:label+'\n'+items.length+' topics',kind:'group',domain:gid.split(':')[0],groupKey:gid,record_type:'display',member_ids:items.map(t=>t.id),expanded:s.expandedGroups.includes(gid)},'overview',0,p);
  let shown:Item[]=[];
  if(s.expandedGroups.includes(gid)){
   const ranked=items.filter(t=>!primaryGroup(t.id,catalog)&&!browseGroups(catalog).some(g=>g.anchor_topic_id===t.id&&g.parent_id.startsWith('browse:'))).sort((a,b)=>(preferred.includes(a.id)?preferred.indexOf(a.id):-1)-(preferred.includes(b.id)?preferred.indexOf(b.id):-1)||a.label.localeCompare(b.label));
   // Prioritize useful entry points without making an expansion depend on selection afterwards.
   ranked.sort((a,b)=>Number(preferred.includes(b.id))-Number(preferred.includes(a.id)));
   shown=ranked.slice(0,s.groupLimits[gid]||6).filter(t=>withinLayer(t.id)).map(t=>({...t,record_type:'topic'}));const seeds:Record<string,Vec3>={};
   shown.forEach((r,j)=>seeds[r.id]={x:p.x+(j%2-.5)*270,y:p.y+Math.floor(j/2)*145-145,z:PLANE_GAP});
   const remaining=items.filter(t=>!primaryGroup(t.id,catalog)&&!shown.some(n=>n.id===t.id));
   const more:Item={id:'more:'+gid,label:'More topics\n'+remaining.length+' remaining',kind:'more',domain:gid.split(':')[0],groupKey:gid,record_type:'display',member_ids:remaining.map(t=>t.id)};
   if(remaining.length){shown.push(more);seeds[more.id]={x:p.x,y:p.y+Math.ceil((shown.length-1)/2)*145-145,z:PLANE_GAP}}
   if(!addExpansion(shown,'group:'+gid,1,seeds))shown=[];
  }
  for(const item of items)representatives[item.id]=shown.some(t=>t.id===item.id)?item.id:shown.length?'more:'+gid:id;
 }
 const centreIds=new Set<string>();
 if(s.centreFirst&&s.centreVisible!==false&&!s.overview&&s.centre&&all.has(s.centre)&&(ctx.layerCeiling===undefined||ctx.layerCeiling>=(s.centreLevel||1))){
  const owner='centre:'+s.centre,level=s.centreLevel||1;ctx.planes[owner]=level;
  const root=s.scene?.centres?.[s.centre]?.homes||{},origin=ctx.homes[s.centre]||root[s.centre]||{x:0,y:0,z:level*PLANE_GAP};
  const neighbours=directNeighbours(s.centre,catalog).slice(0,Math.min(48,s.directLimit||12)).map(n=>all.get(n.id)!);
  const records=[all.get(s.centre)!,...neighbours],seeds:Record<string,Vec3>={};
  records.forEach((r,i)=>{const cached=root[r.id];const ring=Math.floor((i-1)/12),angle=((i-1)%12)/12*Math.PI*2-Math.PI/2;seeds[r.id]=i===0?{...origin,z:level*PLANE_GAP}:cached?{...cached,z:level*PLANE_GAP}:{x:origin.x+Math.cos(angle)*(650+ring*400),y:origin.y+Math.sin(angle)*(420+ring*260),z:level*PLANE_GAP};ctx.homes[r.id]=seeds[r.id]});
  if(addExpansion(records,owner,level,seeds))for(const r of records)if(nodes.has(r.id))centreIds.add(r.id);
 }
 const activeCentreLevel=centreIds.size?(s.centreLevel||1):0;
 const projected=projectKnowledge(view,{...s,positions:{}},catalog,[]);
 const projectedNodes=projected.elements.filter(e=>e.group==='nodes'&&!['domain','landmark','group','more'].includes(e.data.kind));
 let routes=[...new Map([...view.routes,...s.alternatives].map(r=>[r.id,r])).values()];
 for(const id of s.expandedRoutes)if(!routes.some(r=>r.id===id)&&ctx.routes?.[id])routes.push(copy(ctx.routes[id]));
 ctx.routes=Object.fromEntries(routes.map(r=>[r.id,copy(r)]));
 const showResults=!s.centreFirst||!!s.resultsOpen;
 if(s.centreFirst&&showResults){const endpoints=new Set(centreIds);endpoints.delete(s.centre||'');routes=routes.filter(r=>{if(!endpoints.has(r.endpoint)&&endpoints.size>=48){warn();return false}endpoints.add(r.endpoint);return true})}
 const activeRoutes=(showResults?routes:[]).filter(r=>s.detail==='full'||s.expandedRoutes.includes(r.id));
 const endpointIds=new Set(routes.flatMap(r=>[r.nodes[0],r.endpoint]));
 const projectionSeeds:Record<string,Vec3>={};const centreProjection=projectedNodes.find(el=>el.data.id===s.centre),centreHome=s.centre?nodes.get(s.centre)?.home:undefined,shiftX=s.centreFirst&&centreHome?centreHome.x-(centreProjection?.position?.x||0):0,shiftY=s.centreFirst&&centreHome?centreHome.y-(centreProjection?.position?.y||0):0;for(const el of projectedNodes)projectionSeeds[String(el.data.id)]={x:(el.position?.x||0)+shiftX,y:(el.position?.y||0)+shiftY,z:PLANE_GAP};
 if(!s.overview&&s.centre&&showResults){
  const requested=projectedNodes.filter(el=>!activeRoutes.some(r=>r.nodes.slice(1,-1).includes(String(el.data.id)))||endpointIds.has(String(el.data.id))).map(el=>el.data as Item);
  // Preserve expanded route endpoints even if a refreshed result set changes its first page.
  for(const r of routes)for(const id of [r.nodes[0],r.endpoint])if(!requested.some(n=>n.id===id)&&all.has(id))requested.push(all.get(id)!);
  // Whole initial result set is admitted before any route detail.
  const resultLevel=s.centreFirst?(activeCentreLevel||Math.max(0,...[...nodes.values()].map(c=>c.plane),...(s.retainedLayers||[]).map(l=>l.level)))+1:1;for(const seed of Object.values(projectionSeeds))seed.z=resultLevel*PLANE_GAP;addExpansion(requested,'query',resultLevel,projectionSeeds);
 }
 const evidenceLinks:any[]=[];
 // Context groupings are detail over the independent base map, even without a centre/query.
 if(s.overview&&s.overviewDepth!==0&&!['combined','ecosystems','technology','funding'].includes(s.perspective)){
  type Grouping={key:string;label:string;domain:string;members:Item[]};const grouped:Grouping[]=[];
  if(s.perspective==='sources')for(const source of catalog.sources){
   const findings:Item[]=catalog.findings.filter(f=>f.source_refs?.some(r=>r.source_id===source.id)).map(f=>({...f,id:'finding:'+f.id,record_id:f.id,label:f.label,description:f.text,kind:f.kind,domain:'source',record_type:'finding'}));
   grouped.push({key:'document:'+source.id,label:source.id+' · findings & pages',domain:'source',members:[{...source,id:'source:'+source.id,label:source.id+' · original PDF',kind:'source',domain:'source',record_type:'source'},...findings]});
   for(const f of findings){for(const topic of f.topic_ids||[])evidenceLinks.push({id:'evidence:'+f.id+':'+topic,source:topic,target:f.id,label:'reported in',record_type:'evidence',source_refs:f.source_refs,evidence_finding_ids:[f.record_id]});for(const r of f.source_refs||[])if(r.source_id===source.id)evidenceLinks.push({id:'page:'+f.id+':'+source.id+':'+r.page,source:f.id,target:'source:'+source.id,label:'PDF p'+r.page,record_type:'evidence',source_refs:[r],evidence_finding_ids:[f.record_id]})}
  }
  if(s.perspective==='hierarchy')for(const family of catalog.topics.filter(t=>t.kind==='family')){
   const ids=new Set(catalog.relationships.filter(e=>e.source===family.id||e.target===family.id).flatMap(e=>[e.source,e.target]));
   grouped.push({key:'classification:'+family.id,label:family.label+' · sourced family',domain:family.domain,members:catalog.topics.filter(t=>ids.has(t.id)).map(t=>({...t,record_type:'topic'}))});
  }
  if(s.perspective==='conditions')for(const domain of ['ecosystem','technology','funding'])grouped.push({key:'dependencies:'+domain,label:({ecosystem:'Ecological conditions & methods',technology:'Components & requirements',funding:'Funding conditions & activities'} as any)[domain],domain,members:catalog.topics.filter(t=>t.domain===domain&&['condition','equipment','method','activity','requirement'].includes(t.kind)).map(t=>({...t,record_type:'topic'}))});
  if(['places','time'].includes(s.perspective))for(const el of projected.elements.filter(e=>e.group==='nodes'&&e.data.kind==='group'))grouped.push({key:el.data.groupKey,label:String(el.data.label).split('\n')[0],domain:el.data.domain,members:(el.data.member_ids||[]).map((id:string)=>all.get(id)).filter(Boolean)});
  for(const [i,g] of grouped.entries()){
   const id='perspective-group:'+g.key,seed={x:(i%3-1)*540,y:(Math.floor(i/3)-1)*220,z:PLANE_GAP};
   const header=add({id,label:g.label+'\n'+g.members.length+' records',kind:'group',domain:g.domain,groupKey:g.key,record_type:'display',member_ids:g.members.map(t=>t.id),expanded:s.expandedGroups.includes(g.key)},'perspective',1,seed);
   if(!header)continue;let shown:Item[]=[];
   if(s.expandedGroups.includes(g.key)){
    shown=g.members.slice(0,s.groupLimits[g.key]||6).filter(t=>withinLayer(t.id));const level=plane('group:'+g.key,header.plane+1),seeds:Record<string,Vec3>={};shown.forEach((r,j)=>seeds[r.id]={x:seed.x+(j%2-.5)*270,y:seed.y+Math.floor(j/2)*145-145,z:level*PLANE_GAP});
    const hidden=g.members.filter(r=>!shown.some(n=>n.id===r.id));if(hidden.length){const more:Item={id:'more:'+g.key,label:'More topics\n'+hidden.length+' remaining',kind:'more',domain:g.domain,groupKey:g.key,record_type:'display',member_ids:hidden.map(t=>t.id)};shown.push(more);seeds[more.id]={x:seed.x,y:seed.y+Math.ceil((shown.length-1)/2)*145,z:level*PLANE_GAP}}
    if(!addExpansion(shown,'group:'+g.key,level,seeds))shown=[];
   }
   for(const member of g.members)representatives[member.id]=shown.some(t=>t.id===member.id)?member.id:shown.length?'more:'+g.key:id;
  }
  if(s.perspective==='comparison'){
   const exposed=projectKnowledge(view,{...s,overview:false,centre:view.nodes[0]?.id||null},catalog,[]).elements.filter(e=>e.group==='nodes'&&!['domain','landmark'].includes(e.data.kind));
   const seeds:Record<string,Vec3>={};exposed.forEach(e=>seeds[String(e.data.id)]={x:e.position?.x||0,y:e.position?.y||0,z:PLANE_GAP});addExpansion(exposed.map(e=>e.data as Item),'perspective',1,seeds);
  }
 }
 for(const group of browseGroups(catalog)){
  const anchor=nodes.get(group.anchor_topic_id),parent=representatives[group.anchor_topic_id];
  for(const member of group.members)if(member.role==='primary')representatives[member.topic_id]=anchor?anchor.id:parent;
  if(!s.expandedGroups.includes(group.id))continue;
  const owner='group:'+group.id,level=plane(owner,Math.max(activeCentreLevel,...[...nodes.values()].map(c=>c.plane))+1);
  const origin=anchor?.home||{x:0,y:0,z:level*PLANE_GAP};
  if(!anchor&&all.has(group.anchor_topic_id))add(all.get(group.anchor_topic_id)!,owner,level,origin);
  const members=group.members.map(m=>all.get(m.topic_id)).filter(Boolean) as Item[],shown=members.slice(0,s.groupLimits[group.id]||6),seeds:Record<string,Vec3>={};
  shown.forEach((r,i)=>seeds[r.id]={x:origin.x+(i%2-.5)*290,y:origin.y+Math.floor(i/2)*155-160,z:level*PLANE_GAP});
  const hidden=members.slice(shown.length);if(hidden.length){const more={id:'more:'+group.id,label:'More topics\n'+hidden.length+' remaining',kind:'more',domain:'technology',groupKey:group.id,member_ids:hidden.map(r=>r.id)};shown.push(more);seeds[more.id]={x:origin.x,y:origin.y+Math.ceil(shown.length/2)*155,z:level*PLANE_GAP}}
  if(addExpansion(shown,owner,level,seeds))for(const member of group.members)representatives[member.topic_id]=shown.some(r=>r.id===member.topic_id)?member.topic_id:'more:'+group.id;
 }
 let deepest=Math.max(1,...[...nodes.values()].map(n=>n.plane));
 for(const topicId of s.branches){
  const owner='topic:'+topicId;let origin=nodes.get(topicId);if(!origin&&all.has(topicId))origin=add(all.get(topicId)!,owner,1,oldHome(topicId)||{x:0,y:0,z:PLANE_GAP});if(!origin)continue;if(!origin.owners.includes(owner))origin.owners.push(owner);const level=plane(owner,Math.max(origin.plane,activeCentreLevel)+1);
  const neighbours=[...new Set(catalog.relationships.filter(e=>e.source===topicId||e.target===topicId).map(e=>e.source===topicId?e.target:e.source))].filter(id=>all.has(id)).slice(0,s.groupLimits[owner]||6);
  const records=neighbours.map(id=>all.get(id)!);const seeds:Record<string,Vec3>={};records.forEach((r,i)=>seeds[r.id]={x:origin.home.x+(i%3-1)*290,y:origin.home.y+Math.floor(i/3)*160-80,z:level*PLANE_GAP});
  if(addExpansion(records,owner,level,seeds))deepest=Math.max(deepest,level);
 }
 const admittedRoutes=new Set<string>(),routeFacts=new Set<string>();
 for(const route of activeRoutes){
  if(!route.nodes.every(withinLayer))continue;
  const owner='route:'+route.id,level=plane(owner,deepest+1),records=route.nodes.map(id=>all.get(id)).filter(Boolean) as Item[];
  const knownEdges=new Set(catalog.relationships.map(e=>e.id));
  if(records.length!==route.nodes.length||!route.edges.every(id=>knownEdges.has(id))){notice='A saved route changed in this knowledge revision. Refresh its connection before reopening it.';continue}
  const a=nodes.get(route.nodes[0])?.home||{x:0,y:0,z:PLANE_GAP},b=nodes.get(route.endpoint)?.home||{x:600,y:0,z:PLANE_GAP},seeds:Record<string,Vec3>={};
  route.nodes.forEach((id,i)=>seeds[id]={x:a.x+(b.x-a.x)*i/(route.nodes.length-1||1),y:a.y+(b.y-a.y)*i/(route.nodes.length-1||1),z:level*PLANE_GAP});
  if(new Set([...routeFacts,...route.edges]).size>MAX_LINKS){warn();continue}if(addExpansion(records,owner,level,seeds)){admittedRoutes.add(route.id);route.edges.forEach(id=>routeFacts.add(id))}
 }
 if(!s.overview){
  ctx.revealed=ctx.revealed||{};const focusId=s.scene?.focus||s.selected;
  if(!ctx.signature&&focusId&&all.has(focusId)&&!nodes.has(focusId))ctx.revealed[focusId]=ctx.revealed[focusId]||Math.max(1,...[...nodes.values()].map(c=>c.plane))+1;
  for(const [id,level] of Object.entries(ctx.revealed)){const record=all.get(id);if(record)add(record,'visit:'+id,level,{x:0,y:0,z:level*PLANE_GAP})}
 }
 // Actual visible identities replace their summary contributions, independent of their owner.
 for(const id of nodes.keys())if(all.has(id))representatives[id]=id;
 const selected=new Set(s.selectedEdges);
 const addLink=(record:any,ids:string[])=>{
  if(!nodes.has(record.source)||!nodes.has(record.target)||links.has(record.id))return;
  if(links.size>=MAX_LINKS){warn();return}
  const own=ids.filter(id=>!used.has(id));if(ids.length&&!own.length)return;own.forEach(id=>used.add(id));
  links.set(record.id,{id:record.id,source:record.source,target:record.target,record:{...copy(record),constituent_ids:own},relationshipIds:own,active:record.id===s.selected||(record.record_type!=='aggregate'&&(record.source===s.selected||record.target===s.selected))||own.some(id=>selected.has(id))});
 };
 const valid=new Map([...catalog.relationships,...view.edges].map(e=>[e.id,e]));
 // Route ownership is all-or-nothing; every step is exposed, then shared edges are drawn once.
 for(const route of activeRoutes.filter(r=>admittedRoutes.has(r.id)))for(const id of route.edges){const e=valid.get(id);if(e)addLink(e,[id])}
 for(const route of (showResults?routes:[]).filter(r=>!admittedRoutes.has(r.id))){
  if(!nodes.has(route.endpoint)||!nodes.has(route.nodes[0]))continue;
  if(route.edges.length===1){const e=valid.get(route.edges[0]);if(e)addLink({...e,route_id:route.id},[e.id])}
  else addLink({id:route.id,route_id:route.id,source:route.nodes[0],target:route.endpoint,label:'via '+(route.nodes.length-2)+' topics',record_type:'abbreviated',relationship_ids:route.edges,explanation:route.why},route.edges);
 }
 // First direct links, then summaries; ledger prevents both forms accounting for the same fact.
 const otherFacts:string[]=[];
 for(const e of catalog.relationships)if(nodes.has(e.source)&&nodes.has(e.target)){
  if(s.centreFirst&&!s.otherConnections&&centreIds.has(e.source)&&centreIds.has(e.target)&&e.source!==s.centre&&e.target!==s.centre&&!selected.has(e.id)){if(!used.has(e.id)){otherFacts.push(e.id);used.add(e.id)}continue}addLink(e,[e.id]);
 }
 for(const e of view.edges)if(!valid.has(e.id)||!catalog.relationships.some(r=>r.id===e.id))addLink(e,e.record_type==='relationship'?[e.id]:[]);
 const aggregated=new Map<string,any>();
 for(const e of catalog.relationships){if(used.has(e.id))continue;const source=representatives[e.source],target=representatives[e.target];if(!source||!target)continue;
  const id='aggregate:'+ [source,target].sort().join('|');if(!aggregated.has(id))aggregated.set(id,{id,source,target,label:'',record_type:'aggregate',constituent_ids:[]});aggregated.get(id).constituent_ids.push(e.id);
 }
 const internalSummaries:InternalSummary[]=[];
 if(otherFacts.length&&s.centre){const id='centre-other:'+s.centre,summary={id,cardId:s.centre,relationshipIds:otherFacts,record:{id,record_type:'aggregate',label:otherFacts.length+' other connections',constituent_ids:otherFacts,centreOther:true}};internalSummaries.push(summary);nodes.get(s.centre)!.internal=summary}

 for(const e of aggregated.values()){
  if(e.source===e.target&&nodes.has(e.source)){
   const ids=e.constituent_ids.filter((id:string)=>!used.has(id));if(!ids.length)continue;ids.forEach((id:string)=>used.add(id));
   const summary={id:e.id,cardId:e.source,relationshipIds:ids,record:{...e,label:ids.length+' internal connection'+(ids.length===1?'':'s'),constituent_ids:ids}};
   internalSummaries.push(summary);nodes.get(e.source)!.internal=summary;
  }else{e.label=e.constituent_ids.length+' recorded connections';addLink(e,e.constituent_ids)}
 }
 const groupedEvidence=new Map<string,any>();
 for(const e of evidenceLinks){const source=representatives[e.source]||e.source,target=representatives[e.target]||e.target;if(!nodes.has(source)||!nodes.has(target)||source===target)continue;
  const key='evidence-summary:'+source+'|'+target;if(!groupedEvidence.has(key))groupedEvidence.set(key,{...e,id:key,source,target,evidence_finding_ids:[],source_refs:[]});const summary=groupedEvidence.get(key);summary.evidence_finding_ids=[...new Set([...summary.evidence_finding_ids,...e.evidence_finding_ids])];summary.source_refs=[...new Map([...summary.source_refs,...e.source_refs].map((r:any)=>[r.source_id+':'+r.page,r])).values()];summary.label=source===e.source&&target===e.target?e.label:summary.evidence_finding_ids.length+' sourced findings';
 }
 for(const edge of groupedEvidence.values())addLink(edge,[]);
 if(s.markers)for(const [i,task] of tasks.filter(t=>t.status!=='Completed').slice(0,5).entries()){
  const id='research:'+task.id,originId=task.context?.gap?.from_id||task.context?.centre,origin=nodes.get(originId)||nodes.get(representatives[originId]);
  add({id,label:'To research\n'+(task.custom_topics||task.instruction),kind:'research',domain:'research',record_type:'display',task_id:task.id},'research',origin?.plane??(s.overview?0:1),{x:(origin?.home.x||0)-300,y:(origin?.home.y||0)+i*140,z:origin?.home.z??(s.overview?0:PLANE_GAP)});
  if(origin)addLink({id:'indication:'+task.id,source:origin.id,target:id,label:'Investigate connection',record_type:'gap'},[]);const targetId=task.context?.gap?.to_id,target=nodes.get(targetId)||nodes.get(representatives[targetId]);if(target&&target.id!==origin?.id)addLink({id:'indication:'+task.id+':to',source:id,target:target.id,label:'To research · connection',record_type:'gap'},[]);
 }
 // Preserve old homes for reversible collapse/reopen; owners describe only this visible scene.
 ctx.owners={};ctx.planes={...ctx.planes,...ownerPlanes};
 for(const card of nodes.values()){ctx.homes[card.id]={...card.home};ctx.owners[card.id]=[...card.owners]}
 const level=Math.max(0,...[...nodes.values()].map(n=>n.plane),...Object.keys(ctx.layers||{}).map(Number),...Object.entries(ownerPlanes).filter(([owner])=>[...nodes.values()].some(c=>c.owners.includes(owner))).map(([,plane])=>plane));
 const focusId=s.scene?.focus===undefined?s.selected:s.scene.focus;
 const focused=focusId&&nodes.has(focusId)&&all.has(focusId)?focusId:null;
 const mode=s.scene?.mode||'layered';
 if(mode==='flat'&&s.centreFirst){const area=showResults?'results':'centre';if(ctx.flatArea!==area){const cache=s.centre?s.scene?.centres?.[s.centre]?.flat||{}:{};for(const card of nodes.values())if(card.owners.some(o=>o.startsWith('centre:'))){const position=showResults?projectionSeeds[card.id]:cache[card.id];if(position)ctx.flat[card.id]={...position,x:position.x+(showResults?2200:0),z:0}}ctx.flatArea=area;ctx.reflow=[...nodes.values()].filter(c=>c.record.kind!=='group').map(c=>c.id)}}
 for(const card of nodes.values()){
  const group=browseGroups(catalog).find(g=>g.anchor_topic_id===card.id);if(group)card.record.browse_group={id:group.id,label:group.label,expanded:s.expandedGroups.includes(group.id)};
  card.record.branchExpanded=s.branches.includes(card.id);
  if(mode==='flat')card.position={...(ctx.flat[card.id]||{...card.home,z:0}),z:0};
  else if(card.id===focused){const position=ctx.focus?.id===focused?ctx.focus.position:{...card.home,z:level*PLANE_GAP+FOCUS_OFFSET};card.position={...position,z:Math.min(position.z,level*PLANE_GAP+FOCUS_OFFSET)};ctx.focus={id:focused,position:{...card.position}}}
  card.record.poppedOut=mode==='layered'&&card.id===focused&&card.position.z!==card.home.z;
 }
 const descriptors=new Map<number,{kind:'centre'|'detail'|'results';names:string[];ids:string[]}>();
 for(const [owner,plane] of Object.entries(ownerPlanes)){
  if(owner==='overview'||![...nodes.values()].some(c=>c.owners.includes(owner)))continue;
  let name='',kind:'centre'|'detail'|'results'='detail',anchorId='';
  if(owner.startsWith('centre:')){anchorId=owner.slice(7);name=all.get(anchorId)?.label||anchorId;kind='centre'}
  else if(owner==='query'){name=[s.search||'Connected knowledge',catalog.perspectives?.find(p=>p.id===s.perspective)?.label||s.perspective.charAt(0).toUpperCase()+s.perspective.slice(1)].join(' · ');kind='results';anchorId=s.centre||''}
  else if(owner.startsWith('group:')){const gid=owner.slice(6),group=browseGroups(catalog).find(g=>g.id===gid);name=group?.label||GROUP_LABELS[gid.split(':').at(-1)!]||gid;anchorId=group?.anchor_topic_id||'group:'+gid}
  else if(owner.startsWith('visit:')&&(s.retainedLayers||[]).some(l=>l.level===plane)){continue}
  else if(owner.startsWith('topic:')||owner.startsWith('visit:')){anchorId=owner.slice(6);name=all.get(anchorId)?.label||anchorId}
  else if(owner.startsWith('route:')){anchorId=ctx.routes?.[owner.slice(6)]?.endpoint||s.centre||'';name=all.get(anchorId)?.label||'Connection'}
  else name=s.perspective;
  const entry=descriptors.get(plane)||{kind,names:[],ids:[]};if(name&&!entry.names.includes(name))entry.names.push(name);if(anchorId&&!entry.ids.includes(anchorId))entry.ids.push(anchorId);descriptors.set(plane,entry);
 }
 for(const [plane,d] of descriptors){const prefix=({centre:'Centre',detail:'Detail',results:'Results'}[d.kind])+' · ';ctx.layers![String(plane)]={level:plane,kind:d.kind,label:prefix+d.names.join(' + '),shortLabel:prefix+d.names.slice(0,2).join(' + ')+(d.names.length>2?' + '+(d.names.length-2)+' more':''),anchorIds:d.ids}}
 for(const card of nodes.values())card.record.membership_labels=card.owners.map(o=>ctx.layers?.[String(ownerPlanes[o])]?.label).filter(Boolean);
 const signature=JSON.stringify([[...nodes.keys()], [...links.values()].map(e=>[e.id,e.source,e.target,e.relationshipIds]),s.expandedGroups,s.expandedRoutes,s.branches,s.detail,...(s.centreFirst?[s.resultsOpen,s.directLimit,s.otherConnections,s.centreLevel]:[]),...(ctx.layerCeiling===undefined?[]:[ctx.layerCeiling])]);
 const lastId=focused||s.scene?.focus||s.centre,lastTopic=lastId?all.get(lastId):null,baseGroup=lastTopic?nodes.get('group:'+rootGroup(lastTopic.id,catalog)):null;
 const homeMarker=lastTopic?{id:lastTopic.id,label:lastTopic.label,home:nodes.get(lastTopic.id)?.home||baseGroup?.home||{x:0,y:0,z:0}}:undefined;
 ctx.returns=layerReturns(s,ctx,catalog,[...nodes.values()].map(n=>n.record));
 return {references:Object.values(ctx.references||{}),retainedLayers:s.retainedLayers,homeMarker,cards:[...nodes.values()],links:[...links.values()],internalSummaries,context:ctx,key,signature,notice,level,mode,focused,revision:catalog.revision};
}

/** Place only fresh cards; pinned homes and route endpoints remain exact across transitions. */
export function seedUnoccupied(scene:Scene,mode:'layered'|'flat',previous?:Scene){
 const cached=mode==='flat'?scene.context.flat:scene.context.homes;
 const existing=new Set(previous?.key===scene.key&&previous.mode===mode?previous.cards.map(c=>c.id):scene.context.laidOut?.[mode]||[]);
 const occupied:SceneCard[]=[];
 const cards=[...scene.cards].sort((a,b)=>Number(existing.has(b.id))-Number(existing.has(a.id))||Number(b.record.kind==='group')-Number(a.record.kind==='group'));
 for(const card of cards){
  const initial=mode==='flat'?{...(cached[card.id]||card.home),z:0}:{...card.home};let p={...initial};
  const free=(v:Vec3)=>!occupied.some(c=>(mode==='flat'||c.plane===card.plane)&&Math.abs(c.position.x-v.x)<(c.width+card.width)/2+25&&Math.abs(c.position.y-v.y)<(c.height+card.height)/2+25);
  if(!existing.has(card.id)&&!free(p))for(let i=0;i<600;i++){const radius=155*(1+Math.floor(i/16)),angle=i%16/16*Math.PI*2;const test={...p,x:initial.x+Math.cos(angle)*radius,y:initial.y+Math.sin(angle)*radius};if(free(test)){p=test;break}}
  if(mode==='flat'){scene.context.flat[card.id]=p;card.position=p}else{card.home=p;scene.context.homes[card.id]=p;card.position={...p,z:card.id===scene.focused?(scene.context.focus?.position.z??scene.level*PLANE_GAP+FOCUS_OFFSET):p.z};if(card.id===scene.focused)scene.context.focus={id:card.id,position:{...card.position}}}
  occupied.push({...card,position:p});
 }
 return scene;
}
