import cytoscape, {type Core,type ElementDefinition} from 'cytoscape';
import {COLORS,GROUP_LABELS,landscapeGroup,type Catalog,type State,type View,type Item,type Point,type Route} from './types.ts';
import {palettes,type Theme} from './appearance.ts';

export function graphStyleFor(theme:Theme){const p=palettes[theme];return [
 {selector:'node',style:{'background-color':(n:any)=>(p.fills as Record<string,string>)[n.data('domain')]||p.fills.other,'label':'data(label)','shape':'round-rectangle','width':200,'height':84,'color':p.text,'font-size':22,'font-family':'Segoe UI, sans-serif','text-wrap':'wrap','text-max-width':185,'text-valign':'center','text-halign':'center','border-width':1.5,'border-color':'data(color)','background-opacity':1,'padding':7,'z-compound-depth':'top','z-index':10}},
 {selector:'node[isGroup]',style:{'width':250,'height':110,'font-size':24,'font-weight':600,'text-max-width':230,'background-opacity':1,'border-width':1.5}},
 {selector:'node:parent',style:{'background-opacity':.15,'border-style':'dashed','border-width':1,'text-valign':'top','text-margin-y':-10,'padding':28,'font-size':19,'z-compound-depth':'bottom','z-index':0}},
 {selector:'node[isDomain]',style:{'background-opacity':0,'border-width':0,'font-size':26,'font-weight':600,'text-valign':'top','padding':38,'text-margin-y':-18,'z-compound-depth':'bottom'}},
 {selector:'node[isLandmark], node[kind="lane"]',style:{'width':185,'height':42,'font-size':18,'background-opacity':1,'border-style':'dashed','border-width':1,'text-valign':'center','text-margin-y':0,'padding':7}},
 {selector:'node.centre',style:{'background-color':p.centre,'background-opacity':1,'border-width':3,'border-color':p.active,'font-weight':700,'width':210,'height':78}},
 {selector:'node.focus',style:{'overlay-color':p.selected,'overlay-opacity':.12,'overlay-padding':8,'border-color':p.selected,'border-width':3}},
 {selector:'node.match',style:{'border-width':3,'border-color':theme==='dark'?'#efc16f':'#a6751a'}},
 {selector:'node.missing',style:{'border-style':'dashed'}},
 {selector:'node.marker',style:{'border-style':'dashed','background-opacity':1,'font-size':14,'color':p.marker,'border-color':p.marker}},
 {selector:'node.muted',style:{'color':p.muted,'border-color':p.border}},
 {selector:'node.new',style:{'border-color':'#36868b','border-width':4,'overlay-color':'#8dd0bc','overlay-opacity':.15,'overlay-padding':6}},
 {selector:'edge',style:{'curve-style':'bezier','line-color':p.edge,'target-arrow-color':p.edge,'target-arrow-shape':'triangle','arrow-scale':.8,'width':1.5,'label':'data(label)','font-size':16,'color':p.muted,'text-background-color':p.label,'text-background-opacity':1,'text-background-padding':4,'text-rotation':'none','text-margin-y':-9,'text-wrap':'ellipsis','text-max-width':190,'overlay-padding':7,'z-compound-depth':'orphan','z-index':1}},
 {selector:'edge.abbreviated',style:{'line-style':'dashed','target-arrow-shape':'none','font-size':18}},
 {selector:'edge.curated',style:{'line-style':'dotted'}},
 {selector:'edge.aggregate',style:{'target-arrow-shape':'none','width':2,'line-opacity':.65,'font-size':16,'label':''}},
 {selector:'edge.gap',style:{'line-style':'dotted','target-arrow-shape':'none'}},
 {selector:'edge.context',style:{'line-opacity':.18,'opacity':.65,'label':'','width':1,'events':'yes'}},
 {selector:'edge.active, edge:selected',style:{'curve-style':'straight','width':3,'line-opacity':1,'opacity':1,'line-color':p.active,'target-arrow-color':p.active,'label':'data(label)','color':p.text,'z-index':3}},
 {selector:'edge.routed',style:{'curve-style':'round-segments','edge-distances':'node-position','segment-weights':(e:any)=>e.data('routeWeights'),'segment-distances':(e:any)=>e.data('routeDistances'),'segment-radii':8,'radius-type':'influence-radius'}},
];}
export const graphStyle:any[]=graphStyleFor('light');

export function positionKey(s:State){return s.perspective+(s.overview?':overview:'+s.expandedGroups.slice().sort().join('|')+':'+JSON.stringify(s.groupLimits):':focus:'+s.centre)}
const key=positionKey;
export const atMinimumZoom=(zoom:number,minimum:number)=>zoom<=minimum*1.001;
export function capture(cy:Core,s:State):State{
 const positions={...s.positions};cy.nodes().filter(n=>!n.isParent()).forEach(n=>{positions[key(s)+':'+n.id()]={...n.position()};if(n.data('kind')==='group')positions[s.perspective+':closed:'+n.id()]={...n.position()}});
 return {...s,positions,camera:{zoom:cy.zoom(),pan:{...cy.pan()},reference:s.camera?.reference||cy.zoom()}};
}
export {projectKnowledge as buildElements} from './projection.ts';

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
 for(const el of nodes){const n=cy.getElementById(String(el.data.id));if(n.isParent()||!el.position)continue;n.stop(true,false);if(animate)n.animate({position:el.position},{duration:300,queue:false});else n.position(el.position)}
}

export function newGraph(container:HTMLElement){return cytoscape({container,elements:[],style:graphStyle,layout:{name:'preset'},minZoom:.08,maxZoom:2.5,boxSelectionEnabled:false,autoungrabify:true})}
