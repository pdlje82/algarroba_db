import type {Point} from './types.ts';

export const CARD_GAP=24;
const WIDTH=214,HEIGHT=118;
export function compactGrid(count:number,aspect:number,width=WIDTH,height=HEIGHT){
 const target=Math.max(.5,Math.min(3.5,aspect));let best={columns:1,rows:Math.max(1,count),score:Infinity};
 for(let columns=1;columns<=Math.max(1,count);columns++){
  const rows=Math.ceil(Math.max(1,count)/columns),w=columns*width+(columns-1)*CARD_GAP+64,h=rows*height+(rows-1)*CARD_GAP+132,shape=w/h/target,score=w*h*Math.sqrt(Math.max(shape,1/shape));
  if(score<best.score)best={columns,rows,score};
 }
 return {columns:best.columns,rows:best.rows,points:Array.from({length:count},(_,i)=>{const row=Math.floor(i/best.columns),members=Math.min(best.columns,count-row*best.columns);return {x:(i%best.columns-(members-1)/2)*(width+CARD_GAP),y:(row-(best.rows-1)/2)*(height+CARD_GAP)}})};
}
const clear=(points:Point[])=>{for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(Math.abs(points[i].x-points[j].x)<WIDTH+CARD_GAP&&Math.abs(points[i].y-points[j].y)<HEIGHT+CARD_GAP)return false;return true};
/** Complete rings with enough clearance for rectangular cards; never scatter collisions into a grid. */
export function compactRings(count:number,aspect:number):Point[]{
 if(count<=1)return count?[{x:0,y:0}]:[];
 const ratio=Math.max(.8,Math.min(2.4,aspect));let best:Point[]=[],area=Infinity;
 for(let rings=1;rings<=Math.ceil(Math.sqrt(count/9));rings++){
  const total=rings*(rings+1)/2,counts=Array.from({length:rings},(_,i)=>Math.max(1,Math.floor(count*(i+1)/total)));for(let remaining=count-counts.reduce((a,b)=>a+b,0),i=rings-1;remaining>0;remaining--,i=(i+rings-1)%rings)counts[i]++;
  let points:Point[]=[];
  for(const n of counts){let rx=Math.max(120,n*(WIDTH+CARD_GAP)/(2*Math.PI)),ry=Math.max(80,rx/ratio),ring:Point[]=[];
   for(let step=0;step<240;step++){ring=Array.from({length:n},(_,i)=>({x:Math.cos(i/n*2*Math.PI-Math.PI/2)*rx,y:Math.sin(i/n*2*Math.PI-Math.PI/2)*ry}));if(clear([...points,...ring]))break;rx*=1.035;ry*=1.035;if(step===239)throw new Error('The connected topics could not be packed with readable spacing. Your previous view is preserved.')}
   points.push(...ring);
  }
  const w=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))+WIDTH+64,h=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))+HEIGHT+132;
  if(w*h<area){area=w*h;best=points}
 }
 return best;
}
