import {GROUP_LABELS,type State,type Catalog,type View,type Item,type Point,type ExplorationLayer,type SceneLayer,type SceneReference,type DisplayMode} from './types.ts';
import type {Scene,SceneCard,SceneLink,InternalSummary} from './scene.ts';
import {ROOT_GROUPS,ensureLayers,members,layerName} from './layerState.ts';
import {rootGroup} from './organization.ts';
import {PLANE_GAP} from './depth.ts';
import {requestLayout} from './layoutRequest.ts';
import {overviewLayout} from './overviewLayout.ts';
import {compactGrid,compactRings,CARD_GAP} from './compactLayout.ts';
const clone=<T,>(v:T):T=>structuredClone(v);
const size={w:214,h:98};
export function layerRecords(l:ExplorationLayer,c:Catalog):Item[]{const map=new Map<string,Item>(c.topics.map(t=>[t.id,{...t,record_type:'topic'}]));for(const r of l.scope.records||[])map.set(r.id,r);return members(l.scope,c).map(id=>map.get(id)).filter(Boolean).map(r=>({...r!,label:r!.label||r!.filename||r!.id})) as Item[]}
function category(r:Item,l:ExplorationLayer,c:Catalog){const p=l.scope.perspective||'combined';let key='',label='';
 if(p==='time'){key=r.dates?.[0]?.value?.slice(0,4)||'Undated';label=key}
 else if(p==='places'){key=r.kind==='place'?'Places':r.place_ids?.[0]||'Place not recorded';label=c.topics.find(t=>t.id===key)?.label||key}
 else if(p==='sources'){key=r.record_type||'topic';label=key==='finding'?'Findings':key==='source'?'Source documents':'Topics'}
 else if(p==='comparison'){key=r.kind==='aspect'?'aspects':'methods';label=key==='aspects'?'Comparison aspects':'Methods'}
 else if(p==='hierarchy'){key=r.group_id||r.kind;label=GROUP_LABELS[key]||key}
 else if(p==='conditions'){key=r.kind==='condition'?'conditions':r.kind==='equipment'?'components':'connected';label=key==='conditions'?'Conditions':key==='components'?'Components':'Connected topics'}
 else{key=r.kind;label=({method:'Methods',equipment:'Equipment',condition:'Conditions',species:'Species',activity:'Activities',programme:'Programmes',place:'Places',organization:'Organizations',habitat:'Habitats',family:'Families',event:'Dates'} as Record<string,string>)[key]||key}
 return {key,label};
}
export function layerGroups(l:ExplorationLayer,c:Catalog,records=layerRecords(l,c)){const map=new Map<string,{key:string;label:string;ids:string[]}>();for(const r of records){const g=category(r,l,c);if(g.key===l.scope.categoryKey)continue;let group=map.get(g.key);if(!group){group={...g,ids:[]};map.set(g.key,group)}group.ids.push(r.id)}return [...map.values()].sort((a,b)=>a.key==='Undated'?1:b.key==='Undated'?-1:a.key.localeCompare(b.key))}
function slotsFor(l:ExplorationLayer,records:Item[],mode:DisplayMode,aspect:number,c:Catalog,hosts:Record<string,string>){
 const slots=l.slots[mode],key=l.display,signature=JSON.stringify([1,l.kind,l.scope.perspective||'',records.map(r=>r.id)]),stamp=l.packing?.[mode]?.[key],force=l.compactRequested?.[mode];
 if(stamp===signature&&!force&&records.every(r=>slots[r.id]))return;
 const dimensions=(r:Item)=>({width:size.w,height:hosts[r.id]!==l.id?78:c.browse_groups?.some(g=>g.anchor_topic_id===r.id)?118:size.h});
 const previous=records.filter(r=>slots[r.id]).map(r=>({...slots[r.id],...dimensions(r)})),target=l.centres?.[mode]||(previous.length?frameBounds(previous):{x:0,y:0});
 const preserve=stamp===undefined&&!force&&previous.length>0;let proposed=compactGrid(records.length,aspect).points;
 if(l.display!=='groups'&&l.kind==='connections')proposed=compactRings(records.length,aspect);
 else if(l.display!=='groups'&&l.kind==='results'&&['hierarchy','places','time','conditions','comparison','sources'].includes(l.scope.perspective||'')){
  const native=new Map<string,Point>();let left=0;const groups=layerGroups(l,c,records);
  for(const group of groups){const grid=compactGrid(group.ids.length,l.scope.perspective==='comparison'?.01:aspect/Math.max(1,groups.length)),points=l.scope.perspective==='comparison'?group.ids.map((_,i)=>({x:0,y:i*(118+CARD_GAP)})):grid.points,minX=Math.min(0,...points.map(p=>p.x)),minY=Math.min(0,...points.map(p=>p.y));
   group.ids.forEach((id,i)=>native.set(id,{x:left+points[i].x-minX,y:points[i].y-minY}));left+=Math.max(0,...points.map(p=>p.x))-minX+214+50;
  }
  proposed=records.map((r,i)=>native.get(r.id)||proposed[i]);
 }
 if(preserve){
  // Adopt existing/legacy snapshots verbatim. Their explicit Compact action can tidy old slots.
  const active=new Set(records.map(r=>r.id)),free=(p:Point)=>!Object.entries(slots).some(([id,q])=>active.has(id)&&Math.abs(q.x-p.x)<238&&Math.abs(q.y-p.y)<142);
  for(let i=0;i<records.length;i++){if(slots[records[i].id])continue;let point=proposed[i];if(!free(point))for(let j=0;j<10000;j++){const q={x:j%8*238,y:Math.floor(j/8)*142};if(free(q)){point=q;break}}slots[records[i].id]=point}
 }else{
  const box=frameBounds(records.map((r,i)=>({...proposed[i],...dimensions(r)})));
  records.forEach((r,i)=>slots[r.id]={x:proposed[i].x+target.x-box.x,y:proposed[i].y+target.y-box.y});delete l.signatures[mode];
 }
 l.packing={...l.packing,[mode]:{...l.packing?.[mode],[key]:signature}};l.compactRequested={...l.compactRequested,[mode]:false};
}

