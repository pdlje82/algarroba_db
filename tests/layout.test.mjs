import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {initialState} from '../frontend/types.ts';
import {buildElements,updateGraph} from '../frontend/graphView.ts';
import cytoscape from 'cytoscape';
import {calculateLayout,readPrevious} from '../frontend/layout.ts';
import {graphStyle,graphStyleFor} from '../frontend/graphView.ts';
import {clampPanel,palettes} from '../frontend/appearance.ts';
import {avoidCards,crossesCard,segmentCoordinates,routeActiveConnections} from '../frontend/routing.ts';

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
 for(const node of short.elements.filter(e=>e.group==='nodes'&&e.data.domain!=='ecosystem'))assert.deepEqual(open.elements.find(e=>e.data.id===node.data.id)?.position,node.position);
 assert.deepEqual(buildElements(fixture.overview,s,catalog,[]).elements,short.elements);
});

function renderLayout(cy,view,s){
 const projection=buildElements(view,s,catalog,[]);
 const result=calculateLayout({elements:projection.elements,previous:readPrevious(cy),overview:s.overview,centre:s.centre,preserve:!cy.nodes().empty()});
 for(const node of projection.elements.filter(e=>e.group==='nodes'))node.position=result.positions[node.data.id];
 updateGraph(cy,projection.elements,false);return projection;
}

test('fCoSE expands groups without moving other areas or overlapping sibling frames',()=>{
 const cy=cytoscape({headless:true,styleEnabled:true,style:graphStyle,elements:[]});
 try{
  renderLayout(cy,fixture.overview,state());
  const technology=cy.nodes('[domain="technology"]').filter(n=>!n.isParent()).map(n=>({id:n.id(),p:{...n.position()}}));
  renderLayout(cy,fixture.overview,state({expandedGroups:['ecosystem:species']}));
  for(const n of technology)assert.deepEqual(cy.getElementById(n.id).position(),n.p);
  const frames=cy.nodes('[kind="group"]').filter(n=>n.data('domain')==='ecosystem').map(n=>n.boundingBox({includeLabels:true}));
  for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++)assert.ok(frames[i].y2<=frames[j].y1||frames[j].y2<=frames[i].y1,'sibling group overlap');
  renderLayout(cy,fixture.overview,state({expandedGroups:['ecosystem:species'],groupLimits:{'ecosystem:species':12}}));
  assert.ok(cy.nodes().every(n=>Number.isFinite(n.position().x)&&Number.isFinite(n.position().y)));
 }finally{cy.destroy()}
});

test('partial groups account for relationships once and use More topics for hidden endpoints',()=>{
 const s=state({expandedGroups:['ecosystem:species']}),projection=buildElements(fixture.overview,s,catalog,[]);
 const nodes=new Map(projection.elements.filter(e=>e.group==='nodes').map(e=>[e.data.id,e.data]));
 const shown=new Set(),more='more:ecosystem:species';assert.ok(nodes.has(more));
 for(const edge of projection.elements.filter(e=>e.group==='edges')){
  for(const id of edge.data.constituent_ids||[edge.data.id]){assert.ok(!shown.has(id),'duplicate relationship '+id);shown.add(id)}
  assert.ok(edge.data.source!=='group:ecosystem:species'&&edge.data.target!=='group:ecosystem:species');
 }
 const hidden=new Set(catalog.topics.filter(t=>t.domain==='ecosystem'&&t.group_id==='species'&&!nodes.has(t.id)).map(t=>t.id));
 for(const edge of fixture.overview.edges.filter(e=>hidden.has(e.source)!==hidden.has(e.target))){const representation=projection.elements.find(e=>(e.data.constituent_ids||[e.data.id]).includes(edge.id));assert.ok(representation,edge.id);assert.ok([representation.data.source,representation.data.target].includes(more))}
});

