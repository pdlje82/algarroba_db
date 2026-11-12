import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, reduceExploration, isInPlaceAction, query, commitHistory} from '../frontend/exploration.ts';
import {buildScene} from '../frontend/scene.ts';
import {migrate, reconcileIdentities} from '../frontend/migration.ts';
import {navigationTree, filterNavigation, inclusion} from '../frontend/navigationTree.ts';
import {inspectorLimits, inspectorWidth} from '../frontend/sidebarLayout.ts';
import {ROOT_GROUPS} from '../frontend/types.ts';

const topic=(id,label=id)=>({id,label,kind:'programme',domain:'funding',group_id:'programmes',aliases:[id+' alias']});
const group=(id,parent,anchor,ids,extra={})=>({id,label:id,parent_id:parent,anchor_topic_id:anchor,members:ids.map(topic_id=>({topic_id,role:'primary'})),maintenance_rule:'Fixture',presentation:'hierarchy',...extra});
const catalog={revision:1,topics:['fund','call','other','shared','pending'].map(id=>topic(id)),relationships:[],findings:[],sources:[],coverage:[],unresolved:[],irrigation_evidence:[],
  organization_roots:ROOT_GROUPS.map(id=>({id,label:id,domain:id.split(':')[0]})),
  browse_groups:[], communities:[]};
catalog.browse_groups=[group('wrap','funding:programmes',null,['fund'],{navigation:'transparent'}),
  group('fund folder','wrap','fund',['call','shared']),group('other folder','funding:programmes',null,['other','shared'],{members:[{topic_id:'other',role:'primary'},{topic_id:'shared',role:'shared'}]})];
catalog.communities=[{id:'community',label:'Community',parent_id:'ecosystem:species',plants:[{topic_id:'shared'}]}];
catalog.organization_review={topic_roots:{fund:'funding:programmes',call:'funding:programmes',other:'funding:programmes',shared:'funding:programmes',pending:'review:funding'},pending_groups:[{id:'review:funding',label:'Needs organization · Funding',domain:'funding',member_ids:['pending']}]};
const view={revision:1,scope:'group',group_id:'funding:programmes',centre:null,domain:'all',nodes:catalog.topics,edges:[],endpoint_ids:['fund','call','other','shared'],routes:[],matches:[],passages:[],notices:[],complete:true};

test('tree projects transparent groups, anchors, shared references, communities and pending topics without duplicate roots',()=>{
  const nodes=navigationTree(catalog),funding=nodes.find(n=>n.id==='funding:programmes');
  assert.equal(nodes.filter(n=>n.id==='funding:programmes').length,1);
  assert.ok(!funding.children.some(n=>n.id==='wrap'||n.kind==='topic'&&n.id==='fund'));
  assert.deepEqual(funding.members.sort(),['fund','call','other','shared'].sort());
  const fund=funding.children.find(n=>n.id==='fund folder');assert.equal(fund.anchor,'fund');
  assert.ok(fund.children.some(n=>n.id==='call'));
  assert.ok(funding.children.find(n=>n.id==='other folder').children.find(n=>n.id==='shared').shared);
  assert.equal(nodes.find(n=>n.id==='ecosystem:species').children[0].children[0].id,'shared');
  assert.deepEqual(nodes.find(n=>n.id==='review:funding').members,['pending']);
  assert.deepEqual(inclusion(funding,new Set(['shared'])),{included:3,total:4,checked:true,mixed:true});
});

test('tree search reveals alias paths while branch toggles retain the whole original membership',()=>{
  const nodes=navigationTree(catalog),before=structuredClone(nodes),filtered=filterNavigation(nodes,'call alias');
  const root=filtered[0];assert.equal(root.id,'funding:programmes');
  assert.equal(root.children[0].children[0].id,'call');
  assert.deepEqual([...root.members].sort(),['fund','call','other','shared'].sort());
  assert.deepEqual(nodes,before);
});

