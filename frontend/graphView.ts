import cytoscape, {type Core,type ElementDefinition} from 'cytoscape';
import {COLORS,GROUP_LABELS,landscapeGroup,type Catalog,type State,type View,type Item,type Point,type Route} from './types.ts';

export const graphStyle:any[]=[
 {selector:'node',style:{'background-color':'data(color)','label':'data(label)','shape':'round-rectangle','width':200,'height':70,'color':'#203d32','font-size':22,'font-family':'Segoe UI, sans-serif','text-wrap':'wrap','text-max-width':185,'text-valign':'center','text-halign':'center','border-width':1.5,'border-color':'data(color)','background-opacity':.12,'padding':7}},
 {selector:'node[isGroup]',style:{'width':250,'height':110,'font-size':26,'font-weight':600,'text-max-width':230,'background-opacity':.13,'border-width':1.5}},
 {selector:'node:parent',style:{'background-opacity':.045,'border-style':'dashed','border-width':1,'text-valign':'top','text-margin-y':-8,'padding':24,'font-size':18}},
 {selector:'node[isDomain]',style:{'background-opacity':.025,'border-width':0,'font-size':26,'font-weight':600,'text-valign':'top','padding':30,'text-margin-y':-12}},
 {selector:'node[isLandmark]',style:{'width':170,'height':40,'font-size':20,'background-opacity':.055,'border-style':'dashed','border-width':1,'text-valign':'center','text-margin-y':0,'padding':7}},
 {selector:'node.centre',style:{'background-color':'#f3e6c9','background-opacity':1,'border-width':3,'border-color':'#355d43','font-weight':700,'width':210,'height':78}},
 {selector:'node.focus',style:{'overlay-color':'#9db48a','overlay-opacity':.18,'overlay-padding':8,'border-width':3}},
 {selector:'node.match',style:{'border-width':3,'border-color':'#d39a33'}},
 {selector:'node.missing',style:{'border-style':'dashed','background-opacity':.04}},
 {selector:'node.marker',style:{'border-style':'dashed','background-opacity':0,'font-size':12,'color':'#6c7481','border-color':'#89939d'}},
 {selector:'node.muted',style:{'opacity':.52}},
 {selector:'node.new',style:{'border-color':'#36868b','border-width':4,'overlay-color':'#8dd0bc','overlay-opacity':.15,'overlay-padding':6}},
 {selector:'edge',style:{'curve-style':'bezier','line-color':'#9aa99f','target-arrow-color':'#9aa99f','target-arrow-shape':'triangle','arrow-scale':.7,'width':1.5,'label':'data(label)','font-size':16,'color':'#53655a','text-background-color':'#f7f5ef','text-background-opacity':.96,'text-background-padding':3,'text-rotation':'autorotate','text-margin-y':-8,'text-wrap':'ellipsis','text-max-width':180,'overlay-padding':7}},
 {selector:'edge.abbreviated',style:{'line-style':'dashed','line-color':'#7d9381','target-arrow-shape':'none','font-size':20}},
 {selector:'edge.curated',style:{'line-style':'dotted','line-color':'#b18d55','target-arrow-color':'#b18d55'}},
 {selector:'edge.aggregate',style:{'target-arrow-shape':'none','width':2,'line-opacity':.6,'font-size':18}},
 {selector:'edge.gap',style:{'line-style':'dotted','target-arrow-shape':'none','line-color':'#b4b5b1','color':'#898c85'}},
 {selector:'edge:selected',style:{'width':3,'line-color':'#365c44'}},
];

function key(s:State){return s.perspective+(s.overview?':overview:'+s.expandedGroups.slice().sort().join('|')+':'+JSON.stringify(s.groupLimits):':focus:'+s.centre)}
export function capture(cy:Core,s:State):State{
 const positions={...s.positions};cy.nodes().filter(n=>!n.isParent()).forEach(n=>{positions[key(s)+':'+n.id()]={...n.position()}});
 return {...s,positions,camera:{zoom:cy.zoom(),pan:{...cy.pan()},reference:s.camera?.reference||cy.zoom()}};
}
function dated(item:Item){return item.dates?.map(x=>x.value).filter(Boolean).sort()[0]||'Undated'}
function dateBucket(item:Item){const value=dated(item);return value==='Undated'?value:value.slice(0,4)}

