import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const base='http://127.0.0.1:8776',out='output/funding-suitability-qa';mkdirSync(out,{recursive:true});
const initial=await(await fetch(base+'/api/catalog')).json();
assert.ok((await(await fetch(base+'/api/health')).json()).project.replaceAll('\\','/').endsWith('/output/funding-suitability-qa'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1050},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
const checks=[],errors=[];const check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};page.on('pageerror',e=>errors.push(e.message));
const ready=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});};
const root=async()=>{await page.locator('.sidebar [data-group-id="funding:programmes"]').click();await ready();};
const visible=async()=>{const d=page.locator('.visible-topics');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();};
try{
  await page.goto(base);await ready();await root();await visible();
  check('Funding programmes directly exposes funding options',await page.getByRole('button',{name:'Inspect CDTI · Company R&D (PID)',exact:true}).isVisible());
  check('Transparent wrapper has no graph/sidebar navigation step',await page.locator('.sidebar [data-group-id="browse:funding-structure"]').count()===0&&await page.getByRole('button',{name:'Inspect Funding structure',exact:true}).count()===0);
  check('Four exploratory ideas plus All ideas are available',await page.getByLabel('Funding project idea',{exact:true}).locator('option').count()===5);
  const count=await page.locator('.visible-topics article').count();
  await page.getByLabel('Funding project idea',{exact:true}).selectOption('idea:drone');await ready();
  check('Project selection preserves canonical funding cards',await page.locator('.visible-topics article').count()===count);
  await page.getByRole('button',{name:'Inspect CDTI · Company R&D (PID)',exact:true}).click();
  const details=page.getByRole('region',{name:'Project suitability'});
  await details.waitFor();check('Inspector distinguishes conditional fit, finance and applicant route',(await details.innerText()).includes('Conditional candidate')&&(await details.innerText()).includes('Partially repayable funding')&&(await details.innerText()).includes('Possible route:'));
  check('Opening a funding card retains all four idea assessments',await details.locator('.idea-assessment').count()===4);
  await details.locator('.citation-link').first().click();await page.locator('.source-panel').waitFor();check('Official reviewed source opens from the suitability panel',await page.locator('.source-panel').isVisible());await page.getByRole('button',{name:'Close source',exact:true}).click();
  await page.getByRole('button',{name:'Edit project ideas',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'Edit project idea'});await dialog.waitFor();
  check('Unconfirmed facts and all possible applicant routes seed the editor',(await dialog.getByLabel('Applicant status',{exact:true}).inputValue())==='Unconfirmed'&&await dialog.locator('fieldset input:checked').count()===5);
  await dialog.getByLabel('Readiness / technical maturity').fill('QA only: prototype idea, not validated');await dialog.getByRole('button',{name:'Save project idea',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('.funding-details')?.textContent?.includes('Project idea changed'));
  check('Saved project change flags prior assessments without erasing reasoning',(await details.innerText()).includes('Earlier reasoning:')&&(await details.innerText()).includes('Needs review'));
  const afterSave=await(await fetch(base+'/api/catalog')).json();
  check('Assessment payloads and factual knowledge stay unchanged on a project edit',JSON.stringify(afterSave.funding_assessments)===JSON.stringify(initial.funding_assessments)&&JSON.stringify(afterSave.topics)===JSON.stringify(initial.topics)&&JSON.stringify(afterSave.communities)===JSON.stringify(initial.communities));
  await page.getByRole('button',{name:'Edit project ideas',exact:true}).click();dialog=page.getByRole('dialog',{name:'Edit project idea'});
  const draft='QA draft that must survive a revision conflict';await dialog.getByLabel('Project goals',{exact:true}).fill(draft);
  let c=await(await fetch(base+'/api/catalog')).json();await fetch(base+'/api/projects/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_revision:c.revision,action:'update',id:'idea:education',changes:{partners:'QA-only concurrent edit'}})});
  await dialog.getByRole('button',{name:'Save project idea',exact:true}).click();await dialog.getByRole('alert').waitFor();
  check('Conflict preserves unsaved draft',await dialog.getByLabel('Project goals',{exact:true}).inputValue()===draft);
  await dialog.getByRole('button',{name:'Refresh collection, keep draft',exact:true}).click();await page.waitForTimeout(200);
  check('Refresh retains draft for review',await dialog.getByLabel('Project goals',{exact:true}).inputValue()===draft);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('.sidebar [data-group-id="browse:funding-feader"]').click();await ready();check('Real single-child funding levels remain visible',await page.locator('.sidebar [data-group-id="browse:funding-pepac"]').isVisible());
  await page.locator('.sidebar [data-group-id="browse:funding-pepac"]').click();await ready();await page.getByRole('button',{name:'Back',exact:true}).click();await ready();await root();await visible();
  await page.getByLabel('Funding project idea',{exact:true}).selectOption('all');await ready();await page.getByRole('button',{name:'Inspect GroundWork · 2026 farm cascade call',exact:true}).count().then(async n=>{if(!n){await page.locator('.sidebar [data-group-id="browse:funding-commission"]').click();await ready();await page.locator('.sidebar [data-group-id="browse:horizon-funding"]').click();await ready();await page.locator('.sidebar [data-group-id="browse:horizon-cascade-projects"]').click();await ready();await page.locator('.sidebar [data-group-id="browse:groundwork"]').click();await ready();await visible();}});
  await page.getByRole('button',{name:'Inspect GroundWork · 2026 farm cascade call',exact:true}).click();
  check('Verified geographic exclusion has an explicit reason',(await details.innerText()).includes('Outside this idea’s scope')&&(await details.innerText()).includes('Spain/Alhama'));
  await root();await visible();await page.getByRole('button',{name:'Inspect CDTI · Company R&D (PID)',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'/funding-overview.png'});
  await page.reload();await ready();await root();check('Reload preserves saved profile changes',(await(await fetch(base+'/api/catalog')).json()).project_ideas.find(p=>p.id==='idea:drone').readiness==='QA only: prototype idea, not validated');
  await page.getByLabel('Funding project idea',{exact:true}).selectOption('idea:education');
  await page.getByRole('button',{name:'Edit project ideas',exact:true}).click();dialog=page.getByRole('dialog',{name:'Edit project idea'});
  await dialog.getByLabel('Project goals',{exact:true}).fill('QA second draft');
  c=await(await fetch(base+'/api/catalog')).json();await fetch(base+'/api/projects/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_revision:c.revision,action:'update',id:'idea:education',changes:{goals:'QA concurrent saved goals'}})});
  await dialog.getByRole('button',{name:'Save project idea',exact:true}).click();await dialog.getByRole('alert').waitFor();await dialog.getByRole('button',{name:'Refresh collection, keep draft',exact:true}).click();
  await dialog.getByText('QA concurrent saved goals',{exact:true}).waitFor();check('Same-project conflict shows current saved version and requires acknowledgement',await dialog.getByRole('button',{name:'Save project idea',exact:true}).isDisabled()&&await dialog.getByLabel('Project goals',{exact:true}).inputValue()==='QA second draft');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'New project idea',exact:true}).click();dialog=page.getByRole('dialog',{name:'New project idea'});await dialog.getByLabel('Project idea name',{exact:true}).fill('QA exploratory idea');await dialog.getByLabel('Project goals',{exact:true}).fill('QA only: an editable exploratory record');await dialog.getByRole('button',{name:'Save project idea',exact:true}).click();await dialog.waitFor({state:'hidden'});
  check('New idea persists with no fabricated assessment',(await(await fetch(base+'/api/catalog')).json()).project_ideas.some(p=>p.label==='QA exploratory idea'&&p.version===1));
  for(const id of ['browse:funding-nextgenerationeu','browse:funding-prtr','browse:funding-prtr-c4i3','browse:funding-prtr-regional']){
    const group=initial.browse_groups.find(g=>g.id===id);
    if(group&&await page.locator(`.sidebar [data-group-id="${id}"]`).count()){await page.locator(`.sidebar [data-group-id="${id}"]`).focus();await page.keyboard.press('Enter');await ready();}
  }
  const citation=page.locator('.inspector [aria-label="Group guide"] .citation-link').first();await citation.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.pdf-scroll')?.getAttribute('aria-busy')==='false');
  check('Keyboard navigation and citation opening preserve the exact PDF page',Number(await page.getByLabel('PDF page',{exact:true}).inputValue())===1);await page.getByRole('button',{name:'Close source',exact:true}).click();
  await root();await page.getByLabel('Funding project idea',{exact:true}).selectOption('all');await page.getByRole('button',{name:'Edit project ideas',exact:true}).click();await page.evaluate(()=>{document.documentElement.dataset.theme='dark';window.scrollTo(0,0);});await page.screenshot({path:out+'/project-editor-dark.png'});await page.getByRole('dialog',{name:'Edit project idea'}).getByRole('button',{name:'Cancel',exact:true}).click();
  check('No uncaught browser errors',errors.length===0);
}catch(e){console.error(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{writeFileSync(out+'/browser-report.json',JSON.stringify({checks,errors},null,2));await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}
process.exit(process.exitCode||0);
