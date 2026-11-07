import {Vector3,type PerspectiveCamera} from 'three';
import type {CameraPose,DisplayMode,Point,Vec3} from './types.ts';
import type {Scene} from './scene.ts';
export type ScreenRect={x1:number;y1:number;x2:number;y2:number};
export type CameraFrame=CameraPose&{sceneKey:string;mode:DisplayMode};
/** Ignore a late frame from the other display mode or a superseded exploration. */
export function cameraPoseForScene(frame:CameraFrame|undefined,scene:{key:string;mode:DisplayMode}):CameraPose|undefined{
 if(!frame||frame.sceneKey!==scene.key||frame.mode!==scene.mode)return;
 const {sceneKey,mode,...pose}=frame;return pose;
}
/** Centre the card in the largest usable rectangle, including a moved/resized inspector. */
export function focusScreenPoint(width:number,height:number,obstacles:ScreenRect[]=[],card={width:0,height:0}):Point{
 const mx=Math.min(width/3,card.width/2+20),my=Math.min(height/3,card.height/2+20);
 const bounds={x1:mx,y1:my,x2:width-mx,y2:height-my};let free=[bounds];
 for(const obstacle of obstacles){
  const o={x1:obstacle.x1-card.width/2-12,y1:obstacle.y1-card.height/2-12,x2:obstacle.x2+card.width/2+12,y2:obstacle.y2+card.height/2+12};
  free=free.flatMap(r=>{
   if(o.x2<=r.x1||o.x1>=r.x2||o.y2<=r.y1||o.y1>=r.y2)return [r];
   return [{...r,x2:Math.min(r.x2,o.x1)},{...r,x1:Math.max(r.x1,o.x2)},{...r,y2:Math.min(r.y2,o.y1)},{...r,y1:Math.max(r.y1,o.y2)}].filter(p=>p.x2>p.x1&&p.y2>p.y1);
  });
  free=free.filter((r,i)=>!free.some((p,j)=>j!==i&&p.x1<=r.x1&&p.x2>=r.x2&&p.y1<=r.y1&&p.y2>=r.y2&&(j<i||p.x1<r.x1||p.x2>r.x2||p.y1<r.y1||p.y2>r.y2)));
 }
 const area=(r:ScreenRect)=>(r.x2-r.x1)*(r.y2-r.y1),distance=(r:ScreenRect)=>Math.hypot((r.x1+r.x2-width)/2,(r.y1+r.y2-height)/2);
 const rect=free.sort((a,b)=>area(b)-area(a)||distance(a)-distance(b))[0]||bounds;
 return {x:(rect.x1+rect.x2)/2,y:(rect.y1+rect.y2)/2};
}
/** Translate eye and target together in the screen plane: no rotation, zoom or home changes. */
export function focusCameraPan(camera:PerspectiveCamera,target:Vec3,point:Vec3,screen:Point,size:{width:number;height:number}){
 camera.updateMatrixWorld();const node=new Vector3().copy(point),projected=node.clone().project(camera);
 if(!Number.isFinite(projected.z)||node.clone().applyMatrix4(camera.matrixWorldInverse).z>=-camera.near)return null;
 const desired=new Vector3(screen.x/size.width*2-1,1-screen.y/size.height*2,projected.z).unproject(camera),delta=node.sub(desired);
 return {position:camera.position.clone().add(delta),target:new Vector3().copy(target).add(delta)};
}
/** User selection/expansion requests centring; restoration, themes and modes retain their pose. */
export function focusAfterTransition(previous:Scene|undefined,scene:Scene,restoring=false):string|null{
 if(!previous||restoring||previous.mode!==scene.mode)return null;
 const old=new Map(previous.cards.map(c=>[c.id,c]));
 const expanded=scene.cards.find(c=>c.record.branchExpanded&&!old.get(c.id)?.record.branchExpanded)||scene.cards.find(c=>c.record.kind==='group'&&c.record.expanded&&old.has(c.id)&&!old.get(c.id)?.record.expanded);
 return expanded?.id||(scene.focused&&(scene.focused!==previous.focused||scene.context.centreSession!==previous.context.centreSession)?scene.focused:null);
}
