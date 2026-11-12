import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,reduceExploration} from '../frontend/exploration.ts';
import {buildScene} from '../frontend/scene.ts';
import {fixedGroupLayout,rootGroup,groupLabel,editorTarget,navigationChildren} from '../frontend/organization.ts';
import {ROOT_GROUPS,GROUP_LABELS} from '../frontend/types.ts';

const topics=['fund','local','direct','outside'].map(id=>({id,label:id,kind:'programme',domain:'funding',group_id:'programmes'}));
const group={id:'browse:structure',label:'Structure',parent_id:'funding:programmes',anchor_topic_id:null,presentation:'hierarchy',members:[{topic_id:'fund',role:'primary'},{topic_id:'direct',role:'primary'}]};
const child={id:'browse:local',label:'Local implementation',parent_id:group.id,anchor_topic_id:'fund',presentation:'hierarchy',members:[{topic_id:'local',role:'primary'}]};
const edge={id:'real-connection',source:'fund',target:'direct',label:'finances',basis:'source'};
const catalog={topics,relationships:[edge],browse_groups:[group,child],organization_roots:ROOT_GROUPS.map(id=>({id,label:GROUP_LABELS[id.split(':')[1]],domain:id.split(':')[0]})),communities:[],findings:[],sources:[],coverage:[],unresolved:[],irrigation_evidence:[],revision:1};
const view={revision:1,scope:'group',group_id:group.id,centre:null,search:'',domain:'all',kinds:[],depth:6,nodes:topics,edges:[edge],endpoint_ids:['fund','local','direct'],routes:[],matches:[],passages:[],notices:[]};
const state={...initialState(),scope:'group',groupId:group.id};

test('funding hierarchy interleaves numbered folders and topics and orders two-digit operation codes',()=>{
  const t=[['one','1.7 · Holdings'],['two','1.9 · Processing'],['ten','1.10 · Forest products'],['eleven','1.11 · Services'],['training','1.8 training · unselected']].map(([id,label])=>({id,label,kind:'activity',domain:'funding',group_id:'activities'}));
  const parent={...group,members:t.map(v=>({topic_id:v.id,role:'primary'}))};
  const folder={...child,label:'1.8 training · unselected',anchor_topic_id:null,members:[{topic_id:'training',role:'shared'}]};
  const c={...catalog,topics:t,browse_groups:[parent,folder],relationships:[]};
  const v={...view,nodes:t,endpoint_ids:t.map(t=>t.id),edges:[]};
  const scene=buildScene(state,v,c);
  assert.deepEqual(scene.cards.map(c=>c.record.label),['1.7 · Holdings','1.8 training · unselected','1.9 · Processing','1.10 · Forest products','1.11 · Services']);
  assert.deepEqual(scene.links,[]);
  const oldOrder=['display-group:'+folder.id,'ten','eleven','one','two'];
  const oldPositions=Object.fromEntries(oldOrder.map((id,i)=>[id,scene.cards[i].position]));
  const restored=buildScene({...state,positions:oldPositions},v,c);
  assert.deepEqual(restored.positions,scene.positions,'A saved alphabetical grid reflows to numeric order without rewriting the saved state');
  const vertical=buildScene(state,v,{...c,browse_groups:[{...parent,member_layout:'vertical',members:[...parent.members].reverse()}]});
  assert.deepEqual(vertical.cards.map(c=>c.id),[...t].reverse().map(t=>t.id));
});

test('funding sidebar orders line numbers while preserving unnumbered navigation slots',()=>{
  const children=[['ten','AL20 Line 10 · Ten'],['guide','Guide'],['two','AL20 Line 2 · Two'],['one','AL20 Line 1 · One']].map(([id,label])=>({...child,id:'browse:'+id,label,parent_id:group.id}));
  assert.deepEqual(navigationChildren(group.id,{...catalog,browse_groups:[group,...children]}).map(g=>g.label),['AL20 Line 1 · One','Guide','AL20 Line 2 · Two','AL20 Line 10 · Ten']);
});

