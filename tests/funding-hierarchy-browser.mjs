import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildScene} from '../frontend/scene.ts';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8774',output='output/funding-hierarchy-qa';
mkdirSync(output,{recursive:true});
const health=await(await fetch(url+'/api/health')).json();
assert.ok(health.project.replaceAll('\\','/').endsWith('/output/funding-hierarchy-qa'),'Use the isolated funding QA server.');
const catalog=await(await fetch(url+'/api/catalog')).json();
assert.ok(catalog.browse_groups.some(g=>g.id==='browse:funding-structure' && g.presentation==='hierarchy'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'});
page.setDefaultTimeout(15000);
const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const ready=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});};
const current=async()=>{
  await page.waitForTimeout(200);
  const h=await page.evaluate(async()=>{
    const local=JSON.parse(localStorage.getItem('kgb:exploration:v6')||'null');
    const mirror=await new Promise(resolve=>{const r=indexedDB.open('kgb-exploration',1);r.onsuccess=()=>{const q=r.result.transaction('sessions').objectStore('sessions').get('kgb:exploration:v6');q.onsuccess=()=>resolve(q.result);};});
    return [local,mirror].filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt)[0].history;
  });
  const state=h.entries[h.index],rect=await page.locator('.graph-canvas').boundingBox();
  return {state,scene:buildScene(state,state.view,catalog,rect.width/rect.height),history:h};
};
const sidebar=async id=>{
  if(!await page.locator(`.sidebar button[data-group-id="${id}"]`).count()){
    const group=catalog.browse_groups.find(g=>g.id===id);assert.ok(group);
    await sidebar(group.parent_id);
  }
  await page.locator(`.sidebar button[data-group-id="${id}"]`).click();await ready();
};
const openChild=async id=>{
  const group=catalog.browse_groups.find(g=>g.id===id),before=await current();
  assert.ok(before.scene.cards.some(c=>c.record.groupKey===id),`${id} is a child card`);
  await page.locator('.visible-topics').evaluate(e=>{e.open=true;});
  const article=page.locator('.visible-topics article').filter({has:page.getByRole('button',{name:'Inspect '+group.label,exact:true})});
  await article.getByRole('button',{name:'Open group',exact:true}).focus();await page.keyboard.press('Enter');await ready();
  assert.equal((await current()).state.groupId,id);
};
try{
  await page.goto(url);await ready();
  await sidebar('browse:funding-structure');
  check('Funding structure contains exactly the four evidenced branches',(await current()).scene.cards.length===4);
  await page.screenshot({path:`${output}/funding-structure.png`});
  for(const id of ['browse:funding-feader','browse:funding-pepac','browse:funding-leader','browse:funding-leader-andalusia','browse:funding-local-implementation'])await openChild(id);
  const local=await current();
  check('LEADER opens Local implementation with AL20 and AL30, without a province',local.scene.cards.some(c=>c.record.groupKey==='browse:funding-al20')&&local.scene.cards.some(c=>c.record.groupKey==='browse:funding-al30')&&!local.scene.cards.some(c=>c.id==='almeria'));
  await page.screenshot({path:`${output}/local-implementation.png`});
  await openChild('browse:funding-al20');
  const al20=await current();
  check('AL20 has Managing GDR, Funding lines and retained strategy groups',al20.scene.cards.length===3&&['browse:funding-al20-gdr','browse:funding-al20-lines','browse:al20-evidence'].every(id=>al20.scene.cards.some(c=>c.record.groupKey===id)));
  await page.screenshot({path:`${output}/al20.png`});
  await page.getByRole('button',{name:'Back',exact:true}).click();await ready();
  check('Back returns to the same local implementation layer',(await current()).state.groupId==='browse:funding-local-implementation');
  await openChild('browse:funding-al30');await openChild('browse:funding-al30-gdr');
  check('AL30 opens its own GDR without importing AL20 criteria',(await current()).scene.cards.map(c=>c.id).join(',')==='al30-gdr');
  await sidebar('browse:funding-al20');
  await page.locator('.inspector').getByRole('button',{name:'About '+catalog.topics.find(t=>t.id==='al20').label,exact:true}).click();
  check('About exposes the original AL20 topic and factual connections',await page.locator('.inspector').getByRole('button',{name:'Explore this topic',exact:true}).isVisible()&&(await page.locator('.inspector').innerText()).includes('served by'));
  await page.getByRole('button',{name:'Explore this topic',exact:true}).click();await ready();
  check('Ordinary topic exploration retains factual arrows',(await current()).scene.links.length>0);

  // Every hierarchy folder must open with named content and the same immutable factual snapshot.
  for(const group of catalog.browse_groups.filter(g=>g.presentation==='hierarchy')){
    await sidebar(group.id);
    const d=await current();
    assert.equal(d.state.groupId,group.id);assert.equal(d.state.grouping,'none');
    assert.equal(d.scene.links.length,0);assert.equal(d.scene.internal.length,0);
    assert.ok(d.scene.cards.length>0 && d.scene.cards.every(c=>c.record.label?.trim()));
    assert.equal(await page.getByLabel('Group by',{exact:true}).isDisabled(),true);
  }
  check('Every hierarchy folder opens named content, locks grouping and draws no arrows');
  await sidebar('browse:funding-prtr-regional');
  check('PRTR regional delivery retains both real project identities',['andarax-restoration-2023','nijar-fluvial-restoration'].every(id=>catalog.browse_groups.find(g=>g.id==='browse:funding-prtr-regional').members.some(m=>m.topic_id===id&&m.role==='shared')));
  const citation=page.locator('.inspector [aria-label="Group guide"] .citation-link').first();
  await citation.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.pdf-scroll')?.getAttribute('aria-busy')==='false');
  check('Keyboard opens the authority citation at its exact PDF page',Number(await page.getByLabel('PDF page',{exact:true}).inputValue())===1);
  await page.getByRole('button',{name:'Close source',exact:true}).click();
  await sidebar('browse:funding-al20');await page.getByRole('button',{name:'Refresh',exact:true}).click();await ready();
  await page.reload();await ready();
  check('Refresh and reload preserve the hierarchy scope',(await current()).state.groupId==='browse:funding-al20');
  const after=await(await fetch(url+'/api/catalog')).json();
  check('Browser verification preserves revision, facts and working plans',after.revision===catalog.revision&&JSON.stringify(after.relationships)===JSON.stringify(catalog.relationships)&&JSON.stringify(after.communities)===JSON.stringify(catalog.communities)&&JSON.stringify(after.irrigation_evidence)===JSON.stringify(catalog.irrigation_evidence));
  check('No uncaught browser errors',errors.length===0);
}catch(e){console.error(e);process.exitCode=1;await page.screenshot({path:`${output}/failure.png`}).catch(()=>{});}
finally{writeFileSync(`${output}/browser-report.json`,JSON.stringify({checks,errors},null,2));await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
process.exit(process.exitCode||0);
