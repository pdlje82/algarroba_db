import {reuseRenderObject,bindRenderRecord} from '../frontend/rendererCache.ts';
import {Group,Mesh,PlaneGeometry,MeshBasicMaterial,Color} from 'three';
import {calculateLayout} from '../frontend/layout.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {initialState} from '../frontend/types.ts';
import {rememberScene,normalizeExploration} from '../frontend/scene.ts';
import {encodeHistory,decodeHistory} from '../frontend/explorationStorage.ts';
import {ensureLayers,openGroupLayer,openTopicLayer,centreLayer,withoutCentre,closeLayer,returnLayer,overviewLayers,zoomLayer,moveLayer,layerDisplay,resultLayer,routeLayer,routesLayer,memberLayer,compactLayer,members} from '../frontend/layerState.ts';
import {buildLayerScene,prepareLayerScene} from '../frontend/layerScene.ts';
import {PLANE_GAP,MAX_CAMERA_DISTANCE,depthOrigin} from '../frontend/depth.ts';
import {layerAppearance} from '../frontend/appearance.ts';
const fixture=JSON.parse(execFileSync(resolve('.venv/Scripts/python.exe'),['-c',`
import json,tempfile,sys
from pathlib import Path
from backend.store import Store,ROOT
from backend.graph import Graph,PERSPECTIVES
sys.stdout.reconfigure(encoding='utf-8')
with tempfile.TemporaryDirectory() as folder:
 s=Store(Path(folder)/'test.sqlite');s.register_sources(json.loads((ROOT/'imports/source-manifest.json').read_text(encoding='utf8')))
 b=dict(batch_id='v5-fixture',summary='v5 tests',topics=[],relationships=[],findings=[],coverage=[],unresolved=[])
 for name in ['ecosystems.json','water-technology.json','funding.json']:
  raw=json.loads((ROOT/'imports'/name).read_text(encoding='utf8'))
  for key in ['topics','relationships','findings','coverage','unresolved']:b[key]+=raw[key]
 s.import_batch(b);b=json.loads((ROOT/'imports/cocoon-browse-group.json').read_text());b['base_revision']=s.revision();s.import_batch(b);g=Graph(s)
 print(json.dumps(dict(catalog=s.snapshot(),overview=g.view(all_results=True),views={p:g.view(perspective=p,all_results=True) for p,_ in PERSPECTIVES},focus=g.view('carob','drone','technology',depth=8,all_results=True))))
`],{encoding:'utf8',maxBuffer:16*1024*1024}));
const {catalog,overview,views,focus}=fixture;
const fresh=()=>ensureLayers(normalizeExploration(structuredClone(initialState)),catalog);
const render=(s,view=overview,aspect=16/9)=>{const scene=buildLayerScene(view,s,catalog,[],aspect);return {scene,state:rememberScene(s,scene)}};
function tightFrame(scene,frame){
 const items=[...scene.cards,...scene.references].filter(c=>c.layerId===frame.id);if(!items.length){assert.equal(frame.width,300);assert.equal(frame.height,240);return}
 const left=Math.min(...items.map(c=>c.position.x-c.width/2)),right=Math.max(...items.map(c=>c.position.x+c.width/2)),top=Math.min(...items.map(c=>c.position.y-c.height/2)),bottom=Math.max(...items.map(c=>c.position.y+c.height/2));
 for(const [actual,expected] of [[frame.width,Math.max(300,right-left+64)],[frame.height,Math.max(240,bottom-top+132)],[frame.x,(left+right)/2],[frame.y,(top+bottom-68)/2]])assert.ok(Math.abs(actual-expected)<1e-6,'loose frame '+frame.id);
}
function ledger(scene){const seen=new Set();for(const e of [...scene.links,...scene.internalSummaries])for(const id of e.relationshipIds){assert.ok(!seen.has(id),'duplicated '+id);seen.add(id)}assert.equal(seen.size,catalog.relationships.length);assert.equal(new Set(scene.cards.map(c=>c.id)).size,scene.cards.length);assert.ok(scene.cards.every(c=>Object.values(c.position).every(Number.isFinite)));for(const frame of scene.layers)tightFrame(scene,frame);return seen}
function water(){return render(openGroupLayer(fresh(),catalog,'technology:irrigation'))}
test('v5 source contents remain populated during centre/contents opening and return',()=>{
 let {scene:source,state:s}=water();const originals=source.cards.filter(c=>c.layerId==='root:technology:irrigation');assert.ok(originals.some(c=>c.id==='cocoon'));
 ({state:s}=render(centreLayer(s,catalog,'cocoon')));let opened=render(openTopicLayer(s,catalog,'cocoon','root:technology:irrigation'));
 for(const c of originals)assert.deepEqual(opened.scene.cards.find(n=>n.id===c.id)?.position,c.position,c.id);
 assert.equal(opened.scene.cards.filter(c=>c.id==='cocoon').length,1);assert.ok(opened.state.layerView.layers['connections:cocoon'].band<opened.state.layerView.layers['group:browse:cocoon'].band);
 assert.equal(opened.scene.layers.find(l=>l.id==='group:browse:cocoon').memberIds.length,9);assert.ok(opened.scene.references.some(r=>r.topicId==='cocoon-reservoir'));
 const back=render(returnLayer(opened.state,'root:technology:irrigation'));for(const c of originals)assert.deepEqual((({x,y})=>({x,y}))(back.scene.cards.find(n=>n.id===c.id).position),(({x,y})=>({x,y}))(c.position));ledger(back.scene);
});
test('connections and contents close independently; canonical cards rehost into surviving slots',()=>{
 let {state:s}=water();({state:s}=render(centreLayer(s,catalog,'cocoon')));({state:s}=render(openTopicLayer(s,catalog,'cocoon','root:technology:irrigation')));
 const closed=render(closeLayer(s,'connections:cocoon'));assert.ok(closed.state.layerView.layers['group:browse:cocoon'].open);for(const id of members(closed.state.layerView.layers['group:browse:cocoon'].scope,catalog))assert.ok(closed.scene.cards.some(c=>c.id===id));ledger(closed.scene);
});
test('each overview branch has its own surface, and returning closes only dependent layers',()=>{
 let {state:s}=water();({state:s}=render(openGroupLayer(s,catalog,'technology:drones')));const unrelated=render(s).scene.cards.filter(c=>c.layerId==='root:technology:drones');({state:s}=render(centreLayer(s,catalog,'cocoon')));
 const back=render(returnLayer(s,'root:technology:irrigation'));assert.ok(back.state.layerView.layers['root:technology:drones'].open);for(const c of unrelated)assert.deepEqual(back.scene.cards.find(n=>n.id===c.id)?.position,c.position);assert.equal(back.scene.layers.length,3);
 const parent=render(returnLayer(back.state,'overview'));assert.ok(parent.state.layerView.layers['root:technology:drones'].open);assert.ok(!parent.state.layerView.layers['root:technology:irrigation'].open);
});
test('ordinary front topics open a deeper step; repeated click collapses without lifting the anchor',()=>{
 let {state:s,scene}=water();const anchor=scene.cards.find(c=>c.id==='cocoon');({state:s}=render(openTopicLayer(s,catalog,'cocoon',anchor.layerId)));const child=render(s).scene.cards.find(c=>c.id==='cocoon-reservoir');assert.ok(child);
 const next=render(openTopicLayer(s,catalog,child.id,child.layerId));assert.ok(next.state.layerView.layers['connections:'+child.id].band>next.state.layerView.layers[child.layerId].band);assert.deepEqual(next.scene.cards.find(c=>c.id===child.id).position,child.position);
 const closed=render(openTopicLayer(next.state,catalog,child.id,child.layerId));assert.ok(!closed.state.layerView.layers['connections:'+child.id].open);assert.deepEqual(closed.scene.cards.find(c=>c.id==='cocoon').position,anchor.position);
});
test('all scopes exceed old scene limits with no More cards and exact factual accounting',()=>{
 let s=fresh();for(const gid of ['ecosystem:species','ecosystem:habitats','ecosystem:restoration-methods','technology:irrigation','technology:drones','technology:monitoring','funding:programmes','funding:activities','funding:requirements'])({state:s}=render(openGroupLayer(s,catalog,gid)));({state:s}=render(openGroupLayer(s,catalog,'browse:cocoon','root:technology:irrigation')));
 const all=render(s);assert.ok(all.scene.cards.length>120);assert.ok(all.scene.links.length>240);assert.equal(all.scene.cards.filter(c=>catalog.topics.some(t=>t.id===c.id)).length,catalog.topics.length);assert.ok(!all.scene.cards.some(c=>c.record.kind==='more'));ledger(all.scene);
});
test('Group nodes retains complete membership and summary inspection without recursive grouping',()=>{
 const {state:s}=water(),grouped=render(layerDisplay(s,'root:technology:irrigation','groups'));assert.ok(grouped.scene.cards.some(c=>c.id.startsWith('viewgroup:')));ledger(grouped.scene);const restored=render(layerDisplay(grouped.state,'root:technology:irrigation','topics'));assert.ok(restored.scene.cards.some(c=>c.id==='cocoon'));assert.deepEqual(restored.state.layerView.layers['root:technology:irrigation'].scope,s.layerView.layers['root:technology:irrigation'].scope);
});
test('all ten complete result perspectives work without a centre and preserve their source view',()=>{
 for(const [perspective,view] of Object.entries(views)){const s={...fresh(),perspective,overview:false,resultsOpen:true},result=render(resultLayer(s,catalog,view),view);const layer=result.state.layerView.layers['results:overview'];assert.equal(layer.scope.memberIds.length,view.nodes.length,perspective);assert.equal(result.scene.cards.filter(c=>c.layerId===layer.id).length,view.nodes.length,perspective);ledger(result.scene)}
});
test('making Nursery watering centre exposes its sole recorded neighbour without moving its source',()=>{
 const {state:s,scene}=water(),n=scene.cards.find(c=>c.id==='nursery-irrigation');assert.ok(n);const next=render(centreLayer(s,catalog,'nursery-irrigation'));assert.deepEqual(next.scene.cards.find(c=>c.id===n.id).position,n.position);assert.deepEqual(next.state.layerView.layers['connections:nursery-irrigation'].scope.anchorId,n.id);assert.equal(next.scene.layers.find(l=>l.id==='connections:nursery-irrigation').memberIds.length,1);
});
test('layer movement changes only its offset and endpoints, retaining stable membership and other layers',()=>{
 const {state:s,scene}=water(),id='root:technology:irrigation',o=s.layerView.layers[id].offsets.layered;const moved=render(moveLayer(s,id,{x:o.x+150,y:o.y-80}));for(const c of scene.cards){const after=moved.scene.cards.find(n=>n.id===c.id);assert.deepEqual(after.position,c.layerId===id?{x:c.position.x+150,y:c.position.y-80,z:c.position.z}:c.position)}ledger(moved.scene);assert.deepEqual(moved.state.layerView.layers[id].scope,s.layerView.layers[id].scope);
 assert.deepEqual(rememberScene(moved.state,scene).layerView,moved.state.layerView,'old frame must not overwrite a pending move');
});
test('viewport resizing reflows the overview while retaining opened detail positions and offsets',()=>{const {state:s,scene}=water(),wide=render(s,overview,2.1);for(const c of scene.cards.filter(c=>c.layerId!=='overview'))assert.deepEqual(wide.scene.cards.find(n=>n.id===c.id).position,c.position);assert.deepEqual(wide.state.layerView.layers['root:technology:irrigation'].offsets,s.layerView.layers['root:technology:irrigation'].offsets);const box=wide.scene.layers.find(l=>l.id!=='overview');assert.deepEqual(box,scene.layers.find(l=>l.id===box.id));tightFrame(wide.scene,box)});
test('repeated Make centre reuses a layer, never creates a self-parent, and complete history round-trips',()=>{
 let {state:s}=water();for(let i=0;i<4;i++)({state:s}=render(centreLayer(s,catalog,'cocoon')));assert.equal(Object.keys(s.layerView.layers).filter(id=>id==='connections:cocoon').length,1);assert.notEqual(s.layerView.layers['connections:cocoon'].parentId,'connections:cocoon');const decoded=decodeHistory(encodeHistory([s],0),normalizeExploration);assert.deepEqual(decoded.entries[0].layerView,s.layerView);assert.equal(JSON.parse(encodeHistory([s],0)).format,5);
});
test('v4 retained memberships and source homes migrate into populated independent layers',()=>{const old=normalizeExploration({...structuredClone(initialState),layoutVersion:4,overview:false,centre:'cocoon',centreFirst:true,retainedLayers:[{id:'old-water',label:'Detail · Establishment water',kind:'detail',level:1,anchorIds:['group:technology:irrigation'],x:0,y:0,width:1000,height:700,members:[{id:'cocoon',home:{x:555,y:333,z:520}}]}]});const migrated=render(ensureLayers(old,catalog));assert.ok(migrated.scene.cards.some(c=>c.id==='cocoon'&&c.position.x===555&&c.position.y===333));assert.ok(migrated.scene.layers.some(l=>l.id==='retained:old-water'&&l.memberIds.length>1));assert.equal(old.layoutVersion,4)});
test('Flat caches and full v5 snapshots restore without a new layout worker',async()=>{let {state:s}=water();const layered=render(s);const flat=render({...s,scene:{...s.scene,mode:'flat'}});assert.ok(flat.scene.cards.every(c=>c.position.z===0));const restored=render({...flat.state,scene:{...flat.state.scene,mode:'layered'}});for(const c of layered.scene.cards)assert.deepEqual(restored.scene.cards.find(n=>n.id===c.id).position,c.position);for(const l of Object.values(restored.scene.layerView.layers))l.signatures.layered=[...restored.scene.cards.filter(c=>c.layerId===l.id).map(c=>c.id),...restored.scene.references.filter(r=>r.layerId===l.id).map(r=>r.topicId)].join('|');await prepareLayerScene(restored.scene,undefined,new AbortController().signal)});
test('route expansion exposes all included steps while existing endpoints remain fixed',()=>{let s={...fresh(),centre:'carob',search:'drone',perspective:'technology',overview:false};s=centreLayer(s,catalog,'carob');let before=render(resultLayer(s,catalog,focus),focus);const route=focus.routes.find(r=>r.nodes.length>2);assert.ok(route);const after=render(routeLayer(before.state,catalog,route),focus);for(const id of route.nodes)assert.ok(after.scene.cards.some(c=>c.id===id));for(const c of before.scene.cards)assert.deepEqual(after.scene.cards.find(n=>n.id===c.id).position,c.position)});