test('visibility is in-place, keeps the complete captured query and survives navigation and history snapshots',()=>{
  const state={...initialState(),scope:'group',groupId:'funding:programmes',view};
  const action={type:'visibility',ids:['call','shared'],included:false};
  const hidden=reduceExploration(state,action,catalog);assert.ok(isInPlaceAction(action));
  assert.deepEqual(hidden.view,view);assert.equal(query(hidden),query(state));
  assert.deepEqual(reduceExploration(hidden,{type:'group',id:'fund folder'},catalog).hiddenTopicIds,['call','shared']);
  const history=commitHistory({entries:[state],index:0},hidden);
  assert.deepEqual(history.entries[0].hiddenTopicIds,[]);assert.deepEqual(history.entries[1].hiddenTopicIds,['call','shared']);
  assert.deepEqual(buildScene(hidden,view,catalog).cards.flatMap(c=>c.members).sort(),['fund','other']);
  assert.deepEqual(hidden.view.endpoint_ids,view.endpoint_ids);
});

test('excluding the centre removes it atomically; explicit centring re-includes only that topic; reset does not restore it',()=>{
  const v={...view,scope:'neighbors',centre:'fund',endpoint_ids:['call','other']};
  const state={...initialState(),scope:'neighbors',centre:'fund',anchor:'fund',view:v};
  const hidden=reduceExploration(state,{type:'visibility',ids:['fund','call'],included:false},catalog);
  assert.equal(hidden.centre,null);assert.equal(hidden.anchor,'fund');assert.deepEqual(hidden.view,v);
  const scene=buildScene(hidden,v,catalog);assert.equal(scene.layout,'grid');assert.deepEqual(scene.cards.map(c=>c.id),['other']);
  const reset=reduceExploration(hidden,{type:'resetVisibility'},catalog);assert.equal(reset.centre,null);assert.equal(reset.anchor,'fund');
  assert.ok(!buildScene(reset,v,catalog).cards.some(c=>c.id==='fund'));
  const next=reduceExploration(hidden,{type:'explore',id:'fund'},catalog);assert.deepEqual(next.hiddenTopicIds,['call']);
});

test('hidden intermediate topics suppress both abbreviated and expanded routes without invented shortcut edges',()=>{
  const c=structuredClone(catalog);c.relationships=[{id:'a',source:'fund',target:'call',label:'a'},{id:'b',source:'call',target:'other',label:'b'}];
  const v={...view,scope:'search',centre:'fund',endpoint_ids:['other'],routes:[{id:'route',endpoint:'other',nodes:['fund','call','other'],edges:['a','b'],why:'Fixture'}]};
  for(const expandedRoutes of [[],['route']]){
    const scene=buildScene({...initialState(),scope:'search',centre:'fund',anchor:'fund',expandedRoutes,hiddenTopicIds:['call']},v,c);
    assert.deepEqual(scene.cards.map(c=>c.id).sort(),['fund','other']);assert.deepEqual(scene.links,[]);
  }
});

test('complete exclusions produce an empty scene; funding coverage is unchanged by partial exclusions',()=>{
  const c=structuredClone(catalog);c.project_ideas=[];c.funding_reviews=[{id:'review',topic_id:'call',version:1,availability:'open',verification_state:'confirmed',deadlines:[]}];c.funding_assessments=[];
  const state={...initialState(),scope:'group',groupId:'funding:programmes'};
  const complete=buildScene(state,view,c),partial=buildScene({...state,hiddenTopicIds:['call']},view,c);
  assert.deepEqual(partial.cards.find(c=>c.id==='display-group:fund folder').record.fundingSummary,complete.cards.find(c=>c.id==='display-group:fund folder').record.fundingSummary);
  const empty=buildScene({...state,hiddenTopicIds:view.endpoint_ids},view,c);assert.equal(empty.cards.length,0);assert.equal(empty.links.length,0);
});

test('older views include all topics; saved visibility resolves canonical identities without rewriting its input',()=>{
  assert.deepEqual(migrate({version:6,scope:'overview'}).hiddenTopicIds,[]);
  const raw={...initialState(),hiddenTopicIds:['old-call','call','other']},before=structuredClone(raw);
  assert.deepEqual(reconcileIdentities(raw,{...catalog,identity_redirects:{'old-call':'call'}}).hiddenTopicIds,['call','other']);
  assert.deepEqual(raw,before);
});

test('inspector clamps only its rendered width and has deterministic desktop and tablet limits',()=>{
  assert.deepEqual(inspectorLimits(1600),{min:300,max:670});assert.deepEqual(inspectorLimits(2400),{min:300,max:720});
  assert.deepEqual(inspectorLimits(1000),{min:300,max:500});
  assert.equal(inspectorWidth(650,1200),470);assert.equal(inspectorWidth(650,1600),650);assert.equal(inspectorWidth(200,1600),300);
});
