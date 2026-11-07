import {InstancedBufferAttribute,Vector3} from 'three';
import type {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';

/** Public-API replacement avoids Three's cached capacity when an instanced line grows. */
export function setConnectionPath(line:Line2,points:Vector3[],fractions:number[],behind:[number,number]){
 if(points.length<2||points.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))return false;
 const old=line.geometry,count=points.length-1,geometry=old.attributes.instanceStart?.count===count?old:new LineGeometry();
 geometry.setPositions(points.flatMap(p=>[p.x,p.y,p.z]));
 const depths=fractions.map(t=>behind[0]+(behind[1]-behind[0])*t);
 geometry.setAttribute('instanceBehindStart',new InstancedBufferAttribute(new Float32Array(depths.slice(0,-1)),1));
 geometry.setAttribute('instanceBehindEnd',new InstancedBufferAttribute(new Float32Array(depths.slice(1)),1));
 line.geometry=geometry;line.computeLineDistances();line.visible=true;
 if(old!==geometry)old.dispose();return true;
}
