import type {Core} from 'cytoscape';
import type {Point} from './types.ts';
export type CardRect={x1:number;y1:number;x2:number;y2:number};
const inside=(p:Point,r:CardRect)=>p.x>r.x1+1e-6&&p.x<r.x2-1e-6&&p.y>r.y1+1e-6&&p.y<r.y2-1e-6;

export function crossesCard(a:Point,b:Point,r:CardRect){
 let enter=0,leave=1;
 for(const [start,delta,lo,hi]of [[a.x,b.x-a.x,r.x1+1e-6,r.x2-1e-6],[a.y,b.y-a.y,r.y1+1e-6,r.y2-1e-6]]){
  if(Math.abs(delta)<1e-8){if(start<=lo||start>=hi)return false;continue}
  const t1=(lo-start)/delta,t2=(hi-start)/delta;enter=Math.max(enter,Math.min(t1,t2));leave=Math.min(leave,Math.max(t1,t2));if(enter>=leave)return false;
 }
 return enter<1&&leave>0;
}

/** Visibility graph around padded card corners; routing changes no topic or relationship. */
export function avoidCards(source:Point,target:Point,obstacles:CardRect[],cornerClearance=0):Point[]{
 if(!obstacles.some(r=>crossesCard(source,target,r)))return [source,target];
 const region={x1:Math.min(source.x,target.x)-250,x2:Math.max(source.x,target.x)+250,y1:Math.min(source.y,target.y)-250,y2:Math.max(source.y,target.y)+250};
 const nearby=obstacles.filter(r=>r.x2>=region.x1&&r.x1<=region.x2&&r.y2>=region.y1&&r.y1<=region.y2);
 const points=[source,target,...nearby.flatMap(r=>[{x:r.x1-cornerClearance,y:r.y1-cornerClearance},{x:r.x1-cornerClearance,y:r.y2+cornerClearance},{x:r.x2+cornerClearance,y:r.y1-cornerClearance},{x:r.x2+cornerClearance,y:r.y2+cornerClearance}]).filter(p=>!obstacles.some(r=>inside(p,r)))];
 const distance=points.map(()=>Infinity),parent=points.map(()=>-1),visited=new Set<number>();distance[0]=0;
 for(let step=0;step<points.length;step++){
  let at=-1;for(let i=0;i<points.length;i++)if(!visited.has(i)&&(at<0||distance[i]<distance[at]))at=i;
  if(at<0||!Number.isFinite(distance[at]))break;if(at===1){const path:Point[]=[];for(let i=1;i>=0;i=parent[i])path.unshift(points[i]);return path}
  visited.add(at);
  for(let next=0;next<points.length;next++){if(visited.has(next)||next===at)continue;const cost=distance[at]+Math.hypot(points[next].x-points[at].x,points[next].y-points[at].y)+8;if(cost>=distance[next])continue;if(obstacles.some(r=>crossesCard(points[at],points[next],r)))continue;distance[next]=cost;parent[next]=at}
 }
 return [source,target];
}