test('GPU reuse retains ForceGraph record and root identities across movement, selection and theme updates',()=>{
 const cache=new Map(),retired=[],create=()=>{const g=new Group();g.add(new Mesh(new PlaneGeometry(20,10),new MeshBasicMaterial()));return g};
 const root=reuseRenderObject(cache,'card:carob','dark',create,retired),record=bindRenderRecord(cache,'card:carob',{id:'carob',object:root,x:0});root.__data=record;record.__threeObj=root;
 assert.equal(reuseRenderObject(cache,'card:carob','dark',()=>{throw new Error('Unnecessary texture rebuild')},retired),root);
 const moved=bindRenderRecord(cache,'card:carob',{id:'carob',object:root,x:50});assert.equal(moved,record);assert.equal(root.__data,moved);assert.equal(record.__threeObj,root);
 const oldChild=root.children[0],updated=reuseRenderObject(cache,'card:carob','light-selected',create,retired);assert.equal(updated,root);assert.notEqual(updated.children[0],oldChild);assert.deepEqual(retired,[oldChild]);assert.equal(root.__data,record);assert.equal(cache.get('card:carob').data,record);
});
test('fCoSE candidates verify every fixed label slot and restoration skips the worker',async()=>{
 const {state:s}=water(),scene=buildLayerScene(overview,s,catalog,[]);for(const l of Object.values(scene.layerView.layers))l.signatures={};const previous=globalThis.Worker;let runs=0;
 globalThis.Worker=class {postMessage(request){runs++;queueMicrotask(()=>this.onmessage({data:{result:calculateLayout(request)}}))}terminate(){}};
 try{await prepareLayerScene(scene,undefined,new AbortController().signal);assert.equal(runs,1);await prepareLayerScene(scene,undefined,new AbortController().signal);assert.equal(runs,1)}finally{globalThis.Worker=previous}
});
test('reopening a front expansion and updating front results never create endless depth steps',()=>{
 let {state:s}=water();({state:s}=render(centreLayer(s,catalog,'cocoon')));const before=s.layerView.layers['connections:cocoon'].band;
 ({state:s}=render(openGroupLayer(s,catalog,'browse:cocoon','root:technology:irrigation')));assert.equal(s.layerView.layers['connections:cocoon'].band,before);assert.equal(s.layerView.layers['group:browse:cocoon'].band,before+1);
 ({state:s}=render(returnLayer(s,'group:browse:cocoon')));assert.equal(s.layerView.layers['group:browse:cocoon'].band,before+1);
});