export function buildElements(view:View,s:State,catalog:Catalog,tasks:any[]){
 const all=new Map([...catalog.topics,...view.nodes].map(n=>[n.id,n]));
 const nodeMap=new Map(view.nodes.map(n=>[n.id,n]));
 const elements:ElementDefinition[]=[];const positions:Record<string,Point>={};const rendered=new Set<string>();
 const actualByDisplay:Record<string,string>={};const edgeIds=new Set<string>();let budgetNotice='';
 const add=(item:Item,point:Point,extra:any={},classes='')=>{
  if(rendered.has(item.id))return;rendered.add(item.id);
  const saved=s.positions[key(s)+':'+item.id];let placed=saved||point;
  if(!saved&&!s.overview&&item.id!==s.centre&&!['landmark','lane','research'].includes(item.kind)){
   const occupied=Object.entries(positions).filter(([id])=>!id.startsWith('lane:')&&!id.startsWith('domain:')).map(([,p])=>p);
   const free=(p:Point)=>!occupied.some(o=>Math.abs(o.x-p.x)<235&&Math.abs(o.y-p.y)<110);
   if(!free(placed))for(let i=0;i<180;i++){const radius=85*(1+Math.floor(i/12));const angle=(i%12)/12*Math.PI*2;const candidate={x:point.x+Math.cos(angle)*radius,y:point.y+Math.sin(angle)*radius};if(free(candidate)){placed=candidate;break}}
  }
  positions[item.id]=placed;
  elements.push({group:'nodes',data:{...item,color:COLORS[item.domain]||'#6d8776',...extra},position:positions[item.id],classes:[classes,item.id===s.centre?'centre':'',item.id===s.selected?'focus':'',item.matched?'match':'',item.missing?'missing':''].join(' ')});
 };
 const addEdge=(edge:any)=>{if(!rendered.has(edge.source)||!rendered.has(edge.target)||edgeIds.has(edge.id))return;edgeIds.add(edge.id);elements.push({group:'edges',data:{...edge},classes:[edge.basis==='curated'?'curated':'',edge.record_type==='gap'?'gap':'',edge.record_type==='aggregate'?'aggregate':'',edge.record_type==='abbreviated'?'abbreviated':''].join(' ')})};
 if(s.overview || !s.centre){
  const groups=new Map<string,Item[]>();
  for(const item of view.nodes){
   let grouping=item.group_id||'other';
   if(s.perspective==='places')grouping=item.kind==='place'?'Place names':(item.place_ids?.[0] ? all.get(item.place_ids[0])?.label||item.place_ids[0] : 'Place not recorded');
   if(s.perspective==='time')grouping=dateBucket(item);
   if(s.perspective==='hierarchy')grouping=item.group_id||item.kind;
   const gid=(s.perspective==='places'||s.perspective==='time')?'context:'+grouping:s.perspective==='hierarchy'?item.domain+':'+grouping:landscapeGroup(item);
   if(!groups.has(gid))groups.set(gid,[]);groups.get(gid)!.push(item);
  }
  const domains=[...new Set([...groups.keys()].map(g=>g.split(':')[0]))].sort((a,b)=>['ecosystem','technology','funding','source','context'].indexOf(a)-['ecosystem','technology','funding','source','context'].indexOf(b));
  let count=0;
  for(const [di,domain] of domains.entries()){
   const domainId='domain:'+domain;
   add({id:domainId,label:domain==='context'?(s.perspective==='time'?'Recorded dates':'Places'):({ecosystem:'Ecosystems',technology:'Technology',funding:'Funding',source:'Sources'}[domain]||domain),kind:'domain',domain}, {x:di*640,y:0},{isDomain:true});
   const preferred=['species','habitats','restoration-methods','irrigation','drones','monitoring','programmes','activities','requirements'];
   const domainGroups=[...groups.entries()].filter(([g])=>g.startsWith(domain+':')).sort(([a],[b])=>(preferred.indexOf(a.split(':')[1])<0?99:preferred.indexOf(a.split(':')[1]))-(preferred.indexOf(b.split(':')[1])<0?99:preferred.indexOf(b.split(':')[1]))||a.localeCompare(b));
   let displacement=0;
   for(const [gi,[gid,members]] of domainGroups.entries()){
    const label=GROUP_LABELS[gid.split(':').slice(1).join(':')]||gid.split(':').slice(1).join(':').replaceAll('-',' ');
    const p={x:di*450,y:gi*350+displacement};
    const groupId='group:'+gid;const expanded=s.expandedGroups.includes(gid);const limit=s.groupLimits[gid]||6;
    const prioritized=[...members].sort((a,b)=>Number(b.id===s.centre)-Number(a.id===s.centre)||Number(!!b.matched)-Number(!!a.matched)||a.label.localeCompare(b.label));
    const childBudget=120-groups.size*2-domains.length-5;
    const canExpand=expanded&&count+Math.min(members.length,limit)<=childBudget;
    const emphasis={ecosystems:'ecosystem',technology:'technology',funding:'funding'}[s.perspective];
    const containsCentre=members.some(t=>t.id===s.centre);
    const groupLabel=canExpand?`${label} · ${members.length}`:`${label}\n${members.length} topics${containsCentre?' · '+all.get(s.centre!)?.label:''}${members.some(t=>t.matched)?' · search match':''}`;
    add({id:groupId,label:groupLabel,kind:'group',domain,description:`${members.length} topics. Open this group to explore.`,groupKey:gid},p,{isGroup:true,parent:domainId},emphasis&&domain!==emphasis?'muted':'');
    if(canExpand){
     const shown=prioritized.slice(0,limit);
     shown.forEach((t,i)=>{add(t,{x:p.x+(i%2)*230-115,y:p.y-90+Math.floor(i/2)*95}, {parent:groupId});actualByDisplay[t.id]=t.id;count++});
     displacement+=Math.max(0,Math.ceil(shown.length/2)*95+65-350);
     if(shown.length<members.length){
      const moreId='more:'+gid;add({id:moreId,label:`More ${label.toLowerCase()}\n${members.length-shown.length} remaining`,kind:'more',domain,groupKey:gid},{x:p.x,y:p.y-90+Math.ceil(shown.length/2)*95},{parent:groupId});
     }
     members.filter(t=>!shown.includes(t)).forEach(t=>actualByDisplay[t.id]=groupId);
    }else{
     members.forEach(t=>actualByDisplay[t.id]=groupId);if(expanded)budgetNotice='The canvas limit is reached. Collapse another group to reveal this group completely.';
    }
   }
  }
  const aggregated=new Map<string,any>();
  for(const e of view.edges){
   const a=actualByDisplay[e.source],b=actualByDisplay[e.target];if(!a||!b||a===b)continue;
   if(a===e.source&&b===e.target){addEdge(e);continue}
   const sorted=[a,b].sort();const id='aggregate:'+sorted.join('|');
   if(!aggregated.has(id))aggregated.set(id,{id,source:sorted[0],target:sorted[1],label:'',record_type:'aggregate',constituent_ids:[]});
   aggregated.get(id).constituent_ids.push(e.id);
  }
  for(const edge of aggregated.values()){edge.label=`${edge.constituent_ids.length} recorded connection${edge.constituent_ids.length===1?'':'s'}`;addEdge(edge)}
 }else{
  const centre=nodeMap.get(s.centre)||all.get(s.centre);
  const anchor=s.positions[key(s)+':'+s.centre]||{x:0,y:0};if(centre)add(centre,anchor);
  for(const [i,domain] of ['ecosystem','technology','funding'].entries())add({id:'domain:'+domain,label:({ecosystem:'Ecosystems',technology:'Technology',funding:'Funding'}[domain]||domain),kind:'landmark',domain,description:'A stable overview landmark. Open to return to this area.'},{x:anchor.x+(i-1)*450,y:anchor.y-570},{isLandmark:true});
  const routes=[...view.routes,...s.alternatives];
  const branchEdges=new Set(view.edges.filter(e=>e.record_type==='branch').map(e=>e.id));
  const active=routes.filter(r=>s.detail==='full'||s.expandedRoutes.includes(r.id)||r.edges.every(e=>branchEdges.has(e)));
  const visible=new Set<string>([s.centre]);routes.forEach(r=>visible.add(r.endpoint));active.forEach(r=>r.nodes.forEach(n=>visible.add(n)));
  for(const n of view.nodes)if(n.missing||n.record_type!=='topic'||n.perspective_support)visible.add(n.id);
  if(['comparison','sources'].includes(s.perspective))view.nodes.forEach(n=>visible.add(n.id));
  const endpointPositions:Record<string,Point>={};
  routes.forEach((route,i)=>{const angle=(i%12)/12*Math.PI*2-Math.PI/2;const radius=430+Math.floor(i/12)*260;endpointPositions[route.endpoint]={x:anchor.x+Math.cos(angle)*radius,y:anchor.y+Math.sin(angle)*radius}});
  const mid:Record<string,Point[]>={};
  for(const route of active){const end=s.positions[key(s)+':'+route.endpoint]||endpointPositions[route.endpoint];if(!end)continue;route.nodes.slice(1,-1).forEach((id,i)=>{const f=(i+1)/(route.nodes.length-1);(mid[id]||=[]).push({x:anchor.x+(end.x-anchor.x)*f,y:anchor.y+(end.y-anchor.y)*f})})}
  let index=0;
  for(const id of visible){
   if(id===s.centre)continue;const item=nodeMap.get(id)||all.get(id);if(!item)continue;
   let pos=endpointPositions[id]||{x:anchor.x+Math.cos(index*2.4)*550,y:anchor.y+Math.sin(index++*2.4)*420};
   if(mid[id])pos={x:mid[id].reduce((a,p)=>a+p.x,0)/mid[id].length,y:mid[id].reduce((a,p)=>a+p.y,0)/mid[id].length};
   if(['hierarchy','places','time','conditions','comparison','sources'].includes(s.perspective)){
    let lane=0;let row=0;
    const items=[...visible].map(i=>nodeMap.get(i)||all.get(i)).filter(Boolean) as Item[];
    const laneFor=(n:Item)=>s.perspective==='places'?(n.kind==='place'?n.label:(n.place_ids?.[0]?all.get(n.place_ids[0])?.label||n.place_ids[0]:'Place not recorded')):s.perspective==='time'?dateBucket(n):s.perspective==='sources'?(n.record_type||'topic'):s.perspective==='comparison'?(n.kind==='aspect'?'Comparison aspects':'Methods'):s.perspective==='conditions'?(n.kind==='condition'?'Conditions':n.kind==='equipment'?'Components':'Connected topics'):(n.group_id||n.kind);
    const lanes=[...new Set(items.map(laneFor))].sort();lane=lanes.indexOf(laneFor(item));row=items.filter(n=>laneFor(n)===laneFor(item)).findIndex(n=>n.id===id);
    const laneCount=lanes.length;const rows=items.filter(n=>laneFor(n)===laneFor(item)).length;const cols=laneCount<=3&&rows>6?2:1;
    pos={x:anchor.x+290+lane*(cols===2?460:280)+(row%cols)*220,y:anchor.y+(Math.floor(row/cols)-1)*110};
    const labelId='lane:'+laneFor(item);
    if(!rendered.has(labelId))add({id:labelId,label:(GROUP_LABELS[laneFor(item)]||laneFor(item)).replaceAll('_',' '),kind:'lane',domain:item.domain,description:'Arrangement label; this is not a factual relationship.'},{x:pos.x,y:anchor.y-240},{isGroup:true});
   }
   add(item,pos);
  }
  const fullEdgeIds=new Set(active.flatMap(r=>r.edges));
  const validEdges=new Map([...catalog.relationships,...view.edges].map(e=>[e.id,e]));
  for(const route of routes){
   if(active.includes(route)){route.edges.forEach(e=>{const edge=validEdges.get(e);if(edge&&!elements.some(x=>x.data.id===edge.id))addEdge(edge)})}
   else if(route.edges.length===1){const e=validEdges.get(route.edges[0]);if(e)addEdge({...e,route_id:route.id})}
   else addEdge({id:route.id,source:s.centre,target:route.endpoint,label:`via ${route.nodes.length-2} topic${route.nodes.length===3?'':'s'}`,record_type:'abbreviated',route_id:route.id,explanation:route.why});
  }
  if(['sources','comparison','time'].includes(s.perspective))view.edges.filter(e=>e.record_type!=='relationship').forEach(addEdge);
  view.edges.filter(e=>e.record_type==='branch').forEach(addEdge);
  // Preserve actual cross-links between visible intermediates and additional memberships.
  if(s.detail==='full'||['hierarchy','conditions','places','time'].includes(s.perspective))view.edges.filter(e=>visible.has(e.source)&&visible.has(e.target)&&!fullEdgeIds.has(e.id)).forEach(e=>{if(!elements.some(x=>x.data.id===e.id))addEdge(e)});
 }
 if(s.markers){
  const pending=tasks.filter(t=>t.status!=='Completed').filter(t=>!s.centre||t.context?.centre===s.centre).slice(0,5);
  pending.forEach((task,i)=>{
   const base=positions[s.centre||'']||{x:0,y:0};const id='research:'+task.id;
   add({id,label:`To research\n${task.custom_topics||task.instruction}`,kind:'research',domain:'research',description:task.prompt,task_id:task.id},{x:base.x-260,y:base.y+150+i*85},{},'marker');
   const attach=rendered.has(task.context?.centre)?task.context.centre:actualByDisplay[task.context?.centre];if(attach)addEdge({id:'indication:'+task.id,source:attach,target:id,label:'Investigate connection',record_type:'gap'});
  });
 }
 return {elements,positions,budgetNotice};
}

