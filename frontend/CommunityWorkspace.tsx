import React, {useEffect, useRef, useState} from 'react';
import {api, type Catalog, type Community, type CommunityPlant, type IrrigationEvidence, type Ref} from './types';
import {ResearchPanel} from './dialogs';
import {SourcePanel} from './SourcePanel';
import {groupDomain} from './organization';
import {PHASES, PARAMETERS, type Phase, type Parameter, type PlantDraft, type PlanSave, type StageStatus, evidenceProblem, fieldKey, fieldText, newPlantDraft, parameterLabel, phaseLabel, plantDraftDirty, plantPlanData, previewField, sourceTitles, stageStatus} from './communityPlan';
import './communityWorkspace.css';

type Props = {
  community: Community; catalog: Catalog; save: PlanSave; refresh: () => Promise<Catalog | null>;
  close: () => void; manage?: () => void; copy: () => void;
  busy: boolean; error: string; status: string;
  undo: () => Promise<Catalog | null>; redo: () => Promise<Catalog | null>; canUndo: boolean; canRedo: boolean;
  researchContext: () => any; taskCreated: (task: any) => void;
};
const plantName = (id: string, c: Catalog) => {const t=c.topics.find(t=>t.id===id);return t?.spanish_name || t?.english_name || t?.label || id;};
const statusLabel = {configured:'Configured',unconfigured:'Not configured','not-applicable':'Not applicable'};
const originLabel = {'not-set':'Not set',source:'Researched source','user-set':'Existing manual value','user-adjusted':'Existing adjusted value'};

export function FriendlyRefs({refs,catalog,open}: {refs: Ref[];catalog: Catalog;open:(ref:Ref)=>void}) {
  return <div className="desk-source-links">{refs.map((ref,i)=>{
    const title=catalog.sources.find(s=>s.id===ref.source_id)?.title || ref.source_id;
    return <button key={i} type="button" className="desk-text-link" onClick={()=>open(ref)} title={ref.locator} aria-label={`Open ${title}${ref.page ? ', PDF page '+ref.page : ''}`}>{title}{ref.page ? ` · PDF page ${ref.page}` : ''} ↗</button>;
  })}</div>;
}

