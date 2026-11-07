import React,{forwardRef,useEffect,useImperativeHandle,useMemo,useRef,useState} from 'react';
import ForceGraph3D,{type ForceGraphMethods} from 'react-force-graph-3d';
import * as THREE from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {palettes,type Theme} from './appearance';
import {pathFractions,pathMidpoint,type CardRect} from './routing';
import {polygonConnectionPath,padPolygon,inPolygon,type Polygon} from './polygonRouting';
import {projectCard,cardCorners,screenPointAtZ} from './cardGeometry';
import {setConnectionPath} from './connectionGeometry';
import {LayerHover} from './layerHover';
import type {SceneMemory,Vec3} from './types';
import {PLANE_GAP,type Scene,type SceneCard} from './scene';
import {depthOrigin} from './depth';
import {focusAfterTransition,focusCameraPan,focusScreenPoint,type CameraFrame} from './cameraFocus';
import {layerBorderAt,layerLabel,sceneLayers} from './layers';
import {FrostedGraphPass,type BokehFrame,type BokehItem} from './bokeh';
import {effectsEnabled,type BackgroundEffects} from './backgroundEffects';
export type SceneHandle={pose:()=>CameraFrame|undefined;fit:()=>void;reset:()=>void;zoom:(factor:number)=>void;turn:(side:number,tilt:number)=>void;reveal:(id:string)=>void};
type Props={scene:Scene;theme:Theme;effects:BackgroundEffects;selected:string|null;additions:string[];panel:boolean;restoreToken:number;collapse?:SceneMemory['collapse'];onCard:(record:any)=>void;onGroup:(id:string)=>void;onReopen:(level:number)=>void;onLink:(record:any)=>void;onClear:()=>void;onReturn:(id:string)=>void;onLayer:(level:number)=>void;onBroaden:()=>void;onPose:(pose:CameraFrame)=>void;onError:(text:string)=>void};
type LayerSurface={level:number;group:THREE.Group;surface:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;border:THREE.Line<THREE.BufferGeometry,THREE.LineBasicMaterial>;normal:THREE.Color;highlight:THREE.Color;corners:THREE.Vector3[]};
const world=(p:Vec3,origin=0)=>new THREE.Vector3(p.x,-p.y,p.z-origin);
const plain=(p:THREE.Vector3):Vec3=>({x:p.x,y:p.y,z:p.z});
const rad=THREE.MathUtils.degToRad;
const nodeObject=(n:any)=>n.object,linkObject=(e:any)=>e.object,skipPosition=()=>true;
const ease=(t:number)=>1-Math.pow(1-t,3);
const ms=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:300;
function dispose(object:THREE.Object3D){object.traverse((obj:any)=>{obj.geometry?.dispose();for(const m of Array.isArray(obj.material)?obj.material:obj.material?[obj.material]:[]){m.map?.dispose();m.dispose()}})}
function wrap(ctx:CanvasRenderingContext2D,text:string,max:number,maxLines=3){const words=text.replaceAll('\n',' ').split(/\s+/),lines:string[]=[];let line='';for(const word of words){if(ctx.measureText(line+' '+word).width>max&&line){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);return lines.slice(0,maxLines).map((s,i)=>i===maxLines-1&&lines.length>maxLines?s.slice(0,-1)+'…':s)}
function cardMesh(card:SceneCard,theme:Theme,selected:boolean){
 const p=palettes[theme],canvas=document.createElement('canvas');canvas.width=640;canvas.height=card.internal||card.record.browse_group?360:card.record.kind==='group'?286:280;
 const ctx=canvas.getContext('2d')!,fill=card.record.viewCentre?p.centre:(p.fills as any)[card.record.domain]||p.fills.other;
 ctx.fillStyle=fill;ctx.strokeStyle=selected||card.record.newAddition?p.selected:p.border;ctx.lineWidth=selected||card.record.viewCentre||card.record.newAddition?8:3;if(card.record.kind==='research'||card.record.missing)ctx.setLineDash([12,8]);ctx.beginPath();ctx.roundRect(4,4,632,canvas.height-8,20);ctx.fill();ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=selected?p.selected:p.muted;ctx.font='500 30px Segoe UI, sans-serif';
 const kind=card.record.kind==='group'?(card.record.expanded?'OPEN · CLICK TO COLLAPSE':'OPEN TO EXPLORE'):card.record.kind==='more'?'REVEAL SIX MORE':card.record.kind==='research'?'MANUAL RESEARCH':card.record.kind==='lane'?'ARRANGEMENT':card.record.branchExpanded?'EXPANDED · CLICK TO COLLAPSE':card.record.poppedOut?'CLICK AGAIN TO FOLD BACK':String(card.record.kind||'TOPIC').replaceAll('_',' ').toUpperCase();
 ctx.fillText((card.record.newAddition?'NEW · ':'')+(card.record.viewCentre?'CENTRE · ':'')+kind,28,46);ctx.fillStyle=p.text;ctx.font='600 62px Segoe UI, sans-serif';
 const lines=wrap(ctx,card.record.label,580,3);lines.forEach((line,i)=>ctx.fillText(line,28,110+i*65));
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Mesh(new THREE.PlaneGeometry(card.width,card.height),new THREE.MeshBasicMaterial({map:texture,transparent:false,alphaTest:.5,depthTest:true,depthWrite:true,side:THREE.DoubleSide}));sprite.userData.cardSurface=true;sprite.renderOrder=10;const group=new THREE.Group();group.userData.cardId=card.id;group.renderOrder=20;group.add(sprite);if(card.internal){const badge=labelMesh(card.internal.record.label+' ↗',theme,card.width*.9);badge.scale.set(card.width*.9,card.height*(card.record.browse_group?.13:.18),1);badge.position.set(0,-card.height*(card.record.browse_group?.43:.36),2);badge.userData.internalId=card.internal.id;badge.renderOrder=21;group.add(badge)}if(card.record.browse_group){const g=card.record.browse_group,badge=labelMesh((g.expanded?'Collapse':'Open')+' group · '+g.label,theme,card.width*.9);badge.scale.set(card.width*.9,card.height*.13,1);badge.position.set(0,-card.height*.28,2);badge.userData.browseGroup=g.id;badge.renderOrder=22;group.add(badge)}return group;
}
function labelMesh(text:string,theme:Theme,width=150){const p=palettes[theme],canvas=document.createElement('canvas');canvas.width=512;canvas.height=82;const ctx=canvas.getContext('2d')!;ctx.fillStyle=p.label;ctx.fillRect(0,0,512,82);ctx.fillStyle=p.text;ctx.font='28px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillText(text.length>44?text.slice(0,42)+'…':text,256,51);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map,transparent:false,depthTest:false,depthWrite:false,alphaTest:.5,side:THREE.DoubleSide}));sprite.scale.set(width,24,1);sprite.userData.labelSurface=true;return sprite}
class GraphicsBoundary extends React.Component<{children:React.ReactNode;retry:()=>void;error:(message:string)=>void},{error:string}>{
 state={error:''};static getDerivedStateFromError(error:Error){return {error:error.message}}
 componentDidCatch(){this.props.error('3D graphics could not start. The exploration and HTML controls are preserved. Retry the graph or open this local app in a current browser with WebGL 2 enabled.')}
 render(){return this.state.error?<div className="graphics-failure" role="alert"><p>3D graphics are unavailable. Your exploration and details are preserved.</p><button onClick={this.props.retry}>Retry graph</button></div>:this.props.children}
}
export const SceneView=forwardRef<SceneHandle,Props>(function SceneView(props,ref){
 const host=useRef<HTMLDivElement>(null),graph=useRef<ForceGraphMethods<any,any>|undefined>(undefined),mini=useRef<HTMLCanvasElement>(null);
 const live=useRef(props);live.current=props;
 const currentOrigin=useRef(depthOrigin(props.scene)),previousScene=useRef<Scene|undefined>(undefined),ghostLayer=useRef<THREE.Group|null>(null);
 const layerSurfaces=useRef<LayerSurface[]>([]),hoveredLayerRef=useRef<number|null>(null),bokehPass=useRef<FrostedGraphPass|undefined>(undefined);const [hoveredLayer,setHoveredLayer]=useState<number|null>(null),[blurError,setBlurError]=useState('');
 const cameraContext=useRef<{sceneKey:string;mode:Scene['mode']}|undefined>(undefined);
 const readout=useRef<HTMLOutputElement>(null),cardRects=useRef<Polygon[]>([]);
 const [size,setSize]=useState({width:800,height:600}),[failure,setFailure]=useState(''),[retry,setRetry]=useState(0),[ready,setReady]=useState(false);
 const sizeRef=useRef(size);sizeRef.current=size;
 const program=useRef(false),frame=useRef(0),cameraFrame=useRef(0),reference=useRef(1),lastSize=useRef({width:0,height:0}),restored=useRef(''),decoration=useRef<THREE.Group|null>(null);
 const lastCollapse=useRef<string|undefined>(undefined),lastRestore=useRef(props.restoreToken),lastSignature=useRef(''),lastPositions=useRef<Record<string,THREE.Vector3>>({});
 const routeTimer=useRef<any>(null),poseTimer=useRef<any>(null),zoomTimer=useRef<any>(null),miniTransform=useRef({scale:1,ox:0,oy:0});
 const assets=useMemo(()=>{
  const objects:THREE.Object3D[]=[];
  const nodes=props.scene.cards.map(c=>{const fresh=props.additions.includes(c.id)||(c.record.member_ids||[]).some((id:string)=>props.additions.includes(id));const obj=cardMesh({...c,record:{...c.record,newAddition:fresh}},props.theme,c.id===props.selected);objects.push(obj);const p=world(c.position,depthOrigin(props.scene));obj.position.copy(p);return {...c,record:structuredClone(c.record),home:{...c.home},position:{...c.position},owners:[...c.owners],x:p.x,y:p.y,z:p.z,fx:p.x,fy:p.y,fz:p.z,object:obj}});
  const links=props.scene.links.map(e=>{
   const active=e.active,p=palettes[props.theme],faint=!!props.selected&&!active;
   const group=new THREE.Group();group.userData.edgeId=e.id;
   const dashed=['abbreviated','gap'].includes(e.record.record_type),dotted=e.record.basis==='curated';
   const alpha=active?1:faint?.17:e.record.record_type==='aggregate'?.4:.65,lineColor=new THREE.Color(active?p.active:p.edge).lerp(new THREE.Color(p.canvas),1-alpha);
   const material=new LineMaterial({color:lineColor,linewidth:active?3:faint?1:1.4,transparent:false,opacity:1,depthTest:false,depthWrite:false,dashed:dashed||dotted,dashSize:dotted?1:8,gapSize:dotted?5:5});
   const geometry=new LineGeometry(),a=nodes.find(n=>n.id===e.source)!,b=nodes.find(n=>n.id===e.target)!;geometry.setPositions([a.x,a.y,a.z,b.x,b.y,b.z]);const line=new Line2(geometry,material);line.visible=false;line.computeLineDistances();line.renderOrder=-100;group.add(line);
   const label=labelMesh(e.record.label||'Recorded relationship',props.theme);label.renderOrder=-80;label.visible=active||(!props.selected&&e.record.record_type==='abbreviated');group.add(label);
   const arrow=new THREE.Mesh(new THREE.ConeGeometry(3,9,7),new THREE.MeshBasicMaterial({color:lineColor,transparent:false,depthTest:false,depthWrite:false}));arrow.renderOrder=-90;arrow.visible=!['aggregate','abbreviated','gap'].includes(e.record.record_type);group.add(arrow);
   // Match picking to paint order: a faint link behind an opaque card cannot steal its click.
   group.traverse((object:any)=>{if(!object.raycast)return;const original=object.raycast.bind(object);object.raycast=(raycaster:THREE.Raycaster,hits:any[])=>{const camera=graph.current?.camera();if(camera){const p=raycaster.ray.origin.clone().add(raycaster.ray.direction).project(camera),viewport=sizeRef.current,x=(p.x+1)*viewport.width/2,y=(1-p.y)*viewport.height/2;if(cardRects.current.some(r=>inPolygon({x,y},r)))return}original(raycaster,hits)}});
   objects.push(group);return {...e,record:structuredClone(e.record),relationshipIds:[...e.relationshipIds],source:e.source,target:e.target,object:group,line,label,arrow};
  });
  return {nodes,links,objects};
 },[props.scene,props.theme,props.selected,props.additions]);
 const data=useRef(assets);data.current=assets;
 useEffect(()=>()=>{for(const object of assets.objects)dispose(object)},[assets]);
 const get=()=>{const g=graph.current;if(!g)return null;return {g,camera:g.camera() as THREE.PerspectiveCamera,controls:g.controls() as OrbitControls}};
 const pose=():CameraFrame|undefined=>{const size=sizeRef.current;const v=get(),context=cameraContext.current;if(!v||!context)return;const {camera,controls}=v;return {...context,position:plain(camera.position),target:plain(controls.target),quaternion:camera.quaternion.toArray() as [number,number,number,number],focalScale:size.height/(2*Math.tan(rad(camera.fov)/2)),reference:reference.current}};
 const protectView=()=>{const v=get();if(!v)return;const dir=v.camera.position.clone().sub(v.controls.target).normalize(),distance=v.camera.position.distanceTo(v.controls.target),front=Math.max(0,...data.current.nodes.map(n=>n.object.position.clone().sub(v.controls.target).dot(dir))),needed=Math.max(200,front+150);if(distance<needed){const delta=dir.clone().multiplyScalar(needed-distance);v.camera.position.add(delta);v.controls.target.add(delta)}v.controls.minDistance=Math.min(19999,Math.max(200,Math.min(distance,needed)));if(v.camera.position.z<200){const dz=200-v.camera.position.z;v.camera.position.z+=dz;v.controls.target.z+=dz}v.camera.updateMatrixWorld()};
 const persist=()=>{const value=pose();if(value)live.current.onPose(value)};
 const animateCamera=(position:THREE.Vector3,target:THREE.Vector3,duration=ms(),done?:()=>void)=>{
  const v=get();if(!v)return;cancelAnimationFrame(cameraFrame.current);program.current=true;const from=v.camera.position.clone(),startTarget=v.controls.target.clone(),start=performance.now();
  const step=(time:number)=>{const t=duration?Math.min(1,(time-start)/duration):1,alpha=ease(t);v.camera.position.lerpVectors(from,position,alpha);v.controls.target.lerpVectors(startTarget,target,alpha);v.controls.update();if(t<1)cameraFrame.current=requestAnimationFrame(step);else{program.current=false;done?.();schedule();persist()}};cameraFrame.current=requestAnimationFrame(step);
 };
 const direction=()=>{const v=get();return v?v.camera.position.clone().sub(v.controls.target).normalize():new THREE.Vector3(0,Math.sin(rad(25)),Math.cos(rad(25)))};
 const fit=(reset=false)=>{
  const size=sizeRef.current;const v=get();if(!v||!data.current.nodes.length)return;
  const dir=live.current.scene.mode==='flat'?new THREE.Vector3(0,0,1):reset?new THREE.Vector3(0,Math.sin(rad(25)),Math.cos(rad(25))):direction();
  const allCorners=data.current.nodes.flatMap(n=>cardCorners(n.object,n.width,n.height));const box=new THREE.Box3().setFromPoints(allCorners);const target=box.getCenter(new THREE.Vector3());
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize(),tan=Math.tan(rad(v.camera.fov)/2),aspect=size.width/Math.max(1,size.height);
  let distance=700;for(const point of allCorners){const d=point.clone().sub(target);distance=Math.max(distance,Math.abs(d.dot(right))/(tan*aspect)+d.dot(dir),Math.abs(d.dot(up))/tan+d.dot(dir))}
  animateCamera(target.clone().addScaledVector(dir,distance*1.12),target,ms(),()=>{reference.current=distance;persist()});
 };
 const zoom=(factor:number)=>{const v=get();if(!v)return;const d=v.camera.position.clone().sub(v.controls.target);animateCamera(v.controls.target.clone().add(d.multiplyScalar(factor)),v.controls.target);};
 const turn=(side:number,tilt:number)=>{const v=get();if(!v||live.current.scene.mode==='flat')return;const d=v.camera.position.clone().sub(v.controls.target),spherical=new THREE.Spherical().setFromVector3(d);spherical.theta=THREE.MathUtils.clamp(spherical.theta+rad(side),rad(-60),rad(60));spherical.phi=THREE.MathUtils.clamp(spherical.phi-rad(tilt),rad(30),rad(75));animateCamera(v.controls.target.clone().add(new THREE.Vector3().setFromSpherical(spherical)),v.controls.target)};
 const reveal=(id:string)=>{
  const size=sizeRef.current;const v=get(),n=data.current.nodes.find(n=>n.id===id);if(!v||!n)return;
  v.camera.updateMatrixWorld();const bounds=host.current?.getBoundingClientRect(),workspace=host.current?.closest('.canvas-wrap');if(!bounds||!workspace)return;
  const obstacles=Array.from(workspace.querySelectorAll('.floating-details,.depth-badge,.layer-returns,.scene-topic-list,.scene-layer-list,.minimap-box,.view-readout,.angle-controls,.zoom-controls,.graph-legend,.canvas-title')).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({x1:(r.left-bounds.left)*size.width/bounds.width,y1:(r.top-bounds.top)*size.height/bounds.height,x2:(r.right-bounds.left)*size.width/bounds.width,y2:(r.bottom-bounds.top)*size.height/bounds.height}));
  const projected=projectCard(n.object,n.width,n.height,v.camera,size),screen=focusScreenPoint(size.width,size.height,obstacles,{width:projected.rect.x2-projected.rect.x1,height:projected.rect.y2-projected.rect.y1});
  const pan=focusCameraPan(v.camera,v.controls.target,n.object.position,screen,size);if(pan)animateCamera(pan.position,pan.target);
 };
 const hoverFrame=useRef(0),hoverPaint=useRef<(level:number|null)=>void>(()=>{}),hoverControl=useRef<LayerHover|undefined>(undefined);
 const layerHover=(level:number|null)=>{
  hoveredLayerRef.current=level;setHoveredLayer(previous=>previous===level?previous:level);cancelAnimationFrame(hoverFrame.current);
  const start=performance.now(),entries=layerSurfaces.current.map(entry=>({entry,opacity:entry.surface.material.opacity,color:entry.border.material.color.clone()}));
  const tick=(now:number)=>{const t=ms()===0?1:Math.min(1,(now-start)/120);for(const {entry,opacity,color} of entries){const active=entry.level===level;entry.surface.material.opacity=THREE.MathUtils.lerp(opacity,active?.065:.003,t);entry.border.material.color.copy(color).lerp(active?entry.highlight:entry.normal,t)}if(t<1)hoverFrame.current=requestAnimationFrame(tick)};hoverFrame.current=requestAnimationFrame(tick);
  const canvas=graph.current?.renderer().domElement;if(canvas)canvas.style.cursor=level===null?'':'pointer';
 };
 hoverPaint.current=layerHover;if(!hoverControl.current)hoverControl.current=new LayerHover(level=>hoverPaint.current(level));
 const clearHover=()=>hoverControl.current?.immediate(null);
 const pickLayer=(event:MouseEvent)=>{
  const v=get(),bounds=host.current?.getBoundingClientRect();if(!v||!bounds||live.current.scene.mode!=='layered')return null;
  const size=sizeRef.current;v.camera.updateMatrixWorld();
  const frames=layerSurfaces.current.map(entry=>{entry.group.updateWorldMatrix(true,false);return {level:entry.level,points:entry.corners.map(c=>entry.group.localToWorld(c.clone()))}}).filter(frame=>frame.points.every(p=>p.clone().applyMatrix4(v.camera.matrixWorldInverse).z<0)).map(frame=>({level:frame.level,corners:frame.points.map(p=>{const q=p.project(v.camera);return {x:(q.x+1)*size.width/2,y:(1-q.y)*size.height/2}})}));
  const border=layerBorderAt({x:(event.clientX-bounds.left)*size.width/bounds.width,y:(event.clientY-bounds.top)*size.height/bounds.height},frames);if(border!==null)return border;
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),v.camera);
  const plane=ray.intersectObjects(layerSurfaces.current.map(entry=>entry.surface),false)[0];return plane?Number(plane.object.userData.layerLevel):null;
 };
 const pickScene=(event:MouseEvent)=>{
  const v=get(),bounds=host.current?.getBoundingClientRect();if(!v||!bounds)return;const pointer=new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),raycaster=new THREE.Raycaster();v.camera.updateMatrixWorld();raycaster.setFromCamera(pointer,v.camera);
  // Recheck the click ray: the renderer throttles hover picking and can otherwise use an old hit.
  const nodeHit=raycaster.intersectObjects(data.current.nodes.map(n=>n.object),true)[0];
  const referenceObjects:THREE.Object3D[]=[];decoration.current?.traverse(object=>{if(object.userData.topicReference)referenceObjects.push(object)});
  const referenceHit=raycaster.intersectObjects(referenceObjects,false)[0];
  if(referenceHit&&(!nodeHit||referenceHit.distance<nodeHit.distance)){const node=data.current.nodes.find(n=>n.id===referenceHit.object.userData.topicReference);if(node)return {node}}
  if(nodeHit){if(nodeHit.object.userData.browseGroup)return {browseGroup:String(nodeHit.object.userData.browseGroup)};const summary=live.current.scene.internalSummaries.find(e=>e.id===nodeHit.object.userData.internalId);if(summary)return {internal:summary};let object:THREE.Object3D|null=nodeHit.object;while(object&&!object.userData.cardId)object=object.parent;const node=data.current.nodes.find(n=>n.id===object?.userData.cardId);if(node)return {node}}
  const linkHit=raycaster.intersectObjects(data.current.links.map(e=>e.object),true)[0];
  if(linkHit){let object:THREE.Object3D|null=linkHit.object;while(object&&!object.userData.edgeId)object=object.parent;const edge=data.current.links.find(e=>e.id===object?.userData.edgeId);if(edge)return {edge}}
  const level=pickLayer(event);if(level!==null)return {layer:level};
  return {};
 };
 const clickScene=(event:MouseEvent)=>{
  const hit=pickScene(event);clearHover();
  if(hit?.browseGroup)live.current.onGroup(hit.browseGroup);else if(hit?.internal)live.current.onLink(hit.internal.record);else if(hit?.node)live.current.onCard(hit.node.record);else if(hit?.edge)live.current.onLink(hit.edge.record);else if(hit?.layer!==undefined)live.current.onLayer(hit.layer);else live.current.onClear();
 };
 useImperativeHandle(ref,()=>({pose,fit:()=>fit(),reset:()=>fit(true),zoom,turn,reveal}));
 function schedule(){const v=get();if(v&&readout.current){const d=v.camera.position.clone().sub(v.controls.target),sph=new THREE.Spherical().setFromVector3(d);readout.current.textContent=live.current.scene.mode==='flat'?'Perpendicular view':`${Math.round(90-THREE.MathUtils.radToDeg(sph.phi))}° tilt · ${Math.round(THREE.MathUtils.radToDeg(sph.theta))}° turn`}clearTimeout(routeTimer.current);routeTimer.current=setTimeout(()=>{routeLinks();drawMini()},40)}
 function routeLinks(){
  const size=sizeRef.current;const v=get();if(!v)return;v.camera.updateMatrixWorld();
  const projected=data.current.nodes.map(n=>{const p=projectCard(n.object,n.width,n.height,v.camera,size);return {...p,n,actual:p.rect,rect:{x1:p.rect.x1-8,x2:p.rect.x2+8,y1:p.rect.y1-8,y2:p.rect.y2+8}}});
  cardRects.current=projected.filter(p=>p.distance>0).map(p=>p.polygon);
  const map=new Map(projected.map(p=>[p.n.id,p]));
  const unproject=(p:{x:number;y:number},depth:number)=>{const ray=new THREE.Vector3(p.x/size.width*2-1,1-p.y/size.height*2,.5).unproject(v.camera).sub(v.camera.position);const view=ray.clone().applyQuaternion(v.camera.quaternion.clone().invert());return v.camera.position.clone().add(ray.multiplyScalar(depth/Math.max(.01,-view.z)))};
  const homeAid=decoration.current?.userData.focusHome;if(homeAid){const home=world(homeAid.logical,currentOrigin.current);homeAid.point.copy(home);homeAid.ring.position.copy(home);const focus=data.current.nodes.find(n=>n.id===live.current.scene.focused);if(focus)homeAid.line.geometry.setFromPoints([home,focus.object.position]);const q=home.clone().project(v.camera),depth=-home.clone().applyMatrix4(v.camera.matrixWorldInverse).z,scale=size.height/(2*Math.tan(rad(v.camera.fov)/2)*Math.max(1,depth)),x=(q.x+1)*size.width/2,y=(1-q.y)*size.height/2,w=120*scale,h=20*scale;
   const offsets=[[0,-35],[0,35],[80,-20],[-80,-20],[90,35],[-90,35],[0,-80],[0,80],[130,0],[-130,0]];
   const chosen=offsets.map(([dx,dy])=>({x:x+dx,y:y+dy})).find(p=>p.x>w/2+8&&p.x<size.width-w/2-8&&p.y>h/2+8&&p.y<size.height-h/2-8&&!projected.some(c=>p.x+w/2>c.rect.x1&&p.x-w/2<c.rect.x2&&p.y+h/2>c.rect.y1&&p.y-h/2<c.rect.y2));
   homeAid.label.position.copy(unproject(chosen||{x,y:y-35},depth));homeAid.ring.quaternion.identity();
  }
  for(const e of data.current.links){const a=map.get(typeof e.source==='string'?e.source:(e.source as any).id),b=map.get(typeof e.target==='string'?e.target:(e.target as any).id);if(!a||!b)continue;
   let path:{x:number;y:number}[];
   if(a===b)path=[{x:a.x+20,y:a.actual.y1},{x:a.rect.x2+35,y:a.rect.y1-35},{x:a.rect.x2+35,y:a.rect.y2+25},{x:a.x+20,y:a.actual.y2}];
   else path=polygonConnectionPath(e.id,a,b,a.polygon,b.polygon,projected.filter(p=>p!==a&&p!==b&&p.distance>0).map(p=>padPolygon(p.polygon,8)),e.active);
   e.label.visible=e.active||(!live.current.selected&&(e.record.record_type==='abbreviated'||(e.record.record_type!=='aggregate'&&Math.min(a.rect.x2-a.rect.x1,b.rect.x2-b.rect.x1)>110)));
   const fractions=pathFractions(path),points=path.map((p,i)=>screenPointAtZ(p,a.z+(b.z-a.z)*fractions[i],v.camera,size)||unproject(p,a.distance+(b.distance-a.distance)*fractions[i]));
   setConnectionPath(e.line,points,fractions,[Math.max(0,-a.z/PLANE_GAP),Math.max(0,-b.z/PLANE_GAP)]);e.line.material.resolution.set(size.width,size.height);
   const mid=screenPointAtZ(pathMidpoint(path),(a.z+b.z)/2,v.camera,size)||unproject(pathMidpoint(path),(a.distance+b.distance)/2);e.label.position.copy(mid);e.label.position.z+=2;
   const end=points[points.length-1],prev=points[points.length-2],dir=end.clone().sub(prev).normalize();e.arrow.position.copy(end.clone().addScaledVector(dir,-4.5));e.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  }
 }
 function drawMini(){
  const el=mini.current,v=get();if(!el||!v)return;const ctx=el.getContext('2d')!,p=palettes[live.current.theme];ctx.clearRect(0,0,el.width,el.height);
  const base=live.current.scene.cards.filter(n=>n.record.kind==='group');const box=new THREE.Box2().setFromPoints(base.map(n=>new THREE.Vector2(n.home.x,n.home.y)));box.expandByScalar(180);
  const scale=Math.min((el.width-16)/(box.max.x-box.min.x),(el.height-16)/(box.max.y-box.min.y)),ox=(el.width-(box.max.x+box.min.x)*scale)/2,oy=(el.height-(box.max.y+box.min.y)*scale)/2;miniTransform.current={scale,ox,oy};
  ctx.strokeStyle=p.mini;ctx.lineWidth=.6;for(const e of live.current.scene.links){const a=base.find(n=>n.id===e.source),b=base.find(n=>n.id===e.target);if(a&&b){ctx.beginPath();ctx.moveTo(a.home.x*scale+ox,a.home.y*scale+oy);ctx.lineTo(b.home.x*scale+ox,b.home.y*scale+oy);ctx.stroke()}}
  for(const card of base){ctx.fillStyle=(p.fills as any)[card.record.domain];ctx.strokeStyle=p.border;ctx.fillRect(card.home.x*scale+ox-13,card.home.y*scale+oy-5,26,10);ctx.strokeRect(card.home.x*scale+ox-13,card.home.y*scale+oy-5,26,10)}
  const focus=live.current.scene.homeMarker;if(focus){ctx.fillStyle=p.selected;ctx.beginPath();ctx.arc(focus.home.x*scale+ox,focus.home.y*scale+oy,4,0,Math.PI*2);ctx.fill()}
  // Intersect the actual receding overview plane, never a rectangle around the 3D scene.
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const ray=new THREE.Vector3(x,y,.5).unproject(v.camera).sub(v.camera.position).normalize(),t=(-currentOrigin.current-v.camera.position.z)/ray.z;return t>0?v.camera.position.clone().addScaledVector(ray,t):null});
  if(corners.every(Boolean)){ctx.strokeStyle=p.viewport;ctx.setLineDash([3,2]);ctx.beginPath();corners.forEach((q,i)=>{const x=q!.x*scale+ox,y=-q!.y*scale+oy;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.stroke();ctx.setLineDash([])}
 }
 function blurFrame():BokehFrame{
  const p=live.current,scene=p.scene,items:BokehItem[]=[],surface=layerSurfaces.current.find(l=>l.level===scene.level)?.surface;surface?.updateWorldMatrix(true,false);
  const surfaceZ=surface?.getWorldPosition(new THREE.Vector3()).z??-8;
  for(const node of data.current.nodes)node.object.traverse(object=>{if((object as any).isMesh&&(object.userData.cardSurface||object.userData.labelSurface)){object.updateWorldMatrix(true,false);const z=object.getWorldPosition(new THREE.Vector3()).z;items.push({object,behind:Math.max(0,(-z)/PLANE_GAP),plane:node.plane,sharp:z>surfaceZ,card:true,order:20})}});
  for(const edge of data.current.links){const from=typeof edge.source==='string'?edge.source:(edge.source as any).id,to=typeof edge.target==='string'?edge.target:(edge.target as any).id,a=data.current.nodes.find(n=>n.id===from),b=data.current.nodes.find(n=>n.id===to);if(!a||!b)continue;
   const za=a.object.position.z,zb=b.object.position.z,front=Math.max(za,zb)>surfaceZ,behind=Math.max(0,-(za+zb)/2/PLANE_GAP),plane=Math.min(a.plane,b.plane);items.push({object:edge.line,behind,plane,sharp:edge.active||front,gradient:!edge.active&&!front,edge:true,order:10},{object:edge.arrow,behind:Math.max(0,-zb/PLANE_GAP),plane,sharp:edge.active||front,edge:true,order:10},{object:edge.label,behind,plane,sharp:edge.active||front,edge:true,order:11});
  }
  for(const layer of layerSurfaces.current){items.push({object:layer.border,behind:scene.level-layer.level,plane:layer.level,sharp:layer.level===scene.level,order:-199});if(layer.level<scene.level)items.push({object:layer.surface,behind:scene.level-layer.level,plane:layer.level,depth:false,order:-300})}
  decoration.current?.traverse(object=>{if(object.userData.labelSurface){const level=object.userData.layerLevel??scene.level;items.push({object,behind:Math.max(0,scene.level-level),plane:level,sharp:level===scene.level,card:!!object.userData.topicReference,order:30})}});
  const home=decoration.current?.userData.focusHome;if(home)items.push({object:home.ring,behind:0,sharp:true,plane:scene.level,order:30},{object:home.line,behind:0,sharp:true,plane:scene.level,order:30});
  ghostLayer.current?.traverse(object=>{if(object.userData.cardSurface||object.userData.labelSurface)items.push({object,behind:0,sharp:true,card:true,plane:scene.level,order:20})});
  return {preference:p.effects.blur?'subtle':'off',effects:p.effects,mode:scene.mode,level:scene.level,width:sizeRef.current.width,reducedMotion:ms()===0,items,glass:surface,tint:palettes[p.theme].canvas};
 }
 useEffect(()=>{const el=host.current;if(!el)return;const observer=new ResizeObserver(()=>setSize({width:Math.max(1,el.clientWidth),height:Math.max(1,el.clientHeight)}));observer.observe(el);return()=>observer.disconnect()},[]);
 useEffect(()=>{
  if(!ready)return;const v=get();if(!v)return;const before=lastSize.current;lastSize.current=size;
  if(before.height){const focal=before.height/(2*Math.tan(rad(v.camera.fov)/2));v.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(size.height/(2*focal)));v.camera.updateProjectionMatrix()}
  schedule();
 },[size,ready]);
 useEffect(()=>{
  const timer=setTimeout(()=>{try{
   const v=get();if(!v)return;const controls=v.controls;controls.enableDamping=false;controls.screenSpacePanning=true;controls.enablePan=true;controls.enableZoom=true;controls.minDistance=200;controls.maxDistance=20000;controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
   for(const name of ['charge','link','center'])v.g.d3Force(name,null);
   try{const pass=new FrostedGraphPass(v.g.scene(),v.camera,blurFrame,setBlurError);pass.attach(v.g.postProcessingComposer());bokehPass.current=pass;setBlurError('')}catch{setBlurError('Background blur is unavailable; the graph remains sharp. Reload to retry.')}
   const onChange=()=>{protectView();schedule();clearTimeout(poseTimer.current);poseTimer.current=setTimeout(persist,180)};
   const onWheel=(event:WheelEvent)=>{if(event.deltaY<=0||program.current)return;clearTimeout(zoomTimer.current);zoomTimer.current=setTimeout(()=>{const current=get();if(!current||program.current)return;const d=current.camera.position.distanceTo(current.controls.target);if(d>reference.current*1.65||d>=19900){reference.current=d;live.current.onBroaden()}},350)};
   const onLost=(event:Event)=>{event.preventDefault();setFailure('The graphics context was lost. Your exploration and HTML details are preserved. Retry the graph to recover it.')};
   const onRestored=()=>{setRetry(x=>x+1);setFailure('');restored.current=''};
   const onPointer=()=>clearHover(),onMove=(event:PointerEvent)=>{if(event.buttons||live.current.scene.mode!=='layered'){clearHover();return}hoverControl.current?.point(pickLayer(event))},onLeave=()=>hoverControl.current?.point(null);
   controls.addEventListener('change',onChange);const canvas=v.g.renderer().domElement;canvas.addEventListener('pointerdown',onPointer,true);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerleave',onLeave);canvas.addEventListener('wheel',onWheel,{passive:true});canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);setReady(true);
   (host.current as any)._cleanup=()=>{bokehPass.current?.detach(v.g.postProcessingComposer());bokehPass.current=undefined;controls.removeEventListener('change',onChange);canvas.removeEventListener('pointerdown',onPointer,true);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerleave',onLeave);canvas.removeEventListener('wheel',onWheel);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored)};
  }catch(error){setFailure(String(error));live.current.onError('3D graphics could not start. Your exploration remains available in the HTML details.')}} ,100);
  return()=>{if(ghostLayer.current){try{graph.current?.scene().remove(ghostLayer.current)}catch{}dispose(ghostLayer.current);ghostLayer.current=null}if(decoration.current){try{graph.current?.scene().remove(decoration.current)}catch{}dispose(decoration.current);decoration.current=null}clearTimeout(timer);hoverControl.current?.dispose();cancelAnimationFrame(hoverFrame.current);(host.current as any)?._cleanup?.();cancelAnimationFrame(frame.current);cancelAnimationFrame(cameraFrame.current);clearTimeout(routeTimer.current);clearTimeout(poseTimer.current);clearTimeout(zoomTimer.current)};
 },[retry]);
 useEffect(()=>bokehPass.current?.configure(),[ready,retry,props.effects,props.scene.mode,props.scene.level]);
 useEffect(()=>{
  if(!ready)return;const v=get();if(!v)return;const mode=props.scene.mode,oldScene=previousScene.current;
  const attention=focusAfterTransition(oldScene,props.scene,props.restoreToken!==lastRestore.current);lastRestore.current=props.restoreToken;
  if(attention){cancelAnimationFrame(cameraFrame.current);program.current=false}
  v.controls.minPolarAngle=mode==='flat'?Math.PI/2:rad(30);v.controls.maxPolarAngle=mode==='flat'?Math.PI/2:rad(75);v.controls.minAzimuthAngle=mode==='flat'?0:rad(-60);v.controls.maxAzimuthAngle=mode==='flat'?0:rad(60);v.controls.enableRotate=mode!=='flat';
  const context=props.scene.key+':'+mode+':'+props.restoreToken,changed=restored.current!==context,saved=props.scene.context.cameras[mode];
  if(changed){
   cameraContext.current=undefined;clearTimeout(poseTimer.current);cancelAnimationFrame(cameraFrame.current);restored.current=context;
   if(saved){program.current=true;v.camera.position.copy(new THREE.Vector3().copy(saved.position));v.controls.target.copy(new THREE.Vector3().copy(saved.target));v.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(size.height/(2*saved.focalScale)));v.camera.updateProjectionMatrix();reference.current=saved.reference;v.controls.update();program.current=false}
   else if(!oldScene||oldScene.mode!==mode)fit(true);
  }
  cameraContext.current={sceneKey:props.scene.key,mode};
  protectView();
  const origin=depthOrigin(props.scene),oldOrigin=changed?origin:currentOrigin.current,shift=origin-oldOrigin;
  const duration=changed||!lastSignature.current?0:ms(),start=performance.now(),from=lastPositions.current;
  cancelAnimationFrame(frame.current);
  clearHover();layerSurfaces.current=[];
  if(decoration.current){v.g.scene().remove(decoration.current);dispose(decoration.current)}
  if(ghostLayer.current){v.g.scene().remove(ghostLayer.current);dispose(ghostLayer.current);ghostLayer.current=null}
  const group=new THREE.Group();decoration.current=group;
  const sliding:THREE.Object3D[]=[];
  const slide=(object:THREE.Object3D,existing:boolean)=>{if(existing&&shift){object.userData.finalZ=object.position.z;sliding.push(object);object.position.z+=shift}group.add(object)};
  if(mode==='layered'){
   const p=palettes[props.theme];
   for(const layer of sceneLayers(props.scene)){
    const frame=new THREE.Group();frame.position.set(layer.x,-layer.y,layer.level*PLANE_GAP-origin-8);
    const corners=[new THREE.Vector3(-layer.width/2,-layer.height/2,0),new THREE.Vector3(layer.width/2,-layer.height/2,0),new THREE.Vector3(layer.width/2,layer.height/2,0),new THREE.Vector3(-layer.width/2,layer.height/2,0)];
    const surface=new THREE.Mesh(new THREE.PlaneGeometry(layer.width,layer.height),new THREE.MeshBasicMaterial({color:p.selected,transparent:true,opacity:.003,depthTest:true,depthWrite:false,side:THREE.DoubleSide}));surface.userData={layerSurface:true,layerLevel:layer.level};surface.renderOrder=-300;
    const normal=new THREE.Color(p.border).lerp(new THREE.Color(p.canvas),layer.level===0?.75:.8),highlight=new THREE.Color(p.selected).lerp(new THREE.Color(p.canvas),.25),border=new THREE.Line(new THREE.BufferGeometry().setFromPoints([...corners,corners[0]]),new THREE.LineBasicMaterial({color:normal,depthTest:false,depthWrite:false}));border.position.z=1;border.userData.layerSurface=true;border.renderOrder=-199;
    const title=labelMesh(layer.shortLabel,props.theme,220);title.position.set(-layer.width/2+95,layer.height/2-22,2);title.userData.layerLevel=layer.level;frame.add(surface,border,title);layerSurfaces.current.push({level:layer.level,group:frame,surface,border,normal,highlight,corners});slide(frame,!!oldScene?.cards.some(c=>c.plane===layer.level));
   }
   // Surfaces and home tethers are view cues and share the receding coordinate frame.
   const owners=new Set(props.scene.cards.flatMap(c=>c.owners).filter(o=>o.startsWith('group:')));
   for(const owner of owners){
    const children=props.scene.cards.filter(c=>c.owners.includes(owner));if(!children.length)continue;const logicalZ=Math.min(...children.map(c=>c.home.z)),layer=children.filter(c=>c.home.z===logicalZ);
    const x=Math.min(...layer.map(c=>c.home.x-c.width/2)),y=Math.min(...layer.map(c=>c.home.y-c.height/2));
    const name=props.scene.cards.find(c=>c.id==='group:'+owner.slice(6))?.record.label?.replace(/\n.*/s,'')||props.scene.cards.find(c=>c.record.browse_group?.id===owner.slice(6))?.record.browse_group.label||owner.slice(6);
    const heading=labelMesh(name,props.theme,190);heading.position.set(x+95,-y+27,logicalZ-origin-6);heading.userData.layerLevel=logicalZ/PLANE_GAP;slide(heading,!!oldScene?.cards.some(c=>c.owners.includes(owner)));
   }
   for(const retained of props.scene.retainedLayers||[]){
    if(!props.scene.context.layers?.[String(retained.level)])continue;
    if(!props.scene.cards.some(c=>c.plane===retained.level)){const note=labelMesh('Details collapsed',props.theme,150);note.position.set(retained.x,-retained.y,retained.level*PLANE_GAP-origin);note.userData.layerLevel=retained.level;slide(note,!!oldScene)}
    for(const previous of retained.members){const current=props.scene.cards.find(c=>c.id===previous.id);if(!current||current.plane===retained.level)continue;const marker=labelMesh('Home · '+current.record.label,props.theme,110);marker.scale.set(110,18,1);marker.position.copy(world(previous.home,origin));marker.userData.layerLevel=retained.level;slide(marker,!!oldScene)}
   }
   // Shared membership is an orientation label, never a second factual card or route endpoint.
   for(const reference of props.scene.references||[]){
    const level=Math.round(reference.position.z/PLANE_GAP),card=props.scene.cards.find(c=>c.id===reference.topicId);
    if(level!==props.scene.level||!card||card.position.z>=reference.position.z)continue;
    const marker=labelMesh(reference.label,props.theme,reference.width);marker.scale.set(reference.width,reference.height,1);marker.position.copy(world(reference.position,origin));marker.userData.topicReference=reference.topicId;marker.userData.layerLevel=level;marker.userData.sharedReference=true;slide(marker,!!oldScene?.references?.some(r=>r.id===reference.id));
   }
   const focus=props.scene.cards.find(c=>c.id===props.scene.focused);
   if(!focus&&props.scene.homeMarker){const m=props.scene.homeMarker,label=labelMesh('Last explored · '+m.label,props.theme,145);label.position.copy(world({...m.home,y:m.home.y+80,z:12},origin));slide(label,!!oldScene)}
   if(focus&&focus.position.z!==focus.home.z){
    const home=world(focus.home,oldOrigin),marker=labelMesh('Home · '+focus.record.label,props.theme,120);marker.position.copy(home);marker.scale.set(120,20,1);const aid=new THREE.Group();aid.renderOrder=30;
    const ring=new THREE.Mesh(new THREE.RingGeometry(4,7,24),new THREE.MeshBasicMaterial({color:p.selected,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));ring.position.copy(home);aid.add(marker,ring);group.add(aid);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([home,world(focus.position,origin)]),new THREE.LineDashedMaterial({color:p.selected,transparent:true,opacity:.6,dashSize:5,gapSize:5}));line.computeLineDistances();group.add(line);group.userData.focusHome={point:home,logical:focus.home,label:marker,ring,line};
   }
  }
  group.traverse((object:any)=>{if(!object.material||object.userData.layerSurface)return;object.renderOrder=object.userData.labelSurface?-75:-200;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material.opacity<1&&material.color)material.color.lerp(new THREE.Color(palettes[props.theme].canvas),1-material.opacity);material.opacity=1;material.transparent=false;material.depthTest=false;material.depthWrite=false}});
  v.g.scene().add(group);
  // Closing detail folds only removed cards into the named parent; shared cards remain interactive.
  const collapse=props.collapse?.id!==lastCollapse.current?props.collapse:undefined;lastCollapse.current=props.collapse?.id;const ghosts:{object:THREE.Group;from:THREE.Vector3;to:THREE.Vector3}[]=[];
  const parent=props.scene.cards.find(c=>c.id===collapse?.parentId),destination=world(parent?.position||props.scene.homeMarker?.home||{x:0,y:0,z:origin},origin);
  if(duration&&mode==='layered'&&collapse&&oldScene?.key===props.scene.key){
   const ids=new Set(props.scene.cards.map(c=>c.id)),layer=new THREE.Group();ghostLayer.current=layer;
   for(const card of oldScene.cards.filter(c=>!ids.has(c.id))){const object=cardMesh(card,props.theme,false),position=from[card.id]?.clone()||world(card.position,oldOrigin);object.position.copy(position);layer.add(object);ghosts.push({object,from:position,to:collapse.level===undefined?destination:world({...card.home,z:collapse.level*PLANE_GAP},origin)})}
   v.g.scene().add(layer);
  }
  let routed=0;
  const tick=(time:number)=>{
   const t=duration?Math.min(1,(time-start)/duration):1,alpha=ease(t);currentOrigin.current=oldOrigin+(origin-oldOrigin)*alpha;
   for(const n of data.current.nodes){const target=world(n.position,origin),initial=from[n.id]||target;n.object.position.lerpVectors(initial,target,alpha);n.x=n.object.position.x;n.y=n.object.position.y;n.z=n.object.position.z;n.fx=n.x;n.fy=n.y;n.fz=n.z}
   for(const object of sliding)object.position.z=object.userData.finalZ+shift*(1-alpha);
   for(const ghost of ghosts){ghost.object.position.lerpVectors(ghost.from,ghost.to,alpha);ghost.object.scale.setScalar(1-alpha*.97)}
   lastPositions.current=Object.fromEntries(data.current.nodes.map(n=>[n.id,n.object.position.clone()]));
   if(time-routed>65){routeLinks();drawMini();routed=time}
   if(t<1)frame.current=requestAnimationFrame(tick);else{
    if(ghostLayer.current){v.g.scene().remove(ghostLayer.current);dispose(ghostLayer.current);ghostLayer.current=null}
    schedule();
   }
  };
  if(attention)reveal(attention);
  frame.current=requestAnimationFrame(tick);lastSignature.current=props.scene.signature;previousScene.current=props.scene;schedule();return()=>cancelAnimationFrame(frame.current);
 },[props.scene,props.theme,ready,props.restoreToken,props.collapse?.id]);
 const returns=props.scene.context.returns||[],back=returns.at(-1);
 return <div ref={host} className="scene-host" data-bokeh={!blurError&&props.effects.blur&&props.scene.mode==='layered'&&props.scene.level>0?'subtle':'off'} data-background-effects={JSON.stringify(props.effects)} data-scene-context={props.scene.key} data-scene-mode={props.scene.mode} data-scene-level={props.scene.level} data-hovered-layer={hoveredLayer??''} data-overview-z={-depthOrigin(props.scene)} data-scene-items={props.scene.cards.length} data-scene-relationships={props.scene.links.length}>
  {!failure&&<GraphicsBoundary key={retry} error={props.onError} retry={()=>{setReady(false);restored.current='';setRetry(x=>x+1)}}><ForceGraph3D key={retry} ref={graph} graphData={assets} width={size.width} height={size.height} controlType="orbit" backgroundColor={palettes[props.theme].canvas} showNavInfo={false} enableNodeDrag={false} cooldownTicks={0} warmupTicks={0} nodeThreeObject={nodeObject} nodePositionUpdate={skipPosition} linkThreeObject={linkObject} linkPositionUpdate={skipPosition} nodeLabel={n=>n.record.label+(n.record.membership_labels?.length?' · '+n.record.membership_labels.join(' / '):'')} linkLabel={e=>e.record.label} onNodeClick={(_,event)=>clickScene(event)} onLinkClick={(_,event)=>clickScene(event)} onBackgroundClick={clickScene} linkHoverPrecision={5}/></GraphicsBoundary>}
  {failure&&<div className="graphics-failure" role="alert"><p>{failure}</p><button onClick={()=>{setFailure('');setReady(false);restored.current='';setRetry(x=>x+1)}}>Retry graph</button></div>}
  {blurError&&<div className="blur-notice" role="status">{blurError}</div>}
  <div className="minimap-box"><div>OVERVIEW <span>{props.scene.mode==='flat'?'Flat':layerLabel(props.scene.level,props.scene)}</span></div><canvas ref={mini} width={200} height={112} aria-label="Overview map" onClick={e=>{
   const v=get();if(!v)return;const r=e.currentTarget.getBoundingClientRect(),{scale,ox,oy}=miniTransform.current,x=((e.clientX-r.left)*200/r.width-ox)/scale,y=((e.clientY-r.top)*112/r.height-oy)/scale,ray=v.controls.target.clone().sub(v.camera.position).normalize(),t=(-currentOrigin.current-v.camera.position.z)/ray.z,centre=v.camera.position.clone().addScaledVector(ray,t),delta=new THREE.Vector3(x-centre.x,-y-centre.y,0);animateCamera(v.camera.position.clone().add(delta),v.controls.target.clone().add(delta));
  }}/></div>
  <div className="depth-badge">{props.scene.mode==='layered'?'LAYERED 3D':'FLAT VIEW'} <span>{props.scene.mode==='flat'?`${props.scene.cards.length} cards · same exploration`:layerLabel(props.scene.level,props.scene)}</span>{props.scene.mode==='layered'&&props.scene.homeMarker&&<span className="home-readout" title={props.scene.homeMarker.label}>Home: {props.scene.homeMarker.label} · {props.scene.homeMarker.home.z?layerLabel(Math.round(props.scene.homeMarker.home.z/PLANE_GAP),props.scene):'overview'}</span>}</div>
  {back&&<nav className="layer-returns" aria-label="Layer navigation"><button className="back-to-parent" aria-label={'Back to '+back.label} onClick={()=>props.onReturn(back.id)}>← Back to {back.label}</button>{returns.length>1&&<details><summary>Earlier layers</summary>{returns.slice(0,-1).reverse().map(r=><button key={r.id} onClick={()=>props.onReturn(r.id)}>{r.label}</button>)}</details>}</nav>}
  {props.scene.mode==='layered'&&<details className="scene-layer-list"><summary>Layers · {layerLabel(props.scene.level,props.scene)}</summary><div>{sceneLayers(props.scene).map(layer=><button key={layer.level} aria-label={'Make '+layer.label+' current'} aria-current={layer.level===props.scene.level?'step':undefined} onMouseEnter={()=>hoverControl.current?.point(layer.level)} onMouseLeave={()=>hoverControl.current?.point(null)} onFocus={()=>hoverControl.current?.immediate(layer.level)} onBlur={()=>clearHover()} onClick={()=>{clearHover();props.onLayer(layer.level)}}>{layer.label}{layer.level===props.scene.level?' · current':''}</button>)}{(props.scene.retainedLayers||[]).filter(l=>props.scene.context.layers?.[String(l.level)]).map(l=><button key={'reopen:'+l.id} onClick={()=>props.onReopen(l.level)}>Reopen {l.label}</button>)}</div></details>}
  {hoveredLayer!==null&&<div className="layer-hover-hint" role="status">{layerLabel(hoveredLayer,props.scene)} · Click to make current and fold deeper nodes back</div>}
  <output ref={readout} className="view-readout" aria-label="Camera angle"/>
  <details className="scene-topic-list"><summary>Visible topics · {props.scene.cards.length}</summary><div>{props.scene.cards.map(c=><React.Fragment key={c.id}><button onClick={()=>props.onCard(c.record)}>{c.record.label.replaceAll('\n',' · ')}<small>{layerLabel(c.plane,props.scene)}{c.record.expanded||c.record.branchExpanded?' · Click to collapse':c.record.poppedOut?' · Click again to fold back':''}</small></button>{c.internal&&<button className="internal-connections" aria-label={'Inspect '+c.internal.record.label+' in '+c.record.label.replaceAll('\n',' ')} onClick={()=>props.onLink(c.internal!.record)}>{c.internal.record.label} ↗</button>}</React.Fragment>)}</div></details>
 </div>;
});
