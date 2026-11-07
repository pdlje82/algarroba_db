import type {State,SceneContext} from './types.ts';
/** Deduplicate immutable layout caches in browser history; keep complete reversible snapshots. */
export function encodeHistory(entries:State[],index:number){
 const pool:unknown[]=[],keys=new Map<string,number>();
 const intern=(value:unknown)=>{const json=JSON.stringify(value);let id=keys.get(json);if(id===undefined){id=pool.length;keys.set(json,id);pool.push(value)}return id};
 const packFields=(object:any,fields:string[])=>{const next={...object},refs:Record<string,number>={};for(const field of fields)if(next[field]!==undefined){refs[field]=intern(next[field]);delete next[field]}return {...next,poolFields:refs}};
 const packed=entries.map(s=>({...s,layerView:s.layerView?{...packFields(s.layerView,['hosts']),layers:Object.fromEntries(Object.entries(s.layerView.layers).map(([key,layer])=>[key,intern(packFields(layer,['scope','slots','offsets','arrangements']))]))}:undefined,positionsRef:intern(s.positions),positions:undefined,scene:s.scene?{...s.scene,contexts:Object.fromEntries(Object.entries(s.scene.contexts).map(([key,value])=>[key,intern(packFields(value,['homes','flat','owners','planes','routes','layers','references','laidOut']))]))}:undefined}));
 return JSON.stringify({format:5,index,entries:packed,pool});
}
export function decodeHistory(raw:string|null):{entries:State[];index:number}|null{
 if(!raw)return null;const value=JSON.parse(raw);if(value.format!==3&&value.format!==4&&value.format!==5)return value;
 const unpack=(object:any)=>{if(!object?.poolFields)return object;const next={...object};for(const [key,id] of Object.entries(object.poolFields))next[key]=value.pool[id as number];delete next.poolFields;return next};
 return {index:value.index,entries:value.entries.map((s:any)=>{const result={...s,layerView:s.layerView?{...unpack(s.layerView),layers:Object.fromEntries(Object.entries(s.layerView.layers).map(([key,layer])=>[key,unpack(typeof layer==='number'?value.pool[layer]:layer)]))}:undefined,positions:value.pool[s.positionsRef]||{},scene:s.scene?{...s.scene,contexts:Object.fromEntries(Object.entries(s.scene.contexts).map(([key,id])=>[key,unpack(value.pool[id as number]) as SceneContext]))}:undefined};delete result.positionsRef;if(!s.layerView)delete result.layerView;return result})};
}

type BrowserSession={savedAt:number;state:State;history:string};
let sessionDatabase:Promise<IDBDatabase>|undefined;
function database(){return sessionDatabase??=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('kgb-exploration',1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function saveBrowserSession(key:string,state:State,entries:State[],index:number){
 const value:BrowserSession={savedAt:Date.now(),state,history:encodeHistory(entries,index)};let local=false;
 try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+':history',value.history);localStorage.setItem(key+':saved-at',String(value.savedAt));local=true}catch{}
 try{const db=await database();await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('sessions','readwrite');transaction.objectStore('sessions').put(value,key);transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error)})}catch{if(!local)throw new Error('Browser storage could not save this session. Use Save view to keep it in the local application.')}
}
export async function restoreBrowserSession(key:string):Promise<BrowserSession|null>{try{const db=await database(),value=await new Promise<BrowserSession|undefined>((resolve,reject)=>{const request=db.transaction('sessions').objectStore('sessions').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});return value&&value.savedAt>Number(localStorage.getItem(key+':saved-at')||0)?value:null}catch{return null}}