/** Trim against the real card, not its routing clearance. */
export function cardPort(centre:Point,towards:Point,rect:CardRect):Point{
 const dx=towards.x-centre.x,dy=towards.y-centre.y;
 const t=Math.min(Math.abs((rect.x2-rect.x1)/2/(dx||1e-12)),Math.abs((rect.y2-rect.y1)/2/(dy||1e-12)));
 return {x:centre.x+dx*t,y:centre.y+dy*t};
}
export function pathFractions(path:Point[]):number[]{
 const distances=[0];for(let i=1;i<path.length;i++)distances.push(distances[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y));
 const total=distances.at(-1)||1;return distances.map(d=>d/total);
}
export function pathMidpoint(path:Point[]):Point{
 const distances=pathFractions(path);for(let i=1;i<path.length;i++)if(distances[i]>=.5){const t=(.5-distances[i-1])/(distances[i]-distances[i-1]||1);return {x:path[i-1].x+(path[i].x-path[i-1].x)*t,y:path[i-1].y+(path[i].y-path[i-1].y)*t}}return path[0];
}
/** Round only where the sampled curve retains the routing clearance. */
export function roundedPath(path:Point[],obstacles:CardRect[],radius=10):Point[]{
 const out=[path[0]];for(let i=1;i<path.length-1;i++){
  const a=path[i-1],b=path[i],c=path[i+1],ab=Math.hypot(b.x-a.x,b.y-a.y),bc=Math.hypot(c.x-b.x,c.y-b.y);let curve:Point[]=[b];
  for(let r=Math.min(radius,ab/3,bc/3);r>=.5;r/=2){
   const p={x:b.x+(a.x-b.x)*r/ab,y:b.y+(a.y-b.y)*r/ab},q={x:b.x+(c.x-b.x)*r/bc,y:b.y+(c.y-b.y)*r/bc};
   const sample=Array.from({length:7},(_,j)=>{const t=j/6;return {x:(1-t)**2*p.x+2*(1-t)*t*b.x+t*t*q.x,y:(1-t)**2*p.y+2*(1-t)*t*b.y+t*t*q.y}});
   if(!sample.slice(1).some((p,j)=>obstacles.some(rect=>crossesCard(sample[j],p,rect)))){curve=sample;break}
  }out.push(...curve);
 }return [...out,path.at(-1)!];
}
/** Stable, shallow curve; selected paths use the visibility graph around card obstacles. */
export function connectionPath(id:string,a:Point,b:Point,source:CardRect,target:CardRect,obstacles:CardRect[],active:boolean):Point[]{
 let path:Point[];
 if(active){
  const padded=(r:CardRect)=>({x1:r.x1-8,y1:r.y1-8,x2:r.x2+8,y2:r.y2+8});
  const barriers=[...obstacles,padded(source),padded(target)];
  const ports=(centre:Point,towards:Point,r:CardRect)=>{
   const direct=cardPort(centre,towards,r),candidates=[direct,{x:r.x1,y:centre.y},{x:r.x2,y:centre.y},{x:centre.x,y:r.y1},{x:centre.x,y:r.y2}];
   return candidates.map((p,i)=>{const sides=[{distance:Math.abs(p.x-r.x1),dx:-1,dy:0},{distance:Math.abs(p.x-r.x2),dx:1,dy:0},{distance:Math.abs(p.y-r.y1),dx:0,dy:-1},{distance:Math.abs(p.y-r.y2),dx:0,dy:1}],side=sides.sort((a,b)=>a.distance-b.distance)[0];return {p,out:{x:p.x+side.dx*8.1,y:p.y+side.dy*8.1},penalty:i?10:0}}).filter(port=>!obstacles.some(r=>inside(port.p,r)||inside(port.out,r)||crossesCard(port.p,port.out,r)));
  };
  const pairs=ports(a,b,source).flatMap(s=>ports(b,a,target).map(t=>({s,t,cost:Math.hypot(s.out.x-t.out.x,s.out.y-t.out.y)+s.penalty+t.penalty}))).sort((a,b)=>a.cost-b.cost);
  for(const {s,t} of pairs){
   // Extra corner waypoints permit rounded detours without closing narrow usable corridors.
   for(const clearance of [12,0]){
    const route=avoidCards(s.out,t.out,barriers,clearance);
    if(route.slice(1).some((p,i)=>barriers.some(r=>crossesCard(route[i],p,r))))continue;
    return roundedPath([s.p,...route,t.p],barriers);
   }
  }
  // Fully overlapping silhouettes can have no exposed port. Keep endpoints attached and inspectable.
  path=roundedPath(avoidCards(a,b,obstacles,12),obstacles);
 }else{
  const d=Math.hypot(b.x-a.x,b.y-a.y)||1,sign=[...id].reduce((s,c)=>s+c.charCodeAt(0),0)%2?1:-1,bend=Math.min(18,d*.07)*sign;
  const c={x:(a.x+b.x)/2-(b.y-a.y)/d*bend,y:(a.y+b.y)/2+(b.x-a.x)/d*bend};
  path=Array.from({length:13},(_,i)=>{const t=i/12;return {x:(1-t)**2*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*c.y+t*t*b.y}});
 }
 // Curves are sampled densely; find a direction outside each endpoint card before clipping.
 const outside=(p:Point,r:CardRect)=>p.x<r.x1||p.x>r.x2||p.y<r.y1||p.y>r.y2;
 const first=path.findIndex(p=>outside(p,source));let last=path.length-1;while(last>0&&!outside(path[last],target))last--;
 if(first<0||last<first)return [cardPort(a,b,source),cardPort(b,a,target)];
 return [cardPort(a,path[first],source),...path.slice(first,last+1),cardPort(b,path[last],target)];
}

export function segmentCoordinates(path:Point[]){
 const source=path[0],target=path[path.length-1],dx=target.x-source.x,dy=target.y-source.y,squared=dx*dx+dy*dy,length=Math.sqrt(squared);
 return {weights:path.slice(1,-1).map(p=>((p.x-source.x)*dx+(p.y-source.y)*dy)/(squared||1)),distances:path.slice(1,-1).map(p=>(dx*(p.y-source.y)-dy*(p.x-source.x))/(length||1))};
}

export function routeActiveConnections(graph:Core){
 graph.edges('.routed').removeClass('routed');
 const cards=graph.nodes().filter(n=>!n.isParent()&&n.data('kind')!=='research').map(n=>{const r=n.boundingBox({includeLabels:true,includeOverlays:false});return {id:n.id(),rect:{x1:r.x1-16,y1:r.y1-16,x2:r.x2+16,y2:r.y2+16}}});
 graph.batch(()=>graph.edges('.active').forEach(edge=>{
  const a=edge.source(),b=edge.target();if(a.id()===b.id())return;
  const obstacles=cards.filter(c=>c.id!==a.id()&&c.id!==b.id()).map(c=>c.rect);
  const path=avoidCards(a.position(),b.position(),obstacles);if(path.length<=2)return;
  const controls=segmentCoordinates(path);edge.data({routeWeights:controls.weights,routeDistances:controls.distances});edge.addClass('routed');
 }));
}
