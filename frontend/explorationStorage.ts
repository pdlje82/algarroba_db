import type {State,SceneContext} from './types.ts';
/** Deduplicate immutable layout caches in browser history; keep complete reversible snapshots. */
export function encodeHistory(entries:State[],index:number){
 const pool:unknown[]=[],keys=new Map<string,number>();
 const intern=(value:unknown)=>{const json=JSON.stringify(value);let id=keys.get(json);if(id===undefined){id=pool.length;keys.set(json,id);pool.push(value)}return id};
 const packed=entries.map(s=>({...s,positionsRef:intern(s.positions),positions:undefined,scene:s.scene?{...s.scene,contexts:Object.fromEntries(Object.entries(s.scene.contexts).map(([key,value])=>[key,intern(value)]))}:undefined}));
 return JSON.stringify({format:4,index,entries:packed,pool});
}
export function decodeHistory(raw:string|null):{entries:State[];index:number}|null{
 if(!raw)return null;const value=JSON.parse(raw);if(value.format!==3&&value.format!==4)return value;
 return {index:value.index,entries:value.entries.map((s:any)=>{const result={...s,positions:value.pool[s.positionsRef]||{},scene:s.scene?{...s.scene,contexts:Object.fromEntries(Object.entries(s.scene.contexts).map(([key,id])=>[key,value.pool[id as number] as SceneContext]))}:undefined};delete result.positionsRef;return result})};
}
