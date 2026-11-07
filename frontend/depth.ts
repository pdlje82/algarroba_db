import type {Vec3} from './types.ts';
export const PLANE_GAP=520,FOCUS_OFFSET=120;
/** Logical homes stay stable; the foremost opened plane is always the reading plane Z=0. */
export const depthOrigin=(scene:{mode:string;level:number})=>scene.mode==='layered'?scene.level*PLANE_GAP:0;
export function displayPosition(scene:{mode:string;level:number},point:Vec3):Vec3{return {...point,z:point.z-depthOrigin(scene)}}