function frameBounds(cards:{x:number;y:number;width:number;height:number}[]){
 const visible=cards.length?cards:[{x:0,y:0,width:0,height:0}];
 const x1=Math.min(...visible.map(p=>p.x-p.width/2))-32,x2=Math.max(...visible.map(p=>p.x+p.width/2))+32,y1=Math.min(...visible.map(p=>p.y-p.height/2))-100,y2=Math.max(...visible.map(p=>p.y+p.height/2))+32;
 // Every pane wraps its own visible content; viewport proportions guide nodes, never padding.
 const width=Math.max(300,x2-x1),height=Math.max(240,y2-y1);
 return {x:(x1+x2)/2,y:(y1+y2)/2,width,height};
}
function bounds(l:ExplorationLayer,records:Item[],mode:DisplayMode,c:Catalog,hosts:Record<string,string>){return frameBounds(records.filter(r=>l.slots[mode][r.id]).map(r=>({...l.slots[mode][r.id],width:size.w,height:hosts[r.id]!==l.id?78:c.browse_groups?.some(g=>g.anchor_topic_id===r.id)?118:size.h})))}
function sourcePoint(l:ExplorationLayer,cards:SceneCard[],layers:SceneLayer[],v:NonNullable<State['layerView']>,mode:DisplayMode):Point|undefined{
 const id=l.sourceId||l.anchorId,card=cards.find(c=>c.id===id);if(card)return card.position;
 if(id){const host=v.layers[v.hosts[id]],slot=host?.slots[mode][id],offset=host?.offsets[mode];if(slot&&offset)return {x:slot.x+offset.x,y:slot.y+offset.y}}
 const parent=layers.find(p=>p.id===l.parentId);return parent?{x:parent.x,y:parent.y}:undefined;
}
function place(l:ExplorationLayer,box:{x:number;y:number;width:number;height:number},placed:SceneLayer[],mode:DisplayMode,source?:Point){
 if(l.offsets[mode])return;l.manualOffsets={...l.manualOffsets,[mode]:false};if(mode==='layered'){l.offsets[mode]={x:(source?.x||0)-box.x,y:(source?.y||0)-box.y};return}
 const same=placed;let offset={x:-box.x,y:-box.y};const parent=same.find(p=>p.id===l.parentId)||same.at(-1);if(parent)offset={x:parent.x+(parent.width+box.width)/2+100-box.x,y:parent.y-box.y};
 const free=(o:Point)=>!same.some(p=>Math.abs(p.x-box.x-o.x)<(p.width+box.width)/2+100&&Math.abs(p.y-box.y-o.y)<(p.height+box.height)/2+100);
 if(!free(offset))for(let i=0;i<10000;i++){const q={x:i%6*(box.width+100)-box.x,y:Math.floor(i/6)*(box.height+100)-box.y};if(free(q)){offset=q;break}}l.offsets[mode]=offset;
}

