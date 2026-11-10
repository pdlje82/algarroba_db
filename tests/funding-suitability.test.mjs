import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScene} from '../frontend/scene.ts';
import {initialState,reduceExploration} from '../frontend/exploration.ts';
import {navigationChildren,navigationGroup} from '../frontend/organization.ts';
import {normalizeNavigationHistory} from '../frontend/migration.ts';
import {fundingSummary,assessmentWarnings} from '../frontend/funding.ts';

const topic=(id)=>({id,label:id,kind:'programme',domain:'funding',group_id:'programmes'});
const group=(id,parent,anchor,members,navigation='normal')=>({id,label:id,parent_id:parent,anchor_topic_id:anchor,members:members.map(topic_id=>({topic_id,role:'primary'})),maintenance_rule:'Synthetic fixture',presentation:'hierarchy',navigation});
const catalog={revision:2,topics:['fund','call','other'].map(topic),relationships:[],findings:[],sources:[],coverage:[],unresolved:[],communities:[],irrigation_evidence:[],organization_roots:[],browse_groups:[group('browse:wrap','funding:programmes',null,['fund','other'],'transparent'),group('browse:fund','browse:wrap','fund',['call'])],project_ideas:[{id:'idea:test',version:1}],funding_reviews:[{id:'review',topic_id:'call',version:1,availability:'open',verification_state:'confirmed',deadlines:[{label:'Application',value:'2027-01-20'}]}],funding_assessments:[{id:'assessment',project_id:'idea:test',project_version:1,review_id:'review',review_version:1,relevance:'conditional'}]};
const view={revision:2,scope:'group',group_id:'funding:programmes',domain:'all',nodes:catalog.topics,edges:[],endpoint_ids:['fund','call','other'],routes:[],matches:[],passages:[],notices:[]};

test('explicit transparent wrappers reveal children and direct members without collapsing financing levels',()=>{
  assert.deepEqual(navigationChildren('funding:programmes',catalog).map(g=>g.id),['browse:fund']);
  assert.equal(navigationGroup('browse:wrap',catalog),'funding:programmes');assert.equal(navigationGroup('browse:fund',catalog),'browse:fund');
  const scene=buildScene({...initialState(),scope:'group',groupId:'funding:programmes'},view,catalog);
  assert.deepEqual(scene.cards.map(c=>c.id),['display-group:browse:fund','other']);assert.equal(scene.links.length,0);
  assert.equal(reduceExploration(initialState(),{type:'group',id:'browse:wrap'},catalog).groupId,'funding:programmes');
});

test('legacy wrapper/root histories normalize in memory, retain offsets/camera and avoid duplicate Back steps',()=>{
  const legacy={...catalog,browse_groups:catalog.browse_groups.map(g=>({...g,navigation:'normal'}))};
  const root={...initialState(),scope:'group',groupId:'funding:programmes',view};
  const wrapped={...root,groupId:'browse:wrap',view:{...view,group_id:'browse:wrap'},camera:{position:{x:1,y:2,z:3},target:{x:0,y:0,z:0}}};
  const old=buildScene(wrapped,wrapped.view,legacy);wrapped.positions=old.positions;wrapped.layerOffsets={[old.key]:{x:123,y:456}};
  const h={entries:[root,wrapped],index:1};const before=structuredClone(h);const result=normalizeNavigationHistory(h,catalog);
  assert.equal(result.entries.length,1);assert.equal(result.index,0);assert.equal(result.entries[0].groupId,'funding:programmes');
  assert.deepEqual(buildScene(result.entries[0],result.entries[0].view,catalog).offset,{x:123,y:456});assert.deepEqual(result.entries[0].camera,wrapped.camera);assert.deepEqual(h,before);
  assert.deepEqual(normalizeNavigationHistory(result,catalog),result);
});

