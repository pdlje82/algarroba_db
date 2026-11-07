import {readFileSync} from 'node:fs';
import {centrePatch} from '../frontend/centreView.ts';
import {directNeighbours} from '../frontend/organization.ts';
import {parseEffects,effectsEnabled} from '../frontend/backgroundEffects.ts';
import {projectCard,screenPointAtZ} from '../frontend/cardGeometry.ts';
import {polygonConnectionPath,inPolygon,padPolygon,crossesPolygon,polygonArea} from '../frontend/polygonRouting.ts';
import {Mesh,MeshBasicMaterial,PlaneGeometry} from 'three';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {depthOrigin,displayPosition} from '../frontend/depth.ts';
import {trackLayerReturns,collapseLayerReturn,collapseExpandedCard} from '../frontend/layerNavigation.ts';
import {setConnectionPath} from '../frontend/connectionGeometry.ts';
import {LayerHover} from '../frontend/layerHover.ts';
import {connectionPath,pathFractions,pathMidpoint,cardPort,crossesCard} from '../frontend/routing.ts';
import {initialState} from '../frontend/types.ts';
import {buildScene,rememberScene,normalizeExploration,deepestCollapse,seedUnoccupied,PLANE_GAP,FOCUS_OFFSET} from '../frontend/scene.ts';
import {encodeHistory,decodeHistory} from '../frontend/explorationStorage.ts';
import {prepareScene} from '../frontend/sceneLayout.ts';
import {requestLayout} from '../frontend/layoutRequest.ts';
import {calculateLayout} from '../frontend/layout.ts';
import {Color,Group,PerspectiveCamera,Scene as ThreeScene,Sprite,SpriteMaterial,Texture,Vector3,WebGLRenderTarget} from 'three';
import {cameraPoseForScene,focusAfterTransition,focusCameraPan,focusScreenPoint} from '../frontend/cameraFocus.ts';
import {collapseToLayer,layerBorderAt,sceneLayers} from '../frontend/layers.ts';
import {FrostedGraphPass,KnowledgeBokehPass,bokehSettings,bokehSharpCards,packedMaskDepth,parseBokehPreference} from '../frontend/bokeh.ts';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
const python=resolve('.venv/Scripts/python.exe');
const fixture=JSON.parse(execFileSync(python,['-c',`
import json,tempfile,sys
from pathlib import Path
from backend.store import Store,ROOT
from backend.graph import Graph,PERSPECTIVES
sys.stdout.reconfigure(encoding='utf-8')
with tempfile.TemporaryDirectory() as folder:
 s=Store(Path(folder)/'test.sqlite');s.register_sources(json.loads((ROOT/'imports/source-manifest.json').read_text(encoding='utf8')))
 b=dict(batch_id='scene-fixture',summary='scene tests',topics=[],relationships=[],findings=[],coverage=[],unresolved=[])
 for name in ['ecosystems.json','water-technology.json','funding.json']:
  raw=json.loads((ROOT/'imports'/name).read_text(encoding='utf8'))
  for key in ['topics','relationships','findings','coverage','unresolved']:b[key]+=raw[key]
 s.import_batch(b);g=Graph(s)
 views={p:g.view('carob','drone',p,48,8) for p,_ in PERSPECTIVES}
 print(json.dumps(dict(catalog=s.snapshot(),views=views,overviewViews={p:g.view(perspective=p) for p,_ in PERSPECTIVES},overview=g.view()),ensure_ascii=False))
`],{encoding:'utf8',maxBuffer:10*1024*1024}));
const {catalog,views,overview}=fixture;
const state=(patch={})=>normalizeExploration({...structuredClone(initialState),...patch});
const build=(s,v=overview,prior)=>seedUnoccupied(buildScene(v,s,catalog,[]),s.scene.mode,prior);
function check(scene){
 assert.ok(scene.cards.length<=120);assert.ok(scene.links.length<=240);
 const ids=new Set(scene.cards.map(c=>c.id));assert.equal(ids.size,scene.cards.length);
 const accounted=new Set();for(const edge of scene.links){assert.ok(ids.has(edge.source));assert.ok(ids.has(edge.target));for(const id of edge.relationshipIds){assert.ok(!accounted.has(id),'duplicate fact '+id);accounted.add(id)}}
 for(const summary of scene.internalSummaries){assert.ok(ids.has(summary.cardId));for(const id of summary.relationshipIds){assert.ok(!accounted.has(id),'duplicate internal fact '+id);accounted.add(id)}}
 for(const card of scene.cards)assert.ok(Object.values(card.position).every(Number.isFinite));
}
test('independent plane-zero overview remains fixed in every focused query and perspective',()=>{
 const base=build(state());for(const [perspective,view] of Object.entries(views)){
  const scene=build(state({centre:'carob',overview:false,perspective,search:'drone',detail:'full'}),view);check(scene);
  for(const n of base.cards)assert.deepEqual(scene.cards.find(c=>c.id===n.id)?.home,n.home,perspective);
 }
});
test('group detail reveals six, More adds six, and all relationships occur exactly once',()=>{
 let s=state({expandedGroups:['ecosystem:species']});let scene=build(s);check(scene);
 assert.equal(scene.cards.filter(c=>c.record.record_type==='topic').length,6);
 assert.ok(scene.cards.find(c=>c.id==='more:ecosystem:species'));
 assert.equal(new Set([...scene.links,...scene.internalSummaries].flatMap(e=>e.relationshipIds)).size,catalog.relationships.length);
 const first=scene.cards.filter(c=>c.record.record_type==='topic');s=rememberScene(s,scene);s.groupLimits['ecosystem:species']=12;
 const more=build(s,overview,scene);assert.equal(more.cards.filter(c=>c.record.record_type==='topic').length,12);for(const n of first)assert.deepEqual(more.cards.find(c=>c.id===n.id).home,n.home);
 s=rememberScene(s,more);s.expandedGroups=[];const closed=build(s,overview,more);assert.equal(closed.cards.length,9);
 s=rememberScene(s,closed);s.expandedGroups=['ecosystem:species'];const reopened=build(s,overview,closed);for(const n of first)assert.deepEqual(reopened.cards.find(c=>c.id===n.id).home,n.home);
});
test('topic expansion creates progressive depth without duplicating shared topics or revisits',()=>{
 let s=state({expandedGroups:['ecosystem:species']});let scene=build(s);s=rememberScene(s,scene);s.branches=['carob'];let next=build(s,overview,scene);assert.ok(next.level>=2);check(next);
 s=rememberScene(s,next);s.branches=[...s.branches,'kermes-oak'];let third=build(s,overview,next);check(third);
 const repeated=build(rememberScene(s,third),overview,third);assert.equal(repeated.level,third.level);assert.deepEqual(repeated.cards.map(c=>[c.id,c.home]),third.cards.map(c=>[c.id,c.home]));
});
test('shared ownership survives collapse and disappears only after its final owner closes',()=>{
 let s=state({expandedGroups:['ecosystem:species'],branches:['carob']});const open=build(s);const shared=open.cards.find(c=>c.owners.length>1);assert.ok(shared);
 s=rememberScene(s,open);s.expandedGroups=[];const next=build(s,overview,open);assert.ok(next.cards.some(c=>c.id===shared.id));
 s=rememberScene(s,next);s.branches=[];const closed=build(s,overview,next);assert.ok(!closed.cards.some(c=>c.id===shared.id));
});
test('route expansion exposes every step and pins previous homes in XYZ',()=>{
 let s=state({centre:'carob',search:'drone',overview:false,perspective:'technology'}),short=build(s,views.technology);
 s=rememberScene(s,short);s.expandedRoutes=views.technology.routes.map(r=>r.id);const full=build(s,views.technology,short);check(full);
 for(const route of views.technology.routes){for(const id of route.nodes)assert.ok(full.cards.some(c=>c.id===id));for(const id of route.edges)assert.ok(full.links.some(e=>e.relationshipIds.includes(id)))}
 for(const n of short.cards)assert.deepEqual(full.cards.find(c=>c.id===n.id).home,n.home);
});
test('focus offset is display-only and closing or selecting a relationship preserves opened geometry',()=>{
 let s=state({expandedGroups:['ecosystem:species'],selected:'carob'});s.scene.focus='carob';let scene=build(s);const card=scene.cards.find(c=>c.id==='carob');assert.equal(card.position.z,scene.level*PLANE_GAP+FOCUS_OFFSET);assert.equal(card.home.z,PLANE_GAP);
 s=rememberScene(s,scene);s.selected=null;const clear=build(s,overview,scene);assert.deepEqual(clear.cards.map(c=>c.position),scene.cards.map(c=>c.position));
 s.scene.focus='aleppo-pine';s.selected='aleppo-pine';const changed=build(s,overview,clear);assert.deepEqual(changed.cards.find(c=>c.id==='carob').position,card.home);
});
test('flat and layered layouts use independent caches without changing the knowledge',()=>{
 let s=state({centre:'carob',overview:false,search:'drone',perspective:'technology',detail:'full'});const layered=build(s,views.technology);s=rememberScene(s,layered);s.scene.mode='flat';const flat=build(s,views.technology,layered);check(flat);
 assert.deepEqual(flat.cards.map(c=>c.id),layered.cards.map(c=>c.id));assert.ok(flat.cards.every(c=>c.position.z===0));
 for(let i=0;i<flat.cards.length;i++)for(let j=i+1;j<flat.cards.length;j++){const a=flat.cards[i],b=flat.cards[j];assert.ok(Math.abs(a.position.x-b.position.x)>=(a.width+b.width)/2+20||Math.abs(a.position.y-b.position.y)>=(a.height+b.height)/2+20,'flat overlap '+a.id+' '+b.id)}
 s=rememberScene(s,flat);s.scene.mode='layered';const returned=build(s,views.technology,flat);assert.deepEqual(returned.cards.map(c=>c.position),layered.cards.map(c=>c.position));
});
test('v3 state round-trips without losing ownership, layouts, cameras or original legacy storage data',()=>{
 const legacy=state({layoutVersion:2,positions:{'combined:focus:carob:carob':{x:123,y:456}},centre:'carob',overview:false});const before=structuredClone(legacy);const scene=build(legacy,views.combined);assert.equal(scene.cards.find(c=>c.id==='carob').home.x,123);assert.deepEqual(legacy,before);
 const pose={position:{x:0,y:800,z:1600},target:{x:0,y:0,z:0},quaternion:[0,0,0,1],focalScale:800,reference:1700};const saved=rememberScene(legacy,scene,pose);assert.deepEqual(normalizeExploration(JSON.parse(JSON.stringify(saved))),saved);
});
test('semantic zoom-out closes deepest owners then returns to the stable overview',()=>{
 let s=state({expandedGroups:['ecosystem:species'],branches:['carob']});s=rememberScene(s,build(s));const patch=deepestCollapse(s);assert.deepEqual(patch.branches,[]);assert.deepEqual(patch.expandedGroups,['ecosystem:species']);
 s={...s,...patch};assert.deepEqual(deepestCollapse(s).expandedGroups,[]);
});
test('renderer-neutral scene construction does not mutate catalog, view or exploration',()=>{
 const s=state({centre:'carob',overview:false,detail:'full'}),before=JSON.stringify([s,catalog,views.combined]);buildScene(views.combined,s,catalog,[]);assert.equal(JSON.stringify([s,catalog,views.combined]),before);
});