test('Expand all admits complete routes in one scope without making every opened route selected',()=>{
 let s=centreLayer(fresh(),catalog,'carob');s={...s,search:'drone',perspective:'technology',overview:false};const {state:before}=render(resultLayer(s,catalog,focus),focus),expanded=routesLayer(before,catalog,focus.routes);expanded.expandedRoutes=focus.routes.map(r=>r.id);expanded.selected='carob';const result=render(expanded,focus);assert.equal(result.scene.layers.filter(l=>l.kind==='route').length,1);for(const r of focus.routes)for(const id of r.nodes)assert.ok(result.scene.cards.some(c=>c.id===id));assert.ok(result.scene.links.filter(l=>l.active).every(l=>l.source==='carob'||l.target==='carob'));ledger(result.scene);
});

test('research markers remain view aids and never enter factual member placement',async()=>{
 const {state:s}=water(),task={id:'qa-task',status:'To research',context:{centre:'cocoon'},custom_topics:'Inspect wider material'};const scene=buildLayerScene(overview,s,catalog,[task]);assert.ok(scene.cards.some(c=>c.id==='research:qa-task'));const previous=globalThis.Worker;globalThis.Worker=class{postMessage(request){assert.ok(request.elements.every(e=>!e.data.id.startsWith('research:')));queueMicrotask(()=>this.onmessage({data:{result:calculateLayout(request)}}))}terminate(){}};try{await prepareLayerScene(scene,undefined,new AbortController().signal);ledger(scene)}finally{globalThis.Worker=previous}
});