export function updateGraph(cy:Core,elements:ElementDefinition[],animate:boolean){
 const incoming=new Set(elements.map(e=>String(e.data.id)));
 cy.startBatch();
 cy.elements().filter(e=>!incoming.has(e.id())).remove();
 const nodes=elements.filter(e=>e.group==='nodes');const edges=elements.filter(e=>e.group==='edges');
 for(const el of nodes){
  const current=cy.getElementById(String(el.data.id));
  if(current.empty())cy.add(el);
  else{for(const name of Object.keys(current.data()))if(!(name in el.data)&&!['id','parent'].includes(name))current.removeData(name);current.data(el.data);current.classes(el.classes||'');const parent=el.data.parent||null;if(current.parent()[0]?.id()!==parent&&!(current.parent().empty()&&parent===null))current.move({parent});}
 }
 for(const el of edges){const current=cy.getElementById(String(el.data.id));if(current.empty())cy.add(el);else{if(current.data('source')!==el.data.source||current.data('target')!==el.data.target)current.move({source:el.data.source,target:el.data.target});for(const name of Object.keys(current.data()))if(!(name in el.data)&&!['id','source','target'].includes(name))current.removeData(name);current.data(el.data);current.classes(el.classes||'')}}
 cy.endBatch();
 for(const el of nodes){const n=cy.getElementById(String(el.data.id));if(n.isParent()||!el.position)continue;if(animate)n.animate({position:el.position},{duration:300,queue:false});else n.position(el.position)}
}

export function newGraph(container:HTMLElement){return cytoscape({container,elements:[],style:graphStyle,layout:{name:'preset'},minZoom:.08,maxZoom:2.5,boxSelectionEnabled:false,autoungrabify:true})}
