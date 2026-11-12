import type { Point } from './types.ts';
import type { SceneCard, SceneLink } from './scene.ts';
import {orderFundingNumbers} from './organization.ts';

export type ConnectionLabel = {
  position: Point;
  width: number;
  height: number;
  lines: string[];
  anchor?: Point;
};
type Box = Point & { width: number; height: number };
export const CIRCLE_CLEARANCE = 14;

export function boxesOverlap(a: Box, b: Box, gap = CIRCLE_CLEARANCE) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap;
}

/** Explicit lines let layout and rendering reserve exactly the same opaque surface. */
export function connectionLabel(text: string): Omit<ConnectionLabel, 'position'> {
  const words = text.trim().split(/\s+/).flatMap(word=>word.match(/.{1,28}/gu)||[]);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > 28) {
      lines.push(line);
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  if (!lines.length) throw new Error('A connection label is missing. Refresh the knowledge data.');
  return {
    lines,
    width: Math.max(120, Math.min(300, Math.max(...lines.map(l => l.length)) * 10.2 + 24)),
    height: lines.length * 24 + 14,
  };
}

export function cardPort(card: Pick<SceneCard, 'width' | 'height'>, at: Point, toward: Point): Point {
  const dx = toward.x - at.x, dy = toward.y - at.y;
  if (Math.abs(dx) + Math.abs(dy) < 0.001) throw new Error('Connection endpoints occupy the same position.');
  const t = Math.min(card.width / 2 / Math.max(0.0001, Math.abs(dx)), card.height / 2 / Math.max(0.0001, Math.abs(dy)));
  return { x: at.x + dx * t, y: at.y + dy * t };
}

