import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url='http://127.0.0.1:8769',output='output/citation-labels';
mkdirSync(output,{recursive:true});
assert.ok((await(await fetch(url+'/api/health')).json()).project.replaceAll('\\','/').endsWith('/output/consolidation-qa'),'Use isolated QA data.');
const catalog=async()=>await(await fetch(url+'/api/catalog')).json();
const before=await catalog(),community=before.communities.find(g=>g.label==='Citation links QA');
assert.ok(community?.basis.length===6,'Use the current six-link community fixture.');
const book=before.sources.find(s=>s.id===community.basis[0].source_id);
assert.equal(Object.keys(book.page_labels).length,6,'Apply checked page labels to the isolated QA store first.');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1300,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(15000);
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const desk=page.locator('.community-workspace'),settings=page.getByRole('dialog',{name:'Community details and members',exact:true});
const ready=async()=>{await page.locator('.graph-canvas canvas').waitFor();await page.locator('.loading').waitFor({state:'hidden'});};
const open=async()=>{await page.locator('.sidebar').getByRole('button',{name:'Manage communities',exact:true}).click();await page.getByLabel('Selected community',{exact:true}).selectOption(community.id);await desk.getByRole('button',{name:'Community details & members',exact:true}).click();};
const painted=async n=>await page.waitForFunction(n=>document.querySelector('.pdf-scroll')?.getAttribute('aria-busy')==='false'&&Number(document.querySelector('.pdf-scroll')?.dataset.renderedPage)===n,n);
try{
  await page.goto(url);await ready();
  // The ordinary inspector uses the same descriptive citation component.
  await page.getByLabel('Centre',{exact:true}).selectOption('carob-community-almeria');await ready();
  await page.locator('.visible-topics summary').click();await page.getByRole('button',{name:'Inspect Carob communities in Almería',exact:true}).click();
  const first=page.locator('.inspector .refs .citation-link').first();
  check('Graph citations visibly name the passage and document',await first.locator('.citation-heading').innerText()!==''&&(await first.locator('.citation-document').innerText()).includes(book.title));
  await page.getByRole('button',{name:'Return to overview',exact:true}).click();await ready();
  for(const theme of ['light','dark']){
    console.log('Checking community links in',theme);
    await page.getByLabel('Appearance',{exact:true}).selectOption(theme);await open();
    const links=settings.locator('.citation-link');
    const captions=await links.locator('.citation-heading').allTextContents();
    check(`${theme}: six citations have distinct visible passage descriptions`,captions.length===6&&new Set(captions).size===6&&captions.every(s=>s!=='Section heading not recorded'));
    check(`${theme}: document title and exact page remain visible`,(await links.locator('.citation-document').allTextContents()).every((s,i)=>s.includes(book.title)&&s.includes('PDF p'+community.basis[i].page)));
    await page.screenshot({path:`${output}/community-links-${theme}.png`});
    if(theme==='light'){
      for(let i=0;i<community.basis.length;i++){
        const ref=community.basis[i];await links.nth(i).focus();await page.keyboard.press('Enter');await painted(ref.page);
        check(`Keyboard opens the exact page ${ref.page} with its checked heading`,Number(await page.getByLabel('PDF page',{exact:true}).inputValue())===ref.page&&(await page.locator('.source-locator').innerText()).includes(book.page_labels[String(ref.page)]));
        if(i===0){
          await page.getByLabel('PDF page',{exact:true}).fill('138');await painted(138);
          check('Navigating away never reuses the previous page heading',!(await page.locator('.source-locator').innerText()).includes(book.page_labels['126'])&&(await page.locator('.source-locator').innerText()).includes('Section heading not recorded'));
        }
        await page.getByRole('button',{name:'Close source',exact:true}).click();
        check(`Closing page ${ref.page} returns to the same community details`,await settings.isVisible()&&await links.count()===6);
      }
      await page.setViewportSize({width:390,height:844});
      check('Passage labels wrap inside the phone dialog',await settings.evaluate(e=>e.scrollWidth<=e.clientWidth+1)&&await links.evaluateAll(els=>els.every(e=>e.scrollWidth<=e.clientWidth+1)));
      await page.screenshot({path:`output/citation-labels/community-links-phone.png`});await page.setViewportSize({width:1300,height:1000});
    }
    await settings.getByRole('button',{name:'Close details',exact:true}).click();await desk.getByRole('button',{name:'Close editor',exact:true}).click();await ready();
  }
  const after=await catalog();
  check('Viewing descriptive citations leaves plans, immutable evidence and revision unchanged',after.revision===before.revision&&JSON.stringify(after.communities)===JSON.stringify(before.communities)&&JSON.stringify(after.irrigation_evidence)===JSON.stringify(before.irrigation_evidence));
  check('No uncaught browser errors',errors.length===0);
  writeFileSync(`${output}/browser-report.json`,JSON.stringify({checks,errors},null,2));
}catch(error){console.error(error);process.exitCode=1;await page.screenshot({path:`${output}/failure.png`,timeout:5000}).catch(()=>{});}
finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);}
process.exit(process.exitCode||0);
