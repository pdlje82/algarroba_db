import type {Scene} from './scene.ts';
import {seedUnoccupied,PLANE_GAP} from './scene.ts';
import {requestLayout} from './layoutRequest.ts';
import type {PreviousNode} from './layout';
/** Isolated fCoSE candidates, one logical plane at a time. Never mutates the displayed scene. */
export async function prepareScene(scene:Scene,previous:Scene|undefined,signal:AbortSignal){
 const cached=scene.mode==='flat'?scene.context.flat:scene.context.homes;
 const restored=scene.context.signatures?.[scene.mode]===scene.signature&&scene.cards.every(c=>cached[c.id]);
 if(restored&&!scene.context.reflow?.length)return scene;
 seedUnoccupied(scene,scene.mode,previous);
 const old=new Set(previous?.key===scene.key&&previous.mode===scene.mode?previous.cards.map(c=>c.id):scene.context.laidOut?.[scene.mode]||[]);
 for(const id of scene.context.reflow||[])old.delete(id);
 const layers=scene.mode==='flat'?[0]:[...new Set(scene.cards.map(c=>c.plane))].filter(p=>p>0);
 for(const layer of layers){
  if(signal.aborted)throw new DOMException('Superseded layout','AbortError');
  const cards=scene.cards.filter(c=>scene.mode==='flat'||c.plane===layer);if(cards.every(c=>old.has(c.id)||(scene.mode==='layered'&&c.owners.some(o=>o.startsWith('centre:')))))continue;
  const ids=new Set(cards.map(c=>c.id));const references=scene.mode==='layered'?(scene.references||[]).filter(r=>Math.round(r.position.z/PLANE_GAP)===layer):[];
  const prior:PreviousNode[]=cards.filter(c=>old.has(c.id)||(scene.mode==='layered'&&c.owners.some(o=>o.startsWith('centre:')))||c.record.kind==='group').map(c=>({id:c.id,position:{x:c.position.x,y:c.position.y},box:{x1:c.position.x-c.width/2,x2:c.position.x+c.width/2,y1:c.position.y-c.height/2,y2:c.position.y+c.height/2,w:c.width,h:c.height}}));
  const elements:any[]=[...cards.map(c=>({group:'nodes',data:{...c.record,parent:undefined,isEndpoint:old.has(c.id),layoutLane:c.record.layoutLane||String(Math.round(c.position.x)),w:c.width,h:c.height},position:{x:c.position.x,y:c.position.y}})),...scene.links.filter(e=>ids.has(e.source)&&ids.has(e.target)&&e.source!==e.target).map(e=>({group:'edges',data:{id:e.id,source:e.source,target:e.target}}))];
  for(const r of references){elements.push({group:'nodes',data:{id:r.id,kind:'lane',isEndpoint:true,w:r.width,h:r.height},position:r.position});prior.push({id:r.id,position:r.position,box:{x1:r.position.x-r.width/2,x2:r.position.x+r.width/2,y1:r.position.y-r.height/2,y2:r.position.y+r.height/2,w:r.width,h:r.height}})}
  const result=await requestLayout({elements,previous:prior,overview:false,centre:null,preserve:true},signal);
  for(const card of cards){if(old.has(card.id)||(scene.mode==='layered'&&card.owners.some(o=>o.startsWith('centre:')))||card.record.kind==='group')continue;const p=result.positions[card.id];if(p){if(scene.mode==='flat'){scene.context.flat[card.id]={...p,z:0};card.position={...p,z:0}}else{card.home={...p,z:card.home.z};scene.context.homes[card.id]={...card.home};card.position={...card.home,z:card.position.z}}}}
 }
 // Resolve residual card collisions after force placement, keeping all previous anchors fixed.
 seedUnoccupied(scene,scene.mode,previous);
 delete scene.context.reflow;return scene;
}
