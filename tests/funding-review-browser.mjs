import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
import {buildScene} from '../frontend/scene.ts';import {initialState} from '../frontend/exploration.ts';import {groupDomain} from '../frontend/organization.ts';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href),base='http://127.0.0.1:8776',out='output/full-funding-review-qa';mkdirSync(out,{recursive:true});
const c=await(await fetch(base+'/api/catalog')).json(),health=await(await fetch(base+'/api/health')).json();assert.ok(health.project.replaceAll('\\','/').endsWith('/output/full-funding-review-qa'));
const checks=[],errors=[],check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
check('Every classified route has a four-idea reviewed comparison',c.topics.filter(t=>t.funding_role==='route').every(t=>c.funding_reviews.some(r=>r.topic_id===t.id&&c.project_ideas.every(p=>c.funding_assessments.some(a=>a.review_id===r.id&&a.project_id===p.id)))));
const review=id=>c.funding_reviews.find(r=>r.topic_id===id),assessments=id=>c.funding_assessments.filter(a=>a.review_id===review(id)?.id);
check('National and institutional subroutes preserve distinct applicant and instrument gates',
 review('water4all-spain-aei').applicants.includes('nonprofit')&&review('water4all-spain-cdti').applicants.includes('For-profit')&&review('water4all-spain-cdti').instrument_type==='grant'&&
 review('paeas-line-a').applicants.includes('nonprofit')&&review('paeas-line-b').applicants.includes('cannot be transferred'));
check('Verified exclusions stay scoped while unknown applicant facts remain conditional',
 assessments('al30').every(a=>a.exclusions.some(e=>e.scope==='location'))&&assessments('biodivfuture-spain-fb').every(a=>a.exclusions.some(e=>e.scope==='activity'))&&
 assessments('demonstration').every(a=>a.exclusions.length===0)&&c.project_ideas.every(p=>p.applicant_status.toLowerCase().includes('unconfirmed')));
let scopes=0,unreviewed=[];
for(const g of [...c.organization_roots,...c.browse_groups].filter(g=>groupDomain(g.id,c)==='funding'&&g.navigation!=='transparent')){
 const v=await(await fetch(base+'/api/explore?scope=group&domain=all&group_id='+encodeURIComponent(g.id))).json();scopes++;
 for(const card of buildScene({...initialState(),scope:'group',groupId:g.id},v,c).cards)if(card.record.fundingSummary?.relevance==='Project fit unreviewed')unreviewed.push(card.id);
}
check('All funding views distinguish reviewed routes, references and remaining verification gaps',unreviewed.length===0);
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1050},reducedMotion:'reduce'});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
const ready=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});};
const scope=async id=>{let group=c.browse_groups.find(g=>g.id===id);if(group?.navigation==='transparent')return scope(group.parent_id);const button=page.locator(`.sidebar [data-group-id="${id}"]`);if(!await button.count()){assert.ok(group);await scope(group.parent_id);}await button.click();await ready();};
const visible=async()=>{await page.locator('.visible-topics').evaluate(e=>e.open=true);};
const inspect=async label=>{await visible();await page.getByRole('button',{name:'Inspect '+label,exact:true}).click();};
try{
 await page.goto(base);await ready();await scope('funding:programmes');await visible();
 check('Funding structure remains invisible',await page.locator('.sidebar [data-group-id="browse:funding-structure"]').count()===0);
 const cards=await page.locator('.visible-topics article').count();await page.getByLabel('Funding project idea',{exact:true}).selectOption('idea:drone');check('Idea selector preserves canonical option cards',await page.locator('.visible-topics article').count()===cards);
 await scope('browse:funding-al20-line-1');await inspect('Agriculture and forestry business services');
 let details=page.getByRole('region',{name:'Project suitability'});check('AL20 service review separates commercial service from prototype R&D',(await details.innerText()).includes('SERVICE')&&(await details.innerText()).includes('65%')&&await details.locator('.idea-assessment').count()===4);
 await scope('browse:heritage-community-activities');await inspect('Rural heritage training');check('Unselected training remains an explicit incomplete review',(await details.innerText()).includes('blank')&&(await details.innerText()).includes('incomplete'));
 await scope('browse:sudoe5');await inspect('SUDOE Call 5 · finance and duration');check('Conditions have a supporting-reference heading and linked review',await details.getByRole('heading',{name:'Supporting reference',exact:true}).isVisible()&&await details.getByRole('navigation',{name:'Linked funding reviews'}).isVisible());
 await details.getByRole('navigation',{name:'Linked funding reviews'}).getByRole('button').first().click();check('Reference link opens its separately named funding review',await details.locator('details[open]').count()>0);
 await scope('browse:horizon-funding');await visible();check('NATURE framework shows incomplete coverage rather than an inherited open verdict',(await page.locator('.visible-topics').innerText()).includes('incomplete'));
 await scope('funding:programmes');await inspect('ENISA · participative business loans');check('Repayable finance remains explicit',(await details.innerText()).includes('Loan')&&(await details.innerText()).includes('quarterly'));
 await inspect('MITECO · carbon absorption project registry');check('Registration remains non-cash without promised buyer or income',(await details.innerText()).includes('Non-cash assistance')&&(await details.innerText()).includes('No grant payment'));
 await inspect('Interreg NEXT MED · third-call reference');check('NEXT MED conflict preserves exact formal deadline and verification problem',(await details.innerText()).includes('OPEN')&&(await details.innerText()).includes('2026-10-29T13:00:00+01:00')&&(await details.innerText()).includes('Contradictory'));
 await scope('browse:funding-prtr-regional');const citation=page.locator('.inspector [aria-label="Group guide"] .citation-link').first();await citation.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.pdf-scroll')?.getAttribute('aria-busy')==='false');check('Existing source citations still open their exact PDF position',Number(await page.getByLabel('PDF page',{exact:true}).inputValue())===1);await page.getByRole('button',{name:'Close source',exact:true}).click();
 await scope('funding:programmes');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'/funding-overview.png'});
 await scope('browse:sudoe5');await inspect('SUDOE Call 5 · finance and duration');await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.screenshot({path:out+'/reference-dark.png'});
 await page.reload();await ready();check('Reload restores a usable funding view',await page.locator('.graph-canvas canvas').isVisible());
 check('No uncaught browser errors',errors.length===0);const after=await(await fetch(base+'/api/catalog')).json();check('Browser verification makes no database edits',after.revision===c.revision&&JSON.stringify(after.project_ideas)===JSON.stringify(c.project_ideas));
}catch(e){errors.push(e.message);console.error(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{writeFileSync(out+'/browser-report.json',JSON.stringify({checks,errors,scopes,unreviewed},null,2));await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}process.exit(process.exitCode||0);
