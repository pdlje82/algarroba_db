import test from 'node:test';
import assert from 'node:assert/strict';
import {relationshipCircle,boxesOverlap,connectionLabel} from '../frontend/relationshipCircle.ts';
import {buildScene,scenePresentationKey,sceneFrame,sceneRectangles} from '../frontend/scene.ts';
import {initialState} from '../frontend/exploration.ts';
import {compactGrid} from '../frontend/compactLayout.ts';

const centre={id:'centre',record:{id:'centre',label:'Centre',kind:'habitat',domain:'ecosystem'},width:234,height:124,position:{x:0,y:0},members:['centre']};
const fixtures=n=>{
  const cards=[centre,...Array.from({length:n},(_,i)=>({...centre,id:'plant:'+i,record:{id:'plant:'+i,label:'Plant '+String(i).padStart(2,'0'),kind:'species',domain:'ecosystem'},members:['plant:'+i]}))];
  const links=cards.slice(1).map((c,i)=>({id:'edge:'+i,source:i%2?c.id:'centre',target:i%2?'centre':c.id,record:{id:'edge:'+i,label:i%3?'includes companion':'occurs in source-described community'},relationshipIds:['edge:'+i]}));
  return {cards,links};
};
const verifyClear=(cards,result)=>{
  const boxes=cards.map(c=>({...result.positions[c.id],width:c.width,height:c.height}));
  boxes.push(...Object.values(result.labels).map(l=>({...l.position,width:l.width,height:l.height})));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!boxesOverlap(boxes[i],boxes[j]),'Every card and reserved connection label must have clearance');
};

test('balanced upper/lower arcs adapt to the window without card or label collisions',()=>{
  for(const n of [0,1,2,3,9,21,36])for(const aspect of [.4,.8,1,1.6,2.4]){
    const {cards,links}=fixtures(n),result=relationshipCircle(cards,links,'centre',aspect);
    assert.deepEqual(result.positions.centre,{x:0,y:0});
    assert.equal(Object.keys(result.labels).length,links.length);
    verifyClear(cards,result);
    const ring=cards.slice(1).map(c=>result.positions[c.id]);
    assert.equal(ring.filter(p=>p.y<0).length,Math.floor(n/2));
    assert.equal(ring.filter(p=>p.y>0).length,Math.ceil(n/2));
    const upper=ring.slice(0,Math.floor(n/2)),lower=ring.slice(Math.floor(n/2));
    assert.ok(upper.every((p,i)=>!i||p.x>=upper[i-1].x));
    assert.ok(lower.every((p,i)=>!i||p.x<=lower[i-1].x));
    assert.deepEqual(relationshipCircle(cards,links,'centre',aspect),result,'Camera movement and reload retain the same layout at the same window size');
    assert.equal(new Set(links.map(e=>e.id)).size,links.length);
  }
});

test('parallel incoming/outgoing labels and secondary relationships retain direction and complete labels',()=>{
  const {cards,links}=fixtures(9);
  links.push({id:'reverse',source:'plant:0',target:'centre',record:{label:'is associated with, in this particular source context'},relationshipIds:['reverse']});
  links.push({id:'secondary',source:'plant:1',target:'plant:4',record:{label:'also occurs in the same documented community'},relationshipIds:['secondary']});
  const original=structuredClone(links),result=relationshipCircle(cards,links,'centre');
  verifyClear(cards,result);
  assert.deepEqual(links,original,'Layout must not alter factual edge direction or identity');
  assert.ok(result.labels.reverse.lines.length>1);
  assert.equal(result.labels.secondary.lines.join(' '),'also occurs in the same documented community');
});