test('a research marker never attaches another task to the currently selected centre',()=>{const {state:s}=water();s.centre='cocoon';const scene=buildLayerScene(overview,s,catalog,[{id:'other-task',status:'To research',context:{centre:'al20'},custom_topics:'AL20'}]);assert.ok(!scene.links.some(l=>l.id==='indication:other-task'));assert.equal(scene.cards.find(c=>c.id==='research:other-task').layerId,'overview')});

test('migration recovers route memberships, real edge IDs and legacy More group selection',()=>{const r=focus.routes.find(r=>r.nodes.length>2),homes=Object.fromEntries(r.nodes.map((id,i)=>[id,{x:777+i*250,y:444,z:1040}])),old=normalizeExploration({...structuredClone(initialState),layoutVersion:4,centre:'carob',overview:false,perspective:'technology',search:'drone',expandedRoutes:[r.id],selected:'more:browse:cocoon',scene:{version:4,mode:'layered',planeGap:520,focusOffset:120,presentation:'foreground',contexts:{'technology:carob:drone':{homes,flat:{},owners:{},planes:{},cameras:{},routes:{[r.id]:r}}}}});const result=render(ensureLayers(old,catalog),focus);assert.equal(result.state.selected,'cocoon');assert.deepEqual(result.state.layerView.layers['route-layer:'+r.id].scope.routes[0].edges,r.edges);for(const id of r.nodes){const card=result.scene.cards.find(c=>c.id===id);assert.ok(card);assert.equal(card.position.x,homes[id].x);assert.equal(card.position.y,homes[id].y)}});

test('legacy source-group migration recovers all findings while preserving existing evidence coordinates',()=>{const f=catalog.findings[0],id='finding:'+f.id,old=normalizeExploration({...structuredClone(initialState),layoutVersion:4,perspective:'sources',expandedGroups:['source:findings'],scene:{version:4,mode:'layered',planeGap:520,focusOffset:120,presentation:'foreground',contexts:{'sources:overview:':{homes:{[id]:{x:345,y:678,z:520}},flat:{},owners:{[id]:['group:source:findings']},planes:{},cameras:{}}}}});const result=render(ensureLayers(old,catalog),views.sources);assert.equal(result.scene.layers.find(l=>l.id==='root:source:findings').memberIds.length,catalog.findings.length);assert.equal(result.scene.cards.find(c=>c.id===id).position.x,345);assert.equal(result.scene.cards.find(c=>c.id===id).position.y,678)});

test('legacy source documents receive readable cards even when their catalog has no label field',()=>{const old=normalizeExploration({...structuredClone(initialState),perspective:'sources',expandedGroups:['source:sources']});const result=render(ensureLayers(old,catalog),views.sources);assert.equal(result.scene.cards.filter(c=>c.record.record_type==='source').length,9);assert.ok(result.scene.cards.every(c=>typeof c.record.label==='string'&&c.record.label.length))});

test('subordinate group expansions from different result scopes have distinct identities',()=>{const a={...fresh(),overview:false,perspective:'technology',search:'drone'},b={...fresh(),overview:false,perspective:'technology',search:'water'};let sa=resultLayer(a,catalog,views.technology),sb=resultLayer(b,catalog,views.technology);sa=layerDisplay(sa,'results:overview','groups');sb=layerDisplay(sb,'results:overview','groups');const keys=s=>buildLayerScene(views.technology,s,catalog,[]).cards.filter(c=>c.record.groupScope).map(c=>c.record.groupScope.key);const first=keys(sa),second=keys(sb);assert.ok(first.length&&second.length);assert.ok(first.every(k=>!second.includes(k)))});

