/** Hover is independent of card/link picking and never edits exploration state. */
export class LayerHover{
 current:number|null=null;
 private pending:number|null=null;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private change:(level:number|null)=>void;
 private timers:{set:typeof setTimeout;clear:typeof clearTimeout};
 constructor(change:(level:number|null)=>void,timers={set:setTimeout,clear:clearTimeout}){this.change=change;this.timers=timers}
 point(level:number|null){
  if(level===this.current){this.cancel();return}if(this.timer&&level===this.pending)return;
  this.cancel();this.pending=level;this.timer=this.timers.set(()=>{this.timer=undefined;this.current=level;this.change(level)},level===null?150:100);
 }
 immediate(level:number|null){this.cancel();this.current=level;this.change(level)}
 dispose(){this.cancel()}
 private cancel(){if(this.timer)this.timers.clear(this.timer);this.timer=undefined;this.pending=null}
}
