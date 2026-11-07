import {Vector3,Ray,Plane,type Object3D,type PerspectiveCamera} from 'three';
import type {Point} from './types.ts';
export function cardCorners(object:Object3D,width:number,height:number){object.updateWorldMatrix(true,false);return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>new Vector3(x*width/2,y*height/2,0).applyMatrix4(object.matrixWorld))}
export function screenPoint(point:Vector3,camera:PerspectiveCamera,size:{width:number;height:number}):Point{const p=point.clone().project(camera);return {x:(p.x+1)*size.width/2,y:(1-p.y)*size.height/2}}
export function projectCard(object:Object3D,width:number,height:number,camera:PerspectiveCamera,size:{width:number;height:number}){
 const corners=cardCorners(object,width,height),polygon=corners.map(p=>screenPoint(p,camera,size)),centre=object.getWorldPosition(new Vector3()),point=screenPoint(centre,camera,size),distance=-centre.clone().applyMatrix4(camera.matrixWorldInverse).z;
 const rect={x1:Math.min(...polygon.map(p=>p.x)),x2:Math.max(...polygon.map(p=>p.x)),y1:Math.min(...polygon.map(p=>p.y)),y2:Math.max(...polygon.map(p=>p.y))};return {...point,polygon,rect,distance,z:centre.z};
}
export function screenPointAtZ(point:Point,z:number,camera:PerspectiveCamera,size:{width:number;height:number}){
 const direction=new Vector3(point.x/size.width*2-1,1-point.y/size.height*2,.5).unproject(camera).sub(camera.position).normalize();return new Ray(camera.position,direction).intersectPlane(new Plane(new Vector3(0,0,1),-z),new Vector3());
}
