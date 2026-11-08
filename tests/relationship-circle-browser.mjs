import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8769';
assert.ok((await(await fetch(url+'/api/health')).json()).project.replaceAll('\\','/').endsWith('/output/consolidation-qa'));
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
try{
  await page.goto(url);await idle();
  await page.locator('.sidebar').getByRole('button',{name:'Plant communities',exact:true}).click();await idle();
  await page.locator('.visible-topics summary').click();
  await page.getByRole('button',{name:'Inspect Carob plant communities',exact:true}).click();
  await page.evaluate(()=>window.__connectionDraws=[]);
  await page.getByRole('button',{name:'Explore this topic',exact:true}).click();await idle();
  let s=await state();circle(s);const positions=structuredClone(s.positions);
  let windowBounds=await page.locator('.graph-canvas').boundingBox();
  let renderedFrame=await page.evaluate(()=>window.__layerFrames.at(-1));
  check('The rendered connection frame matches the graph window proportions',renderedFrame&&Math.abs(renderedFrame.width/renderedFrame.height-windowBounds.width/windowBounds.height)<0.00001);
  check('Nine related topics form four upper and five lower arc positions',s.view.endpoint_ids.length===9&&Object.keys(s.positions).length===10);
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
  check('Topics use most of the resized frame height',(()=>{const points=Object.values(resized.positions);return (Math.max(...points.map(p=>p.y))+62-Math.min(...points.map(p=>p.y))+62)/renderedFrame.height>.85;})());
  check('The frame and topic arcs follow the resized window format',renderedFrame&&Math.abs(renderedFrame.width/renderedFrame.height-windowBounds.width/windowBounds.height)<0.00001);
  await page.screenshot({path:'output/consolidation-qa/relationship-circle-portrait-frame.png'});
  await page.setViewportSize({width:1500,height:2100});await page.getByRole('button',{name:'Fit',exact:true}).click();await idle();
  const tall=await state();circle(tall);const tallBounds=await page.locator('.graph-canvas').boundingBox();
  const tallFrame=await page.evaluate(()=>window.__layerFrames.at(-1));
  check('A tall layer uses four upper and five lower topics across its available height',tallBounds.height>tallBounds.width&&Object.values(tall.positions).filter(p=>p.y<0).length===4&&Object.values(tall.positions).filter(p=>p.y>0).length===5&&(Math.max(...Object.values(tall.positions).map(p=>p.y))-Math.min(...Object.values(tall.positions).map(p=>p.y))+124)/tallFrame.height>.85);
  await page.screenshot({path:'output/consolidation-qa/relationship-circle-tall-arcs.png'});
  await page.setViewportSize({width:1600,height:1150});
  await page.getByRole('button',{name:'Fit',exact:true}).click();await idle();assert.deepEqual((await state()).positions,positions);check('Returning to the original window size restores its deterministic arc layout');
  await page.getByLabel('Centre',{exact:true}).selectOption('carob');await idle();circle(await state());check('A larger carob neighbourhood also forms a complete circle');
  await page.getByLabel('Centre',{exact:true}).selectOption('cocoon');await idle();circle(await state());check('Mixed methods, conditions and equipment remain in one circle');
  await page.getByLabel('Remove centre',{exact:true}).click();await idle();s=await state();check('Removing the centre keeps neighbours and removes the centre card',!s.centre&&!s.positions.cocoon&&s.view.endpoint_ids.length>0);
  check('No browser JavaScript exceptions',errors.length===0);
}catch(e){console.error(e.stack);await page.screenshot({path:'output/consolidation-qa/relationship-circle-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{writeFileSync('output/consolidation-qa/relationship-circle-results.json',JSON.stringify({checks,errors},null,2));await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
process.exit(process.exitCode||0);
