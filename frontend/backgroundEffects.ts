export type BackgroundEffects={blur:boolean;darken:boolean;darkenAmount:number;transparency:boolean};
export const EFFECTS_KEY='kgb:background-effects:v1';
export const DEFAULT_EFFECTS:BackgroundEffects={blur:false,darken:true,darkenAmount:.25,transparency:true};
export function parseEffects(raw:string|null):BackgroundEffects{
 try{const value=JSON.parse(raw||'null');if(value&&typeof value==='object')return {blur:typeof value.blur==='boolean'?value.blur:false,darken:typeof value.darken==='boolean'?value.darken:true,darkenAmount:Number.isFinite(value.darkenAmount)?Math.min(.6,Math.max(0,value.darkenAmount)):.25,transparency:typeof value.transparency==='boolean'?value.transparency:true}}catch{}return {...DEFAULT_EFFECTS};
}
export const effectsEnabled=(effects:BackgroundEffects,mode:string,level:number)=>mode==='layered'&&level>0&&(effects.blur||effects.darken||effects.transparency);