test('new Flat-view detail is placed on return without disturbing existing layered anchors',()=>{
 let s=state({expandedGroups:['ecosystem:species']});const first=build(s);s=rememberScene(s,first);s.scene.mode='flat';let flat=build(s,overview,first);s=rememberScene(s,flat);s.branches=['carob'];const expanded=build(s,overview,flat);s=rememberScene(s,expanded);s.scene.mode='layered';const returned=build(s,overview,expanded);check(returned);
 for(const card of first.cards)assert.deepEqual(returned.cards.find(c=>c.id===card.id).home,card.home);
 assert.ok(returned.cards.length>first.cards.length);
});
test('route unfolding pins the displayed foreground centre as well as ordinary endpoints',()=>{
 let s=state({centre:'carob',selected:'carob',overview:false,search:'drone',perspective:'technology'});s.scene.focus='carob';const first=build(s,views.technology);s=rememberScene(s,first);s.expandedRoutes=views.technology.routes.map(r=>r.id);s.selected=views.technology.routes[0].id;const full=build(s,views.technology,first);
 for(const c of first.cards)assert.deepEqual(full.cards.find(n=>n.id===c.id).position,c.position);
});
test('complete snapshots retain mode layout signatures and camera values for direct restoration',()=>{
 let s=state({expandedGroups:['ecosystem:species']});const scene=build(s),pose={position:{x:12,y:900,z:1800},target:{x:45,y:50,z:0},quaternion:[0,.1,0,.99],focalScale:910,reference:1900};s=rememberScene(s,scene,pose);const restored=buildScene(overview,normalizeExploration(s),catalog,[]);
 assert.equal(restored.context.signatures.layered,restored.signature);assert.deepEqual(restored.context.cameras.layered,pose);assert.deepEqual(restored.cards.map(c=>c.position),scene.cards.map(c=>c.position));
});
test('the overview retains an orientation marker after all detail closes',()=>{
 const s=state({centre:'carob',overview:true});s.scene.focus='carob';const scene=build(s);assert.equal(scene.cards.length,9);assert.equal(scene.homeMarker.id,'carob');assert.equal(scene.homeMarker.home.z,0);
});
test('history cache deduplication retains exact reversible states in a small local payload',()=>{
 let s=state({centre:'carob',overview:false,search:'drone',detail:'full'});s=rememberScene(s,build(s,views.combined));const entries=Array.from({length:100},(_,i)=>({...structuredClone(s),selected:i%2?'carob':'drones'}));const raw=encodeHistory(entries,78),unpacked=decodeHistory(raw);assert.deepEqual(unpacked,{entries,index:78});assert.ok(raw.length<JSON.stringify(entries).length/3);assert.ok(raw.length<4_000_000);
});
test('all ten overview perspectives and both modes keep valid bounded canonical identities',()=>{
 for(const [perspective,view] of Object.entries(views))for(const mode of ['flat','layered']){const s=state({perspective,overview:true});s.scene.mode=mode;check(build(s,view))}
});
test('all group and full-route requests respect the scene budgets',()=>{
 const s=state({centre:'carob',overview:false,search:'drone',perspective:'technology',detail:'full',expandedGroups:['ecosystem:species','ecosystem:habitats','ecosystem:restoration-methods','technology:irrigation','technology:drones','technology:monitoring','funding:programmes','funding:activities','funding:requirements'],groupLimits:{'ecosystem:species':100,'ecosystem:habitats':100}});const scene=build(s,views.technology);check(scene);assert.ok(scene.notice);
});

test('source discovery without a centre exposes all nine editions and their inspectable findings',()=>{
 let s=state({perspective:'sources'}),view=fixture.overviewViews.sources;const base=build(s,view);assert.equal(base.cards.filter(c=>c.id.startsWith('perspective-group:document:')).length,9);assert.ok(base.links.some(e=>e.record.evidence_finding_ids?.length));s=rememberScene(s,base);s.expandedGroups=['document:FOREST-002'];const opened=build(s,view,base);assert.ok(opened.cards.some(c=>c.record.kind==='source'));assert.ok(opened.cards.some(c=>c.record.record_type==='finding'));check(opened);
});
test('unfocused places, time, hierarchy and dependencies provide real grouped entry points',()=>{
 for(const perspective of ['places','time','hierarchy','conditions']){const s=state({perspective}),view=fixture.overviewViews[perspective],scene=build(s,view);assert.ok(scene.cards.some(c=>c.id.startsWith('perspective-group:')),perspective);check(scene)}
});
test('zoom-out can close perspective detail without changing the independent controls',()=>{
 let s=state({perspective:'time'});const scene=build(s,fixture.overviewViews.time);s=rememberScene(s,scene);const patch=deepestCollapse(s);assert.equal(patch.overviewDepth,0);const base=build({...s,...patch},fixture.overviewViews.time,scene);assert.equal(base.cards.length,9);assert.equal(base.level,0);assert.equal(s.perspective,'time');
});
test('closing a visited topic does not recreate it through the old focus marker',()=>{
 let s=state({centre:'carob',overview:false,search:'drone',perspective:'technology'});const first=build(s,views.technology);s=rememberScene(s,first);const key=first.key;s.scene.contexts[key].revealed={'local-seed-provenance':3};s.scene.focus='local-seed-provenance';const open=build(s,views.technology,first);s=rememberScene(s,open);const patch=deepestCollapse(s);const closed=build({...s,...patch},views.technology,open);assert.ok(!closed.cards.some(c=>c.id==='local-seed-provenance'));
});

test('complete v3 restoration does not require a Worker or rerun the layout',async()=>{
 let s=state({expandedGroups:['ecosystem:species']});const first=build(s);s=rememberScene(s,first);const restored=buildScene(overview,s,catalog,[]);assert.equal(typeof globalThis.Worker,'undefined');const result=await prepareScene(restored,undefined,new AbortController().signal);assert.deepEqual(result.cards.map(c=>c.position),first.cards.map(c=>c.position));
});
test('superseding a layout terminates its worker and rejects the obsolete candidate',async()=>{
 const previous=globalThis.Worker;let worker;
 globalThis.Worker=class {constructor(){worker=this}postMessage(){}terminate(){this.terminated=true}};
 try{const controller=new AbortController(),job=requestLayout({elements:[],previous:[],overview:false,centre:null,preserve:true},controller.signal);controller.abort();await assert.rejects(job,{name:'AbortError'});assert.equal(worker.terminated,true)}finally{globalThis.Worker=previous}
});
test('worker placement of new detail preserves established anchors',async()=>{
 const previous=globalThis.Worker;
 globalThis.Worker=class {postMessage(request){queueMicrotask(()=>{try{this.onmessage({data:{result:calculateLayout(request)}})}catch(error){this.onmessage({data:{error:String(error)}})}})}terminate(){}};
 try{let s=state({expandedGroups:['ecosystem:species']});const first=await prepareScene(buildScene(overview,s,catalog,[]),undefined,new AbortController().signal);s=rememberScene(s,first);s.groupLimits['ecosystem:species']=12;const next=await prepareScene(buildScene(overview,s,catalog,[]),first,new AbortController().signal);for(const n of first.cards)assert.deepEqual(next.cards.find(c=>c.id===n.id).home,n.home);check(next)}finally{globalThis.Worker=previous}
});