test('funding intervention numbers remain ordered when the code follows the name',()=>{
  const t=[['cooperation','LEADER cooperation · 7119.3'],['management','LEADER management · 7119.4'],['operations','LEADER operations · 7119.2']].map(([id,label])=>({id,label,kind:'programme',domain:'funding',group_id:'programmes'}));
  const parent={...group,members:t.map(v=>({topic_id:v.id,role:'primary'}))};
  const scene=buildScene(state,{...view,nodes:t,endpoint_ids:t.map(t=>t.id),edges:[]},{...catalog,topics:t,browse_groups:[parent],relationships:[]});
  assert.deepEqual(scene.cards.map(c=>c.id),['operations','cooperation','management']);
});

test('hierarchy shows child folders and direct members without arrows or duplicate anchor cards',()=>{
  const scene=buildScene(state,view,catalog);
  assert.deepEqual(scene.cards.map(c=>c.id),['display-group:browse:local','direct']);
  assert.deepEqual(scene.cards[0].members,['local','fund']);
  assert.deepEqual(scene.links,[]);assert.deepEqual(scene.internal,[]);
  assert.deepEqual(catalog.relationships,[edge]);
});

test('hierarchy restores old grouped/expanded state as stored folders without leaking route topics',()=>{
  const stale={...state,grouping:'type',expandedGroups:['display-group:browse:local'],expandedRoutes:['old'],alternatives:[{id:'old',endpoint:'outside',nodes:['fund','outside'],edges:['real-connection']}]};
  const before=structuredClone(stale),scene=buildScene(stale,view,catalog);
  assert.deepEqual(scene.cards.map(c=>c.id),['display-group:browse:local','direct']);
  assert.deepEqual(scene.links,[]);assert.deepEqual(stale,before);
});

test('hierarchy locks grouping for both opening and later grouping actions',()=>{
  assert.equal(fixedGroupLayout(group.id,catalog),true);
  assert.equal(reduceExploration({...initialState(),grouping:'place'},{type:'group',id:group.id},catalog).grouping,'none');
  assert.equal(reduceExploration(state,{type:'grouping',value:'family'},catalog).grouping,'none');
});

test('standard groups and ordinary topic exploration retain their recorded arrows',()=>{
  const standard={...catalog,browse_groups:[{...group,presentation:'standard'}]};
  assert.equal(buildScene(state,view,standard).links[0].id,edge.id);
  const neighbors={...state,scope:'neighbors',centre:'fund',anchor:'fund'};
  const result=buildScene(neighbors,{...view,scope:'neighbors',centre:'fund',endpoint_ids:['direct']},catalog);
  assert.equal(result.links[0].id,edge.id);
  assert.equal(fixedGroupLayout(group.id,standard),false);
});

test('hierarchy filters and previews retain shared-member identity and compact geometry',()=>{
  const filtered={...view,domain:'funding',endpoint_ids:['fund','local','direct']};
  const scene=buildScene(state,filtered,catalog);
  assert.equal(new Set(scene.cards.flatMap(c=>c.members)).size,3);
  const retained=buildScene({...state,positions:scene.positions,pendingDomain:'ecosystem'},filtered,catalog);
  assert.deepEqual(retained.positions,scene.positions);
  assert.ok(retained.cards.every(c=>c.outOfDomain));
});

test('backend placements govern roots and read-only review folders remain openable',()=>{
  const c={...catalog,organization_review:{topic_roots:{fund:'review:funding',direct:'funding:programmes'},warnings:[],pending_groups:[{id:'review:funding',label:'Needs organization · Funding',domain:'funding',member_ids:['fund'],readonly:true,presentation:'hierarchy'}]}};
  assert.equal(rootGroup('fund',c),'review:funding');
  assert.equal(groupLabel('review:funding',c),'Needs organization · Funding');
  assert.equal(editorTarget('review:funding',c),null);
  assert.equal(fixedGroupLayout('review:funding',c),true);
  const scene=buildScene({...initialState(),scope:'group',groupId:'review:funding'},{...view,endpoint_ids:['fund']},c);
  assert.deepEqual(scene.cards.map(c=>c.id),['fund']);assert.deepEqual(scene.links,[]);
});

test('overview and root folder views omit arrows while peer catalogues remain complete',()=>{
  for(const scope of ['overview','group']){
    const s={...initialState(),scope,groupId:scope==='group'?'funding:programmes':null};
    const scene=buildScene(s,{...view,scope},catalog);
    assert.deepEqual(scene.links,[]);
    assert.equal(new Set(scene.cards.flatMap(c=>c.members)).size,3);
  }
});
