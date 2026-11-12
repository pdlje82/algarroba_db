import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {buildScene} from '../frontend/scene.ts';
import {cardPort} from '../frontend/relationshipCircle.ts';
import {palettes} from '../frontend/appearance.ts';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8769';
assert.ok((await(await fetch(url+'/api/health')).json()).project.replaceAll('\\','/').endsWith('/output/consolidation-qa'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1150},reducedMotion:'reduce'});
const errors=[],checks=[],results=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.__skipBackplate=false;window.__backplateDraws=0;
 for(const kind of [WebGLRenderingContext,WebGL2RenderingContext]){
  const names=new WeakMap(),values=new WeakMap();
  const locate=kind.prototype.getUniformLocation;
  kind.prototype.getUniformLocation=function(program,name){const location=locate.call(this,program,name);if(location)names.set(location,{program,name});return location;};
  const uniform=kind.prototype.uniform1f;
  kind.prototype.uniform1f=function(location,value){const info=names.get(location);if(info?.name==='opacity')values.set(info.program,value);return uniform.call(this,location,value);};
  for(const method of ['drawElements','drawArrays']){
   const draw=kind.prototype[method];kind.prototype[method]=function(...args){
    if(Math.abs((values.get(this.getParameter(this.CURRENT_PROGRAM))??0)-0.7)<0.00001){window.__backplateDraws++;if(window.__skipBackplate)return;}
    return draw.apply(this,args);
   };
  }
 }
});
const idle=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});await page.waitForTimeout(600);};
const state=async()=>page.evaluate(async()=>{
 const local=JSON.parse(localStorage.getItem('kgb:exploration:v6')||'null');
 const mirror=await new Promise(resolve=>{const r=indexedDB.open('kgb-exploration',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('sessions').objectStore('sessions').get('kgb:exploration:v6');q.onsuccess=()=>{resolve(q.result);db.close();};};});
 const s=[local,mirror].filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt)[0];return s.history.entries[s.history.index];
});
const catalog=await(await fetch(url+'/api/catalog')).json();
const compare=async(name)=>{
 await idle();await page.mouse.move(1,1);
 const s=await state(),rect=await page.locator('.graph-canvas').boundingBox();
 const scene=buildScene(s,s.view,catalog,rect.width/rect.height);
 const camera=new THREE.PerspectiveCamera(50,rect.width/rect.height,.1,250000);
 camera.position.copy(s.camera.position);camera.lookAt(new THREE.Vector3().copy(s.camera.target));camera.updateMatrixWorld();
 const polygon=(x,y,z,w,h)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy])=>{
  const p=new THREE.Vector3(x+scene.offset.x+dx*(w/2-8),y+scene.offset.y+dy*(h/2-8),z).project(camera);
  return {x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};
 });
 const cards=scene.cards.map(c=>polygon(c.position.x,-c.position.y,6,c.width,c.height));
 const labels=scene.links.flatMap(e=>e.labelPlacement?[polygon(e.labelPlacement.position.x,-e.labelPlacement.position.y,3,e.labelPlacement.width,e.labelPlacement.height)]:[]);
 const byId=new Map(scene.cards.map(c=>[c.id,c]));
 const linePoints=scene.links.flatMap(e=>{
  const a=byId.get(e.source),b=byId.get(e.target),start=cardPort(a,a.position,b.position),end=cardPort(b,b.position,a.position);
  return Array.from({length:40},(_,i)=>{
   const t=(i+.5)/40,p=new THREE.Vector3(start.x+(end.x-start.x)*t+scene.offset.x,-start.y-(end.y-start.y)*t+scene.offset.y,1).project(camera);
   return {x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};
  });
 });
 const palette=palettes[await page.getByLabel('Appearance',{exact:true}).inputValue()];
 const lineColors=[palette.edge,palette.active].map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
 await page.evaluate(()=>window.__skipBackplate=false);await page.waitForTimeout(120);
 const on=await page.screenshot();
 await page.evaluate(()=>window.__skipBackplate=true);await page.waitForTimeout(120);
 const off=await page.screenshot();
 await page.evaluate(()=>window.__skipBackplate=false);
 const counts=await page.evaluate(async({on,off,cards,labels,linePoints,lineColors})=>{
  const decode=async(data)=>{const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return {pixels:ctx.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};};
  const a=await decode(on),b=await decode(off);
  const count=polygons=>{
   const mask=document.createElement('canvas');mask.width=a.width;mask.height=a.height;const ctx=mask.getContext('2d');
   for(const poly of polygons){ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
   const m=ctx.getImageData(0,0,a.width,a.height).data;let changed=0,total=0;
   for(let i=0;i<m.length;i+=4)if(m[i+3]===255){total++;if(Math.max(...[0,1,2].map(c=>Math.abs(a.pixels[i+c]-b.pixels[i+c])))>3)changed++;}
   return {changed,total};
  };
  const linePixels=new Set();
  for(const point of linePoints)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const x=Math.round(point.x)+dx,y=Math.round(point.y)+dy;
   if(x<0||y<0||x>=a.width||y>=a.height)continue;
   const i=(y*a.width+x)*4;
   // Compare fully covered line pixels, excluding ordinary antialiased edges.
   if(lineColors.some(color=>color.every((c,j)=>Math.abs(b.pixels[i+j]-c)<=1)))linePixels.add(i);
  }
  const lines={total:linePixels.size,changed:[...linePixels].filter(i=>[0,1,2].some(c=>Math.abs(a.pixels[i+c]-b.pixels[i+c])>3)).length};
  return {cards:count(cards),labels:count(labels),lines};
 },{on:on.toString('base64'),off:off.toString('base64'),cards,labels,linePoints,lineColors});
 results.push({name,...counts});console.log(name,JSON.stringify(counts));
 if(counts.cards.changed||counts.labels.changed){writeFileSync(`output/consolidation-qa/opacity-${name}-on.png`,on);writeFileSync(`output/consolidation-qa/opacity-${name}-off.png`,off);}
 assert.ok(counts.cards.total>100&&counts.labels.total>20,'Opaque surfaces sampled');
 assert.equal(counts.cards.changed,0,'Backplate must not paint over opaque cards');
 assert.equal(counts.labels.changed,0,'Backplate must not paint over opaque labels');
 assert.ok(counts.lines.total>10,'Connection-line pixels sampled');
 assert.equal(counts.lines.changed,0,'Backplate must not paint over connection lines');
 checks.push(name);
};
try{
 await page.goto(url);await idle();await page.getByLabel('Appearance',{exact:true}).selectOption('dark');
 await page.locator('.sidebar').getByRole('button',{name:'Plant communities',exact:true}).click();await idle();
 await page.locator('.visible-topics summary').click();await page.getByRole('button',{name:'Inspect Carob plant communities',exact:true}).click();
 await page.getByRole('button',{name:'Show connected topics',exact:true}).click();await idle();
 await compare('dark-default');
 await page.getByLabel('Turn right',{exact:true}).click();await page.getByLabel('Tilt up',{exact:true}).click();
 await compare('dark-angled');
 await page.getByLabel('Appearance',{exact:true}).selectOption('light');await compare('light-angled');
 await page.getByLabel('Zoom out',{exact:true}).click();await page.getByLabel('Zoom out',{exact:true}).click();await compare('light-zoomed-out');
 for(let i=0;i<5;i++){await page.getByLabel('Turn right',{exact:true}).click();await page.getByLabel('Tilt up',{exact:true}).click();}
 await compare('light-steep');
 await page.getByLabel('Appearance',{exact:true}).selectOption('dark');await compare('dark-steep');
 await page.screenshot({path:'output/consolidation-qa/opacity-fixed-steep.png'});
 assert.ok(await page.evaluate(()=>window.__backplateDraws>0),'Real backplate draws exercised');assert.deepEqual(errors,[]);
 console.log('PASS translucent surface never changes opaque foreground interiors');
}catch(error){console.error(error.stack);process.exitCode=1;}
finally{writeFileSync('output/consolidation-qa/opacity-artifact-results.json',JSON.stringify({checks,results,errors},null,2));await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}
process.exit(process.exitCode||0);
