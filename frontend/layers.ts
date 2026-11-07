import {contextKey} from './layerNavigation.ts';
import {PLANE_GAP} from './depth.ts';
import type {Scene} from './scene.ts';
import type {Point,State} from './types.ts';
export const layerLabel=(level:number|string,scene?:Scene)=>{if(scene?.layers)return scene.layers.find(l=>l.id===level)?.label||scene.layers.find(l=>l.id===scene.layerView?.currentId)?.label||'Overview';return level===0?'Overview':scene?.context.layers?.[String(level)]?.label||'Detail'};
/** A visible border identifies a rear plane even where a nearer transparent plane overlaps it. */
export function layerBorderAt(point:Point,frames:{level:number;corners:Point[]}[],tolerance=9):number|null{
 let selected:number|null=null,best=tolerance;
 for(const frame of frames)for(let i=0;i<frame.corners.length;i++){
  const a=frame.corners[i],b=frame.corners[(i+1)%frame.corners.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
  if(distance<best||(distance===best&&(selected===null||frame.level>selected))){selected=frame.level;best=distance}
 }
 return selected;
}
/** Finite clickable surfaces follow ordinary homes, not a card temporarily popped forward. */
export function sceneLayers(scene:Scene){
 if(scene.layers)return scene.layers;
 return [...new Set([0,...scene.cards.map(c=>c.plane),...Object.keys(scene.context.layers||{}).map(Number)])].sort((a,b)=>a-b).map(level=>{
  const cards=[...scene.cards.filter(c=>c.plane===level),...(scene.references||[]).filter(r=>Math.round(r.position.z/PLANE_GAP)===level).map(r=>({home:r.position,width:r.width,height:r.height}))],minW=level?640:2160,minH=level?360:1200;
  const x1=Math.min(...cards.map(c=>c.home.x-c.width/2))-100,x2=Math.max(...cards.map(c=>c.home.x+c.width/2))+100,y1=Math.min(...cards.map(c=>c.home.y-c.height/2))-100,y2=Math.max(...cards.map(c=>c.home.y+c.height/2))+100;
  const x=cards.length?(x1+x2)/2:0,y=cards.length?(y1+y2)/2:0,width=cards.length?Math.max(minW,x2-x1):minW,height=cards.length?Math.max(minH,y2-y1):minH;
  const retained=(scene as Scene&{retainedLayers?:any[]}).retainedLayers?.find(l=>l.level===level),descriptor=scene.context.layers?.[String(level)];
  return {id:String(level),subtitle:'',parentId:'',display:'topics' as const,memberIds:[] as string[],groups:[] as {key:string;label:string;ids:string[]}[],emptyMessage:undefined as string|undefined,level,label:layerLabel(level,scene),shortLabel:descriptor?.shortLabel||layerLabel(level,scene),kind:descriptor?.kind||(level===0?'overview':'detail') as 'overview'|'detail',anchorIds:descriptor?.anchorIds||[],x:cards.length?x:retained?.x||x,y:cards.length?y:retained?.y||y,width:cards.length?width:retained?.width||width,height:cards.length?height:retained?.height||height};
 });
}
/** Fold expansions above the clicked plane, retaining the controls, homes and mode cameras. */
export function collapseToLayer(s:State,scene:Scene,level:number):Partial<State>|null{
 if(scene.mode!=='layered'||!sceneLayers(scene).some(l=>l.level===level))return null;
 const key=contextKey(s),memory=structuredClone(s.scene),ctx=memory?.contexts[key];if(!memory||!ctx)return null;
 const remove=new Set(Object.entries(ctx.planes).filter(([owner,plane])=>owner!=='overview'&&plane>level).map(([owner])=>owner));
 const routes=s.detail==='full'?Object.keys(ctx.routes||{}):s.expandedRoutes;
 for(const id of routes)if(ctx.routes?.[id]?.nodes.some(node=>(ctx.homes[node]?.z||0)>level*PLANE_GAP))remove.add('route:'+id);
 const patch:Partial<State>={expandedGroups:s.expandedGroups.filter(id=>!remove.has('group:'+id)),branches:s.branches.filter(id=>!remove.has('topic:'+id)),expandedRoutes:routes.filter(id=>!remove.has('route:'+id)),selectedEdges:[]};
 if([...remove].some(o=>o.startsWith('route:')))patch.detail='abbreviated';
 ctx.revealed=Object.fromEntries(Object.entries(ctx.revealed||{}).filter(([id,plane])=>plane<=level&&!remove.has('visit:'+id)));
 if(remove.has('query')&&!s.centreFirst)patch.overview=true;
 if(remove.has('perspective'))patch.overviewDepth=0;
 if(s.centreFirst){if(level<(s.centreLevel||1))patch.centreVisible=false;patch.resultsOpen=false;patch.retainedLayers=(s.retainedLayers||[]).filter(l=>l.level<=level)}
 if(level===0)Object.assign(patch,{overview:true,overviewDepth:0,expandedGroups:[],branches:[],expandedRoutes:[],alternatives:[],detail:'abbreviated'});
 ctx.returns=(ctx.returns||[]).map(r=>({...r,owners:r.owners.filter(o=>!remove.has(o))})).filter(r=>r.owners.length);
 const selected=scene.cards.find(c=>c.id===s.selected);patch.selected=selected&&selected.plane<=level&&selected.owners.some(o=>!remove.has(o))?s.selected:null;
 memory.focus=null;delete ctx.focus;ctx.layerCeiling=level;ctx.returnSerial=(ctx.returnSerial||0)+1;
 memory.collapse={id:key+':layer:'+level+':'+ctx.returnSerial,parentId:null,level};patch.scene=memory;
 return patch;
}