test('two-endpoint research questions remain view-only links and do not consume factual IDs',()=>{
 const s=state(),task={id:'QA-gap',status:'Prepared',instruction:'Investigate',context:{centre:'carob',gap:{kind:'existing-topics',from_id:'carob',to_id:'al20'}}};const scene=buildScene(overview,s,catalog,[task]);const gap=scene.links.filter(e=>e.record.record_type==='gap');assert.equal(gap.length,2);assert.ok(gap.every(e=>e.relationshipIds.length===0));assert.equal(new Set([...scene.links,...scene.internalSummaries].flatMap(e=>e.relationshipIds)).size,catalog.relationships.length);
});

test('stronger depth migrates existing layered caches once while preserving XY, Flat and camera angle',()=>{
 const old={...structuredClone(initialState),layoutVersion:3,centre:'carob',scene:{version:3,mode:'layered',contexts:{'combined:carob:':{homes:{carob:{x:25,y:70,z:260},drones:{x:420,y:80,z:520},'group:ecosystem:species':{x:-650,y:-230,z:0}},flat:{carob:{x:15,y:30,z:0}},owners:{carob:['query']},planes:{query:1},cameras:{layered:{position:{x:20,y:850,z:1900},target:{x:30,y:80,z:260},quaternion:[0,0,0,1],focalScale:750,reference:1700},flat:{position:{x:0,y:0,z:1800},target:{x:0,y:0,z:0},quaternion:[0,0,0,1],focalScale:750,reference:1800}},focus:{id:'carob',position:{x:25,y:70,z:544}},signatures:{layered:'unchanged',flat:'flat-layout'}}}}};
 const before=structuredClone(old),upgraded=normalizeExploration(old),ctx=upgraded.scene.contexts['combined:carob:'];
 assert.deepEqual(old,before);assert.equal(ctx.homes.carob.z,PLANE_GAP);assert.equal(ctx.homes.drones.z,2*PLANE_GAP);assert.equal(ctx.focus.position.z,2*PLANE_GAP+FOCUS_OFFSET);
 for(const [id,home] of Object.entries(before.scene.contexts['combined:carob:'].homes)){assert.equal(ctx.homes[id].x,home.x);assert.equal(ctx.homes[id].y,home.y)}
 assert.deepEqual(ctx.flat,before.scene.contexts['combined:carob:'].flat);assert.deepEqual(ctx.cameras.flat,before.scene.contexts['combined:carob:'].cameras.flat);assert.deepEqual(ctx.signatures,before.scene.contexts['combined:carob:'].signatures);
 assert.equal(ctx.cameras.layered.position.z-ctx.cameras.layered.target.z,1640);assert.equal(ctx.cameras.layered.focalScale,750);assert.deepEqual(ctx.cameras.layered.quaternion,[0,0,0,1]);
 assert.deepEqual(normalizeExploration(upgraded),upgraded);
});

test('opening deeper detail holds its reading plane fixed while the overview recedes and becomes smaller',()=>{
 let s=state({expandedGroups:['ecosystem:species'],selected:'carob'});s.scene.focus='carob';let first=build(s);s=rememberScene(s,first);const camera=structuredClone(s.scene.contexts[first.key].cameras);delete s.scene.contexts[first.key].focus;s.branches=['carob'];const deeper=build(s,overview,first);
 assert.equal(depthOrigin(first),PLANE_GAP);assert.equal(depthOrigin(deeper),2*PLANE_GAP);
 const base=first.cards.find(c=>c.id==='group:technology:drones'),back=deeper.cards.find(c=>c.id===base.id);
 assert.equal(displayPosition(deeper,back.position).z,displayPosition(first,base.position).z-PLANE_GAP);
 assert.equal(displayPosition(first,first.cards.find(c=>c.id==='carob').position).z,FOCUS_OFFSET);assert.equal(displayPosition(deeper,deeper.cards.find(c=>c.id==='carob').position).z,FOCUS_OFFSET);
 assert.ok(deeper.cards.some(c=>c.plane===2&&displayPosition(deeper,c.position).z===0));
 const apparent=(z)=>1/(1600-z);assert.ok(apparent(displayPosition(deeper,back.position).z)<apparent(displayPosition(first,base.position).z));assert.deepEqual(deeper.context.cameras,camera);
});
test('Back to parent removes the latest expansion and restores the previous reading plane with shared topics once',()=>{
 const root=state();let s=trackLayerReturns(root,{...root,expandedGroups:['ecosystem:species']},catalog,[]),group=build(s);s=rememberScene(s,group);
 const opened=trackLayerReturns(s,{...s,branches:['carob']},catalog,[]),scene=build(opened,overview,group);s=rememberScene(opened,scene);
 const back=scene.context.returns.at(-1);assert.equal(back.label,'Carob tree');assert.ok(back.owners.includes('topic:carob'));
 const patch=collapseLayerReturn(s,back.id,catalog),closed=build({...s,...patch},overview,scene);check(closed);assert.equal(closed.level,group.level);assert.equal(closed.cards.filter(c=>c.id==='carob').length,1);assert.deepEqual(patch.expandedGroups,['ecosystem:species']);assert.deepEqual(patch.branches,[]);
 assert.ok(!scene.cards.filter(c=>c.owners.every(o=>o==='topic:carob')).some(c=>closed.cards.some(n=>n.id===c.id)));assert.equal(displayPosition(closed,closed.cards.find(c=>c.id==='carob').position).z,FOCUS_OFFSET);
});
test('Expand all is one return step and returning keeps the earlier endpoint geometry',()=>{
 let s=state({centre:'carob',overview:false,perspective:'technology',search:'drone'}),short=build(s,views.technology);s=rememberScene(s,short);
 const opened=trackLayerReturns(s,{...s,detail:'full'},catalog,views.technology.routes),full=build(opened,views.technology,short);s=rememberScene(opened,full);
 const back=full.context.returns.at(-1);assert.ok(back.owners.length>1);assert.ok(back.owners.every(o=>o.startsWith('route:')));
 const patch=collapseLayerReturn(s,back.id,catalog),closed=build({...s,...patch},views.technology,full);assert.equal(patch.detail,'abbreviated');assert.deepEqual(patch.expandedRoutes,[]);
 for(const node of short.cards)assert.deepEqual(closed.cards.find(c=>c.id===node.id).home,node.home);check(closed);
});
test('earlier-layer returns close later steps while retaining previously opened independent groups',()=>{
 const root=state();let s=trackLayerReturns(root,{...root,expandedGroups:['technology:irrigation']},catalog,[]);s=rememberScene(s,build(s));
 let next=trackLayerReturns(s,{...s,expandedGroups:[...s.expandedGroups,'ecosystem:species']},catalog,[]);let scene=build(next);s=rememberScene(next,scene);const species=scene.context.returns.at(-1);
 next=trackLayerReturns(s,{...s,branches:['carob']},catalog,[]);scene=build(next);s=rememberScene(next,scene);
 const patch=collapseLayerReturn(s,species.id,catalog);assert.deepEqual(patch.expandedGroups,['technology:irrigation']);assert.deepEqual(patch.branches,[]);
});
test('existing positive-Z snapshots migrate camera coordinates once into the foreground frame, leaving Flat untouched',()=>{
 const old=state();old.scene.presentation=undefined;old.scene.contexts.example={homes:{a:{x:1,y:2,z:2*PLANE_GAP}},owners:{a:['topic:a']},planes:{'topic:a':2},flat:{a:{x:9,y:8,z:0}},cameras:{layered:{position:{x:0,y:700,z:2200},target:{x:0,y:20,z:520},quaternion:[0,0,0,1],focalScale:800,reference:1800}}};const before=structuredClone(old),upgraded=normalizeExploration(old);
 assert.equal(upgraded.scene.contexts.example.cameras.layered.position.z,2200-2*PLANE_GAP);assert.deepEqual(upgraded.scene.contexts.example.flat,before.scene.contexts.example.flat);assert.deepEqual(upgraded.scene.contexts.example.homes,before.scene.contexts.example.homes);assert.deepEqual(normalizeExploration(upgraded),upgraded);assert.deepEqual(old,before);
});
test('Flat keeps the same XY coordinates and no receding offset',()=>{
 const s=state({centre:'carob',overview:false,detail:'full'});s.scene.mode='flat';const scene=build(s,views.combined);assert.equal(depthOrigin(scene),0);for(const card of scene.cards)assert.deepEqual(displayPosition(scene,card.position),card.position);
});

test('returning to an earlier group also closes later full routes instead of recreating them',()=>{
 let s=state({centre:'carob',overview:false,perspective:'technology',search:'drone'});s=rememberScene(s,build(s,views.technology));
 let next=trackLayerReturns(s,{...s,expandedGroups:['ecosystem:species']},catalog,views.technology.routes),scene=build(next,views.technology);s=rememberScene(next,scene);const group=scene.context.returns.at(-1);
 next=trackLayerReturns(s,{...s,detail:'full'},catalog,views.technology.routes);scene=build(next,views.technology,scene);s=rememberScene(next,scene);
 const patch=collapseLayerReturn(s,group.id,catalog),closed=build({...s,...patch},views.technology,scene);assert.equal(patch.detail,'abbreviated');assert.deepEqual(patch.expandedRoutes,[]);assert.ok(!Object.values(closed.context.owners).flat().some(o=>o.startsWith('route:')));check(closed);
});