test('fCoSE unfolds routes while keeping every existing endpoint and centre fixed',()=>{
 const cy=cytoscape({headless:true,styleEnabled:true,style:graphStyle,elements:[]});
 try{const s=state({centre:'carob',overview:false,perspective:'technology',search:'drone'});renderLayout(cy,fixture.views.technology,s);
 const before=new Map(cy.nodes().map(n=>[n.id(),{...n.position()}]));renderLayout(cy,fixture.views.technology,{...s,detail:'full'});
 for(const [id,p]of before){const actual=cy.getElementById(id).position();assert.ok(Math.hypot(actual.x-p.x,actual.y-p.y)<.01,id+' moved')}
 }finally{cy.destroy()}
});

test('fCoSE lays out all ten perspectives with finite, bounded cards',()=>{
 for(const [perspective,view]of Object.entries(fixture.views)){
  const s=state({centre:'carob',overview:false,perspective,search:'drone',detail:'full'}),projection=buildElements(view,s,catalog,[]);
  const result=calculateLayout({elements:projection.elements,previous:[],overview:false,centre:'carob',preserve:false});
  for(const node of projection.elements.filter(e=>e.group==='nodes')){const p=result.positions[node.data.id];assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.y),perspective+' '+node.data.id)}
  assert.deepEqual(result.positions.carob,{x:0,y:0});
 }
});

test('floating panel clamps saved geometry to a smaller workspace',()=>{
 const b=clampPanel({x:1400,y:900,width:800,height:700},480,320);assert.ok(b.x>=8&&b.y>=8);assert.ok(b.x+b.width<=472&&b.y+b.height<=312);
 const small=clampPanel(undefined,250,180);assert.equal(small.width,234);assert.equal(small.height,164);
});

test('both themes keep card backgrounds solid and context connections distinct',()=>{
 for(const theme of ['light','dark']){const styles=graphStyleFor(theme);assert.equal(styles.find(s=>s.selector==='node').style['background-opacity'],1);assert.ok(!('opacity' in styles.find(s=>s.selector==='node.muted').style));assert.equal(styles.find(s=>s.selector==='edge.context').style.label,'')}
});

test('successive group openings, More topics and collapse remain bounded and reversible',()=>{
 const cy=cytoscape({headless:true,styleEnabled:true,style:graphStyle,elements:[],layout:{name:'preset'}});
 try{let s=state();renderLayout(cy,fixture.overview,s);const before={...cy.getElementById('group:ecosystem:species').position()};
 for(const gid of ['ecosystem:species','technology:irrigation','funding:programmes']){s={...s,expandedGroups:[...s.expandedGroups,gid]};renderLayout(cy,fixture.overview,s);const frames=cy.nodes('[kind="group"]').map(n=>({id:n.id(),box:n.boundingBox({includeLabels:true})}));for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++){const a=frames[i].box,b=frames[j].box;assert.ok(a.x2<=b.x1||b.x2<=a.x1||a.y2<=b.y1||b.y2<=a.y1,frames[i].id+' overlaps '+frames[j].id)}}
 s={...s,groupLimits:{'ecosystem:species':12}};renderLayout(cy,fixture.overview,s);assert.ok(cy.nodes().length<=120);assert.ok(cy.edges().length<=240);
 s={...s,expandedGroups:[]};renderLayout(cy,fixture.overview,s);const after=cy.getElementById('group:ecosystem:species').position();assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01);
 }finally{cy.destroy()}
});

test('layout failure rejects invalid coordinates without modifying its input',()=>{
 const request={elements:[{group:'nodes',data:{id:'broken'},position:{x:NaN,y:0}}],previous:[],overview:false,centre:null,preserve:false};
 assert.throws(()=>calculateLayout(request),/invalid/);assert.ok(Number.isNaN(request.elements[0].position.x));
});

