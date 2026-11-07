import {GROUP_LABELS,landscapeGroup,type State,type SceneContext,type Catalog,type Item,type Route,type LayerReturn} from './types.ts';
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export const contextKey=(s:State)=>s.perspective+':'+(s.centre||'overview')+':'+s.search;
const empty=():SceneContext=>({homes:{},flat:{},owners:{},planes:{},cameras:{}});
const groupId=(key:string)=>/^(ecosystem|technology|funding):/.test(key)?'group:'+key:'perspective-group:'+key;
function label(id:string|null,catalog:Catalog,records:Item[]=[]){
 if(!id)return 'overview';const item=records.find(n=>n.id===id)||catalog.topics.find(n=>n.id===id);if(item)return item.label.split('\n')[0];
 const key=id.replace(/^(perspective-group:|group:)/,'');return catalog.browse_groups?.find(g=>g.id===key)?.label||GROUP_LABELS[key.split(':')[1]]||key.split(':').slice(1).join(':')||id;
}
function step(id:string,owners:string[],parentId:string|null,catalog:Catalog):LayerReturn{return {id,owners,parentId,label:label(parentId,catalog)}}
/** Record one return step per user expansion, including batches such as Expand all. */
export function trackLayerReturns(before:State,next:State,catalog:Catalog,routes:Route[]):State{
 const key=contextKey(next),old=before.scene?.contexts[contextKey(before)],ctx=next.scene?.contexts[key];
 const groups=next.expandedGroups.filter(id=>!before.expandedGroups.includes(id));
 const topics=next.branches.filter(id=>!before.branches.includes(id));
 const oldRoutes=new Set(before.detail==='full'?[...Object.keys(old?.routes||{}),...before.alternatives.map(r=>r.id),...before.expandedRoutes]:before.expandedRoutes);
 const full=next.detail==='full'?routes.map(r=>r.id):next.expandedRoutes;
 const expanded=full.filter(id=>!oldRoutes.has(id));
 const visits=Object.keys(ctx?.revealed||{}).filter(id=>!old?.revealed?.[id]);
 const query=!next.overview&&(before.overview||before.centre!==next.centre);
 const owners=[...groups.map(id=>'group:'+id),...topics.map(id=>'topic:'+id),...expanded.map(id=>'route:'+id),...visits.map(id=>'visit:'+id),...(query?['query']:[])];
 const more=next.limit>before.limit||next.depth>before.depth||Object.entries(next.groupLimits).some(([id,n])=>n>(before.groupLimits[id]||6));
 if(!owners.length){if(more&&ctx?.layerCeiling!==undefined){const memory=clone(next.scene!);delete memory.contexts[key].layerCeiling;return {...next,scene:memory}}return next}
 const memory=clone(next.scene||{version:4 as const,mode:'layered' as const,contexts:{}}),context=memory.contexts[key]||empty();
 let parentId:string|null=topics[0]||null;
 if(!parentId&&groups.length)parentId=groupId(groups[0]);
 if(!parentId&&(visits.length||expanded.length))parentId=catalog.topics.some(t=>t.id===before.selected)?before.selected:next.centre;
 if(query){const centre=catalog.topics.find(t=>t.id===next.centre),group=centre&&landscapeGroup(centre);parentId=group&&next.expandedGroups.includes(group)?groupId(group):null}
 const serial=(context.returnSerial||0)+1;context.returnSerial=serial;
 delete context.layerCeiling;
 context.returns=(context.returns||[]).map(s=>({...s,owners:s.owners.filter(o=>!owners.includes(o))})).filter(s=>s.owners.length);
 context.returns.push(step('step:'+serial,owners,parentId,catalog));memory.contexts[key]=context;delete memory.collapse;
 return {...next,scene:memory};
}
/** Older snapshots get useful return controls without losing any opened exploration. */
export function layerReturns(s:State,ctx:SceneContext,catalog:Catalog,records:Item[]):LayerReturn[]{
 const active=new Set(Object.values(ctx.owners).flat()),existing=ctx.returns||[],covered=new Set(existing.flatMap(s=>s.owners));
 const fallback:LayerReturn[]=[];
 const add=(id:string,owners:string[],parent:string|null)=>{const missing=owners.filter(o=>active.has(o)&&!covered.has(o));if(missing.length)fallback.push(step('auto:'+id,missing,parent,catalog))};
 add('perspective',['perspective'],null);
 for(const id of s.expandedGroups)add('group:'+id,['group:'+id],groupId(id));
 if(s.centreFirst&&s.centre&&active.has('centre:'+s.centre)&&!covered.has('centre:'+s.centre))fallback.push({id:'auto:centre',owners:['centre:'+s.centre],parentId:null,label:s.centreSource?.label||'Overview'});
 add('query',['query'],null);
 for(const id of Object.keys(ctx.revealed||{}))add('visit:'+id,['visit:'+id],s.centre);
 for(const id of s.branches)add('topic:'+id,['topic:'+id],id);
 const routes=s.detail==='full'?Object.keys(ctx.routes||{}):s.expandedRoutes;add('routes',routes.map(id=>'route:'+id),s.centre);
 return [...fallback,...existing].map(r=>({...r,label:r.id==='auto:centre'?r.label:label(r.parentId,catalog,records),owners:r.owners.filter(o=>active.has(o))})).filter(r=>r.owners.length);
}
export function collapseLayerReturn(s:State,id:string,catalog:Catalog):Partial<State>|null{
 const key=contextKey(s),memory=clone(s.scene),ctx=memory?.contexts[key],target=ctx?.returns?.find(r=>r.id===id);if(!memory||!ctx||!target)return null;
 const index=ctx.returns!.findIndex(r=>r.id===id),remove=new Set(ctx.returns!.slice(index).flatMap(r=>r.owners)),routes=s.detail==='full'?Object.keys(ctx.routes||{}):s.expandedRoutes;
 const patch:Partial<State>={expandedGroups:s.expandedGroups.filter(id=>!remove.has('group:'+id)),branches:s.branches.filter(id=>!remove.has('topic:'+id)),expandedRoutes:routes.filter(id=>!remove.has('route:'+id)),selectedEdges:[]};
 if([...remove].some(o=>o.startsWith('route:')))patch.detail='abbreviated';
 ctx.revealed=Object.fromEntries(Object.entries(ctx.revealed||{}).filter(([id])=>!remove.has('visit:'+id)));
 if(remove.has('query'))Object.assign(patch,{...(s.centreFirst?{resultsOpen:false}:{overview:true}),expandedRoutes:[],alternatives:[],branches:[],detail:'abbreviated'});
 if(remove.has('perspective'))patch.overviewDepth=0;
 if(s.centreFirst&&remove.has('centre:'+s.centre)){const level=s.centreSource?.level||0;ctx.layerCeiling=level;ctx.layers=Object.fromEntries(Object.entries(ctx.layers||{}).filter(([key])=>Number(key)<=level));patch.retainedLayers=s.retainedLayers?.filter(l=>l.level<=level);patch.resultsOpen=false;patch.centreVisible=false;patch.selected=null;memory.focus=null;if(level===0)patch.overview=true}
 ctx.returns=ctx.returns!.map(r=>({...r,owners:r.owners.filter(o=>!remove.has(o))})).filter(r=>r.owners.length);
 delete ctx.focus;
 const parent=catalog.topics.find(t=>t.id===target.parentId);patch.selected=parent?.id||null;if(parent)memory.focus=parent.id;
 memory.collapse={id:key+':'+target.id,parentId:target.parentId};patch.scene=memory;
 return patch;
}

