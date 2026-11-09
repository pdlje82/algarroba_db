import assert from 'node:assert/strict';
import {test} from 'node:test';
import {citationDetails} from '../frontend/citations.ts';

const sources=[{id:'HANDBOOK',title:'Restoration handbook',page_labels:{'135':'La Alcantarilla: interventions','136':'La Tórtola: site conditions'}}];
test('specific checked labels take priority over page context and preserve exact citations',()=>{
  const ref={source_id:'HANDBOOK',page:135,label:'Companion vegetation',locator:'Actuaciones; Fig. 5.49',edition_sha256:'unchanged'};
  const before=structuredClone(ref);
  assert.deepEqual(citationDetails(ref,sources),{caption:'Companion vegetation',document:'Restoration handbook',location:'PDF p135',text:'Companion vegetation · Restoration handbook · PDF p135'});
  assert.deepEqual(ref,before);
});
test('legacy links to one document gain distinct checked page headings without losing locators',()=>{
  const a=citationDetails({source_id:'HANDBOOK',page:135,locator:'Regional observations'},sources);
  const b=citationDetails({source_id:'HANDBOOK',page:136,locator:'Regional observations'},sources);
  assert.equal(a.caption,'La Alcantarilla: interventions');
  assert.equal(b.caption,'La Tórtola: site conditions');
  assert.notEqual(a.caption,b.caption);
  assert.equal(citationDetails({source_id:'HANDBOOK',page:135,locator:'La Alcantarilla: interventions'},sources).caption,'La Alcantarilla: interventions');
});
test('unknown headings are explicit, and page context is limited to its exact source and page',()=>{
  assert.equal(citationDetails({source_id:'HANDBOOK',page:137,locator:'Selected passage'},sources).caption,'Section heading not recorded');
  assert.equal(citationDetails({source_id:'OTHER',page:135},sources).caption,'Section heading not recorded');
  assert.equal(citationDetails({source_id:'HANDBOOK',page:136},sources).caption,'La Tórtola: site conditions');
  assert.equal(citationDetails({source_id:'WEB',locator:'Identity and habitat'},sources).caption,'Identity and habitat');
  assert.equal(citationDetails({source_id:'WEB',label:'  Habitat  description  '}).caption,'Habitat description');
});
