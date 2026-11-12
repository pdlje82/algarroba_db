import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {buildScene,sceneFrame,sceneRectangles} from '../frontend/scene.ts';
import {boxesOverlap} from '../frontend/relationshipCircle.ts';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8769';
assert.ok((await(await fetch(url+'/api/health')).json()).project.replaceAll('\\','/').endsWith('/output/consolidation-qa'));
const catalog=await(await fetch(url+'/api/catalog')).json();
const reference=await(await fetch(url+'/api/explore?scope=neighbors&centre=carob-community')).json();
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1150},reducedMotion:'reduce'});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
const check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
await page.addInitScript(()=>{
  window.__layerFrames=[];
  for(const type of [WebGLRenderingContext,WebGL2RenderingContext]){
    const buffer=type.prototype.bufferData;
    type.prototype.bufferData=function(...args){
      const a=args[1];
      if(ArrayBuffer.isView(a)&&a.length===12&&a[2]===0&&a[5]===0&&a[8]===0&&a[11]===0&&a[0]===a[9]&&a[3]===a[6]&&a[1]===a[4]&&a[7]===a[10]&&a[0]<a[3]&&a[1]<a[7])window.__layerFrames.push({width:a[3]-a[0],height:a[7]-a[1]});
      return buffer.apply(this,args);
    };
  }
  window.__connectionDraws=[];
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
    if(String(text).includes('includes companion')||String(text)==='occurs in')window.__connectionDraws.push({text,width:this.measureText(text).width,maxWidth,canvasWidth:this.canvas.width,canvasHeight:this.canvas.height});
    return fill.call(this,text,x,y,maxWidth);
  };
});
const idle=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});await page.waitForTimeout(300);};
const state=async()=>page.evaluate(async()=>{
  const local=JSON.parse(localStorage.getItem('kgb:exploration:v6')||'null');
  const mirror=await new Promise(resolve=>{const r=indexedDB.open('kgb-exploration',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('sessions').objectStore('sessions').get('kgb:exploration:v6');q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>{resolve(null);db.close();};};r.onerror=()=>resolve(null);});
  const payload=[local,mirror].filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt)[0];return payload.history.entries[payload.history.index];
});
const circle=s=>{
  const centre=s.positions[s.centre];assert.deepEqual(centre,{x:0,y:0});
  const neighbours=Object.entries(s.positions).filter(([id])=>id!==s.centre).map(([,p])=>p);
  assert.equal(neighbours.filter(p=>p.y<0).length,Math.floor(neighbours.length/2));
  assert.equal(neighbours.filter(p=>p.y>0).length,Math.ceil(neighbours.length/2));
};
const ellipseMatches=(s,bounds)=>{
  const points=Object.values(s.positions),w=2*Math.max(...points.map(p=>Math.abs(p.x)))+234,h=2*Math.max(...points.map(p=>Math.abs(p.y)))+124;
  return Math.abs((w+50)/(h+50)-bounds.width/bounds.height)<.005;
};
try{
  await page.goto(url);await idle();
  await page.evaluate(()=>window.__connectionDraws=[]);
  await page.getByLabel('Centre',{exact:true}).selectOption('carob-community');await idle();
  let s=await state();circle(s);const positions=structuredClone(s.positions);
  let windowBounds=await page.locator('.graph-canvas').boundingBox();
  let renderedFrame=await page.evaluate(()=>window.__layerFrames.at(-1));
  check('The rendered connection frame matches the graph window proportions',renderedFrame&&Math.abs(renderedFrame.width/renderedFrame.height-windowBounds.width/windowBounds.height)<0.00001);
  check('Related topics split evenly across upper and lower arcs',s.view.endpoint_ids.length===reference.endpoint_ids.length&&Object.keys(s.positions).length===reference.endpoint_ids.length+1);
  const draws=await page.evaluate(()=>window.__connectionDraws);
  check('All incoming/outgoing labels are drawn, including all eight companion labels',draws.filter(d=>d.text==='includes companion').length>=8&&draws.some(d=>d.text==='occurs in'));
  check('Canvas text fits its reserved label surface',draws.every(d=>d.width<=d.maxWidth));
  await page.locator('.context-strip').scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/consolidation-qa/relationship-circle-light.png'});
  const oldIndex=s.view.edges.find(e=>e.source==='carob'&&e.target==='carob-community');
  check('The incoming occurs-in relationship retains its original direction',!!oldIndex);
  await page.getByLabel('Appearance',{exact:true}).selectOption('dark');
  await page.getByLabel('Turn right',{exact:true}).click();await page.getByLabel('Tilt up',{exact:true}).click();await page.getByLabel('Zoom in',{exact:true}).click();await page.waitForTimeout(250);
  assert.deepEqual((await state()).positions,positions);check('Dark theme, rotation and zoom preserve circle geometry');
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await page.waitForTimeout(200);
  await page.screenshot({path:'output/consolidation-qa/relationship-circle-dark.png'});
  await page.reload();await idle();assert.deepEqual((await state()).positions,positions);check('Circle geometry survives reload');
  await page.getByLabel('Group by',{exact:true}).selectOption('type');await idle();s=await state();circle(s);
  const summaries=await page.evaluate(()=>window.__connectionDraws);
  check('Grouping retains separate incoming and outgoing labels',summaries.some(d=>d.text==='includes companion (8)')&&summaries.some(d=>d.text==='occurs in'));
  await page.getByLabel('Group by',{exact:true}).selectOption('none');await idle();
  const beforePreview=(await state()).positions;
  await page.getByLabel('Domain',{exact:true}).selectOption('technology');await idle();assert.deepEqual((await state()).positions,beforePreview);
  await page.getByLabel('Domain',{exact:true}).selectOption('all');await idle();check('Domain preview and cancellation retain the same circle');
  await page.evaluate(()=>window.__layerFrames=[]);
  await page.setViewportSize({width:1100,height:900});await page.getByRole('button',{name:'Fit',exact:true}).click();await idle();
  const resized=await state();circle(resized);assert.notDeepEqual(resized.positions,positions);assert.deepEqual(Object.keys(resized.positions).sort(),Object.keys(positions).sort());check('Resizing adapts the arcs to the window without changing their member topics');
  windowBounds=await page.locator('.graph-canvas').boundingBox();renderedFrame=await page.evaluate(()=>window.__layerFrames.at(-1));
  check('Resized topic ellipse follows the window',ellipseMatches(resized,windowBounds));
  check('The frame and topic arcs follow the resized window format',renderedFrame&&Math.abs(renderedFrame.width/renderedFrame.height-windowBounds.width/windowBounds.height)<0.00001);
  await page.screenshot({path:'output/consolidation-qa/relationship-circle-portrait-frame.png'});
  await page.setViewportSize({width:1500,height:2100});await page.getByRole('button',{name:'Fit',exact:true}).click();await idle();
  const tall=await state();circle(tall);const tallBounds=await page.locator('.graph-canvas').boundingBox();
  const tallFrame=await page.evaluate(()=>window.__layerFrames.at(-1));
  check('A tall layer uses a tall ellipse',tallBounds.height>tallBounds.width&&ellipseMatches(tall,tallBounds));
  await page.screenshot({path:'output/consolidation-qa/relationship-circle-tall-arcs.png'});
  await page.setViewportSize({width:1600,height:1150});
  await page.getByRole('button',{name:'Fit',exact:true}).click();await idle();assert.deepEqual((await state()).positions,positions);check('Returning to the original window size restores its deterministic arc layout');
  await page.getByLabel('Centre',{exact:true}).selectOption('carob');await idle();circle(await state());check('A larger carob neighbourhood also forms a complete circle');
  await page.getByLabel('Centre',{exact:true}).selectOption('cocoon');await idle();circle(await state());check('Mixed methods, conditions and equipment remain in one circle');
  await page.getByLabel('Centre',{exact:true}).selectOption('carob-community-almeria');await idle();
  const almeria=await state(),memberIds=Object.keys(almeria.positions).sort(),edgeIds=almeria.view.edges.map(e=>e.id).sort();
  await page.setViewportSize({width:2000,height:2400});
  const formatStyle=await page.addStyleTag({content:'.canvas-wrap {width:960px!important;height:540px!important;min-height:0!important;}'});
  for(const [name,aspect] of [['16-9',16/9],['4-3',4/3],['1-1',1],['3-4',3/4],['9-16',9/16]]){
    await formatStyle.evaluate((el,aspect)=>el.textContent=`.canvas-wrap {width:960px!important;height:${960/aspect}px!important;min-height:0!important;}`,aspect);
    await idle();await page.getByRole('button',{name:'Fit',exact:true}).click();await idle();
    const current=await state(),bounds=await page.locator('.graph-canvas').boundingBox(),scene=buildScene(current,current.view,catalog,bounds.width/bounds.height);
    circle(current);assert.deepEqual(Object.keys(current.positions).sort(),memberIds);assert.deepEqual(current.view.edges.map(e=>e.id).sort(),edgeIds);
    const frame=sceneFrame(scene,aspect),rects=sceneRectangles(scene),boxes=rects.map(r=>({...r.position,width:r.width,height:r.height}));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!boxesOverlap(boxes[i],boxes[j]));
    assert.ok(Math.abs(bounds.width/bounds.height-aspect)<.002);
    for(const r of rects){assert.ok(r.position.x-r.width/2>=frame.minX&&r.position.x+r.width/2<=frame.maxX);assert.ok(-r.position.y-r.height/2>=frame.minY&&-r.position.y+r.height/2<=frame.maxY);}
    const points=Object.values(current.positions),w=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))+234,h=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))+124;
    assert.ok(ellipseMatches(current,bounds));
    check('Almería community follows the window ellipse with clear labels and all facts at '+name);
    if(name==='16-9'||name==='9-16')await page.locator('.graph-canvas').screenshot({path:`output/consolidation-qa/compact-almeria-${name}.png`});
  }
  await formatStyle.evaluate(el=>el.remove());await page.setViewportSize({width:1600,height:1150});await idle();
  await page.getByLabel('Remove centre',{exact:true}).click();await idle();s=await state();check('Removing the centre keeps neighbours and removes the centre card',!s.centre&&!s.positions['carob-community-almeria']&&s.view.endpoint_ids.length>0);
  check('No browser JavaScript exceptions',errors.length===0);
}catch(e){console.error(e.stack);await page.screenshot({path:'output/consolidation-qa/relationship-circle-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{writeFileSync('output/consolidation-qa/relationship-circle-results.json',JSON.stringify({checks,errors},null,2));await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
process.exit(process.exitCode||0);