test('removing the centre retains populated layers, controls, geometry and both camera poses',()=>{
 let {state:s}=water();({state:s}=render(centreLayer(s,catalog,'cocoon')));s.search='drone';s.perspective='technology';s.resultsOpen=true;
 const pose={position:{x:100,y:200,z:3000},target:{x:20,y:30,z:0},quaternion:[0,0,0,1],focalScale:900,reference:3000};s.scene.contexts['technology:cocoon:drone']={homes:{},flat:{},owners:{},planes:{},cameras:{layered:pose,flat:{...pose,position:{x:1,y:2,z:4000}}}};
 const before=render(s),cleared=withoutCentre(before.state),after=render(cleared);
 assert.equal(after.state.centre,null);assert.equal(after.state.selected,null);assert.equal(after.state.resultsOpen,false);assert.equal(after.state.search,'drone');assert.equal(after.state.perspective,'technology');
 assert.deepEqual(after.scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));assert.deepEqual(after.scene.layers.map(l=>l.id),before.scene.layers.map(l=>l.id));assert.ok(after.scene.cards.every(c=>!c.record.viewCentre));
 assert.ok(after.scene.layers.find(l=>l.id==='connections:cocoon').label.startsWith('Connections · '));assert.deepEqual(after.scene.context.cameras,before.scene.context.cameras);assert.equal(before.state.centre,'cocoon');
 const inspectingOther={...before.state,selected:'cocoon-reservoir',selectedEdges:['kept-inspection']};assert.equal(withoutCentre(inspectingOther).selected,'cocoon-reservoir');assert.deepEqual(withoutCentre(inspectingOther).selectedEdges,['kept-inspection']);
});

test('overview cards use wide and portrait frames without overlap, while detail stays fixed',()=>{
 for(const mode of ['layered','flat']){
  const start=water().state;start.scene.mode=mode;const before=render(start);
  for(const aspect of [.3,9/16,1,4/3,16/9,2.6,4]){
   const after=render(before.state,overview,aspect),frame=after.scene.layers.find(l=>l.id==='overview'),cards=after.scene.cards.filter(c=>c.layerId==='overview');
   tightFrame(after.scene,frame);assert.equal(cards.length,9);assert.equal(new Set(cards.map(c=>c.id)).size,9);
   assert.deepEqual(after.scene.cards.filter(c=>c.layerId!=='overview').map(c=>[c.id,c.position]),before.scene.cards.filter(c=>c.layerId!=='overview').map(c=>[c.id,c.position]));
   for(const card of cards){assert.ok(card.position.x-card.width/2>=frame.x-frame.width/2);assert.ok(card.position.x+card.width/2<=frame.x+frame.width/2);assert.ok(card.position.y-card.height/2>=frame.y-frame.height/2);assert.ok(card.position.y+card.height/2<=frame.y+frame.height/2)}
   for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)assert.ok(Math.abs(cards[i].position.x-cards[j].position.x)>=(cards[i].width+cards[j].width)/2+24||Math.abs(cards[i].position.y-cards[j].position.y)>=(cards[i].height+cards[j].height)/2+24,'overlap at '+aspect);
   const spanX=Math.max(...cards.map(c=>c.position.x+c.width/2))-Math.min(...cards.map(c=>c.position.x-c.width/2)),spanY=Math.max(...cards.map(c=>c.position.y+c.height/2))-Math.min(...cards.map(c=>c.position.y-c.height/2));
   assert.ok(spanX/frame.width>(frame.grid.columns===1?.4:.55)&&spanY/frame.height>.55,'overview should use both frame dimensions at '+aspect);ledger(after.scene);
   const restored=render(after.state,overview,16/9);assert.deepEqual(restored.scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));
  }
  const portrait=render(before.state,overview,9/16),wide=render(before.state,overview,4);assert.ok(portrait.scene.layers[0].grid.columns<wide.scene.layers[0].grid.columns);assert.ok(portrait.scene.layers[0].grid.rows>wide.scene.layers[0].grid.rows);
  const repeated=render(before.state);assert.deepEqual(repeated.scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));
 }
});

test('group toggles shrink and restore only their visible frame, preserving offsets and factual slots',()=>{
 for(const mode of ['layered','flat']){
  let s=water().state;s.scene.mode=mode;({state:s}=render(s));({state:s}=render(centreLayer(s,catalog,'cocoon')));
  const id='connections:cocoon';({state:s}=render(moveLayer(s,id,{x:1400,y:750},mode)));const before=render(s),box=before.scene.layers.find(l=>l.id===id);
  const grouped=render(layerDisplay(before.state,id,'groups')),small=grouped.scene.layers.find(l=>l.id===id);
  assert.ok(small.width*small.height<box.width*box.height*.75,'grouped frame must contract in '+mode);
  assert.deepEqual(grouped.state.layerView.layers[id].offsets,before.state.layerView.layers[id].offsets);
  assert.deepEqual(grouped.scene.layers.filter(l=>l.id!==id),before.scene.layers.filter(l=>l.id!==id));
  for(const item of [...grouped.scene.cards,...grouped.scene.references].filter(c=>c.layerId===id)){assert.ok(item.position.x-item.width/2>=small.x-small.width/2);assert.ok(item.position.x+item.width/2<=small.x+small.width/2);assert.ok(item.position.y-item.height/2>=small.y-small.height/2);assert.ok(item.position.y+item.height/2<=small.y+small.height/2)}
  const restored=render(layerDisplay(grouped.state,id,'topics'));assert.deepEqual(restored.scene.layers.find(l=>l.id===id),box);assert.deepEqual(restored.scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));ledger(grouped.scene);ledger(restored.scene);
 }
});

test('a frame follows visible cached slots rather than retaining the empty local origin',()=>{
 const {state:s}=water(),id='root:technology:irrigation';for(const p of Object.values(s.layerView.layers[id].slots.layered)){p.x+=6000;p.y+=4000}
 const scene=render(s).scene,frame=scene.layers.find(l=>l.id===id);assert.ok(frame.width<3000);assert.ok(frame.x>4000);assert.ok(frame.y>3000);
});