test('adding an alternative while full routes are open records only the newly opened route',()=>{
 let s=state({centre:'carob',overview:false,perspective:'technology',search:'drone',detail:'full'}),scene=build(s,views.technology);s=rememberScene(s,scene);
 const alternative={...views.technology.routes[0],id:'QA-extra-alternative'};
 const next=trackLayerReturns(s,{...s,alternatives:[alternative]},catalog,[...views.technology.routes,alternative]);
 assert.deepEqual(next.scene.contexts[scene.key].returns.at(-1).owners,['route:QA-extra-alternative']);
});

test('general zoom-out keeps a cached focused card at reading distance after candidate placement',()=>{
 let s=state({expandedGroups:['ecosystem:species'],branches:['carob'],selected:'carob'});s.scene.focus='carob';let scene=build(s);s=rememberScene(s,scene);assert.equal(scene.level,2);
 const patch=deepestCollapse(s),closed=build({...s,...patch},overview,scene),focus=closed.cards.find(c=>c.id==='carob');assert.equal(closed.level,1);assert.equal(displayPosition(closed,focus.position).z,FOCUS_OFFSET);assert.deepEqual(closed.context.focus.position,focus.position);
});

test('clicking an open group folds it back and preserves cached homes for reopening',()=>{
 let s=state({expandedGroups:['ecosystem:species']});const open=build(s);s=rememberScene(s,open);const original=structuredClone(s),card=open.cards.find(c=>c.id==='group:ecosystem:species');
 const patch=collapseExpandedCard(s,card.record,catalog),closed=build({...s,...patch},overview,open);assert.deepEqual(patch.expandedGroups,[]);assert.equal(closed.cards.length,9);assert.equal(closed.level,0);assert.deepEqual(s,original);
 const reopened=build({...s,...patch,expandedGroups:['ecosystem:species']},overview,closed);for(const node of open.cards)assert.deepEqual(reopened.cards.find(c=>c.id===node.id).home,node.home);check(closed);
});

test('clicking an expanded topic closes only its branch and returns its card home in both modes',()=>{
 for(const mode of ['layered','flat']){
  let s=state({centre:'carob',expandedGroups:['ecosystem:species','technology:irrigation'],branches:['carob','cocoon'],selected:'carob'});s.scene.mode=mode;s.scene.focus='carob';const open=build(s);s=rememberScene(s,open);
  const card=open.cards.find(c=>c.id==='carob'),patch=collapseExpandedCard(s,card.record,catalog),closed=build({...s,...patch},overview,open);assert.deepEqual(patch.branches,['cocoon']);assert.equal(patch.selected,'carob');assert.equal(closed.focused,null);assert.deepEqual(closed.context.cameras,open.context.cameras);
  const retained=open.cards.filter(c=>c.owners.some(owner=>owner!=='topic:carob'));for(const node of retained)assert.deepEqual(closed.cards.find(c=>c.id===node.id).home,node.home);
  assert.deepEqual(closed.cards.find(c=>c.id==='carob').position,mode==='flat'?{...closed.context.flat.carob,z:0}:card.home);assert.ok(!Object.values(closed.context.owners).flat().includes('topic:carob'));check(closed);
 }
});

test('clicking a popped-out card folds just its focus home and keeps its inspector selection',()=>{
 let s=state({centre:'carob',expandedGroups:['ecosystem:species'],selected:'carob'});s.scene.focus='carob';const open=build(s);s=rememberScene(s,open);const card=open.cards.find(c=>c.id==='carob');assert.ok(card.record.poppedOut);
 const patch=collapseExpandedCard(s,card.record,catalog),closed=build({...s,...patch},overview,open);assert.equal(closed.focused,null);assert.deepEqual(patch.expandedGroups,s.expandedGroups);assert.equal(patch.selected,'carob');assert.deepEqual(closed.cards.find(c=>c.id==='carob').position,card.home);assert.equal(closed.cards.length,open.cards.length);assert.equal(closed.cards.find(c=>c.id==='carob').record.poppedOut,false);
 assert.equal(collapseExpandedCard({...s,...patch},closed.cards.find(c=>c.id==='carob').record,catalog),null);
});

test('clicking an unexpanded child or More topics never collapses its parent',()=>{
 let s=state({expandedGroups:['ecosystem:species'],branches:['carob']});const open=build(s);s=rememberScene(s,open);
 const child=open.cards.find(c=>c.record.record_type==='topic'&&!s.branches.includes(c.id)),more=open.cards.find(c=>c.record.kind==='more');
 assert.equal(collapseExpandedCard(s,child.record,catalog),null);assert.equal(collapseExpandedCard(s,more.record,catalog),null);assert.deepEqual(s.expandedGroups,['ecosystem:species']);assert.deepEqual(s.branches,['carob']);
});

test('clicking an open group keeps detail owned by an independent topic expansion',()=>{
 let s=state({expandedGroups:['ecosystem:species'],branches:['carob']});const open=build(s);s=rememberScene(s,open);const patch=collapseExpandedCard(s,open.cards.find(c=>c.id==='group:ecosystem:species').record,catalog),closed=build({...s,...patch},overview,open);
 assert.deepEqual(patch.branches,['carob']);for(const card of open.cards.filter(c=>c.owners.includes('topic:carob')))assert.ok(closed.cards.some(c=>c.id===card.id));check(closed);
});

test('attention pans a tilted 3D camera to the usable centre without changing angle, scale or node homes',()=>{
 const size={width:1200,height:800},camera=new PerspectiveCamera(50,size.width/size.height,.1,50000),target=new Vector3(30,100,-300),node={x:520,y:-400,z:120};camera.position.set(200,950,1800);camera.lookAt(target);camera.updateMatrixWorld();
 const original=structuredClone(node),direction=camera.position.clone().sub(target),rotation=camera.quaternion.clone(),depth=new Vector3().copy(node).applyMatrix4(camera.matrixWorldInverse).z;
 const desired=focusScreenPoint(size.width,size.height,[{x1:800,y1:10,x2:1190,y2:760}],{width:180,height:80}),pan=focusCameraPan(camera,target,node,desired,size);camera.position.copy(pan.position);camera.lookAt(pan.target);camera.updateMatrixWorld();
 const projected=new Vector3().copy(node).project(camera);assert.ok(Math.abs((projected.x+1)*size.width/2-desired.x)<1e-6);assert.ok(Math.abs((1-projected.y)*size.height/2-desired.y)<1e-6);
 assert.ok(camera.position.clone().sub(pan.target).distanceTo(direction)<1e-9);assert.ok(camera.quaternion.angleTo(rotation)<1e-7);assert.ok(Math.abs(new Vector3().copy(node).applyMatrix4(camera.matrixWorldInverse).z-depth)<1e-8);assert.equal(camera.fov,50);assert.deepEqual(node,original);assert.ok(desired.x<800-90);
});

test('usable centring follows a moved inspector and keeps the card clear of graph controls',()=>{
 for(const panel of [{x1:800,y1:0,x2:1200,y2:800},{x1:0,y1:0,x2:400,y2:800},{x1:400,y1:200,x2:800,y2:600}]){
  const controls={x1:20,y1:10,x2:220,y2:180},card={width:160,height:70},point=focusScreenPoint(1200,800,[panel,controls],card);
  for(const r of [panel,controls])assert.ok(point.x+card.width/2<=r.x1||point.x-card.width/2>=r.x2||point.y+card.height/2<=r.y1||point.y-card.height/2>=r.y2);
  assert.ok(point.x>=card.width/2&&point.x<=1200-card.width/2);assert.ok(point.y>=card.height/2&&point.y<=800-card.height/2);
 }
 assert.deepEqual(focusScreenPoint(1200,800),{x:600,y:400});
});

test('an already focused topic still requests centring when its connected detail opens',()=>{
 let s=state({expandedGroups:['ecosystem:species'],selected:'carob'});s.scene.focus='carob';const first=build(s);s=rememberScene(s,first);s.branches=['carob'];const expanded=build(s,overview,first);
 assert.equal(focusAfterTransition(first,expanded),'carob');assert.equal(focusAfterTransition(first,expanded,true),null);assert.equal(focusAfterTransition(expanded,expanded),null);
 const flat=build({...s,scene:{...s.scene,mode:'flat'}},overview,expanded);assert.equal(focusAfterTransition(expanded,flat),null);
});

test('opening a group or selecting another topic centres that card; folding it back does not',()=>{
 const base=build(state());let s=state({expandedGroups:['ecosystem:species']});const group=build(s,overview,base);assert.equal(focusAfterTransition(base,group),'group:ecosystem:species');
 s=rememberScene(s,group);s.scene.focus='carob';s.selected='carob';const selected=build(s,overview,group);assert.equal(focusAfterTransition(group,selected),'carob');
 const patch=collapseExpandedCard(rememberScene(s,selected),selected.cards.find(c=>c.id==='carob').record,catalog),closed=build({...s,...patch},overview,selected);assert.equal(focusAfterTransition(selected,closed),null);
});