test('unreviewed options remain explicit and programme summaries do not inherit an open child status',()=>{
  assert.equal(fundingSummary(['other'],catalog).relevance,'Project fit unreviewed');
  assert.match(fundingSummary(['call'],catalog).availability,/2027-01-20/);
  const summary=fundingSummary(['fund','call'],catalog,'all',true);assert.match(summary.availability,/1 reviewed/);assert.doesNotMatch(summary.availability,/Open/);
  assert.equal(fundingSummary(['call'],catalog,'idea:missing').relevance,'Project fit unreviewed');
  const mixed=structuredClone(catalog);mixed.funding_reviews.push({...mixed.funding_reviews[0],id:'closed-review',topic_id:'other',availability:'closed'});
  const aggregate=fundingSummary(['fund','call','other'],mixed,'all',true);assert.match(aggregate.availability,/2 reviewed/);assert.doesNotMatch(aggregate.availability,/Open|Verified closed/);
});

test('changed project/evidence keeps previous reasoning but removes the current candidate summary',()=>{
  const c=structuredClone(catalog);c.project_ideas[0].version=2;
  assert.match(assessmentWarnings(c.funding_assessments[0],c)[0],/Project idea changed/);
  assert.equal(fundingSummary(['call'],c).relevance,'Assessment needs review');
  c.project_ideas[0].version=1;c.funding_state={assessments:{assessment:['Evidence changed']},reviews:{review:['Deadline passed']}};
  assert.equal(fundingSummary(['call'],c).relevance,'Assessment needs review');assert.match(fundingSummary(['call'],c).availability,/check needed/);
});

test('project selection changes presentation in place without filtering canonical funding identities',()=>{
  const s={...initialState(),scope:'group',groupId:'browse:fund',view};const next=reduceExploration(s,{type:'fundingProject',id:'idea:test'},catalog);
  assert.equal(next.fundingProjectId,'idea:test');assert.deepEqual(next.view,s.view);
  assert.deepEqual(buildScene(s,view,catalog).cards.map(c=>c.id),buildScene(next,view,catalog).cards.map(c=>c.id));
});

test('curated references show linked context without borrowing a route verdict',()=>{
  const c=structuredClone(catalog);c.topics.find(t=>t.id==='other').funding_role='reference';c.topics.find(t=>t.id==='other').funding_context_ids=['call'];
  const summary=fundingSummary(['other'],c);assert.equal(summary.relevance,'Supporting reference');assert.match(summary.availability,/1 linked review/);assert.doesNotMatch(summary.availability,/Open|candidate/);
  c.topics.find(t=>t.id==='other').funding_role='route';assert.equal(fundingSummary(['other'],c).relevance,'Project fit unreviewed');
});

test('classified frameworks expose incomplete coverage and never inherit child suitability or availability',()=>{
  const c=structuredClone(catalog);c.topics.forEach(t=>t.funding_role=t.id==='fund'?'framework':'route');c.topics[0].funding_context_ids=['call','other'];
  const summary=fundingSummary(['fund'],c);assert.match(summary.relevance,/1 reviewed route.*1 unreviewed/);assert.doesNotMatch(summary.relevance,/candidate|possible/);assert.doesNotMatch(summary.availability,/Open/);
});

test('framework coverage follows explicit transitive links safely and flags missing or stale idea comparisons',()=>{
  const c=structuredClone(catalog);c.topics.forEach(t=>t.funding_role=t.id==='call'?'route':t.id==='fund'?'framework':'reference');
  c.topics[0].funding_context_ids=['call'];c.topics[2].funding_context_ids=['fund'];
  assert.match(fundingSummary(['other'],c).availability,/1 linked review/);
  assert.match(fundingSummary(['fund'],c).relevance,/1 reviewed route/);
  c.project_ideas.push({id:'idea:second',version:1});
  assert.match(fundingSummary(['fund'],c).relevance,/0 reviewed routes.*1 incomplete/);
  assert.match(fundingSummary(['fund'],c,'idea:test').relevance,/1 reviewed route/);
  c.project_ideas.pop();c.project_ideas[0].version=2;
  assert.match(fundingSummary(['fund'],c).relevance,/1 incomplete/);
  c.project_ideas[0].version=1;c.funding_reviews[0].verification_state='failed';
  assert.match(fundingSummary(['fund'],c).relevance,/1 incomplete/);
  // Legacy explicit context cycles cannot lock up browsing or duplicate the review.
  c.topics[0].funding_context_ids.push('other');
  assert.match(fundingSummary(['other'],c).availability,/1 linked review/);
});