test('layer colours remain stable through grouping and have matching hues in both themes',()=>{
 const ids=['overview','root:technology:irrigation','group:browse:cocoon','connections:cocoon'];
 for(const id of ids){const light=layerAppearance(id,'light'),dark=layerAppearance(id,'dark');assert.ok(Math.abs(new Color(light.tint).getHSL({},'srgb').h-new Color(dark.tint).getHSL({},'srgb').h)<1e-6);assert.ok(light.opacity>0&&dark.opacity<.1);assert.ok(dark.hoverOpacity>dark.opacity)}
 assert.equal(new Set(ids.map(id=>layerAppearance(id,'dark').tint)).size,ids.length);
});


test('an opened Species subgroup has no recursive group and can return to its complete parent groups',()=>{
 const parentId='root:ecosystem:species',parent=render(layerDisplay(render(openGroupLayer(fresh(),catalog,'ecosystem:species')).state,parentId,'groups'));
 const card=parent.scene.cards.find(c=>c.record.groupScope?.categoryKey==='species');assert.ok(card);
 const opened=render(memberLayer(parent.state,catalog,card.record.groupScope,'Detail · Species',parentId)),leaf=opened.scene.layers.find(l=>l.parentId===parentId);
 assert.ok(leaf);assert.equal(leaf.groups.length,0);assert.equal(leaf.memberIds.length,34);assert.ok(!opened.scene.cards.some(c=>c.layerId===leaf.id&&c.record.groupScope));ledger(opened.scene);
 const returned=render(returnLayer(opened.state,parentId));assert.equal(returned.state.layerView.currentId,parentId);assert.equal(returned.scene.layers.find(l=>l.id===parentId).display,'groups');assert.ok(!returned.scene.layers.some(l=>l.id===leaf.id));assert.deepEqual(returned.scene.cards.filter(c=>c.layerId===parentId).map(c=>c.record.label),parent.scene.cards.filter(c=>c.layerId===parentId).map(c=>c.record.label));ledger(returned.scene);
});


test('two grouped nodes get tight content bounds even in a very tall window',()=>{
 for(const mode of ['layered','flat'])for(const aspect of [.3,9/16,1,16/9,4]){
  let s=openGroupLayer(fresh(),catalog,'ecosystem:species');s.scene.mode=mode;({state:s}=render(s,overview,aspect));
  const id='root:ecosystem:species',before=render(s,overview,aspect),grouped=render(layerDisplay(s,id,'groups'),overview,aspect),frame=grouped.scene.layers.find(l=>l.id===id),cards=grouped.scene.cards.filter(c=>c.layerId===id);
  assert.equal(cards.length,2);assert.ok(cards.every(c=>c.record.kind==='group'));
  const left=Math.min(...cards.map(c=>c.position.x-c.width/2)),right=Math.max(...cards.map(c=>c.position.x+c.width/2)),top=Math.min(...cards.map(c=>c.position.y-c.height/2)),bottom=Math.max(...cards.map(c=>c.position.y+c.height/2));
  assert.ok(frame.width-(right-left)<=86.01,'horizontal excess padding at '+aspect);assert.ok(frame.height-(bottom-top)<=142.01,'vertical excess padding at '+aspect);
  assert.ok(left-(frame.x-frame.width/2)>=31.99);assert.ok(frame.x+frame.width/2-right>=31.99);assert.ok(top-(frame.y-frame.height/2)>=99.99);assert.ok(frame.y+frame.height/2-bottom>=31.99);
  assert.deepEqual(grouped.state.layerView.layers[id].offsets,before.state.layerView.layers[id].offsets);ledger(grouped.scene);
  const restored=render(layerDisplay(grouped.state,id,'topics'),overview,aspect);assert.deepEqual(restored.scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));assert.deepEqual(restored.scene.layers.find(l=>l.id===id),before.scene.layers.find(l=>l.id===id));
 }
});


test('connection panes stay tight across window shapes while preserving their circular slots and camera',()=>{
 for(const mode of ['layered','flat']){
  let s=render(openGroupLayer(fresh(),catalog,'ecosystem:species')).state;s.scene.mode=mode;
  let before=render(openTopicLayer(s,catalog,'carob','root:ecosystem:species'));
  const pose={position:{x:130,y:750,z:2800},target:{x:15,y:20,z:0},quaternion:[0,0,0,1],focalScale:900,reference:3000};before.state=rememberScene(before.state,before.scene,pose);
  assert.ok(before.scene.references.some(r=>r.layerId==='connections:carob'));
  for(const aspect of [.3,9/16,1,16/9,4]){
   const after=render(before.state,overview,aspect);ledger(after.scene);
   assert.deepEqual(after.state.layerView.layers,before.state.layerView.layers);
   assert.deepEqual(after.scene.cards.filter(c=>c.layerId!=='overview').map(c=>[c.id,c.position]),before.scene.cards.filter(c=>c.layerId!=='overview').map(c=>[c.id,c.position]));
   assert.deepEqual(after.scene.references,before.scene.references);assert.deepEqual(after.scene.layers.filter(l=>l.id!=='overview').map(({sourcePosition,...l})=>l),before.scene.layers.filter(l=>l.id!=='overview').map(({sourcePosition,...l})=>l));
   assert.deepEqual(after.scene.context.cameras[mode],pose);assert.equal(after.scene.cards.filter(c=>c.id==='carob').length,1);
  }
 }
});