test('old grid histories translate to circles without rewriting saved offsets or closed/source references',()=>{
  const {cards,links}=fixtures(9),nodes=cards.map(c=>c.record);
  const catalog={topics:nodes,relationships:links.map(e=>({...e.record,id:e.id,source:e.source,target:e.target})),browse_groups:[],organization_roots:[],communities:[]};
  const view={scope:'neighbors',nodes,edges:catalog.relationships,endpoint_ids:nodes.slice(1).map(n=>n.id),routes:[]};
  const grid=compactGrid(cards.length,1.6,234,124).points;
  const s={...initialState(),scope:'neighbors',centre:'centre',anchor:'centre',positions:Object.fromEntries(cards.map((c,i)=>[c.id,grid[i]]))};
  // buildScene uses canonical label order when reconstructing the old geometry key.
  const sorted=[...cards].sort((a,b)=>a.record.label.localeCompare(b.record.label));
  const oldKey=scenePresentationKey(JSON.stringify([sorted.map(c=>[c.id,s.positions[c.id]]),links.map(e=>e.id)]));
  s.layerOffsets={[oldKey]:{x:77,y:-28}};s.closedLayers=[oldKey];s.openedFrom={layerKey:oldKey,cardId:'centre'};
  const before=structuredClone(s),scene=buildScene(s,view,catalog);
  assert.equal(scene.layout,'circle');assert.equal(scene.previousKey,oldKey);
  assert.deepEqual(scene.offset,{x:77,y:-28});assert.deepEqual(scene.openedFrom,s.openedFrom);
  assert.deepEqual(s,before);
  const healthy={...s,positions:scene.positions};
  const resized=buildScene({...healthy,layerOffsets:{...healthy.layerOffsets,[scene.key]:{x:91,y:-34}}},view,catalog,0.6);
  assert.notDeepEqual(resized.positions,scene.positions);
  assert.equal(resized.key,scene.key,'Adaptive reflow must not create a new logical layer');
  assert.deepEqual(resized.offset,{x:91,y:-34});
  const preview={...healthy,pendingDomain:'technology'};
  const frozen=buildScene(preview,view,catalog,.4);
  assert.deepEqual(frozen.positions,scene.positions);
  assert.equal(frozen.layout,'circle');assert.equal(frozen.key,scene.key);
  assert.ok(frozen.links.every(e=>e.labelPlacement),'A resized preview keeps its safe label positions');
});

test('topic arcs fill landscape and portrait frames without clipping labels',()=>{
  for(const n of [1,9,21]){
    for(const aspect of [0.5,0.85,1,1.6,2.4]){
      const {cards,links}=fixtures(n),layout=relationshipCircle(cards,links,'centre',aspect);
      const scene={layout:'circle',cards:cards.map(c=>({...c,position:layout.positions[c.id]})),links:links.map(e=>({...e,labelPlacement:layout.labels[e.id]}))};
      const original=structuredClone(scene);
      const frame=sceneFrame(scene,aspect);
      assert.ok(Math.abs((frame.maxX-frame.minX)/(frame.maxY-frame.minY)-aspect)<0.00001);
      assert.equal(frame.minX+frame.maxX,0);assert.equal(frame.minY+frame.maxY,0);
      for(const r of sceneRectangles(scene)){
        assert.ok(r.position.x-r.width/2>=frame.minX+24.99);
        assert.ok(r.position.x+r.width/2<=frame.maxX-24.99);
        assert.ok(-r.position.y-r.height/2>=frame.minY+24.99);
        assert.ok(-r.position.y+r.height/2<=frame.maxY-24.99);
      }
      if(n>=3){
        const width=Math.max(...scene.cards.map(c=>c.position.x+c.width/2))-Math.min(...scene.cards.map(c=>c.position.x-c.width/2));
        const height=Math.max(...scene.cards.map(c=>c.position.y+c.height/2))-Math.min(...scene.cards.map(c=>c.position.y-c.height/2));
        assert.ok(width/(frame.maxX-frame.minX)>.85,'Topics use the available frame width');
        assert.ok(height/(frame.maxY-frame.minY)>.85,'Topics use the available frame height');
      }
      assert.deepEqual(scene,original);
    }
  }
});