test('late camera frames cannot overwrite the other mode or a different exploration',()=>{
 const pose={position:{x:0,y:700,z:2000},target:{x:0,y:0,z:0},quaternion:[0,0,0,1],focalScale:800,reference:2100},frame={...pose,mode:'flat',sceneKey:'combined:carob:'};
 assert.equal(cameraPoseForScene(frame,{key:frame.sceneKey,mode:'layered'}),undefined);assert.equal(cameraPoseForScene(frame,{key:'technology:carob:',mode:'flat'}),undefined);assert.deepEqual(cameraPoseForScene(frame,{key:frame.sceneKey,mode:'flat'}),pose);
});

test('saving a current camera retains newer camera values in the independent mode cache',()=>{
 let s=state({expandedGroups:['ecosystem:species']});s.scene.mode='flat';const scene=build(s);s=rememberScene(s,scene);
 const layered={position:{x:100,y:700,z:1900},target:{x:100,y:0,z:0},quaternion:[0,0,0,1],focalScale:820,reference:2000},flat={position:{x:100,y:0,z:1700},target:{x:100,y:0,z:0},quaternion:[0,0,0,1],focalScale:780,reference:1700};s.scene.contexts[scene.key].cameras.layered=layered;
 const saved=rememberScene(s,scene,flat);assert.deepEqual(saved.scene.contexts[scene.key].cameras.layered,layered);assert.deepEqual(saved.scene.contexts[scene.key].cameras.flat,flat);
});

test('clicking a background layer folds deeper expansions and brings that plane forward without changing its homes',()=>{
 let s=state({centre:'carob',expandedGroups:['ecosystem:species'],branches:['carob','maysara-carob-trial'],selected:'maysara-carob-trial'});s.scene.focus=s.selected;const open=build(s);s=rememberScene(s,open);const original=structuredClone(s);assert.equal(open.level,3);
 const patch=collapseToLayer(s,open,2),closed=build({...s,...patch},overview,open);assert.equal(closed.level,2);assert.deepEqual(patch.branches,['carob']);assert.equal(closed.focused,null);assert.deepEqual(s,original);assert.deepEqual(closed.context.cameras,open.context.cameras);
 for(const card of open.cards.filter(c=>c.plane<=2&&c.owners.some(o=>o!=='topic:maysara-carob-trial')))assert.deepEqual(closed.cards.find(c=>c.id===card.id).home,card.home);check(closed);
 const first=build({...s,...collapseToLayer(s,open,1)},overview,open);assert.equal(first.level,1);assert.ok(first.cards.some(c=>c.id==='carob'));assert.equal(first.cards.filter(c=>c.id==='carob').length,1);
});

test('layer zero closes all visible detail while retaining centre, search and the chosen perspective',()=>{
 for(const [perspective,view] of Object.entries(views)){
  let s=state({centre:'carob',search:'drone',overview:false,perspective,detail:'full',expandedGroups:['ecosystem:species'],branches:['carob']});const open=build(s,view);s=rememberScene(s,open);
  const patch=collapseToLayer(s,open,0),closed=build({...s,...patch},fixture.overviewViews[perspective],open);assert.equal(closed.level,0,perspective);assert.equal(closed.cards.length,9,perspective);assert.equal(s.centre,'carob');assert.equal(s.search,'drone');assert.equal(s.perspective,perspective);assert.deepEqual(patch.expandedRoutes,[]);assert.deepEqual(patch.branches,[]);check(closed);
 }
});

test('layer return removes full route batches without partially displayed route owners and is reversible',()=>{
 let s=state({centre:'carob',overview:false,perspective:'technology',search:'drone',detail:'full'});const open=build(s,views.technology);s=rememberScene(s,open);assert.ok(open.level>1);
 const patch=collapseToLayer(s,open,1),closed=build({...s,...patch},views.technology,open);assert.equal(closed.level,1);assert.equal(patch.detail,'abbreviated');assert.ok(!Object.values(closed.context.owners).flat().some(o=>o.startsWith('route:')));check(closed);
 const restored=build(normalizeExploration(s),views.technology,closed);assert.deepEqual(restored.cards.map(c=>[c.id,c.position]),open.cards.map(c=>[c.id,c.position]));
});

test('clicking the current layer folds foreground focus home and rejects Flat or nonexistent planes',()=>{
 let s=state({centre:'carob',expandedGroups:['ecosystem:species'],selected:'carob'});s.scene.focus='carob';const open=build(s);s=rememberScene(s,open);
 const patch=collapseToLayer(s,open,open.level),closed=build({...s,...patch},overview,open);assert.equal(closed.level,open.level);assert.deepEqual(closed.cards.find(c=>c.id==='carob').position,open.cards.find(c=>c.id==='carob').home);assert.equal(patch.selected,'carob');assert.equal(collapseToLayer(s,open,99),null);assert.equal(collapseToLayer(s,{...open,mode:'flat'},0),null);
});

test('layer surfaces enclose their ordinary cards and visible rear borders remain independently selectable',()=>{
 const scene=build(state({expandedGroups:['ecosystem:species'],branches:['carob']})),surfaces=sceneLayers(scene);assert.deepEqual(surfaces.map(s=>s.level),[0,1,2]);
 for(const surface of surfaces)for(const card of scene.cards.filter(c=>c.plane===surface.level)){assert.ok(card.home.x-card.width/2>=surface.x-surface.width/2);assert.ok(card.home.x+card.width/2<=surface.x+surface.width/2);assert.ok(card.home.y-card.height/2>=surface.y-surface.height/2);assert.ok(card.home.y+card.height/2<=surface.y+surface.height/2)}
 const frames=[{level:0,corners:[{x:20,y:20},{x:180,y:20},{x:180,y:180},{x:20,y:180}]},{level:2,corners:[{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:0,y:200}]}];
 assert.equal(layerBorderAt({x:100,y:22},frames),0);assert.equal(layerBorderAt({x:100,y:2},frames),2);assert.equal(layerBorderAt({x:100,y:100},frames),null);
});

test('returning to a layer does not recreate deeper cached members, and More can explicitly reveal them again',()=>{
 let s=state({expandedGroups:['ecosystem:species']}),scene=build(s);s=rememberScene(s,scene);const child=scene.cards.find(c=>c.record.record_type==='topic'&&c.id!=='carob');s.scene.contexts[scene.key].homes[child.id].z=3*PLANE_GAP;
 const deep=build(s,overview,scene);assert.equal(deep.level,3);s=rememberScene(s,deep);const patch=collapseToLayer(s,deep,1),closed=build({...s,...patch},overview,deep);assert.equal(closed.level,1);assert.ok(!closed.cards.some(c=>c.id===child.id));assert.ok(closed.cards.find(c=>c.record.kind==='more').record.member_ids.includes(child.id));assert.equal(new Set([...closed.links,...closed.internalSummaries].flatMap(e=>e.relationshipIds)).size,catalog.relationships.length);check(closed);
 s=rememberScene({...s,...patch},closed);const next=trackLayerReturns(s,{...s,groupLimits:{'ecosystem:species':12}},catalog,[]),reopened=build(next,overview,closed);assert.ok(reopened.cards.some(c=>c.id===child.id));assert.equal(next.scene.contexts[scene.key].layerCeiling,undefined);check(reopened);
});

test('Bokeh is subtle by default, keeps Flat/overview sharp and caps the CSS blur radius at four pixels',()=>{
 assert.equal(parseBokehPreference(null),'subtle');assert.equal(parseBokehPreference('invalid'),'subtle');assert.equal(parseBokehPreference('off'),'off');
 for(const width of [360,900,1500,3000]){const settings=bokehSettings('subtle','layered',3,width);assert.equal(settings.enabled,true);assert.ok(Math.abs(settings.maxblur*.4*width-4)<1e-10);assert.ok(Math.abs(settings.aperture*PLANE_GAP*.4*width-1.25)<1e-10)}
 assert.equal(bokehSettings('off','layered',3,900).enabled,false);assert.equal(bokehSettings('subtle','flat',3,900).enabled,false);assert.equal(bokehSettings('subtle','layered',0,900).enabled,false);
 assert.ok(packedMaskDepth(2)>packedMaskDepth(1));assert.ok(packedMaskDepth(1)>packedMaskDepth(0));assert.equal(packedMaskDepth(-1),packedMaskDepth(0));
});

test('Bokeh protects the whole active layer, focused cards and every selected route endpoint',()=>{
 const route=views.technology.routes.find(r=>r.nodes.length>3);const s=state({centre:'carob',overview:false,search:'drone',perspective:'technology',detail:'full',selected:route.id,selectedEdges:route.edges}),scene=build(s,views.technology),sharp=bokehSharpCards(scene,s.selected);
 for(const card of scene.cards.filter(c=>c.plane===scene.level))assert.ok(sharp.has(card.id));for(const id of route.nodes)assert.ok(sharp.has(id));assert.ok(scene.cards.some(c=>c.plane<scene.level&&!sharp.has(c.id)));check(scene);
});