test('an empty pane retains its minimum controls area and manually positioned location',()=>{
 const opened=render(memberLayer(fresh(),catalog,{kind:'members',key:'empty-qa',memberIds:[]},'Empty scope','overview')),id=opened.state.layerView.currentId,frame=opened.scene.layers.find(l=>l.id===id),offset=opened.state.layerView.layers[id].offsets.layered;
 const moved=render(moveLayer(opened.state,id,{x:offset.x+500,y:offset.y-200})),after=moved.scene.layers.find(l=>l.id===id);tightFrame(moved.scene,after);assert.equal(after.x,frame.x+500);assert.equal(after.y,frame.y-200);assert.match(after.emptyMessage,/No topics recorded/);
});


function readable(scene,id){const items=[...scene.cards,...scene.references].filter(c=>c.layerId===id);for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert.ok(Math.abs(items[i].position.x-items[j].position.x)>=(items[i].width+items[j].width)/2+23.99||Math.abs(items[i].position.y-items[j].position.y)>=(items[i].height+items[j].height)/2+23.99,'overlap in '+id)}
function aligned(scene,id,sourceId){const pane=scene.layers.find(l=>l.id===id),source=scene.cards.find(c=>c.id===sourceId);assert.ok(pane&&source);assert.ok(Math.abs(pane.x-source.position.x)<1e-6&&Math.abs(pane.y-source.position.y)<1e-6,'source axis missed '+id);assert.ok(pane.level>source.plane);tightFrame(scene,pane)}

test('new panes align their area centre with overview, subgroup and topic source cards',()=>{
 let opened=render(openGroupLayer(fresh(),catalog,'ecosystem:species'));aligned(opened.scene,'root:ecosystem:species','group:ecosystem:species');
 opened=render(layerDisplay(opened.state,'root:ecosystem:species','groups'));const group=opened.scene.cards.find(c=>c.record.groupScope?.categoryKey==='species');assert.ok(group);
 opened=render(memberLayer(opened.state,catalog,group.record.groupScope,'Detail · Species',group.layerId,group.id));const id=opened.state.layerView.currentId;aligned(opened.scene,id,group.id);
 const anchor=opened.scene.cards.find(c=>c.id==='aleppo-pine');assert.ok(anchor);const next=render(openTopicLayer(opened.state,catalog,anchor.id,anchor.layerId));aligned(next.scene,'connections:'+anchor.id,anchor.id);assert.deepEqual(next.scene.cards.find(c=>c.id===anchor.id).position,anchor.position);ledger(next.scene);
});

test('compact repairs an old watering-hose outlier, preserves pane position, and restores exactly',()=>{
 let before=water(),id='root:technology:irrigation';const old=structuredClone(before.state);old.layerView.layers[id].slots.layered['watering-hose'].x-=3000;delete old.layerView.layers[id].packing;delete old.layerView.layers[id].centres;
 before=render(old);const box=before.scene.layers.find(l=>l.id===id),offset=before.state.layerView.layers[id].offsets.layered,after=render(compactLayer(before.state,id)),small=after.scene.layers.find(l=>l.id===id);
 assert.ok(small.width*small.height<box.width*box.height*.5);assert.ok(Math.abs(small.x-box.x)<1e-6&&Math.abs(small.y-box.y)<1e-6);assert.deepEqual(after.state.layerView.layers[id].offsets.layered,offset);readable(after.scene,id);ledger(after.scene);
 assert.deepEqual(render(before.state).scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));assert.deepEqual(render(after.state).scene.cards.map(c=>[c.id,c.position]),after.scene.cards.map(c=>[c.id,c.position]));
 const history=decodeHistory(encodeHistory([before.state,after.state],1));assert.deepEqual(render(history.entries[0]).scene.cards.map(c=>[c.id,c.position]),before.scene.cards.map(c=>[c.id,c.position]));assert.deepEqual(render(history.entries[1]).scene.cards.map(c=>[c.id,c.position]),after.scene.cards.map(c=>[c.id,c.position]));
});

test('compaction keeps ring cards clear and selection stable in both modes and every perspective',()=>{
 for(const mode of ['layered','flat']){let s=render(centreLayer(fresh(),catalog,'carob')).state;s.scene.mode=mode;const before=render(s),id='connections:carob',packed=render(compactLayer(before.state,id));readable(packed.scene,id);ledger(packed.scene);assert.deepEqual(packed.scene.cards.find(c=>c.id==='carob').position,before.scene.cards.find(c=>c.id==='carob').position);const selected=render({...packed.state,selected:'frost-risk'});assert.deepEqual(selected.scene.cards.map(c=>[c.id,c.position]),packed.scene.cards.map(c=>[c.id,c.position]));}
 for(const [perspective,view] of Object.entries(views)){const next=render(resultLayer({...fresh(),overview:false,perspective},catalog,view),view);for(const l of next.scene.layers)readable(next.scene,l.id);ledger(next.scene)}
});

test('source alignment includes research cards and manual layer movement survives compaction',()=>{
 let s=render(openGroupLayer(fresh(),catalog,'technology:irrigation')).state;s=openTopicLayer(s,catalog,'cocoon','root:technology:irrigation');const scene=buildLayerScene(overview,s,catalog,[{id:'alignment-task',status:'To research',context:{centre:'cocoon-reservoir'},custom_topics:'Research context'}]);aligned(scene,'group:browse:cocoon','cocoon');
 let next=rememberScene(s,scene),id='group:browse:cocoon',offset=next.layerView.layers[id].offsets.layered;next=render(moveLayer(next,id,{x:offset.x+240,y:offset.y-170})).state;const before=render(next),packed=render(compactLayer(before.state,id));assert.deepEqual(packed.state.layerView.layers[id].offsets,before.state.layerView.layers[id].offsets);assert.ok(packed.state.layerView.layers[id].manualOffsets.layered);assert.deepEqual(packed.scene.cards.filter(c=>c.layerId!==id).map(c=>[c.id,c.position]),before.scene.cards.filter(c=>c.layerId!==id).map(c=>[c.id,c.position]));
});


