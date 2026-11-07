import React,{useEffect,useLayoutEffect,useState,useRef,type ReactNode,type RefObject} from 'react';
import {Rnd} from 'react-rnd';
import {APPEARANCE_KEY,PANEL_KEY,clampPanel,type ThemePreference,type Theme,type PanelBounds} from './appearance';
import {BOKEH_KEY,parseBokehPreference,type BokehPreference} from './bokeh';
import {EFFECTS_KEY,parseEffects,type BackgroundEffects} from './backgroundEffects';

export function useBackgroundEffects(){
 const [effects,setEffects]=useState<BackgroundEffects>(()=>{try{return parseEffects(localStorage.getItem(EFFECTS_KEY))}catch{return parseEffects(null)}});
 useEffect(()=>{try{localStorage.setItem(EFFECTS_KEY,JSON.stringify(effects))}catch{}},[effects]);return {effects,setEffects};
}

export function useBokeh(){
 const [preference,setPreference]=useState<BokehPreference>(()=>{try{return parseBokehPreference(localStorage.getItem(BOKEH_KEY))}catch{return 'subtle'}});
 useEffect(()=>{try{localStorage.setItem(BOKEH_KEY,preference)}catch{}},[preference]);return {preference,setPreference};
}

export function useAppearance(){
 const [preference,setPreference]=useState<ThemePreference>(()=>{try{const v=localStorage.getItem(APPEARANCE_KEY);if(v==='light'||v==='dark')return v}catch{}return 'system'});
 const [system,setSystem]=useState<Theme>(()=>matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
 const theme=preference==='system'?system:preference;
 useEffect(()=>{const q=matchMedia('(prefers-color-scheme: dark)');const changed=()=>setSystem(q.matches?'dark':'light');q.addEventListener('change',changed);return()=>q.removeEventListener('change',changed)},[]);
 useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem(APPEARANCE_KEY,preference)}catch{}document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#131d1a':'#f4f2eb')},[theme,preference]);
 return {preference,setPreference,theme};
}

export function useFullScreen(message:(text:string)=>void){
 const [fullscreen,setFullscreen]=useState(()=>!!document.fullscreenElement);
 useEffect(()=>{const change=()=>setFullscreen(!!document.fullscreenElement);const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&document.fullscreenElement)document.exitFullscreen().catch(()=>{})};document.addEventListener('fullscreenchange',change);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('fullscreenchange',change);document.removeEventListener('keydown',escape)}},[]);
 const toggle=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.fullscreenEnabled&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw new Error('unsupported')}catch{message('Full screen is unavailable in this window. Open the local app in Edge or Chrome and try again. Your view is preserved.')}};
 return {fullscreen,toggle};
}

export function FloatingDetails({workspace,title,contentKey,close,children}:{workspace:RefObject<HTMLDivElement|null>;title:string;contentKey?:string;close:()=>void;children:ReactNode}){
 const scroll=useRef<HTMLDivElement>(null);useLayoutEffect(()=>{if(scroll.current)scroll.current.scrollTop=0},[title,contentKey]);
 const [size,setSize]=useState({width:800,height:600});
 const [bounds,setBounds]=useState<PanelBounds|undefined>(()=>{try{return JSON.parse(localStorage.getItem(PANEL_KEY)||'null')||undefined}catch{return undefined}});
 useLayoutEffect(()=>{const el=workspace.current;if(!el)return;const update=()=>{const box=el.getBoundingClientRect();if(box.width<1||box.height<1)return;setSize({width:box.width,height:box.height})};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()},[workspace]);
 useEffect(()=>{if(bounds)try{localStorage.setItem(PANEL_KEY,JSON.stringify(bounds))}catch{}},[bounds]);
 // Viewport clamping is temporary; only a user move/resize/reset changes preferred bounds.
 const rect=clampPanel(bounds,size.width,size.height);
 const reset=()=>setBounds(clampPanel(undefined,size.width,size.height));
 const keyboard=(event:React.KeyboardEvent,resize=false)=>{const delta:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};const d=delta[event.key];if(!d)return;event.preventDefault();event.stopPropagation();setBounds(clampPanel(resize||event.shiftKey?{...rect,width:rect.width+d[0],height:rect.height+d[1]}:{...rect,x:rect.x+d[0],y:rect.y+d[1]},size.width,size.height))};
 return <div className="floating-layer"><Rnd bounds="parent" className="floating-details" position={{x:rect.x,y:rect.y}} size={{width:rect.width,height:rect.height}} minWidth={Math.min(300,size.width-16)} minHeight={Math.min(240,size.height-16)} maxWidth={size.width-16} maxHeight={size.height-16} dragHandleClassName="details-drag-handle" cancel="button,select,input,a" onDragStop={(_,data)=>setBounds(clampPanel({...rect,x:data.x,y:data.y},size.width,size.height))} onResizeStop={(_,__,el,___,position)=>setBounds(clampPanel({...position,width:el.offsetWidth,height:el.offsetHeight},size.width,size.height))} resizeHandleComponent={{bottomRight:<span className="panel-resize-key" role="button" tabIndex={0} aria-label="Resize details panel with arrow keys" onKeyDown={e=>keyboard(e,true)}>◢</span>}}>
  <section role="dialog" aria-modal="false" aria-label={'Details: '+title} className="floating-details-content" onPointerDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
   <div className="details-drag-handle"><span role="button" tabIndex={0} aria-label="Move details panel with arrow keys; Shift and arrow keys resize" onKeyDown={e=>keyboard(e)} title="Drag to move · arrow keys move · Shift + arrows resize">⠿ {title}</span><button onClick={reset} aria-label="Reset details panel position" title="Reset position and size">↺</button><button onClick={close} aria-label="Close details panel">×</button></div>
   <div ref={scroll} className="floating-details-scroll inspector">{children}</div>
  </section>
 </Rnd></div>;
}
