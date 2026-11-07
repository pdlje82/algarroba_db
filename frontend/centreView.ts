import type {State,Catalog,SceneContext,RetainedLayer} from './types.ts';
import type {Scene} from './scene.ts';
import {sceneLayers} from './layers.ts';
import {PLANE_GAP} from './depth.ts';
/** Close child expansions, retain their named surfaces, and open a centre from its source plane. */
export function centrePatch(state:State,scene:Scene|undefined,id:string,catalog:Catalog):Partial<State>{
 const s=structuredClone(state),card=scene?.cards.find(c=>c.id===id),layers=scene?sceneLayers(scene):[],same=s.centreFirst&&s.centre===id&&!!card&&card.owners.includes('centre:'+id)&&scene!.level===(s.centreLevel||1);
 const retained:RetainedLayer[]=same?s.retainedLayers||[]:layers.filter(l=>l.level>0).map(l=>({...l,id:'retained:'+l.level,members:scene!.cards.some(c=>c.plane===l.level)?scene!.cards.filter(c=>c.plane===l.level&&c.record.record_type!=='display').map(c=>({id:c.id,home:{...c.home}})):s.retainedLayers?.find(old=>old.level===l.level)?.members||[]}));
 const cachedSource=(s.retainedLayers||[]).filter(l=>l.members.some(m=>m.id===id)).sort((a,b)=>b.level-a.level)[0],sourceHome=card?.home||cachedSource?.members.find(m=>m.id===id)?.home;
 const level=same?s.centreLevel||1:(scene?.level||0)+1,source=layers.find(l=>l.level===(card?.plane??cachedSource?.level)),memory=s.scene||{version:4 as const,mode:'layered' as const,contexts:{}};
 memory.version=4;memory.focus=id;delete memory.collapse;
 const key=s.perspective+':'+id+':'+s.search,old=memory.centres?.[id]?.homes||{},homes=Object.fromEntries(Object.entries(old).map(([key,p])=>[key,{...p,z:level*PLANE_GAP}]));
 if(!homes[id])homes[id]={x:sourceHome?.x||0,y:sourceHome?.y||0,z:level*PLANE_GAP};
 const centreSession=same?s.centreSession||1:(s.centreSession||0)+1;const context:SceneContext={centreSession,homes,flat:{},owners:{},planes:{},cameras:{}};
 memory.contexts[key]=context;
 return {centre:id,overview:false,centreFirst:true,centreVisible:true,centreSession,resultsOpen:false,directLimit:12,otherConnections:false,centreLevel:level,centreSource:same?s.centreSource:{label:source?.label||'Overview',level:source?.level||0},retainedLayers:retained,scene:memory,selected:id,selectedEdges:[],expandedGroups:[],groupLimits:{},expandedRoutes:[],alternatives:[],branches:[],limit:12};
}
