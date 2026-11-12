import { useEffect, useRef, useState } from 'react';
import { DEFAULT_INSPECTOR_WIDTH, inspectorLimits, inspectorWidth } from './sidebarLayout';

const WIDTH_KEY = 'kgb:inspector:width:v1';
export function useSidebarLayout(fit: () => void) {
  const [viewport, setViewport] = useState(window.innerWidth);
  const [preferred, setPreferred] = useState(() => {try {const n = Number(localStorage.getItem(WIDTH_KEY)); return Number.isFinite(n) && n >= 300 ? n : DEFAULT_INSPECTOR_WIDTH;} catch {return DEFAULT_INSPECTOR_WIDTH;}});
  const [inspectorOpen, setInspectorOpen] = useState(window.innerWidth >= 850);
  const [navigationOpen, setNavigationOpen] = useState(false), [resizing, setResizing] = useState(false);
  const drag = useRef<{x: number; width: number; preferred: number; pointer: number} | null>(null);
  const width = inspectorWidth(preferred, viewport), limits = inspectorLimits(viewport);
  const fitRef = useRef(fit); fitRef.current = fit;
  useEffect(() => {const resize = () => setViewport(window.innerWidth); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);}, []);
  useEffect(() => {try {localStorage.setItem(WIDTH_KEY, String(preferred));} catch {}}, [preferred]);
  const showInspector = () => {setInspectorOpen(true); if (viewport < 1200) setNavigationOpen(false); if(viewport >= 850) settle();};
  const showNavigation = () => {setNavigationOpen(true); if (viewport < 850) setInspectorOpen(false);};
  const closeDrawers = () => {setNavigationOpen(false); if (viewport < 850) setInspectorOpen(false);};
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if(e.key !== 'Escape')return;
      if(drag.current){setPreferred(drag.current.preferred);drag.current=null;setResizing(false);requestAnimationFrame(()=>fitRef.current());return;}
      setNavigationOpen(false); if(viewport < 850)setInspectorOpen(false);
    };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [viewport]);
  // Crossing into the phone layout never opens two drawers at once.
  useEffect(() => {if (viewport < 850) setNavigationOpen(false);}, [viewport < 850]);
  const drawer = navigationOpen && viewport < 1200 ? 'knowledge-navigation' : inspectorOpen && viewport < 850 ? 'topic-inspector' : null;
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = document.getElementById(drawer);
    const backgrounds = [...document.querySelectorAll<HTMLElement>('.masthead, .main-workspace, ' + (drawer === 'knowledge-navigation' ? '#topic-inspector' : '#knowledge-navigation'))];
    const inertBefore = backgrounds.map(el => el.inert);
    backgrounds.forEach(el => {el.inert = true;});
    const selector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]';
    const controls = () => [...(panel?.querySelectorAll<HTMLElement>(selector) || [])].filter(el => el.offsetParent !== null);
    controls()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if(e.key !== 'Tab')return;
      const elements = controls().filter(el => el.tabIndex >= 0), first = elements[0], last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last?.focus();}
      else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first?.focus();}
    };
    document.addEventListener('keydown', trap);
    return () => {document.removeEventListener('keydown', trap); backgrounds.forEach((el,i) => {el.inert = inertBefore[i];}); if(previous?.isConnected)previous.focus();};
  }, [drawer]);
  const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => fitRef.current()));
  return {width, inspectorOpen, navigationOpen, resizing, viewport, showInspector, showNavigation, closeDrawers,
    closeInspector: () => {setInspectorOpen(false); settle();},
    closeNavigation: () => setNavigationOpen(false),
    separator: {
      role: 'separator' as const, tabIndex: 0, 'aria-label': 'Resize topic inspector', 'aria-orientation': 'vertical' as const,
      'aria-controls': 'topic-inspector',
      'aria-valuemin': limits.min, 'aria-valuemax': Math.floor(limits.max), 'aria-valuenow': Math.round(width),
      onDoubleClick: () => {setPreferred(DEFAULT_INSPECTOR_WIDTH); settle();},
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {if(e.button !== 0)return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = {x: e.clientX, width, preferred, pointer: e.pointerId}; setResizing(true);},
      onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {const start = drag.current; if(start && start.pointer === e.pointerId) setPreferred(inspectorWidth(start.width + start.x - e.clientX, viewport));},
      onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {if (!drag.current)return; drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); setResizing(false); settle();},
      onPointerCancel: () => {if(drag.current)setPreferred(drag.current.preferred); drag.current = null; setResizing(false); settle();},
      onLostPointerCapture: () => {if(!drag.current)return; setPreferred(drag.current.preferred);drag.current=null;setResizing(false);settle();},
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && drag.current) {setPreferred(drag.current.preferred); drag.current = null; setResizing(false); settle();}
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
        e.preventDefault(); setPreferred(e.key === 'Home' ? limits.min : e.key === 'End' ? limits.max : inspectorWidth(width + (e.key === 'ArrowLeft' ? 20 : -20), viewport)); settle();
      },
    },
  };
}
