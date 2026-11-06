import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {initialState} from '../frontend/types.ts';
import {buildElements,updateGraph} from '../frontend/graphView.ts';
import cytoscape from 'cytoscape';

const python=resolve('.venv/Scripts/python.exe');
const fixture=JSON.parse(execFileSync(python,['-c',`
import json,tempfile,sys
from pathlib import Path
from backend.store import Store,ROOT
from backend.graph import Graph,PERSPECTIVES
sys.stdout.reconfigure(encoding='utf-8')
with tempfile.TemporaryDirectory() as folder:
 s=Store(Path(folder)/'test.sqlite')
 s.register_sources(json.loads((ROOT/'imports/source-manifest.json').read_text(encoding='utf8')))
 b=dict(batch_id='layout-fixture',summary='layout tests',topics=[],relationships=[],findings=[],coverage=[],unresolved=[])
 for name in ['ecosystems.json','water-technology.json','funding.json']:
  raw=json.loads((ROOT/'imports'/name).read_text(encoding='utf8'))
  for key in ['topics','relationships','findings','coverage','unresolved']:b[key]+=raw[key]
 s.import_batch(b);g=Graph(s)
 views={p:g.view('carob','drone',p,48,8) for p,_ in PERSPECTIVES}
 overview=g.view()
 print(json.dumps(dict(catalog=s.snapshot(),views=views,overview=overview),ensure_ascii=False))
`],{encoding:'utf8',maxBuffer:10*1024*1024}));
const catalog=fixture.catalog;
const state=(patch={})=>({...structuredClone(initialState),...patch});

test('combined landscape has nine readable entry groups and three areas',()=>{
 const {elements}=buildElements(fixture.overview,state(),catalog,[]);
 assert.equal(elements.filter(e=>e.data.kind==='group').length,9);
 assert.equal(elements.filter(e=>e.data.kind==='domain').length,3);
 assert.ok(elements.some(e=>e.data.record_type==='aggregate'));
});

test('all ten perspectives produce valid unique bounded element networks',()=>{
 for(const [perspective,view] of Object.entries(fixture.views)){
  const {elements}=buildElements(view,state({centre:'carob',overview:false,perspective,search:'drone',detail:'full'}),catalog,[]);
  const nodes=elements.filter(e=>e.group==='nodes'),edges=elements.filter(e=>e.group==='edges');
  const ids=new Set(elements.map(e=>e.data.id));assert.equal(ids.size,elements.length,perspective+' duplicate element');
  assert.ok(nodes.length<=120,perspective+' node budget: '+nodes.length);assert.ok(edges.length<=240,perspective+' edge budget: '+edges.length);
  assert.ok(nodes.some(e=>e.data.id==='carob'),perspective+' missing anchor');
  for(const edge of edges){assert.ok(ids.has(edge.data.source));assert.ok(ids.has(edge.data.target))}
 }
});

test('shortened routes unfold completely, share intermediates once and pin existing endpoints',()=>{
 const view=fixture.views.technology;
 const s=state({centre:'carob',search:'drone',overview:false,perspective:'technology'});
 const short=buildElements(view,s,catalog,[]);
 assert.ok(short.elements.some(e=>e.data.record_type==='abbreviated'));
 for(const el of short.elements.filter(e=>e.group==='nodes'))s.positions['technology:focus:carob:'+el.data.id]=el.position;
 const full=buildElements(view,{...s,detail:'full'},catalog,[]);
 const ids=full.elements.map(e=>e.data.id);
 for(const route of view.routes){for(const n of route.nodes)assert.equal(ids.filter(id=>id===n).length,1);for(const e of route.edges)assert.ok(ids.includes(e))}
 for(const el of short.elements.filter(e=>e.group==='nodes'))assert.deepEqual(full.elements.find(n=>n.data.id===el.data.id).position,el.position);
 assert.ok(full.elements.length>short.elements.length);
});

test('group reveal keeps unrelated landmarks fixed and collapses reversibly',()=>{
 const s=state();const short=buildElements(fixture.overview,s,catalog,[]);
 const open=buildElements(fixture.overview,{...s,expandedGroups:['ecosystem:species']},catalog,[]);
 assert.ok(open.elements.some(e=>e.data.id==='carob'));
 for(const node of short.elements.filter(e=>e.group==='nodes'))assert.deepEqual(open.elements.find(e=>e.data.id===node.data.id)?.position,node.position);
 assert.deepEqual(buildElements(fixture.overview,s,catalog,[]).elements,short.elements);
});

test('research indications remain outlined view objects and never domain facts',()=>{
 const result=buildElements(fixture.overview,state(),catalog,[{id:'test-task',status:'Prepared',instruction:'Find more information',custom_topics:'soil microorganisms',context:{centre:'carob'}}]);
 assert.ok(result.elements.some(e=>e.data.kind==='research'&&e.classes.includes('marker')));
 assert.ok(result.elements.some(e=>e.data.record_type==='gap'&&e.data.label==='Investigate connection'));
 assert.ok(!catalog.topics.some(t=>t.id==='test-task'));
});

test('persistent viewer changes shortened-edge endpoints and clears obsolete view flags',()=>{
 const cy=cytoscape({headless:true,elements:[],layout:{name:'preset'}});
 const nodes=[{group:'nodes',data:{id:'a',label:'A',isDomain:true},position:{x:0,y:0}},{group:'nodes',data:{id:'b',label:'B'},position:{x:100,y:0}},{group:'nodes',data:{id:'c',label:'C'},position:{x:0,y:100}}];
 updateGraph(cy,[...nodes,{group:'edges',data:{id:'route',source:'a',target:'b'}}],false);
 updateGraph(cy,[{...nodes[0],data:{id:'a',label:'A',isLandmark:true}},...nodes.slice(1),{group:'edges',data:{id:'route',source:'c',target:'b'}}],false);
 assert.equal(cy.getElementById('route').source().id(),'c');
 assert.equal(cy.getElementById('a').data('isDomain'),undefined);
 cy.destroy();
});
