import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildScene} from '../frontend/scene.ts';
import {initialState} from '../frontend/exploration.ts';
import {rootGroup} from '../frontend/organization.ts';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8775',out='output/tree-organization-qa';mkdirSync(out,{recursive:true});
const health=await(await fetch(url+'/api/health')).json();
assert.ok(health.project.replaceAll('\\','/').endsWith('/output/tree-organization-qa'));
const catalog=await(await fetch(url+'/api/catalog')).json();
const checks=[],errors=[],scopeResults=[];
const check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'});page.setDefaultTimeout(18000);
page.on('pageerror',e=>errors.push(e.message));
const ready=async p=>{await p.locator('.graph-canvas canvas').waitFor();await p.locator('.loading').waitFor({state:'hidden'});};
const current=async(p=page)=>{
  await p.waitForTimeout(180);
  const h=await p.evaluate(async()=>{
    const local=JSON.parse(localStorage.getItem('kgb:exploration:v6')||'null');
    const mirror=await new Promise(resolve=>{const r=indexedDB.open('kgb-exploration',1);r.onsuccess=()=>{const q=r.result.transaction('sessions').objectStore('sessions').get('kgb:exploration:v6');q.onsuccess=()=>resolve(q.result);};});
    return [local,mirror].filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt)[0].history;
  });
  const state=h.entries[h.index],rect=await p.locator('.graph-canvas').boundingBox();
  return {state,scene:buildScene(state,state.view,catalog,rect.width/rect.height)};
};
const sidebar=async id=>{
  if(!await page.locator(`.sidebar button[data-group-id="${id}"]`).count()){
    const group=catalog.browse_groups.find(g=>g.id===id);assert.ok(group,id);await sidebar(group.parent_id);
  }
  await page.locator(`.sidebar button[data-group-id="${id}"]`).click();await ready(page);
};
const openChild=async id=>{
  const g=catalog.browse_groups.find(g=>g.id===id);assert.ok(g);
  await page.locator('.visible-topics').evaluate(e=>{e.open=true;});
  const article=page.locator('.visible-topics article').filter({has:page.getByRole('button',{name:'Inspect '+g.label,exact:true})});
  await article.getByRole('button',{name:'Open group',exact:true}).focus();await page.keyboard.press('Enter');await ready(page);
  assert.equal((await current()).state.groupId,id);
};
try{
  assert.deepEqual(catalog.organization_review.pending_groups,[]);assert.deepEqual(catalog.organization_review.warnings,[]);
  const scopes=[...catalog.root_groups,...catalog.browse_groups.map(g=>g.id)];
  for(const id of scopes){
    const v=await(await fetch(url+'/api/explore?scope=group&group_id='+encodeURIComponent(id))).json();
    const scene=buildScene({...initialState(),scope:'group',groupId:id},v,catalog);
    assert.ok(scene.cards.length>0,id+' is nonempty');assert.ok(scene.cards.every(c=>c.record.label?.trim()),id);
    assert.equal(scene.links.length,0,id+' has no browsing arrows');
    const represented=new Set(scene.cards.flatMap(c=>c.members));assert.ok(v.endpoint_ids.every(id=>represented.has(id)),id+' retains every endpoint');
    assert.equal(new Set(scene.cards.map(c=>c.id)).size,scene.cards.length);
    scopeResults.push({id,topics:v.endpoint_ids.length,cards:scene.cards.length});
  }
  check(`All ${scopes.length} root/folder scopes open complete named content without browsing arrows`);
  check('Every frontend root agrees with the backend canonical placement',catalog.topics.every(t=>rootGroup(t.id,catalog)===catalog.organization_review.topic_roots[t.id]));
  await page.goto(url);await ready(page);
  for(const id of catalog.root_groups){await sidebar(id);const d=await current();assert.equal(d.scene.links.length,0);assert.ok(d.scene.cards.length<=8);assert.equal(await page.getByLabel('Group by',{exact:true}).isDisabled(),true);}
  check('All nine root journeys show concise folders and lock presentation grouping');
  await sidebar('technology:monitoring');
  assert.equal((await current()).scene.cards.length,2);await openChild('browse:monitoring-methods');
  check('Monitoring contains methods and application references rather than study locations',(await current()).scene.cards.every(c=>!['place','organization','event'].includes(c.record.kind)));
  await page.getByRole('button',{name:'Inspect Fixed point transects',exact:true}).click();
  const citation=page.locator('.inspector .citation-link').first();await citation.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.pdf-scroll')?.getAttribute('aria-busy')==='false');
  check('Keyboard source opening retains the exact monitoring passage',Number(await page.getByLabel('PDF page',{exact:true}).inputValue())===84);
  await page.getByRole('button',{name:'Close source',exact:true}).click();
  await sidebar('technology:drones');await openChild('browse:drone-projects');await openChild('browse:citrus-spray-study');
  check('Citrus study opens trial, site, participant, framework and evaluation folders',(await current()).scene.cards.length===5);
  await page.screenshot({path:`${out}/citrus-study.png`});await openChild('browse:citrus-study-trials');
  assert.deepEqual((await current()).scene.cards.map(c=>c.id).sort(),['ikuchijima-manual-trial','innoshima-autopilot-trial']);
  await page.getByRole('button',{name:'Back',exact:true}).click();await ready(page);assert.equal((await current()).state.groupId,'browse:citrus-spray-study');
  check('Specific trial variants and Back retain their project context');
  await sidebar('ecosystem:species');await openChild('browse:species-catalogue');
  check('Species catalogue retains all 52 peer concepts without an artificial display cap',(await current()).scene.cards.length===52);
  await openChild('browse:carob-profile');check('Carob profile separates biology from propagation',(await current()).scene.cards.length===2);
  await page.screenshot({path:`${out}/carob-profile.png`});
  await page.getByRole('textbox',{name:'Search stored knowledge',exact:true}).fill('Rhamnus');await page.getByRole('button',{name:'Search',exact:true}).click();await ready(page);
  const search=await current();check('Search preserves the two distinct Rhamnus identities',['rhamnus-alaternus','rhamnus-lycioides'].every(id=>search.state.view.endpoint_ids.includes(id)));
  await sidebar('funding:requirements');
  check('Requirements no longer classifies municipalities as requirements',(await current()).scene.cards.flatMap(c=>c.members).every(id=>catalog.topics.find(t=>t.id===id).kind!=='place'));
  await sidebar('browse:al20-municipalities');check('AL20 coverage is a geographic peer catalogue',(await current()).scene.cards.length===32);
  await sidebar('funding:programmes');await openChild('browse:funding-structure');check('All four funding branches remain intact',(await current()).scene.cards.length===4);
  await sidebar('browse:irrigation-lifecycle');
  const lifecycle=await current(),order=catalog.browse_groups.find(g=>g.id==='browse:irrigation-lifecycle').members.map(m=>m.topic_id);
  assert.deepEqual(lifecycle.scene.cards.map(c=>c.id),order);assert.ok(lifecycle.scene.cards.every(c=>c.position.x===0));
  check('Generic lifecycle guidance retains its stored vertical order');
  await sidebar('browse:cocoon-components');await page.locator('.visible-topics').evaluate(e=>{e.open=true;});await page.getByRole('button',{name:'Inspect Cocoon lid',exact:true}).click();
  await page.locator('.inspector').getByRole('button',{name:'Explore this topic',exact:true}).click();await ready(page);
  check('Explicit topic exploration still draws factual connections',(await current()).scene.links.length>0);
  await sidebar('browse:citrus-spray-study');await page.getByRole('button',{name:'Refresh',exact:true}).click();await ready(page);await page.reload();await ready(page);
  check('Refresh and reload retain the organized project scope',(await current()).state.groupId==='browse:citrus-spray-study');

  // Read-only network fixture: uncertain placement is visible without test writes to knowledge.
  const probe=await browser.newPage({viewport:{width:1300,height:1000},reducedMotion:'reduce'});probe.setDefaultTimeout(18000);
  probe.on('pageerror',e=>errors.push(e.message));let unresolved=true;
  const mock=structuredClone(catalog),farm=mock.topics.find(t=>t.id==='sanwa-farm');
  mock.organization_review.topic_roots[farm.id]='review:technology';
  mock.organization_review.pending_groups=[{id:'review:technology',label:'Needs organization · Technology',domain:'technology',member_ids:[farm.id],readonly:true,presentation:'hierarchy'}];
  for(const g of mock.browse_groups)for(const m of g.members)if(m.topic_id===farm.id)m.role='shared';
  await probe.route('**/api/catalog',route=>route.fulfill({json:unresolved?mock:catalog}));
  await probe.route('**/api/explore?*',async route=>{
    const u=new URL(route.request().url());
    if(unresolved&&u.searchParams.get('group_id')==='review:technology'){
      const response=await route.fetch(),v=await response.json();
      await route.fulfill({json:{...v,nodes:[{...farm,record_type:'topic',context:false}],endpoint_ids:[farm.id],edges:[],notices:[]}});
    }else await route.continue();
  });
  await probe.goto(url);await ready(probe);await probe.locator('.sidebar button[data-group-id="review:technology"]').click();await ready(probe);
  await probe.locator('.visible-topics').evaluate(e=>{e.open=true;});
  assert.ok(await probe.getByRole('button',{name:'Inspect Sanwa Farm',exact:true}).isVisible());
  assert.equal(await probe.getByRole('button',{name:'Edit group',exact:true}).count(),0);
  check('Uncertain placement opens in a read-only Needs organization folder');
  unresolved=false;await probe.getByRole('button',{name:'Refresh',exact:true}).click();await ready(probe);
  await probe.locator('.sidebar button[data-group-id="review:technology"]').waitFor({state:'detached'});
  check('Resolved review folders disappear without changing factual data',await probe.locator('.sidebar button[data-group-id="review:technology"]').count()===0);
  await probe.close();
  const after=await(await fetch(url+'/api/catalog')).json();
  check('Verification preserves revision, facts, plans and immutable evidence',after.revision===catalog.revision&&JSON.stringify(after.relationships)===JSON.stringify(catalog.relationships)&&JSON.stringify(after.communities)===JSON.stringify(catalog.communities)&&JSON.stringify(after.irrigation_evidence)===JSON.stringify(catalog.irrigation_evidence));
  check('No uncaught browser errors',errors.length===0);
}catch(e){console.error(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{writeFileSync(`${out}/browser-report.json`,JSON.stringify({checks,errors,scopeResults},null,2));await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
process.exit(process.exitCode||0);
