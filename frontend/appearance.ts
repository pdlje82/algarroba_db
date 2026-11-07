export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';
export type PanelBounds = {x:number;y:number;width:number;height:number};
export const APPEARANCE_KEY = 'kgb:appearance:v1';
export const PANEL_KEY = 'kgb:details-panel:v1';

export const palettes = {
 light: {text:'#203d32',muted:'#59695f',canvas:'#fcfbf7',edge:'#87988d',active:'#295e45',label:'#fcfbf7',centre:'#f3e6c9',selected:'#287e91',marker:'#657181',border:'#8c9e90',mini:'#aab8ad',viewport:'#355d43',fills:{ecosystem:'#e5eee5',technology:'#e2eef2',funding:'#f6ead4',source:'#eee6f4',comparison:'#e5ecf3',other:'#e9eee7'}},
 dark: {text:'#e3eee6',muted:'#b0c3b6',canvas:'#131d1a',edge:'#93ab9c',active:'#a5e7ba',label:'#1d2b25',centre:'#594a28',selected:'#83d3e5',marker:'#b4c4d8',border:'#7b9987',mini:'#597466',viewport:'#b3dec0',fills:{ecosystem:'#293f32',technology:'#253e49',funding:'#493d29',source:'#3d3049',comparison:'#2e3b4b',other:'#2e3b32'}}
};

/** A presentation cue, stable across ordering, grouping and restarts; not a topic category. */
export function layerAppearance(id:string,theme:Theme){
 let hash=2166136261;for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 const hue=id==='overview'?155:(hash>>>0)%360;
 return {tint:`hsl(${hue}, 48%, ${theme==='dark'?68:42}%)`,opacity:theme==='dark'?.045:.035,hoverOpacity:theme==='dark'?.085:.075};
}

export function clampPanel(value:PanelBounds|undefined,width:number,height:number):PanelBounds {
 const margin=8,availableW=Math.max(1,width-margin*2),availableH=Math.max(1,height-margin*2);
 const valid=value && Object.values(value).every(Number.isFinite) && value.width>0 && value.height>0;
 const w=Math.min(availableW,Math.max(Math.min(300,availableW),valid?value.width:420));
 const h=Math.min(availableH,Math.max(Math.min(240,availableH),valid?value.height:560));
 return {x:Math.max(margin,Math.min(valid?value.x:width-w-margin,width-w-margin)),y:Math.max(margin,Math.min(valid?value.y:margin,height-h-margin)),width:w,height:h};
}