test('topic labels have at least 4.5 to 1 contrast in both palettes',()=>{
 const luminance=hex=>{const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 for(const p of Object.values(palettes))for(const background of [...Object.values(p.fills),p.centre,p.label]){const l=[luminance(p.text),luminance(background)].sort((a,b)=>a-b);assert.ok((l[1]+.05)/(l[0]+.05)>=4.5,background)}
});

test('highlighted connections detour around unrelated cards and retain exact geometry',()=>{
 const a={x:0,y:0},b={x:500,y:200},obstacles=[{x1:150,x2:350,y1:0,y2:180},{x1:325,x2:450,y1:150,y2:280}];
 const path=avoidCards(a,b,obstacles);assert.ok(path.length>2);assert.deepEqual(path[0],a);assert.deepEqual(path.at(-1),b);
 for(let i=1;i<path.length;i++)for(const r of obstacles)assert.ok(!crossesCard(path[i-1],path[i],r),'route crosses a card');
 const controls=segmentCoordinates(path),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
 controls.weights.forEach((w,i)=>{const p={x:a.x+w*dx-controls.distances[i]*dy/len,y:a.y+w*dy+controls.distances[i]*dx/len};assert.ok(Math.hypot(p.x-path[i+1].x,p.y-path[i+1].y)<1e-6)});
 assert.deepEqual(avoidCards(a,b,[]),[a,b]);
});

test('Cytoscape applies a selected detour and clears it without replacing the relationship',()=>{
 const cy=cytoscape({headless:true,styleEnabled:true,style:graphStyle,layout:{name:'preset'},elements:[
  {group:'nodes',data:{id:'a',label:'A',color:'#49765b'},position:{x:0,y:0}},
  {group:'nodes',data:{id:'b',label:'B',color:'#49765b'},position:{x:500,y:200}},
  {group:'nodes',data:{id:'other',label:'Other topic',color:'#49765b'},position:{x:250,y:100}},
  {group:'edges',data:{id:'original',source:'a',target:'b',label:'recorded connection'},classes:'active'}
 ]});
 try{routeActiveConnections(cy);const edge=cy.getElementById('original');assert.ok(edge.hasClass('routed'));assert.equal(edge.style('curve-style'),'round-segments');assert.equal(cy.edges().length,1);assert.equal(edge.source().id(),'a');assert.equal(edge.target().id(),'b');edge.removeClass('active');routeActiveConnections(cy);assert.ok(!edge.hasClass('routed'));assert.equal(edge.style('curve-style'),'bezier')}finally{cy.destroy()}
});

test('research indications remain outlined view objects and never domain facts',()=>{
 const result=buildElements(fixture.overview,state(),catalog,[{id:'test-task',status:'Prepared',instruction:'Find more information',custom_topics:'soil microorganisms',context:{centre:'carob'}}]);
 assert.ok(result.elements.some(e=>e.data.kind==='research'&&e.classes.includes('marker')));
 assert.ok(result.elements.some(e=>e.data.record_type==='gap'&&e.data.label==='Investigate connection'));
 assert.ok(!catalog.topics.some(t=>t.id==='test-task'));
});

test('persistent viewer changes shortened-edge endpoints and clears obsolete view flags',()=>{
 const cy=cytoscape({headless:true,elements:[],layout:{name:'preset'}});
 const nodes=[{group:'nodes',data:{id:'a',label:'A',color:'#49765b',isDomain:true},position:{x:0,y:0}},{group:'nodes',data:{id:'b',label:'B',color:'#49765b'},position:{x:100,y:0}},{group:'nodes',data:{id:'c',label:'C'},position:{x:0,y:100}}];
 updateGraph(cy,[...nodes,{group:'edges',data:{id:'route',source:'a',target:'b'}}],false);
 updateGraph(cy,[{...nodes[0],data:{id:'a',label:'A',color:'#49765b',isLandmark:true}},...nodes.slice(1),{group:'edges',data:{id:'route',source:'c',target:'b'}}],false);
 assert.equal(cy.getElementById('route').source().id(),'c');
 assert.equal(cy.getElementById('a').data('isDomain'),undefined);
 cy.destroy();
});