export function CommunityWorkspace({community:g,catalog:c,save,refresh,close,manage,copy,busy:mutationBusy,error,status,undo,redo,canUndo,canRedo,researchContext,taskCreated}:Props) {
  const [base,setBase]=useState<CommunityPlant|null>(g.plants[0] || null);
  const [draft,setDraft]=useState<PlantDraft|null>(g.plants[0] ? newPlantDraft(g.plants[0]) : null);
  const [revision,setRevision]=useState(c.revision),[phase,setPhase]=useState<Phase>('settlement'),[parameter,setParameter]=useState<Parameter>('amount');
  const [evidenceId,setEvidenceId]=useState<string|null>(null),[reviewed,setReviewed]=useState(false),[rationale,setRationale]=useState('');
  const [source,setSource]=useState<Ref|null>(null),[nodeId,setNodeId]=useState<string|null>(null),[research,setResearch]=useState(false),[settings,setSettings]=useState(false);
  const [pending,setPending]=useState<(()=>void)|null>(null),[notice,setNotice]=useState(''),[localError,setLocalError]=useState(''),[brandError,setBrandError]=useState(false);
  const [histories,setHistories]=useState<Record<string,any>>({});
  const [refreshing,setRefreshing]=useState(false),busy=mutationBusy||refreshing;
  const root=useRef<HTMLElement>(null),active=useRef<HTMLElement|null>(null);
  const latest=useRef({g,c});latest.current={g,c};
  const previousOverlay=useRef(false);
  const siteSignature=useRef(JSON.stringify([g.region,g.context,g.description]));
  const readonly=g.kind==='source',dirty=!!(base&&draft&&plantDraftDirty(base,draft));
  const reviewNeeded=!!draft&&Object.values(draft.fields).some(f=>f.mode==='source'&&!f.reviewed);
  const overlay=!!(source||research||settings||pending);
  const candidates=base ? c.irrigation_evidence.filter(e=>e.stage===phase&&e.field===parameter&&(e.species_id===base.topic_id||e.species_id===null)) : [];
  const selected=candidates.find(e=>e.id===evidenceId);
  const problem=selected&&base ? evidenceProblem(selected,base.topic_id,phase,parameter) : null;
  const related=base ? [...new Set([g.origin?.id,...c.relationships.filter(e=>e.source===base.topic_id||e.target===base.topic_id).map(e=>e.source===base.topic_id?e.target:e.source)])].filter((id):id is string=>!!id&&c.topics.some(t=>t.id===id)) : [];
  const node=c.topics.find(t=>t.id===nodeId);

  useEffect(()=>{
    active.current=document.activeElement as HTMLElement;
    root.current?.focus();
    const before=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=before;if(active.current?.isConnected)active.current.focus();};
  },[]);
  useEffect(()=>{
    if(!dirty&&!busy){const current=g.plants.find(p=>p.topic_id===base?.topic_id)||g.plants[0]||null;setBase(current);setDraft(current?newPlantDraft(current):null);setRevision(c.revision);siteSignature.current=JSON.stringify([g.region,g.context,g.description]);}
  },[c.revision,busy]);
  useEffect(()=>{
    if(!dirty)return;
    const prevent=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);
  },[dirty]);
  useEffect(()=>{
    if(overlay){const selector=source?'.source-panel':research?'.research-modal':'.desk-overlay [role="dialog"]';const scope=root.current?.querySelector<HTMLElement>(selector);scope?.querySelector<HTMLElement>('button,input,textarea')?.focus();}
    else if(previousOverlay.current)root.current?.querySelector<HTMLElement>('.desk-phase-tabs [aria-selected=true]')?.focus();
    previousOverlay.current=overlay;
  },[overlay,source,research,settings,pending]);

  const resetReview=()=>{setEvidenceId(null);setReviewed(false);setRationale('');setNodeId(null);};
  const inspect=(p:Phase,f:Parameter=parameter)=>{setPhase(p);setParameter(f);resetReview();};
  const chooseEvidence=(field:Parameter)=>{inspect(phase,field);requestAnimationFrame(()=>{const pane=root.current?.querySelector<HTMLElement>('.desk-guidance');pane?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});pane?.querySelector<HTMLElement>('.desk-candidates button,.desk-research-action button')?.focus({preventScroll:true});});};
  const transition=(next:()=>void)=>{if(busy)return;if(dirty)setPending(()=>next);else next();};
  const choosePlant=(id:string)=>{if(id===base?.topic_id)return;transition(()=>{const plant=latest.current.g.plants.find(p=>p.topic_id===id);if(!plant)return;setBase(plant);setDraft(newPlantDraft(plant));setRevision(latest.current.c.revision);resetReview();setNotice('');setLocalError('');});};
  const savePlant=async()=>{
    if(!base||!draft||!dirty||busy||reviewNeeded)return false;
    if(draft.count!==''&&(!Number.isSafeInteger(Number(draft.count))||Number(draft.count)<0)){setLocalError('Plant count must be a whole number, or blank if unknown.');return false;}
    const fresh=await save('plant-plan-set',plantPlanData(g.id,base,draft),revision);
    if(!fresh)return false;
    const plant=fresh.communities.find(v=>v.id===g.id)?.plants.find(p=>p.topic_id===base.topic_id);
    if(!plant){setLocalError('The saved plant is unavailable. Refresh the workspace.');return false;}
    latest.current={g:fresh.communities.find(v=>v.id===g.id)!,c:fresh};setBase(plant);setDraft(newPlantDraft(plant));setRevision(fresh.revision);setHistories({});setLocalError('');setNotice('Plant details and irrigation changes saved together.');return true;
  };
  const cancel=()=>{if(base){setDraft(newPlantDraft(base));resetReview();setNotice('Unsaved plant changes discarded.');setLocalError('');}};
  const refreshDesk=async()=>{
    setRefreshing(true);
    try{
    const fresh=await refresh();if(!fresh)return;
    const freshCommunity=fresh.communities.find(v=>v.id===g.id);
    const newSignature=freshCommunity?JSON.stringify([freshCommunity.region,freshCommunity.context,freshCommunity.description]):siteSignature.current;
    const plant=fresh.communities.find(v=>v.id===g.id)?.plants.find(p=>p.topic_id===base?.topic_id);
    if(base&&draft&&plant){
      const changedContext=newSignature!==siteSignature.current||plant.notes!==base.notes;
      const fields=Object.fromEntries(Object.entries(draft.fields).map(([key,operation])=>[key,changedContext&&operation.mode==='source'?{...operation,reviewed:false}:operation]));
      setDraft({...draft,fields,count:draft.count===newPlantDraft(base).count?newPlantDraft(plant).count:draft.count,notes:draft.notes===base.notes?plant.notes:draft.notes});setBase(plant);
      if(changedContext){resetReview();setLocalError('Plant or site context changed. Re-review and re-adopt each pending source value before saving.');}
    }else if(base&&!plant){setLocalError('This plant was removed from the community. Your draft remains available; discard it or restore the membership before saving.');}
    siteSignature.current=newSignature;
    setRevision(fresh.revision);setNotice(dirty?'Refreshed. Review the saved values alongside your retained draft before saving.':'Current knowledge and source candidates refreshed.');
    }finally{setRefreshing(false);}
  };
  const changeStatus=(value:StageStatus)=>{
    if(!draft||!base)return;
    const fields={...draft.fields};if(value!=='configured')for(const key of Object.keys(fields))if(fields[key].stage===phase)delete fields[key];
    const stages={...draft.stages};if(value===(base.irrigation[phase]?.status||'unconfigured'))delete stages[phase];else stages[phase]=value;
    setDraft({...draft,stages,fields});
    if(value!=='configured')setNotice('Phase status changed in the draft. Pending adoptions in this phase were discarded; earlier saved values remain in the audit history.');
  };
  const adopt=()=>{
    if(!selected||!base||!draft||readonly||problem||!reviewed||!rationale.trim())return;
    setDraft({...draft,stages:{...draft.stages,[phase]:'configured'},fields:{...draft.fields,[fieldKey(phase,parameter)]:{stage:phase,field:parameter,mode:'source',evidence_id:selected.id,reviewed:true,rationale:rationale.trim()}}});
    setLocalError('');
    setNotice(`${parameterLabel[parameter]} adopted in the draft. Other parameters have not changed. Save changes to commit.`);
  };
  const clearField=(field:Parameter)=>{if(!draft)return;setDraft({...draft,fields:{...draft.fields,[fieldKey(phase,field)]:{stage:phase,field,mode:'clear',rationale:'Cleared explicitly in the Evidence desk.'}}});};
  const showHistory=async(field:Parameter)=>{
    if(!base)return;const key=`${base.topic_id}:${phase}:${field}`;setHistories(v=>({...v,[key]:{loading:true}}));
    try{const entries=await api('/api/communities/'+encodeURIComponent(g.id)+'/history?'+new URLSearchParams({topic_id:base.topic_id,stage:phase,field}));setHistories(v=>({...v,[key]:{entries}}));}catch(e){setHistories(v=>({...v,[key]:{error:String(e)}}));}
  };
  const requestContext=()=>({
    ...researchContext(),centre:base?.topic_id,centre_label:base?plantName(base.topic_id,c):g.label,scope:'community-irrigation',filters:{domain:'technology',kinds:[]},grouping:'none',search:'',routes:[],selected_relationship_ids:[],selected_topic_ids:base?[base.topic_id]:[],visible_topic_ids:[...new Set([...g.plants.map(p=>p.topic_id),...related])],knowledge_revision:revision,
    irrigation_request:{community_id:g.id,community_label:g.label,region:g.region,site_context:g.context,community_origin:g.origin,plant_id:base?.topic_id,plant_label:base?plantName(base.topic_id,c):'',plant_notes:draft?.notes,phase,phase_label:phaseLabel(phase),parameter,parameter_label:parameterLabel[parameter],missing_parameters:base&&draft?PARAMETERS.filter(f=>{const v=previewField(base,draft,phase,f,c);return v?.value==null||v.origin!=='source';}):[...PARAMETERS],relevant_node_ids:related,evidence_ids:candidates.map(e=>e.id),captured_revision:revision,unsaved_draft_operations:draft?Object.values(draft.fields):[]},
  });
  const focusTrap=(event:React.KeyboardEvent)=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(busy)return;if(source)setSource(null);else if(research)setResearch(false);else if(settings)setSettings(false);else if(pending)setPending(null);else transition(close);}
    if(event.key!=='Tab')return;
    const elements=[...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary')].filter(e=>e.getClientRects().length&&!e.closest('[inert]'));
    const first=elements[0],last=elements.at(-1);if(!first)return;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };

  return <section className="community-workspace" role="dialog" aria-modal="true" aria-label="Community editor" ref={root} tabIndex={-1} onKeyDown={focusTrap}>
    <div className="desk-frame" inert={overlay}>
      <header className="desk-header">
        <div className="desk-brand"><img className="desk-symbol" src="/branding/algarroba-symbol.png" alt="" onError={()=>setBrandError(true)}/><img className="desk-wordmark" src="/branding/algarroba-wordmark.png" alt="Algarroba" onError={()=>setBrandError(true)}/></div>
        <div className="desk-heading"><span className="desk-eyebrow">Evidence desk · Community workspace</span><h1>{g.label}</h1><span className="desk-subtitle">{g.region||'Region not recorded'} · {readonly?'Source-described · read-only':'Working community'}</span></div>
        <div className="desk-header-actions"><button onClick={()=>transition(()=>setSettings(true))} disabled={busy}>Community details & members</button>{manage&&<button onClick={()=>transition(manage)} disabled={busy}>Choose community</button>}{readonly&&<button onClick={copy} disabled={busy}>Create working copy</button>}<button aria-label="Close editor" onClick={()=>transition(close)} disabled={busy}>Back to graph</button></div>
      </header>
      <div className="desk-toolbar"><span>Find evidence <span aria-hidden="true">→</span> Review conditions <span aria-hidden="true">→</span> Adopt <span aria-hidden="true">→</span> Save</span><div><button disabled={busy||!canUndo} onClick={()=>transition(()=>{void undo();})}>Undo edit</button><button disabled={busy||!canRedo} onClick={()=>transition(()=>{void redo();})}>Redo edit</button><button disabled={busy} onClick={()=>void refreshDesk()}>Refresh evidence</button></div></div>
      {(brandError||error||localError)&&<div role="alert" className="desk-alert">{brandError&&<p>Algarroba artwork is unavailable. The editor remains usable.</p>}{error&&<p>{error}</p>}{localError&&<p>{localError}</p>}</div>}
      {revision!==c.revision&&<div className="desk-alert">Knowledge changed while this draft was open. Refresh evidence, review saved values and then save your retained draft.</div>}
      <div className="desk-body">
        <nav className="desk-plants" aria-label="Member plants"><h2>Member plants <span>{g.plants.length}</span></h2>{g.plants.map(p=>{
          const topic=c.topics.find(t=>t.id===p.topic_id),image=topic?.plant_images?.find(i=>i.role==='whole')?.variants.thumbnail;
          return <button key={p.topic_id} aria-pressed={base?.topic_id===p.topic_id} onClick={()=>choosePlant(p.topic_id)} disabled={busy}>{image&&<img src={image.url} alt="" loading="lazy" onError={e=>e.currentTarget.hidden=true}/>}<span>{plantName(p.topic_id,c)}<small>{topic?.scientific_name||topic?.english_name}</small></span></button>;
        })}{!g.plants.length&&<p>Add existing plants to begin a researched irrigation lifecycle.</p>}<button className="desk-add" onClick={()=>transition(()=>setSettings(true))} disabled={busy||readonly}>Add plants</button><details><summary>Site context</summary><p>{g.context||'No local site context is recorded yet.'}</p><p>{g.description}</p><FriendlyRefs refs={g.basis} catalog={c} open={setSource}/></details></nav>
        <main className="desk-main">
          {!base||!draft?<div className="desk-empty"><h2>Your community is ready for plants</h2><p>Add existing species, then research and adopt irrigation values for each plant.</p><button onClick={()=>setSettings(true)} disabled={readonly}>Add member plants</button></div>:<>
            <div className="desk-plant-heading"><span className="desk-eyebrow">Plant irrigation lifecycle</span><h2>{plantName(base.topic_id,c)}</h2><p>Start with researched evidence. Review the source conditions before adopting a value.</p></div>
            <div className="desk-comparison-wrap"><table className="desk-comparison"><caption>Compare phases · saved values and pending decisions<span className="desk-scroll-hint">Scroll horizontally to compare all four phases.</span></caption><thead><tr><th scope="col">Parameter</th>{PHASES.map(([p,label])=><th key={p} scope="col"><button onClick={()=>inspect(p)} aria-label={`Open ${label} phase`}>{label}</button></th>)}</tr></thead><tbody>
              <tr><th scope="row">Configuration</th>{PHASES.map(([p])=><td key={p}><button onClick={()=>inspect(p)}><span className={'desk-badge state-'+stageStatus(base,draft,p)}>{statusLabel[stageStatus(base,draft,p)]}</span>{draft.stages[p]&&<small>Draft change</small>}</button></td>)}</tr>
              {PARAMETERS.map(f=><tr key={f}><th scope="row">{parameterLabel[f]}{f==='amount'&&<small>L/plant/event</small>}</th>{PHASES.map(([p])=>{
                const value=previewField(base,draft,p,f,c),pendingField=draft.fields[fieldKey(p,f)],inactive=stageStatus(base,draft,p)==='not-applicable';
                return <td key={p}><button className={phase===p&&parameter===f?'is-active':''} aria-label={`${phaseLabel(p)} ${parameterLabel[f]}`} onClick={()=>inspect(p,f)}><span>{inactive?'Not applicable':fieldText(value,f)}</span>{pendingField&&<><span className="desk-pending">Draft</span><small>Saved: {fieldText(base.irrigation[p]?.fields[f],f)}</small></>}{!pendingField&&value?.value!=null&&<small>{originLabel[value.origin]}</small>}</button></td>;
              })}</tr>)}
            </tbody></table></div>
            <div className="desk-phase-tabs" role="tablist" aria-label="Irrigation phases">{PHASES.map(([p,label],index)=><button type="button" role="tab" id={`desk-tab-${p}`} aria-selected={phase===p} aria-controls="desk-phase-panel" tabIndex={phase===p?0:-1} key={p} onClick={()=>inspect(p)} onKeyDown={e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%4;else if(e.key==='ArrowLeft')next=(index+3)%4;else if(e.key==='Home')next=0;else if(e.key==='End')next=3;else return;e.preventDefault();inspect(PHASES[next][0]);document.getElementById(`desk-tab-${PHASES[next][0]}`)?.focus();}}>{label}</button>)}</div>
            <section id="desk-phase-panel" role="tabpanel" aria-labelledby={`desk-tab-${phase}`}>
              <div className="desk-phase-heading"><h3>{phaseLabel(phase)}</h3><label>Phase configuration<select aria-label="Stage status" value={stageStatus(base,draft,phase)} onChange={e=>changeStatus(e.target.value as StageStatus)} disabled={busy||readonly}><option value="unconfigured">Not configured</option><option value="configured">Configured</option><option value="not-applicable">Not applicable</option></select></label></div>
              <div className="desk-help"><strong>Evidence first.</strong> One event is one watering application to one plant. Amount, frequency and period need their own researched support. A shared source page does not establish one compatible regime.{phase==='support'&&<p>Support watering is event-triggered and can overlap other field phases.</p>}</div>
              {base.irrigation[phase]?.fields.notes?.value!=null&&<details className="desk-legacy-notes"><summary>Existing phase notes</summary><p>{String(base.irrigation[phase].fields.notes.value)}</p><span className="desk-badge">{originLabel[base.irrigation[phase].fields.notes.origin]}</span>{base.irrigation[phase].fields.notes.baseline&&<FriendlyRefs refs={base.irrigation[phase].fields.notes.baseline!.source_refs} catalog={c} open={setSource}/>}</details>}
              {stageStatus(base,draft,phase)==='not-applicable'&&<p className="desk-warning">This phase is marked not applicable. Earlier saved values are retained for reactivation; they are not active planning values.</p>}
              {PARAMETERS.map(f=>{
                const value=previewField(base,draft,phase,f,c),pendingField=draft.fields[fieldKey(phase,f)],historyKey=`${base.topic_id}:${phase}:${f}`,history=histories[historyKey];
                return <article className={'desk-parameter'+(parameter===f?' is-selected':'')} key={f} aria-label={parameterLabel[f]}>
                  <header><h4>{parameterLabel[f]}{f==='amount'&&<small> L/plant/event</small>}</h4><span className={'desk-badge origin-'+(value?.origin||'not-set')}>{pendingField?'Draft · ':''}{originLabel[value?.origin||'not-set']}</span></header>
                  <output className="desk-value" aria-label={`Current ${f}`}>{fieldText(value,f)}</output>
                  {(value?.origin==='user-set'||value?.origin==='user-adjusted')&&<p className="desk-warning">Existing planning value retained. Its source basis needs review; a cited baseline does not establish support for an adjustment.</p>}
                  <div className="desk-parameter-actions"><button className="desk-text-link" onClick={()=>chooseEvidence(f)}>Choose researched evidence</button><button className="desk-text-link" onClick={()=>{inspect(phase,f);setResearch(true);}}>Research this parameter</button>{value?.value!=null&&stageStatus(base,draft,phase)==='configured'&&!readonly&&<button className="desk-text-link" onClick={()=>clearField(f)} disabled={busy}>Clear {f}</button>}</div>
                  {value?.baseline&&<FriendlyRefs refs={value.baseline.source_refs} catalog={c} open={setSource}/>}
                  <details onToggle={e=>{if(e.currentTarget.open)void showHistory(f);}}><summary>Source basis & change history</summary>{value?.baseline?<EvidenceDetails evidence={value.baseline} catalog={c} open={setSource}/>:<p>No source value has been adopted for this parameter.</p>}{value?.rationale&&<p><strong>Applicability / decision note:</strong> {value.rationale}</p>}{value?.changed_at&&<p>{value.actor} · {new Date(value.changed_at).toLocaleString()}</p>}{pendingField&&<p>Pending in the draft; not yet committed.</p>}{history?.loading&&<p>Loading changes…</p>}{history?.error&&<p role="alert">{history.error}</p>}{history?.entries?.map((entry:any)=><p key={entry.id}>{entry.actor} · {new Date(entry.changed_at).toLocaleString()} · {fieldText(entry.before,f)} → {fieldText(entry.after,f)}{entry.after?.rationale&&' · '+entry.after.rationale}</p>)}</details>
                </article>;
              })}
              <details className="desk-plant-details"><summary>Plant details · count & notes{(draft.count!==newPlantDraft(base).count||draft.notes!==base.notes)&&' · Draft'}</summary><fieldset disabled={readonly||busy}><label>Plant count (optional)<input aria-label="Plant count" type="number" min="0" step="1" value={draft.count} onChange={e=>setDraft({...draft,count:e.target.value})}/></label><small>Blank means unknown; zero is explicit.</small><label>Plant / site notes<textarea aria-label="Plant notes" value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label></fieldset></details>
            </section>
          </>}
        </main>
        <aside className="desk-guidance" aria-label="Research and source guidance">
          <button className="desk-text-link desk-mobile-back" onClick={()=>root.current?.querySelector('#desk-phase-panel')?.scrollIntoView({block:'start'})}>← Back to selected phase</button>
          {node?<><button className="desk-text-link" onClick={()=>setNodeId(null)}>← Back to evidence</button><span className="desk-eyebrow">Existing knowledge node</span><h2>{node.label}</h2><p className="desk-preline">{node.description}</p><FriendlyRefs refs={node.source_refs||[]} catalog={c} open={setSource}/>{c.findings.filter(f=>f.topic_ids?.includes(node.id)).map(f=><article key={f.id}><h3>{f.label}</h3><p>{f.text}</p><FriendlyRefs refs={f.source_refs||[]} catalog={c} open={setSource}/></article>)}</>:<>
            <span className="desk-eyebrow">Research & guidance</span><h2>{parameterLabel[parameter]}</h2><p className="desk-guidance-context">{base?plantName(base.topic_id,c):'Choose a plant'} · {phaseLabel(phase)}</p><p>Use a researched source. Selecting one opens it for review and does not fill the plan.</p>
            {!candidates.length&&<div className="desk-help"><strong>No researched value is recorded for this combination.</strong><p>Keep it unset and request research into existing nodes and primary external sources.</p></div>}
            <div className="desk-candidates">{candidates.map(e=><button key={e.id} aria-pressed={selected?.id===e.id} onClick={()=>{setEvidenceId(e.id);setReviewed(false);setRationale('');}}><span className="desk-badge">{e.species_id===null?'General guidance':'Species-specific source case'}</span><strong>{e.wording}</strong><small>{sourceTitles(e,c)}</small><span className="desk-text-link">Review this source →</span></button>)}</div>
            {selected&&<section className="desk-source-review" aria-label="Source applicability review"><h3>Review applicability</h3><EvidenceDetails evidence={selected} catalog={c} open={setSource}/>{problem&&<p className="desk-warning">{problem}</p>}<fieldset disabled={readonly||busy}><label className="desk-check"><input type="checkbox" aria-label="Source conditions reviewed" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/><span>I reviewed species, age, method, site conditions and source limitations.</span></label><label>Why does this source apply here?<textarea aria-label="Source applicability note" value={rationale} onChange={e=>setRationale(e.target.value)} maxLength={4000} placeholder="Record the match to this plant and community, and any differences or uncertainty."/></label><button className="desk-primary" disabled={!!problem||!reviewed||!rationale.trim()} onClick={adopt}>Adopt reviewed {parameter}</button></fieldset><small>Adopts this parameter only. Other values stay unchanged until explicitly adopted.</small></section>}
            <section className="desk-research-action"><h3>Need better-fitting evidence?</h3><p>Search existing nodes and primary external sources through an editable Codex research handoff.</p><button onClick={()=>setResearch(true)} disabled={!base||busy}>Request research</button><small>Research never changes adopted values automatically.</small></section>
            {!!related.length&&<details open><summary>Related knowledge nodes</summary>{related.map(id=><button className="desk-node-link" key={id} onClick={()=>setNodeId(id)}>{c.topics.find(t=>t.id===id)?.label} ↗</button>)}</details>}
          </>}
        </aside>
      </div>
      <footer className="desk-footer"><div role="status" aria-live="polite">{dirty?<strong>{reviewNeeded?'Pending source values need review':'Unsaved plant changes'}</strong>:<span>{readonly?'Read-only source community':'All plant changes saved'}</span>}<small>{notice||status||'Irrigation values remain unchanged until you review and adopt researched evidence.'}</small></div><div><button disabled={!dirty||busy} onClick={cancel}>Cancel changes</button><button className="desk-primary" disabled={!dirty||busy||readonly||reviewNeeded} onClick={()=>void savePlant()}>{busy?'Saving…':'Save changes'}</button></div></footer>
    </div>
    {source&&<SourcePanel source={source} catalog={c} close={()=>setSource(null)}/>}
    {research&&<ResearchPanel context={requestContext()} catalog={c} close={()=>setResearch(false)} complete={task=>{setResearch(false);setNotice('Research task saved. Use its editable prompt in Codex Desktop; refresh evidence after checked intake.');taskCreated(task);}}/>}
    {settings&&<div inert={!!source}><CommunitySettings community={g} catalog={c} save={save} busy={busy} close={()=>setSettings(false)} error={error} openSource={ref=>{setSource(ref);}}/></div>}
    {pending&&<div className="desk-overlay"><section className="desk-dialog" role="dialog" aria-modal="true" aria-label="Unsaved plant changes"><h2>Keep your plant changes?</h2><p>Save the selected plant’s details and irrigation decisions before continuing, or discard the draft.</p><div className="desk-dialog-actions"><button onClick={()=>setPending(null)} disabled={busy}>Keep editing</button><button onClick={()=>{const next=pending;cancel();setPending(null);next();}} disabled={busy}>Discard changes</button><button className="desk-primary" onClick={async()=>{if(await savePlant()){const next=pending;setPending(null);next();}}} disabled={busy||reviewNeeded}>Save and continue</button></div>{error&&<p role="alert">{error}</p>}</section></div>}
  </section>;
}