test('a changed scope compacts automatically, but existing saved views stay stable until Compact',()=>{
 const before=water(),id='root:technology:irrigation',changed=structuredClone(catalog),template=changed.topics.find(t=>t.id==='watering-hose');changed.topics.push({...template,id:'qa-extra-hose',label:'Additional test hose'});
 const scene=buildLayerScene(overview,before.state,changed,[]);assert.ok(scene.cards.some(c=>c.id==='qa-extra-hose'));readable(scene,id);assert.deepEqual(scene.layerView.layers[id].offsets,before.state.layerView.layers[id].offsets);assert.notDeepEqual(scene.layerView.layers[id].packing,before.state.layerView.layers[id].packing);
 const restored=rememberScene(before.state,scene),repeated=buildLayerScene(overview,{...restored,selected:'watering-hose'},changed,[]);assert.deepEqual(repeated.cards.map(c=>[c.id,c.position]),scene.cards.map(c=>[c.id,c.position]));
});


test('moving a source then reopening an automatic child restores source-axis alignment',()=>{
 let {state:s}=water();let opened=render(openTopicLayer(s,catalog,'cocoon','root:technology:irrigation')),id='group:browse:cocoon';s=render(closeLayer(opened.state,id)).state;const parent='root:technology:irrigation',offset=s.layerView.layers[parent].offsets.layered;s=render(moveLayer(s,parent,{x:offset.x+180,y:offset.y-90})).state;
 opened=render(openTopicLayer(s,catalog,'cocoon',parent));aligned(opened.scene,id,'cocoon');assert.ok(opened.state.layerView.layers[parent].manualOffsets.layered);
});

test('result arrangements restore their own manual position and packing metadata',()=>{
 let s={...fresh(),overview:false,perspective:'technology',search:'drone'},view=render(resultLayer(s,catalog,views.technology),views.technology),id='results:overview',offset=view.state.layerView.layers[id].offsets.layered;
 const moved=render(moveLayer(view.state,id,{x:offset.x+220,y:offset.y-90}),views.technology);s={...moved.state,perspective:'ecosystems',search:''};view=render(resultLayer(s,catalog,views.ecosystems),views.ecosystems);s={...view.state,perspective:'technology',search:'drone'};
 const back=render(resultLayer(s,catalog,views.technology),views.technology);assert.deepEqual(back.scene.cards.map(c=>[c.id,c.position]),moved.scene.cards.map(c=>[c.id,c.position]));assert.deepEqual(back.state.layerView.layers[id].manualOffsets,moved.state.layerView.layers[id].manualOffsets);assert.deepEqual(back.state.layerView.layers[id].packing,moved.state.layerView.layers[id].packing);
});


test('tripled layer spacing restores v5 snapshots without changing XY, camera, Flat caches or layer bands',()=>{
 assert.equal(PLANE_GAP,1560);assert.equal(MAX_CAMERA_DISTANCE,60000);
 let before=water();before=render(centreLayer(before.state,catalog,'cocoon'));const flat=render({...before.state,scene:{...before.state.scene,mode:'flat'}});before=render({...flat.state,scene:{...flat.state.scene,mode:'layered'}});
 const old=structuredClone(before.state),context=old.scene.contexts[before.scene.key],pose={position:{x:100,y:750,z:1900},target:{x:20,y:0,z:0},quaternion:[0,0,0,1],focalScale:900,reference:1800};context.cameras.layered=pose;old.scene.planeGap=520;for(const p of Object.values(context.homes))p.z/=3;
 const untouched=structuredClone(old),restored=render(normalizeExploration(old));assert.deepEqual(old,untouched);assert.equal(restored.state.scene.planeGap,1560);assert.deepEqual(restored.state.layerView.layers,old.layerView.layers);assert.deepEqual(restored.scene.context.cameras.layered,pose);
 for(const card of restored.scene.cards){const home=context.homes[card.id];assert.equal(card.position.x,home.x);assert.equal(card.position.y,home.y);assert.equal(card.position.z,home.z*3);if(card.plane===restored.scene.level)assert.equal(card.position.z-depthOrigin(restored.scene),0)}
 assert.deepEqual(render(restored.state).scene.cards.map(c=>c.position),restored.scene.cards.map(c=>c.position));const flatAgain=render({...restored.state,scene:{...restored.state.scene,mode:'flat'}});assert.deepEqual(flatAgain.scene.cards.map(c=>[c.id,c.position]),flat.scene.cards.map(c=>[c.id,c.position]));ledger(restored.scene);
});

test('legacy route and result fallback levels use the active spacing after depth migration',()=>{
 const route=focus.routes.find(r=>r.nodes.length>2),homes=Object.fromEntries(route.nodes.map((id,i)=>[id,{x:250*i,y:20,z:1040}])),old=normalizeExploration({...structuredClone(initialState),layoutVersion:4,centre:'carob',overview:false,perspective:'technology',search:'drone',resultsOpen:true,expandedRoutes:[route.id],scene:{version:4,mode:'layered',planeGap:520,focusOffset:120,presentation:'foreground',contexts:{'technology:carob:drone':{homes,flat:{},owners:{},planes:{},cameras:{},routes:{[route.id]:route}}}}});
 const next=ensureLayers(old,catalog);assert.equal(next.layerView.layers['route-layer:'+route.id].band,2);assert.equal(next.layerView.layers['results:carob'].band,2);assert.equal(next.scene.planeGap,1560);
});
