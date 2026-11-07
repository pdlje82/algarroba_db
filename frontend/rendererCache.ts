import type {Object3D} from 'three';
export type RenderEntry={key:string;object:Object3D;data?:any};
/** ForceGraph binds records by identity: keep both its disposable record and root object stable. */
export function reuseRenderObject(cache:Map<string,RenderEntry>,id:string,key:string,create:()=>Object3D,retired:Object3D[]){
 const old=cache.get(id);if(old?.key===key)return old.object;const fresh=create();let object=fresh;
 if(old){object=old.object;for(const child of [...object.children]){object.remove(child);retired.push(child)}for(const child of [...fresh.children])object.add(child);Object.assign(object.userData,fresh.userData)}
 cache.set(id,{key,object,data:old?.data});return object;
}
export function bindRenderRecord<T>(cache:Map<string,RenderEntry>,id:string,value:T):T{const entry=cache.get(id)!;entry.data??={};Object.assign(entry.data,value);return entry.data as T}