function EvidenceDetails({evidence:e,catalog,open}: {evidence:IrrigationEvidence;catalog:Catalog;open:(ref:Ref)=>void}) {
  return <div className="desk-evidence-details"><blockquote>{e.wording}</blockquote><dl><dt>Recorded value</dt><dd>{e.value===null?'Not quantified — see source wording':String(e.value)} {e.units}</dd><dt>Source conditions</dt><dd>{e.context}</dd><dt>Applicability</dt><dd>{e.applicability}</dd>{e.limitations&&<><dt>Limitations</dt><dd>{e.limitations}</dd></>}</dl><FriendlyRefs refs={e.source_refs} catalog={catalog} open={open}/><details><summary>Edition & provenance</summary><p>{e.id}</p>{e.source_refs.map((ref:Ref&{edition_sha256?:string},i)=><p key={i}>{ref.locator}<small className="desk-edition-hash">Edition SHA-256: {ref.edition_sha256||'Not recorded'}</small></p>)}</details></div>;
}

function CommunitySettings({community:g,catalog:c,save,busy,close,error,openSource}:{community:Community;catalog:Catalog;save:PlanSave;busy:boolean;close:()=>void;error:string;openSource:(ref:Ref)=>void}) {
  const [value,setValue]=useState({label:g.label,region:g.region,description:g.description,context:g.context,parent_id:g.parent_id}),[search,setSearch]=useState(''),[selected,setSelected]=useState<string[]>([]);
  const readonly=g.kind==='source',folders=[...c.organization_roots,...c.browse_groups].filter(v=>groupDomain(v.id,c)==='ecosystem');
  return <div className="desk-overlay"><section className="desk-dialog desk-community-settings" role="dialog" aria-modal="true" aria-label="Community details and members"><header><h2>Community details & members</h2><button onClick={close} disabled={busy}>Close details</button></header>{error&&<p role="alert">{error}</p>}{g.origin&&<p>Based on {g.origin.label}. Membership is a user-defined selection, not an irrigation prescription.</p>}<FriendlyRefs refs={g.basis} catalog={c} open={openSource}/><fieldset disabled={readonly||busy}><form onSubmit={async e=>{e.preventDefault();if(await save('community-edit',{id:g.id,changes:value})){close();}}}><label>Community name<input aria-label="Community name" required maxLength={160} value={value.label} onChange={e=>setValue({...value,label:e.target.value})}/></label><label>Region<input aria-label="Community region" value={value.region} onChange={e=>setValue({...value,region:e.target.value})}/></label><label>Folder<select aria-label="Edit community folder" value={value.parent_id} onChange={e=>setValue({...value,parent_id:e.target.value})}>{folders.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label><label>Description<textarea value={value.description} onChange={e=>setValue({...value,description:e.target.value})}/></label><label>Local site context<textarea aria-label="Community context" value={value.context} onChange={e=>setValue({...value,context:e.target.value})}/></label><button className="desk-primary" type="submit">Save community</button></form><hr/><h3>Add existing plants</h3><label>Find a plant<input aria-label="Search community plants" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="desk-plant-picker">{c.topics.filter(t=>t.kind==='species'&&!g.plants.some(p=>p.topic_id===t.id)&&[t.label,t.spanish_name,t.english_name,t.scientific_name,...t.aliases||[]].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(search.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase())).map(t=><label className="desk-check" key={t.id}><input type="checkbox" checked={selected.includes(t.id)} onChange={()=>setSelected(selected.includes(t.id)?selected.filter(id=>id!==t.id):[...selected,t.id])}/>{plantName(t.id,c)}</label>)}</div><button disabled={!selected.length} onClick={async()=>{if(await save('plants-add',{id:g.id,topic_ids:selected}))close();}}>Add selected plants</button><details><summary>Remove a member plant</summary><p>Removing membership preserves the species and its recorded edit history.</p>{g.plants.map(p=><button className="desk-remove" key={p.topic_id} onClick={async()=>{if(await save('plant-remove',{id:g.id,topic_id:p.topic_id}))close();}}>Remove {plantName(p.topic_id,c)}</button>)}</details></fieldset></section></div>;
}
