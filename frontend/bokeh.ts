import * as THREE from 'three';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {CopyShader} from 'three/addons/shaders/CopyShader.js';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import type {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {effectsEnabled,type BackgroundEffects} from './backgroundEffects.ts';
import {PLANE_GAP} from './depth.ts';
import type {Scene as KnowledgeScene} from './scene.ts';

export type BokehPreference='off'|'subtle';
export const BOKEH_KEY='kgb:bokeh:v1';
export const parseBokehPreference=(value:string|null):BokehPreference=>value==='off'?'off':'subtle';
const FOCUS=400,MASK_NEAR=100,MASK_FAR=1_000_000;
export function bokehSettings(preference:BokehPreference,mode:string,level:number,width:number){
 return {enabled:preference==='subtle'&&mode==='layered'&&level>0,focus:FOCUS,aperture:1.25/(.4*Math.max(1,width)*PLANE_GAP),maxblur:4/(.4*Math.max(1,width))};
}
export function bokehSharpCards(scene:KnowledgeScene,selected:string|null){
 const sharp=new Set(scene.cards.filter(c=>c.plane===scene.level||c.id===scene.focused||c.id===selected).map(c=>c.id));
 for(const edge of scene.links.filter(e=>e.active)){sharp.add(edge.source);sharp.add(edge.target)}return sharp;
}
/** Virtual focus depths keep each complete reading layer sharp, even when the camera turns. */
export function packedMaskDepth(layerDifference:number){
 const distance=FOCUS+Math.max(0,layerDifference)*PLANE_GAP;
 return ((MASK_NEAR-distance)*MASK_FAR)/((MASK_FAR-MASK_NEAR)*-distance);
}
export type BokehItem={surface?:boolean;muted?:boolean;highlighted?:boolean;layerKey?:string;object:THREE.Object3D;behind:number;order:number;sharp?:boolean;card?:boolean;gradient?:boolean;depth?:boolean;plane?:number;edge?:boolean};
export type BokehFrame={selectionFocus?:boolean;effects?:BackgroundEffects;preference:BokehPreference;mode:string;level:number;width:number;reducedMotion:boolean;items:BokehItem[];glass?:THREE.Mesh; tint?:string};
type Entry={source:THREE.Object3D;proxy:THREE.Object3D;material:THREE.ShaderMaterial;depth:{value:number};from:number;to:number;current:number;start:number};
const depthVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const depthFragment=`#include <packing>
 uniform float maskDepth;uniform sampler2D alphaMap;uniform bool useAlphaMap;varying vec2 vUv;
 void main(){if(useAlphaMap&&texture2D(alphaMap,vUv).a<0.5)discard;gl_FragColor=packDepthToRGBA(maskDepth);}`;
function depthMaterial(depth:{value:number},map:THREE.Texture|null=null){
 return new THREE.ShaderMaterial({uniforms:{maskDepth:depth,alphaMap:{value:map},useAlphaMap:{value:!!map}},vertexShader:depthVertex,fragmentShader:depthFragment,side:THREE.DoubleSide,depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false,allowOverride:false});
}
function lineDepthMaterial(source:LineMaterial,depth:{value:number},gradient=false){
 const material=new LineMaterial({linewidth:source.linewidth,dashed:source.dashed,worldUnits:source.worldUnits,dashScale:source.dashScale,dashSize:source.dashSize,gapSize:source.gapSize,dashOffset:source.dashOffset,depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false,allowOverride:false});
 material.onBeforeCompile=shader=>{
  shader.uniforms.maskDepth=depth;
  if(gradient){
   shader.vertexShader='attribute float instanceBehindStart;attribute float instanceBehindEnd;varying float vBehind;\n'+shader.vertexShader.replace('void main() {','void main() {vBehind=position.y<0.5?instanceBehindStart:instanceBehindEnd;');
   shader.fragmentShader='varying float vBehind;\n'+shader.fragmentShader;
  }
  shader.fragmentShader='#include <packing>\nuniform float maskDepth;\n'+shader.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor=packDepthToRGBA(maskDepth);').replace('#include <colorspace_fragment>','');
  if(gradient){
   const distance=`(${FOCUS}.0+max(0.0,vBehind)*${PLANE_GAP}.0)`;
   shader.fragmentShader=shader.fragmentShader.replace('packDepthToRGBA(maskDepth)',`packDepthToRGBA(((${MASK_NEAR}.0-${distance})*${MASK_FAR}.0)/((${MASK_FAR}.0-${MASK_NEAR}.0)*-${distance}))`);
  }
 };
 material.customProgramCacheKey=()=> 'knowledge-bokeh-line-depth-v2-'+gradient;return material;
}

/** r187 clear colours must be prepared after binding the linear composer target. */
class LinearClearPass extends Pass{
 constructor(){super();this.needsSwap=false}
 override render(renderer:THREE.WebGLRenderer,_write:THREE.WebGLRenderTarget,read:THREE.WebGLRenderTarget){const color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();renderer.setRenderTarget(read);renderer.setClearColor(color,alpha)}
}

/** Standard Three BokehPass, supplied with disposable billboard/line depth proxies. */
export class KnowledgeBokehPass extends BokehPass{
 readonly output=new OutputPass();
 private readonly clearPass=new LinearClearPass();
 private readonly fallback=new ShaderPass(CopyShader);
 private readonly plane=new THREE.PlaneGeometry(1,1);
 private readonly entries=new Map<THREE.Object3D,Entry>();
 private failed=false;
 private readonly maskScene:THREE.Scene;
 private readonly maskCamera:THREE.PerspectiveCamera;
 private readonly sourceCamera:THREE.PerspectiveCamera;
 private readonly frame:()=>BokehFrame;
 private readonly onFailure:(message:string)=>void;
 constructor(sourceCamera:THREE.PerspectiveCamera,frame:()=>BokehFrame,onFailure:(message:string)=>void){
  const maskScene=new THREE.Scene(),maskCamera=new THREE.PerspectiveCamera();super(maskScene,maskCamera,{focus:FOCUS,aperture:0,maxblur:0});this.sourceCamera=sourceCamera;this.frame=frame;this.onFailure=onFailure;this.maskScene=maskScene;this.maskCamera=maskCamera;
  // The bundled kernel averages RGBA, then forces alpha=1. Preserve its averaged alpha so
  // transparent layers do not turn the empty canvas black when composited separately.
  this.materialBokeh.fragmentShader=this.materialBokeh.fragmentShader.replace('gl_FragColor.a = 1.0;','');
  this.needsSwap=true;this.configure();
 }
 attach(composer:EffectComposer){composer.insertPass(this.clearPass,0);composer.addPass(this);composer.addPass(this.output)}
 configure(){const frame=this.frame();this.enabled=!this.failed&&bokehSettings(frame.preference,frame.mode,frame.level,frame.width).enabled}
 private sync(frame:BokehFrame){
  const now=performance.now(),wanted=new Set(frame.items.map(item=>item.object));
  for(const [source,entry] of this.entries)if(!wanted.has(source)){this.maskScene.remove(entry.proxy);entry.material.dispose();this.entries.delete(source)}
  // Copy the real projection/pose exactly. Near/far metadata describe only our virtual mask depth.
  this.sourceCamera.updateMatrixWorld();this.maskCamera.copy(this.sourceCamera);this.maskCamera.near=MASK_NEAR;this.maskCamera.far=MASK_FAR;
  for(const item of frame.items){
   const source=item.object as THREE.Sprite|THREE.Mesh|Line2|THREE.Line,depth=packedMaskDepth(item.behind);let entry=this.entries.get(source);
   if(!entry){
    const uniform={value:depth};let proxy:THREE.Object3D,material:THREE.ShaderMaterial;
    if(source instanceof THREE.Sprite){material=depthMaterial(uniform,source.material.map);material.depthTest=item.order>=20;material.depthWrite=item.order>=20;proxy=new THREE.Mesh(this.plane,material)}
    else if((source as Line2).isLine2){material=lineDepthMaterial(source.material as LineMaterial,uniform,!!item.gradient);proxy=new Line2((source as Line2).geometry,material as LineMaterial)}
    else{material=depthMaterial(uniform,((source as THREE.Mesh).material as THREE.MeshBasicMaterial)?.map||null);proxy=(source as THREE.Line).isLine?new THREE.Line((source as THREE.Line).geometry,material):new THREE.Mesh((source as THREE.Mesh).geometry,material)}
    proxy.matrixAutoUpdate=false;entry={source,proxy,material,depth:uniform,from:depth,to:depth,current:depth,start:now};this.entries.set(source,entry);this.maskScene.add(proxy);
   }
   if(entry.to!==depth){entry.from=entry.current;entry.to=depth;entry.start=now}
   const t=frame.reducedMotion?1:Math.min(1,(now-entry.start)/300);entry.current=entry.from+(entry.to-entry.from)*(1-Math.pow(1-t,3));entry.depth.value=entry.current;entry.proxy.renderOrder=item.order;
   let visible=true;for(let node:THREE.Object3D|null=source;node;node=node.parent)if(!node.visible){visible=false;break}entry.proxy.visible=visible;
   source.updateWorldMatrix(true,false);
   if(source instanceof THREE.Sprite){const position=source.getWorldPosition(new THREE.Vector3()),scale=source.getWorldScale(new THREE.Vector3());entry.proxy.matrix.compose(position,this.sourceCamera.quaternion,scale)}
   else entry.proxy.matrix.copy(source.matrixWorld);
   entry.proxy.matrixWorldNeedsUpdate=true;
   if((source as any).geometry)(entry.proxy as THREE.Mesh).geometry=(source as THREE.Mesh).geometry;
   if((source as Line2).isLine2){const material=entry.material as LineMaterial,original=source.material as LineMaterial;material.resolution.copy(original.resolution);material.linewidth=original.linewidth}
  }
  const settings=bokehSettings(frame.preference,frame.mode,frame.level,frame.width),uniforms=this.uniforms as Record<string,{value:any}>;uniforms.focus.value=FOCUS;uniforms.aperture.value=settings.enabled?settings.aperture:0;uniforms.maxblur.value=settings.enabled?settings.maxblur:0;
 }
 override render(renderer:THREE.WebGLRenderer,write:THREE.WebGLRenderTarget,read:THREE.WebGLRenderTarget,delta=0,mask=false){
  const target=renderer.getRenderTarget(),color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  try{this.sync(this.frame());super.render(renderer,write,read,delta,mask)}catch{this.failed=true;this.enabled=false;this.fallback.render(renderer,write,read,delta,mask);this.onFailure('Background blur is unavailable; the graph remains sharp. Reload to retry.')}finally{this.maskScene.overrideMaterial=null;renderer.autoClear=auto;renderer.setClearColor(color,alpha);renderer.setRenderTarget(target)}
 }
 detach(composer:EffectComposer){composer.removePass(this.clearPass);composer.removePass(this);composer.removePass(this.output);this.dispose()}
 override dispose(){for(const entry of this.entries.values())entry.material.dispose();this.entries.clear();this.maskScene.clear();this.plane.dispose();this.fallback.dispose();this.output.dispose();super.dispose()}
}

const quadVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const gaussianFragment=`uniform sampler2D tDiffuse;uniform vec2 stepSize;varying vec2 vUv;
 void main(){vec4 c=texture2D(tDiffuse,vUv)*0.199675628;
 c+=(texture2D(tDiffuse,vUv+stepSize)+texture2D(tDiffuse,vUv-stepSize))*0.176213123;
 c+=(texture2D(tDiffuse,vUv+stepSize*2.0)+texture2D(tDiffuse,vUv-stepSize*2.0))*0.121109390;
 c+=(texture2D(tDiffuse,vUv+stepSize*3.0)+texture2D(tDiffuse,vUv-stepSize*3.0))*0.064825185;
 c+=(texture2D(tDiffuse,vUv+stepSize*4.0)+texture2D(tDiffuse,vUv-stepSize*4.0))*0.027023158;
 c+=(texture2D(tDiffuse,vUv+stepSize*5.0)+texture2D(tDiffuse,vUv-stepSize*5.0))*0.008773135;
 c+=(texture2D(tDiffuse,vUv+stepSize*6.0)+texture2D(tDiffuse,vUv-stepSize*6.0))*0.002218196;gl_FragColor=c;}`;
const compositeFragment=`uniform sampler2D backgroundMap;uniform sampler2D frostMap;uniform sampler2D maskMap;uniform sampler2D sharpMap;
 uniform sampler2D edgeBackMap;uniform sampler2D edgeFrontMap;uniform sampler2D edgeFrostMap;uniform sampler2D protectedMap;uniform bool hasHighlights;uniform float edgeOpacity;uniform float edgeBrightness;
 uniform vec3 tint;uniform vec3 surfaceTint;uniform float tintOpacity;uniform bool frostEnabled;varying vec2 vUv;
 vec3 overCanvas(vec4 c){return c.rgb+tint*(1.0-c.a);}
 void main(){vec3 bg=overCanvas(texture2D(backgroundMap,vUv));float mask=texture2D(maskMap,vUv).r;
 if(frostEnabled)bg=mix(bg,overCanvas(texture2D(frostMap,vUv)),mask);
 bg=mix(bg,surfaceTint,mask*tintOpacity);vec4 front=texture2D(sharpMap,vUv);vec3 result=front.rgb+bg*(1.0-front.a);
 if(hasHighlights){float protect=texture2D(protectedMap,vUv).a;vec4 edge=texture2D(edgeBackMap,vUv);if(frostEnabled)edge=mix(edge,texture2D(edgeFrostMap,vUv),mask);edge.rgb*=edgeBrightness*edgeOpacity;edge.a*=edgeOpacity;edge*=1.0-protect;result=edge.rgb+result*(1.0-edge.a);vec4 fore=texture2D(edgeFrontMap,vUv)*(1.0-protect);result=fore.rgb+result*(1.0-fore.a);}gl_FragColor=vec4(result,1.0);}`;
const layerFragment=`uniform sampler2D accumulated;uniform sampler2D layerMap;uniform float opacity;uniform float brightness;varying vec2 vUv;
 void main(){vec4 a=texture2D(accumulated,vUv),b=texture2D(layerMap,vUv);float alpha=b.a*opacity;gl_FragColor=vec4(b.rgb*brightness*opacity+a.rgb*(1.0-alpha),alpha+a.a*(1.0-alpha));}`;
type Variants={back:THREE.Material;front:THREE.Material;mask:THREE.Material};

/** Fixed-orientation, per-layer composition. World-Z clipping is the physical front-plane test. */
export class FrostedGraphPass extends Pass{
 readonly output=new OutputPass();
 private readonly clearPass=new LinearClearPass();
 private readonly fallback=new ShaderPass(CopyShader);
 private readonly layer=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,stencilBuffer:true});
 private readonly softened=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,stencilBuffer:true});
 private readonly accumulatorA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 private readonly accumulatorB=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 private readonly frostX=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 private readonly frostY=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 private readonly mask=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4,depthBuffer:false});
 private readonly sharp=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,stencilBuffer:true});
 private readonly edgeBack=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,stencilBuffer:true});
 private readonly edgeFront=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,stencilBuffer:true});
 private readonly protectedCards=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 private readonly glassScene=new THREE.Scene();
 private readonly glassMaterial=new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
 private readonly glassProxy=new THREE.Mesh(new THREE.BufferGeometry(),this.glassMaterial);
 private readonly gaussian=new ShaderPass({uniforms:{tDiffuse:{value:null},stepSize:{value:new THREE.Vector2()}},vertexShader:quadVertex,fragmentShader:gaussianFragment});
 private readonly composite=new THREE.ShaderMaterial({uniforms:{edgeBackMap:{value:this.edgeBack.texture},edgeFrontMap:{value:this.edgeFront.texture},edgeFrostMap:{value:this.layer.texture},protectedMap:{value:this.protectedCards.texture},hasHighlights:{value:false},edgeOpacity:{value:1},edgeBrightness:{value:1},backgroundMap:{value:null},frostMap:{value:this.frostY.texture},maskMap:{value:this.mask.texture},sharpMap:{value:this.sharp.texture},tint:{value:new THREE.Color()},surfaceTint:{value:new THREE.Color()},tintOpacity:{value:0},frostEnabled:{value:false}},vertexShader:quadVertex,fragmentShader:compositeFragment,depthTest:false,depthWrite:false});
 private readonly layerMaterial=new THREE.ShaderMaterial({uniforms:{accumulated:{value:null},layerMap:{value:null},opacity:{value:1},brightness:{value:1}},vertexShader:quadVertex,fragmentShader:layerFragment,depthTest:false,depthWrite:false});
 private readonly quad=new FullScreenQuad(this.composite);
 private readonly layerQuad=new FullScreenQuad(this.layerMaterial);
 private readonly variants=new Map<THREE.Material,Variants>();
 private readonly surfaceZ={value:-8};
 private readonly bokeh:KnowledgeBokehPass;
 private depthItems:BokehItem[]=[];
 private frameNow:BokehFrame={preference:'off',mode:'flat',level:0,width:1,reducedMotion:true,items:[]};
 private width=1;private height=1;private failed=false;private lastKey='';
 private source:THREE.Scene;private camera:THREE.PerspectiveCamera;private frame:()=>BokehFrame;private onFailure:(message:string)=>void;
 constructor(source:THREE.Scene,camera:THREE.PerspectiveCamera,frame:()=>BokehFrame,onFailure:(message:string)=>void){
  super();this.source=source;this.camera=camera;this.frame=frame;this.onFailure=onFailure;this.needsSwap=true;this.glassProxy.matrixAutoUpdate=false;this.glassProxy.geometry.dispose();this.glassScene.add(this.glassProxy);
  this.bokeh=new KnowledgeBokehPass(camera,()=>({...this.frameNow,preference:'subtle',items:this.depthItems}),message=>{throw new Error(message)});this.configure();
 }
 private effects(frame:BokehFrame):BackgroundEffects{return frame.effects||{blur:frame.preference==='subtle',darken:false,darkenAmount:.25,transparency:false}}
 configure(){const f=this.frame();this.enabled=!this.failed&&(effectsEnabled(this.effects(f),f.mode,f.level)||!!f.selectionFocus)}
 attach(composer:EffectComposer){composer.insertPass(this.clearPass,0);composer.addPass(this);composer.addPass(this.output)}
 detach(composer:EffectComposer){composer.removePass(this.clearPass);composer.removePass(this);composer.removePass(this.output);this.dispose()}
 override setSize(width:number,height:number){this.width=width;this.height=height;this.lastKey='';for(const target of [this.layer,this.softened,this.accumulatorA,this.accumulatorB,this.frostX,this.frostY,this.mask,this.sharp,this.edgeBack,this.edgeFront,this.protectedCards])target.setSize(width,height);this.bokeh.setSize(width,height)}
 private visibleOnly(items:THREE.Object3D[],render:()=>void){
  const allowed=new Set(items),saved:{object:THREE.Object3D;visible:boolean}[]=[];
  this.source.traverse((object:any)=>{if(object.geometry||object.isSprite){saved.push({object,visible:object.visible});object.visible=object.visible&&allowed.has(object)}});
  try{render()}finally{for(const entry of saved)entry.object.visible=entry.visible}
 }
 private material(object:THREE.Object3D):THREE.Material{return (object as any).material}
 private materials(object:THREE.Object3D,card:boolean,surface=false):Variants{
  const original=this.material(object) as THREE.Material&{color?:THREE.Color};let variants=this.variants.get(original);
  const sync=(value:Variants)=>{
   const f=this.frameNow,effects=this.effects(f),older=surface&&object.matrixWorld.elements[14]<this.surfaceZ.value-.5;
   for(const [mode,variant] of [['back',value.back],['front',value.front]] as const){
    const material=variant as THREE.Material&{color?:THREE.Color},darken=older&&mode==='back'&&f.mode==='layered'&&f.level>0&&effects.darken?effects.darkenAmount:0;
    // A faint pane must darken what shows through its area as well as its tint. Increase
    // shadow coverage, preserving the tint's premultiplied colour; layer brightness/alpha
    // are then applied once to the complete pane. Transparency still reduces coverage.
    const opacity=original.opacity+(1-original.opacity)*darken;
    if(material.color&&original.color)material.color.copy(original.color).multiplyScalar(opacity?original.opacity/opacity:0);
    material.opacity=opacity;material.userData.kgbMuted.value=object.userData.kgbMuted?1:0;
   }
   return value
  };
  if(variants)return sync(variants);const muted={value:object.userData.kgbMuted?1:0};
  const make=(mode:number)=>{
   const material=original.clone();material.userData.kgbMuted=muted;material.stencilWrite=!card&&!surface;material.stencilRef=1;material.stencilFunc=THREE.NotEqualStencilFunc;
   const previous=original.onBeforeCompile.bind(original);material.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);shader.uniforms.kgbSurfaceZ=this.surfaceZ;shader.uniforms.kgbMuted=muted;
    const position=(object as Line2).isLine2?'(position.y<0.5?instanceStart:instanceEnd)':object instanceof THREE.Sprite?'vec3(0.0)':'position';
    shader.vertexShader='varying float vKgbWorldZ;\n'+shader.vertexShader.replace('void main() {',`void main() {vKgbWorldZ=(modelMatrix*vec4(${position},1.0)).z;`);
    shader.fragmentShader='uniform float kgbMuted;varying float vKgbWorldZ;uniform float kgbSurfaceZ;\n'+shader.fragmentShader.replace('void main() {',`void main() {if(${mode<0?'vKgbWorldZ>kgbSurfaceZ':'vKgbWorldZ<=kgbSurfaceZ'})discard;`);
    if(card)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\nif(kgbMuted>0.5){gl_FragColor.rgb*=0.375;gl_FragColor.a*=0.5;}');
   };
   material.customProgramCacheKey=()=>original.customProgramCacheKey()+'-physical-plane-'+mode+'-'+!!(object as Line2).isLine2+'-'+card+'-'+surface;return material;
  };
  const mask=original.clone();mask.colorWrite=false;mask.depthTest=false;mask.depthWrite=false;mask.stencilWrite=true;mask.stencilRef=1;mask.stencilFunc=THREE.AlwaysStencilFunc;mask.stencilZPass=THREE.ReplaceStencilOp;
  variants={back:make(-1),front:make(1),mask};this.variants.set(original,variants);return sync(variants);
 }
 private renderItems(renderer:THREE.WebGLRenderer,target:THREE.WebGLRenderTarget,items:BokehItem[],mode:'back'|'front',clear=true,highlight=false){
  renderer.setRenderTarget(target);if(clear){renderer.setClearColor(0,0);renderer.clear(true,true,true)}else renderer.clear(false,true,true);
  const cards=this.frameNow.items.filter(item=>item.card&&(!highlight||!this.frameNow.selectionFocus||!item.muted)),saved:{object:any;material:THREE.Material}[]=[];
  const apply=(selected:BokehItem[],mask:boolean)=>{for(const item of selected){const object=item.object as any;if(!object.material||Array.isArray(object.material))continue;saved.push({object,material:object.material});object.material=this.materials(object,!!item.card,!!item.surface)[mask?'mask':mode]}};
  const restore=()=>{for(const entry of saved)entry.object.material=entry.material;saved.length=0};
  try{apply(cards,true);this.visibleOnly(cards.map(i=>i.object),()=>renderer.render(this.source,this.camera));restore();apply(items,false);this.visibleOnly(items.map(i=>i.object),()=>renderer.render(this.source,this.camera))}finally{restore()}
 }
 private key(frame:BokehFrame){
  const values:any[]=[this.effects(frame),frame.mode,frame.level,frame.tint,frame.selectionFocus,this.width,this.height,...this.camera.matrixWorld.elements,...this.camera.projectionMatrix.elements];
  for(const item of frame.items){const o=item.object as any;o.updateWorldMatrix(true,false);const m=o.material;values.push(o.uuid,o.visible,...o.matrixWorld.elements,m?.color?.getHex(),m?.opacity,o.geometry?.id,o.geometry?.attributes?.instanceStart?.data?.uuid,item.sharp,item.plane,item.muted,item.highlighted,item.layerKey,item.surface)}
  if(frame.glass){frame.glass.updateWorldMatrix(true,false);const material=frame.glass.material as THREE.MeshBasicMaterial;values.push(...frame.glass.matrixWorld.elements,material.opacity,material.color.getHex(),frame.glass.geometry.id)}return JSON.stringify(values);
 }
 private compose(renderer:THREE.WebGLRenderer,frame:BokehFrame,delta:number){
  this.frameNow=frame;const settings=this.effects(frame),effects=(frame.mode==='flat'||frame.level===0)?{...settings,blur:false,darken:false,transparency:false}:settings,sourceBackground=this.source.background;this.source.background=null;
  try{
   frame.glass?.updateWorldMatrix(true,false);this.surfaceZ.value=frame.glass?.getWorldPosition(new THREE.Vector3()).z??-8;
   for(const item of frame.items)item.object.userData.kgbMuted=!!frame.selectionFocus&&!!item.muted;
   const wanted=new Set(frame.items.map(i=>this.material(i.object)));for(const [source,variants] of this.variants)if(!wanted.has(source)){for(const material of Object.values(variants))material.dispose();this.variants.delete(source)}
   let accumulated=this.accumulatorA,next=this.accumulatorB;renderer.setRenderTarget(accumulated);renderer.setClearColor(0,0);renderer.clear();
   const buckets=new Map<string,{plane:number;items:BokehItem[]}>();for(const item of frame.items){if(item.highlighted)continue;const plane=item.plane??Math.max(0,frame.level-Math.ceil(item.behind)),key=item.layerKey||String(plane);const entry=buckets.get(key)||{plane,items:[]};entry.items.push(item);buckets.set(key,entry)}
   for(const {items} of [...buckets.values()].sort((a,b)=>a.plane-b.plane)){
    const normal=items.filter(i=>!i.sharp),crisp=items.filter(i=>i.sharp);this.renderItems(renderer,this.layer,normal,'back');let ready=this.layer;
    if(effects.blur&&normal.length){this.depthItems=normal.filter(i=>i.depth!==false);this.bokeh.render(renderer,this.softened,this.layer,delta);ready=this.softened}
    if(crisp.length)this.renderItems(renderer,ready,crisp,'back',false);
    this.layerMaterial.uniforms.accumulated.value=accumulated.texture;this.layerMaterial.uniforms.layerMap.value=ready.texture;this.layerMaterial.uniforms.opacity.value=effects.transparency?.5:1;this.layerMaterial.uniforms.brightness.value=effects.darken?1-effects.darkenAmount:1;renderer.setRenderTarget(next);this.layerQuad.render(renderer);[accumulated,next]=[next,accumulated];
   }
   if(effects.blur){const ratio=this.width/Math.max(1,frame.width);this.gaussian.uniforms.stepSize.value.set(ratio/this.width,0);this.gaussian.render(renderer,this.frostX,accumulated,delta,false);this.gaussian.uniforms.stepSize.value.set(0,ratio/this.height);this.gaussian.render(renderer,this.frostY,this.frostX,delta,false)}
   renderer.setRenderTarget(this.mask);renderer.setClearColor(0,0);renderer.clear();if(frame.glass){this.glassProxy.geometry=frame.glass.geometry;this.glassProxy.matrix.copy(frame.glass.matrixWorld);this.glassProxy.matrixWorldNeedsUpdate=true;renderer.render(this.glassScene,this.camera)}
   this.renderItems(renderer,this.sharp,frame.items.filter(i=>!i.highlighted),'front');
   const highlights=frame.items.filter(i=>i.highlighted);this.composite.uniforms.hasHighlights.value=highlights.length>0;
   if(highlights.length){this.renderItems(renderer,this.edgeBack,highlights,'back',true,true);this.renderItems(renderer,this.edgeFront,highlights,'front',true,true);if(effects.blur){const ratio=this.width/Math.max(1,frame.width);this.gaussian.uniforms.stepSize.value.set(ratio/this.width,0);this.gaussian.render(renderer,this.softened,this.edgeBack,delta,false);this.gaussian.uniforms.stepSize.value.set(0,ratio/this.height);this.gaussian.render(renderer,this.layer,this.softened,delta,false)}renderer.setRenderTarget(this.protectedCards);renderer.setClearColor(0,0);renderer.clear();this.visibleOnly(frame.items.filter(i=>i.card&&(!frame.selectionFocus||!i.muted)).map(i=>i.object),()=>renderer.render(this.source,this.camera))}
   this.composite.uniforms.edgeOpacity.value=effects.transparency?.5:1;this.composite.uniforms.edgeBrightness.value=effects.darken?1-effects.darkenAmount:1;
   this.composite.uniforms.backgroundMap.value=accumulated.texture;this.composite.uniforms.tint.value.set(frame.tint||'#131d1a');this.composite.uniforms.surfaceTint.value.copy((frame.glass?.material as THREE.MeshBasicMaterial)?.color||this.composite.uniforms.tint.value);this.composite.uniforms.frostEnabled.value=effects.blur;this.composite.uniforms.tintOpacity.value=(effects.blur?.06:0)+((frame.glass?.material as THREE.Material)?.opacity||0);
  }finally{this.source.background=sourceBackground}
 }
 override render(renderer:THREE.WebGLRenderer,write:THREE.WebGLRenderTarget,read:THREE.WebGLRenderTarget,delta=0){
  const target=renderer.getRenderTarget(),color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  try{renderer.autoClear=false;this.camera.updateMatrixWorld();const frame=this.frame(),key=this.key(frame);if(key!==this.lastKey){this.compose(renderer,frame,delta);this.lastKey=key}renderer.setRenderTarget(this.renderToScreen?null:write);this.quad.render(renderer)}
  catch(error){this.failed=true;this.enabled=false;this.fallback.render(renderer,write,read,delta,false);this.onFailure('Background effects are unavailable; the graph remains usable. Reload to retry.');console.warn('Graph depth effects disabled:',error)}
  finally{renderer.autoClear=auto;renderer.setClearColor(color,alpha);renderer.setRenderTarget(target)}
 }
 override dispose(){for(const target of [this.layer,this.softened,this.accumulatorA,this.accumulatorB,this.frostX,this.frostY,this.mask,this.sharp,this.edgeBack,this.edgeFront,this.protectedCards])target.dispose();for(const variants of this.variants.values())for(const material of Object.values(variants))material.dispose();this.variants.clear();this.bokeh.dispose();this.gaussian.dispose();this.composite.dispose();this.layerMaterial.dispose();this.quad.dispose();this.layerQuad.dispose();this.glassMaterial.dispose();this.glassScene.clear();this.fallback.dispose();this.output.dispose()}
}