function fakeBlurRenderer(){return {autoClear:true,target:null,color:new Color('#131d1a'),alpha:1,captured:[],getRenderTarget(){return this.target},setRenderTarget(target){this.target=target},getClearColor(target){return target.copy(this.color)},getClearAlpha(){return this.alpha},setClearColor(color,alpha=this.alpha){this.color.set(color);this.alpha=alpha},setClearAlpha(alpha){this.alpha=alpha},clear(){},render(scene,camera){this.captured.push({scene,camera})}}}

test('Bokeh depth proxies match billboard transforms, preserve original textures and restore renderer state',()=>{
 const camera=new PerspectiveCamera(50,1.5,.1,100000);camera.position.set(0,700,1800);camera.lookAt(0,0,0);camera.updateMatrixWorld();const cameraBefore=camera.clone(),texture=new Texture(),sprite=new Sprite(new SpriteMaterial({map:texture})),parent=new Group(),sourceScene=new ThreeScene();sprite.scale.set(214,98,1);parent.position.set(450,-120,-520);parent.add(sprite);sourceScene.add(parent);let textureDisposed=0;texture.addEventListener('dispose',()=>textureDisposed++);
 let items=[{object:sprite,behind:1,order:20}],warnings=[];const pass=new KnowledgeBokehPass(camera,()=>({preference:'subtle',mode:'layered',level:2,width:1200,reducedMotion:true,items}),message=>warnings.push(message)),renderer=fakeBlurRenderer(),write=new WebGLRenderTarget(4,4),read=new WebGLRenderTarget(4,4),originalColor=renderer.color.clone();
 const composer={passes:[],insertPass(pass,index){this.passes.splice(index,0,pass)},addPass(pass){this.passes.push(pass)},removePass(pass){this.passes=this.passes.filter(p=>p!==pass)}};pass.attach(composer);assert.equal(composer.passes.length,3);
 pass.render(renderer,write,read);const proxy=pass.scene.children[0];proxy.updateMatrixWorld();assert.ok(proxy.getWorldPosition(new Vector3()).distanceTo(sprite.getWorldPosition(new Vector3()))<1e-9);assert.ok(proxy.getWorldScale(new Vector3()).distanceTo(sprite.getWorldScale(new Vector3()))<1e-9);assert.equal(proxy.material.allowOverride,false);assert.equal(proxy.material.uniforms.alphaMap.value,texture);assert.equal(proxy.material.uniforms.maskDepth.value,packedMaskDepth(1));
 assert.deepEqual(camera.projectionMatrix.elements,cameraBefore.projectionMatrix.elements);assert.deepEqual(pass.camera.projectionMatrix.elements,cameraBefore.projectionMatrix.elements);assert.equal(camera.near,.1);assert.equal(renderer.autoClear,true);assert.equal(renderer.target,null);assert.ok(renderer.color.equals(originalColor));assert.equal(pass.scene.overrideMaterial,null);
 let materialDisposed=0;proxy.material.addEventListener('dispose',()=>materialDisposed++);items=[];pass.render(renderer,write,read);assert.equal(pass.scene.children.length,0);assert.equal(materialDisposed,1);assert.equal(textureDisposed,0);assert.deepEqual(warnings,[]);pass.detach(composer);assert.equal(composer.passes.length,0);write.dispose();read.dispose();sprite.material.dispose();texture.dispose();
});

test('a failed Bokeh render preserves the sharp frame and renderer state',()=>{
 const camera=new PerspectiveCamera(),warnings=[],pass=new KnowledgeBokehPass(camera,()=>({preference:'subtle',mode:'layered',level:1,width:900,reducedMotion:true,items:[]}),message=>warnings.push(message)),renderer=fakeBlurRenderer(),write=new WebGLRenderTarget(4,4),read=new WebGLRenderTarget(4,4);let failed=false;
 renderer.render=function(scene,camera){if(scene.isScene&&!failed){failed=true;throw new Error('isolated graphics failure')}this.captured.push({scene,camera})};pass.render(renderer,write,read);assert.equal(pass.enabled,false);assert.equal(warnings.length,1);assert.equal(pass.scene.overrideMaterial,null);assert.equal(renderer.autoClear,true);assert.equal(renderer.target,null);assert.ok(renderer.captured.some(r=>r.scene.isMesh));pass.dispose();write.dispose();read.dispose();
});

test('the Bokeh chain prepares linear clear colours and removes only its own passes',()=>{
 const pass=new KnowledgeBokehPass(new PerspectiveCamera(),()=>({preference:'off',mode:'flat',level:0,width:900,reducedMotion:true,items:[]}),()=>{}),base={},composer={passes:[base],insertPass(pass,index){this.passes.splice(index,0,pass)},addPass(pass){this.passes.push(pass)},removePass(pass){this.passes=this.passes.filter(p=>p!==pass)}};pass.attach(composer);assert.equal(composer.passes[1],base);assert.equal(composer.passes[2],pass);assert.equal(composer.passes[3],pass.output);assert.equal(pass.enabled,false);
 const renderer=fakeBlurRenderer(),read=new WebGLRenderTarget(4,4),write=new WebGLRenderTarget(4,4);let colourTarget;renderer.setClearColor=function(color,alpha=this.alpha){colourTarget=this.target;this.color.set(color);this.alpha=alpha};composer.passes[0].render(renderer,write,read);assert.equal(colourTarget,read);assert.equal(composer.passes[0].needsSwap,false);pass.detach(composer);assert.deepEqual(composer.passes,[base]);read.dispose();write.dispose();
});

test('Bokeh line masks retain thick/dashed route geometry without disposing the real connection',()=>{
 const geometry=new LineGeometry();geometry.setPositions([0,0,-520,300,100,0]);const material=new LineMaterial({linewidth:3,dashed:true,dashSize:8,gapSize:5});material.resolution.set(1200,800);const line=new Line2(geometry,material);line.computeLineDistances();let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
 const pass=new KnowledgeBokehPass(new PerspectiveCamera(),()=>({preference:'subtle',mode:'layered',level:2,width:1200,reducedMotion:true,items:[{object:line,behind:0,order:10}]}),()=>{}),read=new WebGLRenderTarget(4,4),write=new WebGLRenderTarget(4,4);pass.render(fakeBlurRenderer(),write,read);const proxy=pass.scene.children[0];assert.equal(proxy.geometry,geometry);assert.equal(proxy.material.linewidth,3);assert.equal(proxy.material.dashed,true);assert.ok(proxy.material.resolution.equals(material.resolution));assert.equal(proxy.material.allowOverride,false);
 const shader={uniforms:{},fragmentShader:proxy.material.fragmentShader};proxy.material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.maskDepth.value,packedMaskDepth(0));assert.ok(shader.fragmentShader.includes('packDepthToRGBA(maskDepth)'));assert.ok(!shader.fragmentShader.includes('#include <colorspace_fragment>'));pass.dispose();assert.equal(disposed,0);read.dispose();write.dispose();material.dispose();geometry.dispose();
});

test('internal group facts are inspectable badges, never self-loop paths, across partial expansion and collapse',()=>{
 let s=state();for(const patch of [{},{expandedGroups:['ecosystem:species']},{groupLimits:{'ecosystem:species':12}},{expandedGroups:[]}]){
  s={...s,...patch};const scene=build(s);check(scene);assert.ok(scene.links.every(e=>e.record.record_type!=='aggregate'||e.source!==e.target));
  assert.equal(new Set([...scene.links,...scene.internalSummaries].flatMap(e=>e.relationshipIds)).size,catalog.relationships.length);
  for(const summary of scene.internalSummaries){const card=scene.cards.find(c=>c.id===summary.cardId);assert.equal(card.internal,summary);assert.equal(summary.id,'aggregate:'+summary.cardId+'|'+summary.cardId);assert.deepEqual(summary.record.constituent_ids,summary.relationshipIds)}
  s=rememberScene(s,scene);
 }
});

test('complete connection geometry grows and shrinks atomically and retains per-segment depth',()=>{
 const line=new Line2(new LineGeometry(),new LineMaterial()),points=[new Vector3(0,0,0),new Vector3(100,0,0)];
 assert.ok(setConnectionPath(line,points,[0,1],[2,0]));const first=line.geometry;let disposed=0;first.addEventListener('dispose',()=>disposed++);
 assert.ok(setConnectionPath(line,[points[0],new Vector3(10,20,0),points[1]],[0,.2,1],[2,0]));assert.notEqual(line.geometry,first);assert.equal(disposed,1);assert.equal(line.geometry.instanceCount,2);
 assert.ok(Math.abs(line.geometry.attributes.instanceBehindStart.getX(1)-1.6)<1e-6);assert.equal(line.geometry.attributes.instanceBehindEnd.getX(1),0);
 const valid=line.geometry;assert.equal(setConnectionPath(line,[new Vector3(NaN,0,0),points[1]],[0,1],[1,0]),false);assert.equal(line.geometry,valid);
 setConnectionPath(line,points,[0,1],[0,0]);assert.equal(line.geometry.instanceCount,1);line.geometry.dispose();line.material.dispose();
});

