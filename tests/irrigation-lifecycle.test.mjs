import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,reduceExploration} from '../frontend/exploration.ts';
import {buildScene} from '../frontend/scene.ts';
import {ROOT_GROUPS,GROUP_LABELS} from '../frontend/types.ts';

const order=['before','at','recurring','conditional'];
const topics=order.map((id,i)=>({id,label:['Z nursery','Y settlement','B maintenance','A support'][i],kind:'activity',domain:'technology',group_id:'irrigation'}));
const group={id:'browse:ordered-example',label:'Ordered example',parent_id:'technology:irrigation',anchor_topic_id:null,members:order.map(topic_id=>({topic_id,role:'primary'})),maintenance_rule:'Test',description:'Reader guide',source_refs:[],member_layout:'vertical'};
const catalog={topics,browse_groups:[group],relationships:[],findings:[],sources:[],coverage:[],unresolved:[],communities:[],irrigation_evidence:[],revision:1,root_groups:ROOT_GROUPS,topic_kinds:['activity'],organization_roots:ROOT_GROUPS.map(id=>({id,label:GROUP_LABELS[id.split(':')[1]],domain:id.split(':')[0]}))};
const view={revision:1,scope:'group',group_id:group.id,centre:null,search:'',domain:'all',kinds:[],depth:6,nodes:topics,edges:[],endpoint_ids:[...order].reverse(),routes:[],matches:[],passages:[],notices:[]};

test('ordered groups use stored member order in a vertical column, independent of labels or viewport',()=>{
 const s={...initialState(),scope:'group',groupId:group.id,grouping:'type'};
 for(const aspect of [0.6,1.6,3]){
  const scene=buildScene(s,view,catalog,aspect);
  assert.deepEqual(scene.cards.map(c=>c.id),order);
  assert.ok(scene.cards.every(c=>c.position.x===0));
  assert.ok(scene.cards.slice(1).every((c,i)=>c.position.y>scene.cards[i].position.y));
 }
 assert.equal(reduceExploration({...initialState(),grouping:'type'},{type:'group',id:group.id},catalog).grouping,'none');
});

test('old alphabetical grids repair in memory and retain geometry aliases, offsets and pending previews',()=>{
 const positions=Object.fromEntries(order.map((id,i)=>[id,{x:i*258,y:0}]));
 const s={...initialState(),scope:'group',groupId:group.id,positions,layerOffsets:{},camera:{position:{x:0,y:0,z:900},target:{x:0,y:0,z:0}}};
 const before=structuredClone(s),scene=buildScene(s,view,catalog);
 assert.deepEqual(s,before);assert.ok(scene.previousKey);
 const moved=buildScene({...s,layerOffsets:{[scene.previousKey]:{x:123,y:456}}},view,catalog);
 assert.deepEqual(moved.offset,{x:123,y:456});
 const stable=buildScene({...s,positions:scene.positions},view,catalog);assert.deepEqual(stable.positions,scene.positions);
 const preview=buildScene({...s,pendingDomain:'ecosystem'},view,catalog);assert.deepEqual(preview.positions,positions);
});

test('unordered groups keep their usual grid and filtered ordered members keep relative order',()=>{
 const c={...catalog,browse_groups:[{...group,member_layout:'grid'}]};
 const s={...initialState(),scope:'group',groupId:group.id};
 assert.deepEqual(buildScene(s,view,c).cards.map(c=>c.id),[...topics].sort((a,b)=>a.label.localeCompare(b.label)).map(t=>t.id));
 const filtered=buildScene(s,{...view,endpoint_ids:['conditional','at'],nodes:topics.filter(t=>['conditional','at'].includes(t.id))},catalog);
 assert.deepEqual(filtered.cards.map(c=>c.id),['at','conditional']);
});
