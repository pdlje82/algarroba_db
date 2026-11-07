import type {Point} from './types.ts';
export type Polygon=Point[];
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
export function polygonArea(poly:Polygon){return poly.reduce((sum,p,i)=>sum+cross(p,poly[(i+1)%poly.length]),0)/2}
export function inPolygon(point:Point,poly:Polygon,strict=false){const sign=Math.sign(polygonArea(poly));return poly.every((p,i)=>sign*cross(sub(poly[(i+1)%poly.length],p),sub(point,p))>(strict?1e-5:-1e-5))}
export function crossesPolygon(a:Point,b:Point,poly:Polygon){
 const sign=Math.sign(polygonArea(poly));let lo=0,hi=1;
 for(let i=0;i<poly.length;i++){const p=poly[i],edge=sub(poly[(i+1)%poly.length],p),start=sign*cross(edge,sub(a,p)),delta=sign*cross(edge,sub(b,a));if(Math.abs(delta)<1e-10){if(start<=1e-5)return false;continue}const t=(1e-5-start)/delta;if(delta>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>=hi)return false}return lo<1&&hi>0;
}
export function padPolygon(poly:Polygon,padding:number):Polygon{
 const sign=Math.sign(polygonArea(poly));const edges=poly.map((p,i)=>{const d=sub(poly[(i+1)%poly.length],p),length=Math.hypot(d.x,d.y)||1;return {p:{x:p.x+sign*d.y/length*padding,y:p.y-sign*d.x/length*padding},d}});
 return edges.map((edge,i)=>{const previous=edges[(i+edges.length-1)%edges.length],den=cross(previous.d,edge.d);if(Math.abs(den)<1e-8)return edge.p;const t=cross(sub(edge.p,previous.p),edge.d)/den;return {x:previous.p.x+previous.d.x*t,y:previous.p.y+previous.d.y*t}});
}
export function polygonPort(centre:Point,towards:Point,poly:Polygon):Point{
 const d=sub(towards,centre);let best=Infinity;for(let i=0;i<poly.length;i++){const p=poly[i],edge=sub(poly[(i+1)%poly.length],p),den=cross(d,edge);if(Math.abs(den)<1e-10)continue;const t=cross(sub(p,centre),edge)/den,u=cross(sub(p,centre),d)/den;if(t>=0&&u>=-1e-6&&u<=1+1e-6)best=Math.min(best,t)}return Number.isFinite(best)?{x:centre.x+d.x*best,y:centre.y+d.y*best}:centre;
}
function detour(a:Point,b:Point,obstacles:Polygon[],clearance:number):Point[]{
 if(!obstacles.some(p=>crossesPolygon(a,b,p)))return [a,b];
 const points=[a,b,...obstacles.flatMap(p=>padPolygon(p,clearance)).filter(p=>!obstacles.some(o=>inPolygon(p,o,true)))],distance=points.map(()=>Infinity),parent=points.map(()=>-1),done=new Set<number>();distance[0]=0;
 for(let step=0;step<points.length;step++){let at=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(at<0||distance[i]<distance[at]))at=i;if(at<0||!Number.isFinite(distance[at]))break;if(at===1){const path:Point[]=[];for(let i=1;i>=0;i=parent[i])path.unshift(points[i]);return path}done.add(at);for(let j=0;j<points.length;j++){const cost=distance[at]+Math.hypot(points[j].x-points[at].x,points[j].y-points[at].y)+8;if(done.has(j)||cost>=distance[j]||obstacles.some(o=>crossesPolygon(points[at],points[j],o)))continue;distance[j]=cost;parent[j]=at}}
 return [a,b];
}
function round(path:Point[],obstacles:Polygon[]){const result=[path[0]];for(let i=1;i<path.length-1;i++){const a=path[i-1],b=path[i],c=path[i+1],ab=Math.hypot(a.x-b.x,a.y-b.y),bc=Math.hypot(c.x-b.x,c.y-b.y);let corner=[b];for(let r=Math.min(10,ab/3,bc/3);r>=.5;r/=2){const p={x:b.x+(a.x-b.x)*r/ab,y:b.y+(a.y-b.y)*r/ab},q={x:b.x+(c.x-b.x)*r/bc,y:b.y+(c.y-b.y)*r/bc},sample=Array.from({length:7},(_,j)=>{const t=j/6;return {x:(1-t)**2*p.x+2*(1-t)*t*b.x+t*t*q.x,y:(1-t)**2*p.y+2*(1-t)*t*b.y+t*t*q.y}});if(!sample.slice(1).some((p,j)=>obstacles.some(o=>crossesPolygon(sample[j],p,o)))){corner=sample;break}}result.push(...corner)}return [...result,path.at(-1)!]}
export function polygonConnectionPath(id:string,a:Point,b:Point,source:Polygon,target:Polygon,obstacles:Polygon[],active:boolean){
 if(!active){const d=Math.hypot(b.x-a.x,b.y-a.y)||1,sign=[...id].reduce((s,c)=>s+c.charCodeAt(0),0)%2?1:-1,k=Math.min(18,d*.07)*sign,c={x:(a.x+b.x)/2-(b.y-a.y)/d*k,y:(a.y+b.y)/2+(b.x-a.x)/d*k};const raw=Array.from({length:25},(_,i)=>{const t=i/24;return {x:(1-t)**2*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*c.y+t*t*b.y}});let first=raw.findIndex(p=>!inPolygon(p,source)),last=raw.length-1;while(last>0&&inPolygon(raw[last],target))last--;if(first<0||last<first)return [polygonPort(a,b,source),polygonPort(b,a,target)];return [polygonPort(a,raw[first],source),...raw.slice(first,last+1),polygonPort(b,raw[last],target)]}
 const barrier=[...obstacles,padPolygon(source,8),padPolygon(target,8)];
 const ports=(centre:Point,towards:Point,poly:Polygon)=>{
  const candidates=[polygonPort(centre,towards,poly),...poly.map((p,i)=>({x:(p.x+poly[(i+1)%poly.length].x)/2,y:(p.y+poly[(i+1)%poly.length].y)/2}))];
  return candidates.map((p,i)=>{const dx=p.x-centre.x,dy=p.y-centre.y,d=Math.hypot(dx,dy)||1;let out={x:p.x+dx/d*9,y:p.y+dy/d*9};const padded=padPolygon(poly,8.1);out=polygonPort(centre,out,padded);return {p,out,penalty:i?10:0}}).filter(p=>!obstacles.some(o=>inPolygon(p.p,o,true)||inPolygon(p.out,o,true)||crossesPolygon(p.p,p.out,o)));
 };
 const pairs=ports(a,b,source).flatMap(s=>ports(b,a,target).map(t=>({s,t,cost:Math.hypot(s.out.x-t.out.x,s.out.y-t.out.y)+s.penalty+t.penalty}))).sort((a,b)=>a.cost-b.cost);
 for(const {s,t} of pairs)for(const clearance of [12,0]){const path=detour(s.out,t.out,barrier,clearance);if(!path.slice(1).some((p,i)=>barrier.some(o=>crossesPolygon(path[i],p,o))))return round([s.p,...path,t.p],barrier)}
 return [polygonPort(a,b,source),polygonPort(b,a,target)];
}
