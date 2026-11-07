import cytoscape,{type ElementDefinition,type Core} from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type {Point} from './types.ts';
cytoscape.use(fcose);

export type PreviousNode={id:string;position:Point;parent?:string;box:{x1:number;y1:number;x2:number;y2:number;w:number;h:number}};
export type LayoutRequest={elements:ElementDefinition[];previous:PreviousNode[];overview:boolean;centre:string|null;preserve:boolean};
export type LayoutResult={positions:Record<string,Point>};
const dimensions=(e:ElementDefinition)=>e.data.kind==='group'?{w:264,h:124}:e.data.isLandmark?{w:199,h:56}:{w:e.classes?.includes('centre')?224:214,h:e.classes?.includes('centre')?92:98};
const point=(e:ElementDefinition):Point=>e.position||{x:0,y:0};
const clone=(e:ElementDefinition):ElementDefinition=>({...e,data:{...e.data},position:{...point(e)}});

function solve(elements:ElementDefinition[],fixed:Record<string,Point>,alignment:any={},relative:any[]=[],compact=false){
 if(!elements.length)return {} as Record<string,Point>;
 const graph=cytoscape({headless:true,styleEnabled:true,layout:{name:'preset'},elements:elements.map(e=>{const d=dimensions(e);return {...e,position:{...point(e)},data:{...e.data,w:e.data.w||d.w,h:e.data.h||d.h,parent:undefined}}}),style:[{selector:'node',style:{width:'data(w)',height:'data(h)',label:'','padding':'0px'}}]});
 try{
  graph.layout({name:'fcose',randomize:false,quality:'proof',animate:false,fit:false,nodeDimensionsIncludeLabels:true,packComponents:false,tile:false,nodeRepulsion:()=>compact?200:5500,idealEdgeLength:()=>compact?60:180,gravity:compact?2:.25,numIter:1200,fixedNodeConstraint:Object.entries(fixed).map(([nodeId,position])=>({nodeId,position})),alignmentConstraint:alignment,relativePlacementConstraint:relative} as any).run();
  const result:Record<string,Point>={};graph.nodes().forEach(n=>{const p=n.position();if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw new Error('The layout could not place all cards.');result[n.id()]={...p}});return result;
 }finally{graph.destroy()}
}

function groupBox(children:ElementDefinition[],positions:Record<string,Point>){
 const x1=Math.min(...children.map(c=>positions[String(c.data.id)].x-dimensions(c).w/2))-28;
 const x2=Math.max(...children.map(c=>positions[String(c.data.id)].x+dimensions(c).w/2))+28;
 const y1=Math.min(...children.map(c=>positions[String(c.data.id)].y-dimensions(c).h/2))-58;
 const y2=Math.max(...children.map(c=>positions[String(c.data.id)].y+dimensions(c).h/2))+28;
 return {x:(x1+x2)/2,y:(y1+y2)/2,w:x2-x1,h:y2-y1};
}