export function buildLayerScene(view:View,state:State,c:Catalog,tasks:any[],aspect?:number):Scene{
 const s=ensureLayers(state,c),v=clone(s.layerView!),mode=s.scene?.mode||'layered';if(aspect&&Number.isFinite(aspect)&&aspect>0)v.aspect=aspect;
 const key=s.perspective+':'+(s.centre||'overview')+':'+s.search,old=s.scene?.contexts[key];const context={homes:{},flat:{},owners:{},planes:{},cameras:clone(old?.cameras||{}),routes:{...old?.routes,...Object.fromEntries(view.routes.map(r=>[r.id,r]))},layers:{}} as Scene['context'];
 const cards:SceneCard[]=[],layers:SceneLayer[]=[],references:SceneReference[]=[],links:SceneLink[]=[],internalSummaries:InternalSummary[]=[],recordMap=new Map<string,Item>(c.topics.map(t=>[t.id,{...t,record_type:'topic'}]));
 const open=Object.values(v.layers).filter(l=>l.open).sort((a,b)=>a.order-b.order),datasets=new Map<string,Item[]>(),groups=new Map<string,ReturnType<typeof layerGroups>>();
 for(const l of open.filter(l=>l.id!=='overview')){let records=layerRecords(l,c);l.memberIds=records.map(r=>r.id);const gs=layerGroups(l,c,records);groups.set(l.id,gs);if(l.display==='groups'&&gs.length){const covered=new Set(gs.flatMap(g=>g.ids));records=[...gs.map(g=>({id:'viewgroup:'+l.id+':'+g.key,label:g.label+'\n'+g.ids.length+' topics',kind:'group',domain:records.find(r=>g.ids.includes(r.id))?.domain||'other',record_type:'display',member_ids:g.ids,groupScope:{kind:'members',key:l.scope.key+':'+(l.scope.perspective||'')+':'+(l.scope.search||'')+':'+g.key,search:l.scope.search,memberIds:g.ids,records:layerRecords(l,c),perspective:l.scope.perspective,categoryKey:g.key},sourceLayerId:l.id} as Item)),...records.filter(r=>!covered.has(r.id))]}
 datasets.set(l.id,records);records.forEach(r=>recordMap.set(r.id,r))}
 const resolved=new Map(open.map(l=>[l.id,new Set(members(l.scope,c))]));
 // Keep each visible identity at its existing host; only rehost when that host is closed/hidden.
 for(const [id,host] of Object.entries(v.hosts))if(!datasets.get(host)?.some(r=>r.id===id))delete v.hosts[id];
 for(const l of open)for(const r of datasets.get(l.id)||[])v.hosts[r.id]??=l.id;
 for(const l of open.filter(l=>l.id!=='overview'))slotsFor(l,datasets.get(l.id)||[],mode,v.aspect,c,v.hosts);
 const ordered:ExplorationLayer[]=[],seen=new Set<string>();const visit=(l:ExplorationLayer)=>{if(seen.has(l.id))return;seen.add(l.id);const parent=v.layers[l.parentId];if(parent?.open)visit(parent);ordered.push(l)};open.forEach(visit);const newPlacements=new Set<string>();
 const reps:Record<string,string>={};
 const overviewGrid=overviewLayout(v.aspect,ROOT_GROUPS.length);
 ROOT_GROUPS.forEach((gid,i)=>{const id='group:'+gid,p={...overviewGrid.points[i],z:0},items=c.topics.filter(t=>rootGroup(t.id,c)===gid),child='root:'+gid;const record:Item={id,label:layerName(gid,c)+'\n'+items.length+' topics',kind:'group',domain:gid.split(':')[0],record_type:'display',groupKey:gid,expanded:!!v.layers[child]?.open,member_ids:items.map(t=>t.id)};cards.push({id,record,home:p,position:p,plane:0,layerId:'overview',owners:['overview'],width:264,height:118});items.forEach(t=>reps[t.id]=id)});
 const overviewBox={id:'overview',level:0,label:'Overview',shortLabel:'Overview',subtitle:'Available knowledge',kind:'overview',anchorIds:[],parentId:'',display:'groups' as const,...frameBounds(cards.map(card=>({...card.position,width:card.width,height:card.height}))),grid:{columns:overviewGrid.columns,rows:overviewGrid.rows},memberIds:[],groups:[]};layers.push(overviewBox);
 for(const l of ordered.filter(l=>l.id!=='overview')){
  if(!l.offsets[mode])newPlacements.add(l.id);
  const records=datasets.get(l.id)||[],ids=records.map(r=>r.id),box=bounds(l,records,mode,c,v.hosts);l.centres={...l.centres,[mode]:{x:box.x,y:box.y}};place(l,box,layers,mode,sourcePoint(l,cards,layers,v,mode));const o=l.offsets[mode]!,z=mode==='flat'?0:l.band*PLANE_GAP;
  l.label=l.kind==='connections'?(l.anchorId===s.centre?'Centre · ':'Connections · ')+(c.topics.find(t=>t.id===l.anchorId)?.label||l.anchorId):l.label;
  const frame:SceneLayer={sourceId:l.sourceId||l.anchorId,id:l.id,level:l.band,label:l.label,shortLabel:l.label,subtitle:l.kind==='connections'?'Connected topics':l.scope.kind==='group'?'Group contents':l.scope.perspective||'',kind:l.kind,anchorIds:l.anchorId?[l.anchorId]:[],parentId:l.parentId,display:l.display,x:box.x+o.x,y:box.y+o.y,width:box.width,height:box.height,memberIds:members(l.scope,c),groups:groups.get(l.id)||[]};
  let own=0;
  for(const r of records){const p=l.slots[mode][r.id],position={x:p.x+o.x,y:p.y+o.y,z},host=v.hosts[r.id];if(host!==l.id){references.push({id:'reference:'+l.id+':'+r.id,topicId:r.id,owner:l.id,layerId:l.id,hostLayerId:host,position,label:r.label+' ↗ '+(v.layers[host]?.label||host),width:214,height:78});continue}own++;
   const g=c.browse_groups?.find(g=>g.anchor_topic_id===r.id),normal=g?'group:'+g.id:'connections:'+r.id;
   const record={...clone(r),sourceLayerId:l.id,viewCentre:r.id===s.centre,branchExpanded:!!v.layers[normal]?.open,membership_labels:open.filter(other=>resolved.get(other.id)?.has(r.id)).map(other=>other.label),...(g?{browse_group:{id:g.id,label:g.label,expanded:!!v.layers['group:'+g.id]?.open}}:{})};
   cards.push({id:r.id,record,home:position,position:{...position},plane:l.band,layerId:l.id,owners:open.filter(other=>(datasets.get(other.id)||[]).some(r2=>r2.id===r.id)).map(other=>other.id),width:214,height:record.browse_group?118:98});
  }
  if(!ids.length)frame.emptyMessage='No topics recorded · Research this area';else if(!own)frame.emptyMessage='All '+ids.length+' topics are already visible · follow their location links';layers.push(frame);
 }
 for(const card of cards)if(c.topics.some(t=>t.id===card.id))reps[card.id]=card.id;
 for(const l of open)if(l.display==='groups')for(const r of datasets.get(l.id)||[])if(r.kind==='group')for(const id of r.member_ids||[])if(!cards.some(c=>c.id===id))reps[id]=r.id;
 const cardIds=new Set(cards.map(c=>c.id)),used=new Set<string>(),activeIds=new Set<string>(),selectedFacts=new Set(s.selectedEdges),valid=new Map(c.relationships.map(e=>[e.id,e]));
 for(const l of open)for(const r of l.scope.routes||[])if(s.selected===r.id)r.edges.forEach(id=>selectedFacts.add(id));
 const add=(record:any,ids:string[])=>{if(!cardIds.has(record.source)||!cardIds.has(record.target))return;const facts=ids.filter(id=>!used.has(id));if(ids.length&&!facts.length)return;facts.forEach(id=>used.add(id));const active=record.id===s.selected||facts.some(id=>selectedFacts.has(id))||record.source===s.selected||record.target===s.selected;
  const item={id:record.id,source:record.source,target:record.target,record:{...record,constituent_ids:facts},relationshipIds:facts,active};if(active){activeIds.add(record.source);activeIds.add(record.target)}links.push(item);
 };
 // Abbreviate only routes whose intermediate topics genuinely are not visible.
 for(const l of open)for(const r of l.scope.routes||[])if(s.detail==='abbreviated'&&!s.expandedRoutes.includes(r.id)&&r.nodes.length>2&&!r.nodes.every(id=>cardIds.has(id))&&cardIds.has(r.nodes[0])&&cardIds.has(r.endpoint))add({id:r.id,route_id:r.id,source:r.nodes[0],target:r.endpoint,label:'via '+(r.nodes.length-2)+' topics',record_type:'abbreviated'},r.edges);
 const summaries=new Map<string,any>();
 for(const e of c.relationships){if(used.has(e.id))continue;const a=reps[e.source],b=reps[e.target];if(!a||!b)continue;if(a===e.source&&b===e.target){add({...e,record_type:'relationship'},[e.id]);continue}const id='aggregate:'+a+'|'+b+':'+(e.basis||'source');let summary=summaries.get(id);if(!summary){summary={id,source:a,target:b,basis:e.basis,label:'',record_type:'aggregate',ids:[]};summaries.set(id,summary)}summary.ids.push(e.id)}
 for(const e of summaries.values()){if(e.source===e.target){const ids=e.ids.filter((id:string)=>!used.has(id));ids.forEach((id:string)=>used.add(id));if(!ids.length)continue;const summary={id:e.id,cardId:e.source,relationshipIds:ids,record:{...e,label:ids.length+' internal connections',constituent_ids:ids}};internalSummaries.push(summary);const card=cards.find(c=>c.id===e.source);if(card)card.internal=summary}else add({...e,label:e.ids.length+' recorded connections'},e.ids)}
 for(const l of open)for(const e of l.scope.edges||[])if(!valid.has(e.id)&&!links.some(l=>l.id===e.id))add(e,[]);
 if(s.selected&&cardIds.has(s.selected))activeIds.add(s.selected);for(const card of cards)card.dimmed=activeIds.size>0&&!activeIds.has(card.id);
 if(s.markers)for(const [i,task] of tasks.filter(t=>t.status!=='Completed').entries()){const origin=task.context?.centre?cards.find(c=>c.id===task.context.centre):cards.find(c=>c.id===s.centre);const frame=layers.find(l=>l.id===origin?.layerId)||overviewBox;const id='research:'+task.id,p={x:frame.x-frame.width/2-150,y:frame.y+i*140,z:(mode==='flat'?0:frame.level*PLANE_GAP)};cards.push({id,record:{id,label:'To research · '+(task.custom_topics||task.instruction),kind:'research',domain:'research',record_type:'display'},home:p,position:p,plane:frame.level,layerId:frame.id,owners:['research'],width:214,height:98});cardIds.add(id);if(origin)add({id:'indication:'+task.id,source:origin.id,target:id,label:'Investigate connection',record_type:'gap'},[])}
 // Use the actual displayed dimensions, including shared references and optional research cards.
 for(const layer of layers){const visible=[...cards,...references].filter(item=>item.layerId===layer.id);if(visible.length)Object.assign(layer,frameBounds(visible.map(item=>({...item.position,width:item.width,height:item.height}))))}
 for(const layer of layers){const l=v.layers[layer.id];if(!l)continue;
  if(mode==='layered'&&newPlacements.has(l.id)){const target=sourcePoint(l,cards,layers,v,mode);if(target){const dx=target.x-layer.x,dy=target.y-layer.y;layer.x+=dx;layer.y+=dy;l.offsets[mode]!.x+=dx;l.offsets[mode]!.y+=dy;
   for(const item of [...cards,...references].filter(item=>item.layerId===l.id)){item.position.x+=dx;item.position.y+=dy;if('home' in item)item.home={...item.position}}
  }}
  if(l.id==='overview'&&l.compactRequested?.[mode])l.compactRequested[mode]=false;
  layer.sourcePosition=sourcePoint(l,cards,layers,v,mode);
 }

 for(const card of cards){context.homes[card.id]=clone(card.home);context.owners[card.id]=card.owners;context.flat[card.id]={...card.position,z:0}}
 for(const l of open)for(const r of l.scope.routes||[])(context.routes||={})[r.id]=r;const level=Math.max(0,...layers.map(l=>l.level)),current=layers.find(l=>l.id===v.currentId)||overviewBox;context.returns=current.id==='overview'?[]:[{id:current.parentId,owners:[],parentId:null,label:v.layers[current.parentId]?.label||'Overview'}];
 const signature=JSON.stringify([c.revision,v.currentId,mode,layers.map(l=>[l.id,l.level,l.display,l.memberIds]),cards.map(c=>[c.id,c.position]),s.selected,s.selectedEdges,s.detail]);
 return {cards,links,internalSummaries,layers,layerView:v,activeCardIds:[...activeIds],references,context,key,signature,notice:'',level,mode,focused:cardIds.has(s.selected||'')?s.selected:null,homeMarker:s.centre?{id:s.centre,label:c.topics.find(t=>t.id===s.centre)?.label||s.centre,home:cards.find(c=>c.id===s.centre)?.home||{x:0,y:0,z:0}}:undefined,revision:c.revision};
}
/** Solve only new slots in each independent surface, never an already displayed layer. */
export async function prepareLayerScene(scene:Scene,previous:Scene|undefined,signal:AbortSignal){
 const v=scene.layerView!,mode=scene.mode,deadline=performance.now()+20000;
 for(const frame of scene.layers!.filter(l=>l.id!=='overview')){const layer=v.layers[frame.id],ids=[...new Set([...scene.cards.filter(c=>c.layerId===frame.id).map(c=>c.id),...(scene.references||[]).filter(r=>r.layerId===frame.id).map(r=>r.topicId)])].filter(id=>!!layer.slots[mode][id]);const signature=ids.join('|');if(layer.signatures[mode]===signature)continue;
  const previousIds=new Set(previous?.layerView?.layers[frame.id]&&previous.mode===mode?Object.keys(previous.layerView.layers[frame.id].slots[mode]):[]);
  const elements=ids.map(id=>({group:'nodes' as const,data:{id,kind:'lane',w:214,h:98,isEndpoint:previousIds.has(id)},position:layer.slots[mode][id]}));
  // Label-sized reading slots are fixed constraints, including references that may later become cards.
  const prior=elements.map(e=>({id:e.data.id,position:e.position,box:{x1:e.position.x-107,x2:e.position.x+107,y1:e.position.y-49,y2:e.position.y+49,w:214,h:98}}));
  if(elements.length){const remaining=deadline-performance.now();if(remaining<=0)throw new Error('The complete layout took too long. Your previous view is preserved; retry.');const placed=await requestLayout({elements,previous:prior,overview:false,centre:null,preserve:true},signal,remaining);for(const id of ids){const p=placed.positions[id],fixed=layer.slots[mode][id];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-fixed.x,p.y-fixed.y)>.1)throw new Error('The layout could not preserve the reading slots. Your previous view is preserved.');layer.slots[mode][id]={...p}}}
  layer.signatures[mode]=signature;
 }
 return scene;
}