test('ports attach to actual card boundaries and emphasized rounded paths retain obstacle clearance',()=>{
 const a={x:0,y:0},b={x:600,y:0},source={x1:-60,x2:60,y1:-30,y2:30},target={x1:540,x2:660,y1:-30,y2:30},obstacles=[{x1:200,x2:400,y1:-60,y2:60}];
 assert.deepEqual(cardPort(a,b,source),{x:60,y:0});
 for(const active of [false,true]){const path=connectionPath('same-id',a,b,source,target,obstacles,active);assert.equal(path[0].x,60);assert.equal(path.at(-1).x,540);assert.ok(path.length>2);assert.deepEqual(path,connectionPath('same-id',a,b,source,target,obstacles,active));if(active)assert.ok(path.slice(1).every((p,i)=>!crossesCard(path[i],p,obstacles[0])))}
 assert.deepEqual(pathFractions([{x:0,y:0},{x:10,y:0},{x:100,y:0}]),[0,.1,1]);assert.deepEqual(pathMidpoint([{x:0,y:0},{x:10,y:0},{x:100,y:0}]),{x:50,y:0});
});

test('layered routes choose an exposed card side when another card covers the centre-facing port',()=>{
 const a={x:0,y:0},b={x:300,y:0},source={x1:-60,x2:60,y1:-30,y2:30},target={x1:240,x2:360,y1:-30,y2:30},background={x1:-20,x2:100,y1:-10,y2:50};
 const path=connectionPath('overlapping-planes',a,b,source,target,[background],true);
 assert.ok(path[0].y===-30||path[0].x===-60,'use an exposed side');assert.ok(path.slice(1).every((p,i)=>!crossesCard(path[i],p,background)),'all segments stay outside the overlapping card');
 assert.ok(path.slice(2,-1).every((p,i)=>!crossesCard(path[i+1],p,source)),'do not reenter the source card');
});

test('layer hover ignores repeated hits, has entry/exit hysteresis, and cancels during dragging',()=>{
 let now=0,serial=0,jobs=new Map(),changes=[];const timers={set(fn,ms){const id=++serial;jobs.set(id,{fn,at:now+ms});return id},clear(id){jobs.delete(id)}};
 const advance=ms=>{now+=ms;for(const [id,job] of jobs)if(job.at<=now){jobs.delete(id);job.fn()}};
 const hover=new LayerHover(level=>changes.push(level),timers);hover.point(1);advance(99);assert.deepEqual(changes,[]);hover.point(1);advance(1);assert.deepEqual(changes,[1]);
 hover.point(null);advance(100);hover.point(1);advance(100);assert.deepEqual(changes,[1]);hover.point(0);advance(100);assert.deepEqual(changes,[1,0]);hover.point(null);advance(149);assert.equal(hover.current,0);advance(1);assert.equal(hover.current,null);
 hover.point(2);hover.immediate(null);advance(200);assert.equal(hover.current,null);hover.dispose();assert.equal(jobs.size,0);
});

test('depth proxies follow replaced connection geometry and interpolate depth along segments',()=>{
 const line=new Line2(new LineGeometry(),new LineMaterial());setConnectionPath(line,[new Vector3(),new Vector3(100,0,0)],[0,1],[2,0]);let old=line.geometry;
 const pass=new KnowledgeBokehPass(new PerspectiveCamera(),()=>({preference:'subtle',mode:'layered',level:2,width:1000,reducedMotion:true,items:[{object:line,behind:1,gradient:true,order:10}]}),()=>{}),read=new WebGLRenderTarget(4,4),write=new WebGLRenderTarget(4,4),renderer=fakeBlurRenderer();
 pass.render(renderer,write,read);const proxy=pass.scene.children[0];assert.equal(proxy.geometry,old);
 setConnectionPath(line,[new Vector3(),new Vector3(50,40,0),new Vector3(100,0,0)],[0,.4,1],[2,0]);pass.render(renderer,write,read);assert.notEqual(proxy.geometry,old);assert.equal(proxy.geometry,line.geometry);
 const shader={uniforms:{},vertexShader:proxy.material.vertexShader,fragmentShader:proxy.material.fragmentShader};proxy.material.onBeforeCompile(shader,{});assert.ok(shader.vertexShader.includes('instanceBehindStart'));assert.ok(shader.fragmentShader.includes('max(0.0,vBehind)'));pass.dispose();line.geometry.dispose();line.material.dispose();read.dispose();write.dispose();
});

test('frosted compositor separates background and sharp content, masks cards and restores scene materials',()=>{
 const scene=new ThreeScene(),back=new Sprite(new SpriteMaterial()),front=new Sprite(new SpriteMaterial()),line=new Line2(new LineGeometry(),new LineMaterial()),glass=new Sprite(new SpriteMaterial());scene.add(back,front,line,glass);setConnectionPath(line,[new Vector3(),new Vector3(100,0,0)],[0,1],[0,0]);
 const materials=[back.material,front.material,line.material],frames=[],renderer=fakeBlurRenderer();renderer.render=function(s,c){frames.push({scene:s,visible:s.children.filter(o=>o.visible),stencil:back.material.stencilWrite,cardColour:back.material.colorWrite});this.captured.push({scene:s,camera:c})};
 const frame={preference:'subtle',mode:'layered',level:1,width:800,reducedMotion:true,items:[{object:back,behind:1,order:20,card:true},{object:front,behind:0,order:20,card:true,sharp:true},{object:line,behind:0,order:10,sharp:true},{object:glass,behind:1,depth:false,order:-300}]};
 const pass=new FrostedGraphPass(scene,new PerspectiveCamera(),()=>frame,()=>assert.fail('unexpected rendering failure'));pass.setSize(800,600);const read=new WebGLRenderTarget(4,4),write=new WebGLRenderTarget(4,4);pass.render(renderer,write,read);
 const sourceFrames=frames.filter(f=>f.scene===scene);assert.ok(sourceFrames.some(f=>f.visible.includes(back)&&f.visible.includes(glass)));assert.equal(frames.find(f=>f.scene!==scene&&f.scene.isScene).scene.children.length,1,'empty surfaces never enter the depth mask');assert.ok(sourceFrames.some(f=>f.stencil&&!f.cardColour));assert.deepEqual(sourceFrames.at(-1).visible,[back,front,line,glass]);assert.deepEqual([back.material,front.material,line.material],materials);assert.ok(scene.children.every(o=>o.visible));assert.equal(line.material.stencilWrite,false);assert.equal(renderer.target,null);assert.equal(renderer.alpha,1);assert.equal(renderer.autoClear,true);
 pass.dispose();read.dispose();write.dispose();for(const material of [...materials,glass.material])material.dispose();line.geometry.dispose();
});

test('failed frosted compositing restores visibility, materials and the working sharp frame',()=>{
 const scene=new ThreeScene(),sprite=new Sprite(new SpriteMaterial()),material=sprite.material,renderer=fakeBlurRenderer(),warnings=[];scene.add(sprite);let calls=0;
 renderer.render=function(s,c){if(++calls===1)throw new Error('GPU failure');this.captured.push({scene:s,camera:c})};
 const pass=new FrostedGraphPass(scene,new PerspectiveCamera(),()=>({preference:'subtle',mode:'layered',level:1,width:800,reducedMotion:true,items:[{object:sprite,behind:0,sharp:true,card:true,order:20}]}),message=>warnings.push(message)),read=new WebGLRenderTarget(4,4),write=new WebGLRenderTarget(4,4),warn=console.warn;console.warn=()=>{};
 try{pass.render(renderer,write,read)}finally{console.warn=warn}
 assert.equal(pass.enabled,false);assert.equal(sprite.visible,true);assert.equal(sprite.material,material);assert.equal(warnings.length,1);assert.ok(renderer.captured.some(r=>r.scene.isMesh));assert.equal(renderer.target,null);assert.equal(renderer.autoClear,true);pass.dispose();read.dispose();write.dispose();material.dispose();
});


test('centre changes collapse child expansions but retain named surfaces and source context',()=>{
 let s=state({expandedGroups:['technology:irrigation'],branches:['cocoon']});const old=build(s);s=rememberScene(s,old);const before=structuredClone(s),patch=centrePatch(s,old,'nursery-irrigation',catalog);s={...s,...patch};const next=build(s,overview,old);check(next);
 assert.deepEqual(next.cards.filter(c=>c.record.record_type==='topic').map(c=>c.id).sort(),['nursery-irrigation','restoration']);assert.deepEqual(patch.expandedGroups,[]);assert.deepEqual(patch.branches,[]);assert.ok(s.retainedLayers.length);assert.equal(next.level,old.level+1);assert.ok(sceneLayers(next).some(l=>l.level===old.level));assert.equal(sceneLayers(next).at(-1).label,'Centre · Nursery watering');assert.deepEqual(before.expandedGroups,['technology:irrigation']);
 s=rememberScene(s,next);const repeated=build({...s,...centrePatch(s,next,'nursery-irrigation',catalog)},overview,next);assert.equal(repeated.level,next.level);assert.equal(repeated.cards.filter(c=>c.id==='nursery-irrigation').length,1);
 const closed=build({...s,...collapseToLayer(s,next,old.level)},overview,next);assert.equal(closed.level,old.level);assert.ok(sceneLayers(closed).some(l=>l.level===old.level));assert.ok(!closed.cards.some(c=>c.id==='nursery-irrigation'));
 const cocoonHome=old.cards.find(c=>c.id==='cocoon').home,revisit=centrePatch(s,next,'cocoon',catalog);assert.equal(revisit.centreSource.level,cocoonHome.z/PLANE_GAP);assert.equal(revisit.scene.contexts[s.perspective+':cocoon:'+s.search].homes.cocoon.x,cocoonHome.x);
});

