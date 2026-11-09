import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8771';
assert.ok((await(await fetch(url+'/api/health')).json()).project.replaceAll('\\','/').endsWith('/output/irrigation-audit'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'});
page.setDefaultTimeout(15000);const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(s,ok=true)=>{assert.ok(ok,s);checks.push(s);console.log('PASS',s);};
await page.addInitScript(()=>{const draw=CanvasRenderingContext2D.prototype.fillText;window.__cardNames=new Map();CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){if(this.canvas.width===702&&this.canvas.height===372){if(!window.__cardNames.has(this.canvas))window.__cardNames.set(this.canvas,[]);window.__cardNames.get(this.canvas).push({text,x,y,maxWidth,width:this.measureText(text).width});}return draw.apply(this,arguments);};});
const idle=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});await page.waitForTimeout(150);};
try{
 const c=await(await fetch(url+'/api/catalog')).json();const named=c.topics.filter(t=>t.kind==='habitat'&&t.spanish_name&&t.english_name);
 await page.goto(url);await idle();
 await page.locator('.sidebar').getByRole('button',{name:/^Plant communities/}).click();await idle();
 await page.locator('.visible-topics').evaluate(el=>el.open=true);
 const list=await page.locator('.visible-topics').innerText();
 for(const t of named.filter(t=>!t.id.startsWith('carob-community')))check(t.spanish_name+' and English are in the community list',list.includes('ES: '+t.spanish_name)&&list.includes('EN: '+t.english_name));
 check('Community list has no scientific-name row',!list.includes('Sci:'));
 await page.getByRole('button',{name:'Inspect Mastic scrub',exact:true}).click();
 check('Community inspector uses Spanish/English only',JSON.stringify(await page.locator('.species-name-details dt').allTextContents())===JSON.stringify(['Spanish','English']));
 await page.screenshot({path:'output/community-names/communities-bilingual.png'});
 await page.locator('.sidebar').getByRole('button',{name:/^Carob plant communities/}).click();await idle();
 const calls=await page.evaluate(()=>[...window.__cardNames.values()]);
 const habitats=calls.filter(a=>a.some(x=>x.text==='HABITAT'));
 const rows=a=>[88,194].map(y=>a.filter(x=>x.x===98&&x.y>=y&&x.y<=y+32).map(x=>x.text).join(' '));
 for(const t of named)check(t.id+' graph card has ES/EN names',habitats.some(a=>JSON.stringify(rows(a))===JSON.stringify([t.spanish_name,t.english_name])));
 check('Community cards have no Latin row and fit their bounds',habitats.filter(a=>a.some(x=>x.text==='ES')).every(a=>!a.some(x=>x.text==='Sci')&&a.filter(x=>x.x===98).every(x=>x.width<=577&&x.y<=226)));
 await page.getByLabel('Centre',{exact:true}).selectOption('carob');await idle();
 await page.locator('.visible-topics').evaluate(el=>el.open=true);await page.getByRole('button',{name:'Inspect Carob tree',exact:true}).click();
 check('Individual species still keep the scientific name',JSON.stringify(await page.locator('.species-name-details dt').allTextContents())===JSON.stringify(['Spanish','English','Scientific name']));
 check('No browser errors',errors.length===0);
}catch(e){console.error(e.stack);process.exitCode=1;await page.screenshot({path:'output/community-names/failure.png'}).catch(()=>{});}
finally{writeFileSync('output/community-names/browser-results.json',JSON.stringify({checks,errors},null,2));await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);process.exit(process.exitCode||0);}