/** Compute off-screen. The live Cytoscape instance is never used as a layout scratchpad. */
export function calculateLayout(request:LayoutRequest):LayoutResult {
 for(const e of request.elements)if(e.group==='nodes'&&(!Number.isFinite(point(e).x)||!Number.isFinite(point(e).y)))throw new Error('A saved position is invalid. Your previous view is preserved.');
 const nodes=request.elements.filter(e=>e.group==='nodes').map(clone),edges=request.elements.filter(e=>e.group==='edges');
 const previous=new Map((request.preserve?request.previous:[]).map(n=>[n.id,n]));
 const positions:Record<string,Point>={};nodes.forEach(n=>positions[String(n.data.id)]={...(previous.get(String(n.data.id))?.position||point(n))});
 if(request.overview){
  const groups=nodes.filter(n=>n.data.kind==='group'),boxes:ElementDefinition[]=[],changed=new Set<string>();
  for(const group of groups){
   const id=String(group.data.id),children=nodes.filter(n=>n.data.parent===id),old=previous.get(id);
   const oldChildren=[...previous.values()].filter(n=>n.parent===id);
   if(children.map(n=>n.data.id).sort().join('|')!==oldChildren.map(n=>n.id).sort().join('|'))changed.add(id);
   if(!children.length){const d=dimensions(group);if(oldChildren.length)positions[id]=point(group);boxes.push({group:'nodes',data:{id,w:d.w,h:d.h,domain:group.data.domain,order:group.data.order},position:positions[id]});continue}
   const fixed:Record<string,Point>={},relative:any[]=[],vertical:string[][]=[],horizontal:string[][]=[];
   const firstExisting=children.find(n=>previous.has(String(n.data.id)));
   const delta=firstExisting?{x:previous.get(String(firstExisting.data.id))!.position.x-point(firstExisting).x,y:previous.get(String(firstExisting.data.id))!.position.y-point(firstExisting).y}:old?{x:old.position.x-point(group).x,y:old.box.y1+74-point(group).y}:{x:0,y:0};
   children.forEach(n=>{const id=String(n.data.id);if(previous.has(id))n.position=previous.get(id)!.position;else n.position={x:point(n).x+delta.x,y:point(n).y+delta.y};positions[id]=point(n);if(previous.has(id))fixed[id]=point(n)});
   if(!Object.keys(fixed).length)fixed[String(children[0].data.id)]=point(children[0]);
   const columns=new Map<number,ElementDefinition[]>();
   // Seed columns express the intended two-column reading order; fCoSE solves spacing.
   children.forEach(n=>{const x=Math.round(point(n).x);if(!columns.has(x))columns.set(x,[]);columns.get(x)!.push(n)});
   for(const col of columns.values()){const ordered=col.sort((a,b)=>point(a).y-point(b).y);if(ordered.length>1)vertical.push(ordered.map(n=>String(n.data.id)));for(let i=1;i<ordered.length;i++)relative.push({top:ordered[i-1].data.id,bottom:ordered[i].data.id,gap:140})}
   const cols=[...columns.entries()].sort(([a],[b])=>a-b);for(let i=1;i<cols.length;i++)relative.push({left:cols[i-1][1][0].data.id,right:cols[i][1][0].data.id,gap:260});
   const childIds=new Set(children.map(c=>String(c.data.id)));
   const rows=new Map<number,string[]>();children.forEach(n=>{const y=Math.round(point(n).y);if(!rows.has(y))rows.set(y,[]);rows.get(y)!.push(String(n.data.id))});rows.forEach(ids=>{if(ids.length>1)horizontal.push(ids)});
   const local=solve([...children,...edges.filter(e=>childIds.has(String(e.data.source))&&childIds.has(String(e.data.target)))],fixed,{vertical,horizontal},relative,true);Object.assign(positions,local);
   const box=groupBox(children,positions);
   const top=old?old.box.y1:point(group).y-62;
   boxes.push({group:'nodes',data:{id,w:box.w,h:box.h,domain:group.data.domain,order:group.data.order},position:{x:box.x,y:changed.has(id)?top+box.h/2:box.y}});
  }
  const fixed:Record<string,Point>={},vertical:string[][]=[],relative:any[]=[];
  for(const domain of new Set(groups.map(n=>n.data.domain))){
   const col=boxes.filter(n=>n.data.domain===domain).sort((a,b)=>Number(a.data.order)-Number(b.data.order));if(!col.length)continue;
   vertical.push(col.map(n=>String(n.data.id)));
   const firstChanged=col.findIndex(n=>changed.has(String(n.data.id)));
   col.forEach((n,i)=>{const id=String(n.data.id);if(i===0||firstChanged<0||i<firstChanged)fixed[id]=point(n)});
   for(let i=1;i<col.length;i++)relative.push({top:col[i-1].data.id,bottom:col[i].data.id,gap:Math.max(220,(Number(col[i-1].data.h)+Number(col[i].data.h))/2+72)});
  }
  const packed=solve(boxes,fixed,{vertical},relative,true);
  for(const group of groups){const id=String(group.data.id),children=nodes.filter(n=>n.data.parent===id);if(!children.length){positions[id]=packed[id];continue}const box=groupBox(children,positions);const dx=packed[id].x-box.x,dy=packed[id].y-box.y;children.forEach(n=>{const id=String(n.data.id);positions[id]={x:positions[id].x+dx,y:positions[id].y+dy}});positions[id]=packed[id]}
 }else{
  const simple=nodes.filter(n=>!n.data.isDomain),fixed:Record<string,Point>={},vertical:string[][]=[],relative:any[]=[];
  for(const node of simple){const id=String(node.data.id);node.position=positions[id];if(previous.has(id)||id===request.centre||node.data.isEndpoint||node.data.kind==='landmark'||node.data.kind==='lane')fixed[id]=positions[id]}
  const lanes=new Map<string,ElementDefinition[]>();simple.filter(n=>n.data.layoutLane).forEach(n=>{const lane=String(n.data.layoutLane);if(!lanes.has(lane))lanes.set(lane,[]);lanes.get(lane)!.push(n)});
  for(const col of lanes.values()){
   const old=col.filter(n=>previous.has(String(n.data.id))),fresh=col.filter(n=>!previous.has(String(n.data.id)));
   if(old.length&&fresh.length){let y=Math.max(...old.map(n=>point(n).y))+140;fresh.forEach(n=>{n.position={x:point(old[0]).x,y};y+=140})}
   const ordered=col.sort((a,b)=>point(a).y-point(b).y);if(ordered.length>1)vertical.push(ordered.map(n=>String(n.data.id)));
   if(!old.length&&ordered.length)fixed[String(ordered[0].data.id)]=point(ordered[0]);
   for(let i=1;i<ordered.length;i++)relative.push({top:ordered[i-1].data.id,bottom:ordered[i].data.id,gap:Math.min(140,Math.max(110,point(ordered[i]).y-point(ordered[i-1]).y))});
  }
  Object.assign(positions,solve([...simple,...edges],fixed,{vertical},relative));
 }
 for(const p of Object.values(positions))if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw new Error('The layout could not place all cards.');
 return {positions};
}

export function readPrevious(graph:Core):PreviousNode[]{return graph.nodes().map(n=>({id:n.id(),position:{...n.position()},parent:n.parent()[0]?.id(),box:n.boundingBox({includeLabels:true,includeOverlays:false})}))}

export {requestLayout} from './layoutRequest.ts';