test('centre layouts are independent of search and perspective and results open separately',()=>{
 let s=state();let first=build(s);s={...rememberScene(s,first),...centrePatch(s,first,'carob',catalog)};first=build(s,views.combined);s=rememberScene(s,first);assert.ok(first.cards.length>9);const centreHomes=new Map(first.cards.filter(c=>c.owners.includes('centre:carob')).map(c=>[c.id,c.home]));
 for(const [perspective,view] of Object.entries(views)){const next=build({...s,perspective,search:'drone',resultsOpen:false},view,first);for(const [id,home] of centreHomes)assert.deepEqual(next.cards.find(c=>c.id===id).home,home);assert.ok(!next.cards.some(c=>c.owners.includes('query')));check(next)}
 const results=build({...s,resultsOpen:true,search:'drone'},views.combined,first);assert.ok(results.cards.some(c=>c.owners.includes('query')));assert.ok(sceneLayers(results).some(l=>l.kind==='results'));check(results);
});

test('permanent Cocoon members move into the nested group without duplicate factual identities',()=>{
 const groups=JSON.parse(readFileSync(resolve('imports/cocoon-browse-group.json'),'utf8')).browse_groups,organized={...catalog,browse_groups:groups};let s=state({expandedGroups:['technology:irrigation']});const first=seedUnoccupied(buildScene(overview,s,organized,[]),'layered');
 assert.ok(first.cards.some(c=>c.id==='cocoon'));assert.ok(!first.cards.some(c=>c.id==='cocoon-lid'));s=rememberScene(s,first);s.expandedGroups.push('browse:cocoon');const expanded=seedUnoccupied(buildScene(overview,s,organized,[]),'layered',first);assert.equal(expanded.cards.filter(c=>groups[0].members.some(m=>m.topic_id===c.id)).length,6);assert.ok(expanded.cards.some(c=>c.id==='more:browse:cocoon'));assert.ok(sceneLayers(expanded).some(l=>l.label==='Detail · Cocoon'));check(expanded);
 s=rememberScene(s,expanded);s.groupLimits['browse:cocoon']=12;const more=buildScene(overview,s,organized,[]);assert.equal(more.cards.filter(c=>groups[0].members.some(m=>m.topic_id===c.id)).length,9);assert.equal(more.cards.filter(c=>c.id==='cocoon').length,1);check(more);
 assert.deepEqual(directNeighbours('nursery-irrigation',organized).map(t=>t.id),['restoration']);
});

test('background effects default to darken plus half opacity and remain separate from history',()=>{
 assert.deepEqual(parseEffects(null),{blur:false,darken:true,darkenAmount:.25,transparency:true});assert.deepEqual(parseEffects('{bad'),parseEffects(null));assert.equal(parseEffects('{"darkenAmount":12}').darkenAmount,.6);
 for(let bits=0;bits<8;bits++){const effects={blur:!!(bits&1),darken:!!(bits&2),transparency:!!(bits&4),darkenAmount:.25};assert.equal(effectsEnabled(effects,'layered',2),bits!==0);assert.equal(effectsEnabled(effects,'flat',2),false);assert.equal(effectsEnabled(effects,'layered',0),false)}
});

test('shared detail memberships retain one factual card and a separate named orientation label',()=>{
 const groups=JSON.parse(readFileSync(resolve('imports/cocoon-browse-group.json'),'utf8')).browse_groups,organized={...catalog,browse_groups:groups};let s=state();const overviewScene=build(s);s={...rememberScene(s,overviewScene),...centrePatch(s,overviewScene,'cocoon',organized)};
 const star=seedUnoccupied(buildScene(overview,s,organized,[]),'layered');s=rememberScene(s,star);s=trackLayerReturns(s,{...s,expandedGroups:['browse:cocoon']},organized,[]);const scene=seedUnoccupied(buildScene(overview,s,organized,[]),'layered',star);check(scene);
 assert.equal(scene.level,star.level+1);assert.equal(sceneLayers(scene).at(-1).label,'Detail · Cocoon');assert.equal(scene.context.returns.at(-1).label,'Cocoon');assert.ok(scene.references.length>0);
 for(const ref of scene.references){assert.equal(scene.cards.filter(c=>c.id===ref.topicId).length,1);assert.ok(!scene.cards.some(c=>c.id===ref.id));assert.ok(!scene.links.some(e=>[e.source,e.target].includes(ref.id)));assert.equal(ref.position.z,scene.level*PLANE_GAP);assert.deepEqual(scene.cards.find(c=>c.id===ref.topicId).home,star.cards.find(c=>c.id===ref.topicId).home)}
 assert.equal(new Set([...scene.links,...scene.internalSummaries].flatMap(e=>e.relationshipIds)).size,organized.relationships.length);
 s=rememberScene(s,scene);const patch=centrePatch(s,scene,'cocoon',organized),next=buildScene(overview,{...s,...patch},organized,[]);assert.equal(next.level,scene.level+1);assert.ok(patch.retainedLayers.some(l=>l.label==='Detail · Cocoon'));assert.equal(patch.centreSource.label,'Centre · Cocoon planting reservoir');assert.equal(focusAfterTransition(scene,next),'cocoon');
});

test('a new centre session does not reopen cached visits or old result depths in another perspective',()=>{
 let s=state({centre:'carob',overview:false,search:'drone',perspective:'technology',branches:['cocoon']});let old=build(s,views.technology);s=rememberScene(s,old);s.scene.contexts[old.key].revealed={'nursery-irrigation':old.level+1};
 const before=structuredClone(s),patch=centrePatch(s,old,'carob',catalog);s={...s,...patch,perspective:'funding'};const clean=build(s,views.funding);s=rememberScene(s,clean);
 const revisit=build({...s,perspective:'technology',resultsOpen:true},views.technology,clean);check(revisit);assert.deepEqual(revisit.context.revealed,{});assert.equal(revisit.context.planes.query,s.centreLevel+1);assert.ok(!revisit.cards.some(c=>c.owners.includes('visit:nursery-irrigation')));assert.ok(revisit.cards.filter(c=>c.owners.includes('query')&&!c.owners.includes('centre:carob')).every(c=>c.plane===s.centreLevel+1));assert.deepEqual(before.branches,['cocoon']);
});

test('returning to overview ignores a previous centre depth when opening nested groups',()=>{
 const groups=JSON.parse(readFileSync(resolve('imports/cocoon-browse-group.json'),'utf8')).browse_groups,organized={...catalog,browse_groups:groups},s=state({centre:'carob',centreFirst:true,centreVisible:false,centreLevel:7,overview:true,expandedGroups:['technology:irrigation','browse:cocoon']});const scene=buildScene(overview,s,organized,[]);assert.equal(scene.level,2);check(scene);
});

test('the last displayed scene cannot overwrite a newly requested centre while its view is loading',()=>{
 const old=build(state({centre:'carob',overview:false}),views.combined),s=state({centre:'al20',overview:false,centreFirst:true,centreSession:2});const before=structuredClone(s);assert.deepEqual(rememberScene(s,old),before);assert.deepEqual(s,before);
});

test('plane cards foreshorten, keep their normal, and attach routes to real projected boundaries at steep angles',()=>{
 const a=new Mesh(new PlaneGeometry(214,98),new MeshBasicMaterial()),b=new Mesh(new PlaneGeometry(214,98),new MeshBasicMaterial());a.position.set(-300,0,-520);b.position.set(300,0,0);const camera=new PerspectiveCamera(45,1.5,.1,100000),size={width:1200,height:800};let frontalArea=0;
 for(const [tilt,turn] of [[0,0],[25,0],[60,60],[60,-60]]){const t=tilt*Math.PI/180,r=turn*Math.PI/180;camera.position.set(Math.sin(r)*Math.cos(t)*1800,Math.sin(t)*1800,Math.cos(r)*Math.cos(t)*1800);camera.lookAt(0,0,0);camera.updateMatrixWorld();const pa=projectCard(a,214,98,camera,size),pb=projectCard(b,214,98,camera,size),area=Math.abs(polygonArea(pb.polygon));if(!tilt)frontalArea=area;else if(tilt===60)assert.ok(area<frontalArea);assert.equal(a.quaternion.w,1);const path=polygonConnectionPath('a-b',pa,pb,pa.polygon,pb.polygon,[],true);assert.ok(inPolygon(path[0],pa.polygon));assert.ok(inPolygon(path.at(-1),pb.polygon));const start=screenPointAtZ(path[0],-520,camera,size),end=screenPointAtZ(path.at(-1),0,camera,size);assert.ok(Math.abs(start.z+520)<1e-8);assert.ok(Math.abs(end.z)<1e-8);assert.ok(Math.abs(Math.abs(start.x-a.position.x)-107)<1e-5||Math.abs(Math.abs(start.y)-49)<1e-5)}
 a.geometry.dispose();a.material.dispose();b.geometry.dispose();b.material.dispose();
});