/** A second card click closes that card's expansion, without closing unrelated branches. */
export function collapseExpandedCard(s:State,record:Item,catalog:Catalog):Partial<State>|null{
 const key=contextKey(s),current=s.scene?.contexts[key],topic=catalog.topics.some(t=>t.id===record.id);
 const anchored=catalog.browse_groups?.find(g=>g.anchor_topic_id===record.id&&s.expandedGroups.includes(g.id));const group=record.kind==='group'&&s.expandedGroups.includes(record.groupKey)||!!anchored,branch=topic&&s.branches.includes(record.id);
 const popped=topic&&s.scene?.mode==='layered'&&s.scene.focus===record.id&&current?.focus?.id===record.id&&current.focus.position.z!==current.homes[record.id]?.z;
 if(!group&&!branch&&!popped)return null;
 if(!current)return null;const memory=clone(s.scene!),ctx=memory.contexts[key];
 const remove=new Set([...(group?['group:'+(anchored?.id||record.groupKey)]:[]),...(branch?['topic:'+record.id]:[])]);
 const remains=(id:string|null|undefined)=>!!id&&ctx.owners[id]?.some(o=>!remove.has(o));
 const patch:Partial<State>={expandedGroups:s.expandedGroups.filter(id=>!remove.has('group:'+id)),branches:s.branches.filter(id=>!remove.has('topic:'+id)),selected:topic?record.id:remains(s.selected)?s.selected:null,selectedEdges:[]};
 ctx.returns=(ctx.returns||[]).map(r=>({...r,owners:r.owners.filter(o=>!remove.has(o))})).filter(r=>r.owners.length);
 if(topic||!remains(memory.focus)){memory.focus=null;delete ctx.focus}
 ctx.returnSerial=(ctx.returnSerial||0)+1;
 memory.collapse={id:key+':card:'+record.id+':'+ctx.returnSerial,parentId:record.id};patch.scene=memory;
 return patch;
}