function placeLabels(cards: SceneCard[], links: SceneLink[], positions: Record<string, Point>, centre: string) {
  const byId = new Map(cards.map(card => [card.id, card]));
  const shapes = new Map(links.map(link => [link.id, connectionLabel(link.record.label)]));
  const obstacles: Box[] = cards.map(card => ({ ...positions[card.id], width: card.width, height: card.height }));
  const labels: Record<string, ConnectionLabel> = {};
  const order = [...links].sort((a, b) => {
    const primary = (e: SceneLink) => e.source === centre || e.target === centre;
    const area = (e: SceneLink) => shapes.get(e.id)!.width * shapes.get(e.id)!.height;
    // Reserve the harder, larger labels first; short labels can use the gaps.
    return Number(primary(b)) - Number(primary(a)) || area(b) - area(a) || a.id.localeCompare(b.id);
  });
  for (const link of order) {
    const a = byId.get(link.source), b = byId.get(link.target);
    if (!a || !b) throw new Error('A displayed connection endpoint is missing.');
    const start = cardPort(a, positions[a.id], positions[b.id]);
    const end = cardPort(b, positions[b.id], positions[a.id]);
    const shape = shapes.get(link.id)!;
    let placed: ConnectionLabel | undefined;
    // Central spokes stay on their actual lines. Parallel or secondary relationships
    // may use an explicit leader, never over a card or another label.
    const primary = link.source === centre || link.target === centre;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const parallel=links.some(other=>other.id!==link.id&&((other.source===link.source&&other.target===link.target)||(other.source===link.target&&other.target===link.source)));
    const step=Math.min((shape.width+16)/Math.max(0.0001,Math.abs(end.y-start.y)/distance),(shape.height+16)/Math.max(0.0001,Math.abs(end.x-start.x)/distance));
    const offsets = primary && !parallel ? [0] : [0,step,-step,step*2,-step*2,step*3,-step*3];
    for (const offset of offsets) {
      for (const t of [.5,.65,.35,.8,.2,.575,.425,.725,.275,.875,.125]) {
        const anchor = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
        const position = { x: anchor.x - (end.y - start.y) / distance * offset, y: anchor.y + (end.x - start.x) / distance * offset };
        const box = { ...position, width: shape.width, height: shape.height };
        if (!obstacles.some(other => boxesOverlap(box, other))) {
          placed = { ...shape, position, ...(offset ? { anchor } : {}) };
          obstacles.push(box);
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) return null;
    labels[link.id] = placed;
  }
  return labels;
}

function arcAngles(count:number){
  const above=Math.floor(count/2),below=count-above;
  return Array.from({length:count},(_,i)=>i<above ? -Math.PI+(i+0.5)*Math.PI/above : (i-above+0.5)*Math.PI/below);
}

/** A staged domain preview keeps the already displayed arcs, even during resize. */
export function retainedRelationshipArc(cards:SceneCard[],links:SceneLink[],centre:string,positions:Record<string,Point>){
  if(!positions[centre]||Math.hypot(positions[centre].x,positions[centre].y)>0.01)return null;
  const neighbours=orderFundingNumbers(cards.filter(c=>c.id!==centre).sort((a,b)=>a.record.label.localeCompare(b.record.label)||a.id.localeCompare(b.id)),c=>c.record.label,c=>c.record.domain==='funding');
  const angles=arcAngles(neighbours.length);
  let rx:number|undefined,ry:number|undefined;
  for(let i=0;i<neighbours.length;i++){
    const p=positions[neighbours[i].id];if(!p)return null;
    if(Math.abs(Math.cos(angles[i]))>0.1&&rx===undefined)rx=p.x/Math.cos(angles[i]);
    if(Math.abs(Math.sin(angles[i]))>0.1&&ry===undefined)ry=p.y/Math.sin(angles[i]);
  }
  if((rx!==undefined&&rx<=0)||(ry!==undefined&&ry<=0))return null;
  if(neighbours.some((c,i)=>Math.abs(positions[c.id].x-(rx===undefined?0:rx*Math.cos(angles[i])))>0.01||Math.abs(positions[c.id].y-(ry===undefined?0:ry*Math.sin(angles[i])))>0.01))return null;
  const boxes=cards.map(c=>({...positions[c.id],width:c.width,height:c.height}));
  if(boxes.some((a,i)=>boxes.slice(i+1).some(b=>boxesOverlap(a,b))))return null;
  const labels=placeLabels(cards,links,positions,centre);
  return labels?{positions,labels}:null;
}

/** Upper/lower ellipse arcs follow the graph window; cards and labels keep their sizes. */
export function relationshipCircle(cards: SceneCard[], links: SceneLink[], centre: string, aspect=1) {
  if(!Number.isFinite(aspect)||aspect<=0)throw new Error('The graph window dimensions are unavailable.');
  if (!cards.some(card => card.id === centre)) throw new Error('The exploration centre is missing.');
  const neighbours = orderFundingNumbers(cards.filter(card => card.id !== centre).sort((a,b) => a.record.label.localeCompare(b.record.label) || a.id.localeCompare(b.id)),c=>c.record.label,c=>c.record.domain==='funding');
  if (!neighbours.length) return { positions: { [centre]: { x: 0, y: 0 } }, labels: {} as Record<string, ConnectionLabel> };
  const angles=arcAngles(neighbours.length);
  // Match the actual window ratio instead of capping it to a nearly circular
  // footprint. Grow the ellipse until every card and connection label fits.
  const contentAspect = aspect;
  const extentX=Math.max(...angles.map(a=>Math.abs(Math.cos(a))));
  const extentY=Math.max(...angles.map(a=>Math.abs(Math.sin(a))));
  const paddingX=Math.max(...cards.map(c=>c.width))/2+25,paddingY=Math.max(...cards.map(c=>c.height))/2+25;
  for (let radius = 260; radius <= 12000; radius += 12) {
    const rx=neighbours.length<3 ? radius*Math.sqrt(contentAspect) : radius;
    const ry=neighbours.length<3 ? radius/Math.sqrt(contentAspect) : ((rx*extentX+paddingX)/contentAspect-paddingY)/extentY;
    if(ry<=0)continue;
    const positions: Record<string, Point> = { [centre]: { x: 0, y: 0 } };
    neighbours.forEach((card,i) => {
      positions[card.id] = { x: Math.cos(angles[i]) * rx, y: Math.sin(angles[i]) * ry };
    });
    const boxes = cards.map(card => ({ ...positions[card.id], width: card.width, height: card.height }));
    if (boxes.some((a,i) => boxes.slice(i+1).some(b => boxesOverlap(a,b)))) continue;
    const labels = placeLabels(cards,links,positions,centre);
    if (labels) return { positions, labels };
  }
  throw new Error('This relationship circle is too dense to label clearly. Group or filter the topics, then retry.');
}

export function samePositions(cards: SceneCard[], saved: Record<string, Point>, expected: Record<string, Point>) {
  return cards.every(card => saved[card.id] && Math.abs(saved[card.id].x - expected[card.id].x) < 0.01 && Math.abs(saved[card.id].y - expected[card.id].y) < 0.01);
}
