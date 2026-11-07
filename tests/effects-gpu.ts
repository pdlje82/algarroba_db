/** Isolated real-WebGL checks: open /tests/effects-gpu.html using the local Vite server.
 * No API requests, knowledge data or browser-storage writes. Samples are linear RGB.
 */
import * as T from 'three';
import {FrostedGraphPass,type BokehFrame,type BokehItem} from '../frontend/bokeh';

const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setSize(720,480);renderer.setPixelRatio(1);document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,720/480,1,10000);
camera.position.z=1000;camera.updateMatrixWorld();
const colour=new T.Color().setRGB(.8,.4,.2),items:BokehItem[]=[];
function rect(x:number,y:number,w:number,h:number,z:number,opacity=1,card=false,layer='back',sharp=false){
 const object=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:colour,transparent:opacity<1,opacity,depthTest:false,depthWrite:false}));
 object.position.set(x,y,z);object.renderOrder=card?20:-300;scene.add(object);
 items.push({object,behind:sharp?0:1,plane:sharp?2:1,layerKey:layer,order:object.renderOrder,card,sharp,depth:card?undefined:false});
 return object;
}
const surface=rect(-200,110,140,100,-108,.3),border=rect(0,110,140,30,-107),title=rect(200,110,140,45,-106,1,true);
const backCard=rect(-200,-100,140,80,-100,1,true),frontCard=rect(200,-100,140,80,8,1,true,'front',true);
items.find(i=>i.object===surface)!.surface=true;
const oldCard=rect(0,-100,100,80,-210,1,true,'older'),area=rect(0,-100,100,80,-108,.3,false,'area');
Object.assign(items.find(i=>i.object===oldCard)!,{plane:0,behind:2});items.find(i=>i.object===area)!.surface=true;
// A connection beneath its own card must never bleed through when layer opacity is halved.
const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-280,-100,-101),new T.Vector3(-120,-100,-101)]),new T.LineBasicMaterial({color:'#00f',depthTest:false,depthWrite:false}));
line.renderOrder=-90;scene.add(line);items.push({object:line,behind:1,plane:1,layerKey:'back',order:10});
// Exercise the same mapped material used by headings, with a white calibration area.
const titleCanvas=document.createElement('canvas');titleCanvas.width=256;titleCanvas.height=128;
const ctx=titleCanvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,256,128);ctx.fillStyle='black';ctx.font='20px sans-serif';ctx.fillText('Layer title',8,25);
const titleTexture=new T.CanvasTexture(titleCanvas);titleTexture.colorSpace=T.SRGBColorSpace;title.material.map=titleTexture;
const glass=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({opacity:0,transparent:true}));scene.add(glass);
const frame:BokehFrame={preference:'off',effects:{blur:false,darken:false,darkenAmount:.25,transparency:false},mode:'layered',level:2,width:720,reducedMotion:true,items,glass,tint:'#131d1a'};
const pass=new FrostedGraphPass(scene,camera,()=>frame,message=>{throw Error(message)});pass.setSize(720,480);
const read=new T.WebGLRenderTarget(720,480),write=new T.WebGLRenderTarget(720,480),pixel=new Uint8Array(4),results:string[]=[];
function sample(object:T.Object3D){
 const p=object.getWorldPosition(new T.Vector3()).project(camera);
 renderer.readRenderTargetPixels(write,Math.round((p.x+1)*360),Math.round((p.y+1)*240),1,1,pixel);
 return Array.from(pixel).slice(0,3).map(v=>v/255);
}
function render(darken:boolean,transparency:boolean,blur=false){
 frame.effects={blur,darken,darkenAmount:.25,transparency};pass.render(renderer,write,read);
 return {surface:sample(surface),border:sample(border),title:sample(title),card:sample(backCard),front:sample(frontCard),area:sample(area)};
}
let failed=0;
function check(label:string,actual:number[],expected:number[]){
 const ok=actual.every((v,i)=>Math.abs(v-expected[i])<.014);
 results.push((ok?'PASS ':'FAIL ')+label+' actual '+actual.map(v=>v.toFixed(3))+' expected '+expected.map(v=>v.toFixed(3)));
 if(!ok)failed++;
}
const fg=colour.toArray();
for(const theme of ['dark','light']){
 frame.tint=theme==='dark'?'#131d1a':'#fcfbf7';const bg=new T.Color(frame.tint).toArray();
 for(const blur of [false,true]){
  const baseline=render(false,false,blur),dark=render(true,false,blur),alpha=render(false,true,blur),both=render(true,true,blur);
  const cases=[['baseline',baseline,1,1],['dark',dark,1,.75],['alpha',alpha,.5,1],['both',both,.5,.75]] as const;
  for(const [name,baseAlpha] of [['surface',.3],['border',1],['title',1],['card',1]] as const){
   for(const [label,values,opacity,brightness] of cases){
    check(`${theme} ${blur?'blur ':''}${label} ${name}`,values[name],fg.map((v,i)=>(name==='surface'?v*baseAlpha+bg[i]*(1-baseAlpha):v)*opacity*brightness+bg[i]*(1-opacity)));
   }
  }
  for(const [name,values,opacity,brightness] of cases){
   check(`${theme} ${blur?'blur ':''}${name} foreground unchanged`,values.front,fg);
   check(`${theme} ${blur?'blur ':''}${name} overlapping panes`,values.area,fg.map((v,i)=>v*.3*opacity*brightness+(v*opacity*brightness+bg[i]*(1-opacity))*(1-(.3+.7*(1-brightness))*opacity)));
  }
 }
}
const bg=new T.Color(frame.tint).toArray();
surface.material.color.setRGB(.2,.7,.9);surface.material.opacity=.6;border.material.color.setRGB(.4,.6,.8);
const hover=render(true,true);
check('updated hover surface colour/opacity',hover.surface,[.2,.7,.9].map((v,i)=>(v*.6+bg[i]*.4)*.75*.5+bg[i]*.5));
check('updated hover border colour',hover.border,[.4,.6,.8].map((v,i)=>v*.75*.5+bg[i]*.5));
frame.selectionFocus=true;items.find(i=>i.object===backCard)!.muted=true;
check('selection alpha multiplies layer alpha once',render(false,true).card,fg.map((v,i)=>v*.375*.5+bg[i]*.75));
frame.selectionFocus=false;
for(const mode of ['flat','overview']){
 frame.mode=mode==='flat'?'flat':'layered';frame.level=mode==='overview'?0:2;
 const values=render(true,true);check(mode+' keeps background cards unchanged',values.card,fg);check(mode+' keeps foreground unchanged',values.front,fg);
}
frame.mode='layered';frame.level=2;
document.querySelector('#status')!.textContent=failed?`${failed} GPU checks failed`:`All ${results.length} GPU checks passed`;
document.querySelector('#status')!.className=failed?'fail':'pass';document.querySelector('#results')!.textContent=results.join('\n');
pass.renderToScreen=true;pass.render(renderer,write,read);
window.addEventListener('pagehide',()=>{pass.dispose();read.dispose();write.dispose();titleTexture.dispose();for(const item of items){const o=item.object as T.Mesh;o.geometry?.dispose();(o.material as T.Material)?.dispose()}glass.geometry.dispose();glass.material.dispose();renderer.dispose()},{once:true});
