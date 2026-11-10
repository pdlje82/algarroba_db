import React,{useState} from 'react';
import {api,type Catalog,type Ref} from './types';
import {Refs} from './dialogs';
import {assessmentWarnings,fundingReviews,RELEVANCE,AVAILABILITY,INSTRUMENT,type ProjectIdea} from './funding';

const applicantLabels:Record<string,string>={individual:'Individual',business:'Business',nonprofit:'Nonprofit',municipality:'Municipality','research-partnership':'Research partnership'};
const fields=['applicant_status','land_access','partners','budget','readiness'] as const;
const labels={applicant_status:'Applicant status',land_access:'Access to land',partners:'Partners',budget:'Budget',readiness:'Readiness / technical maturity'};
const empty=():ProjectIdea=>({id:'',label:'',goals:'',topic_ids:[],proposed_geography:'Alhama de Almería (proposed; site unconfirmed)',applicant_options:Object.keys(applicantLabels),applicant_status:'Unconfirmed',land_access:'Unconfirmed',partners:'Unconfirmed',budget:'Unconfirmed',readiness:'Unconfirmed',version:1,updated_at:''});

export function FundingProjectTools({catalog,selected,onSelect,onCatalog}:{catalog:Catalog;selected:string;onSelect:(id:string)=>void;onCatalog:(c:Catalog)=>void}){
  const [editing,setEditing]=useState<ProjectIdea|null>(null),[draft,setDraft]=useState<ProjectIdea|null>(null),[revision,setRevision]=useState(catalog.revision);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[latest,setLatest]=useState<ProjectIdea|null>(null),[ack,setAck]=useState(false),[refreshNeeded,setRefreshNeeded]=useState(false);
  const open=(p:ProjectIdea)=>{setEditing(p);setDraft(structuredClone(p));setRevision(catalog.revision);setError('');setLatest(null);setAck(false);setRefreshNeeded(false);};
  const refresh=async()=>{try{const c=await api<Catalog>('/api/catalog');onCatalog(c);setRevision(c.revision);setLatest(c.project_ideas?.find(p=>p.id===editing?.id)||null);setAck(false);setRefreshNeeded(false);}catch(e){setError(String(e));}};
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(!draft)return;setBusy(true);setError('');
    const {id,version,updated_at,...changes}=draft;
    try{await api('/api/projects/edit',{method:'POST',body:JSON.stringify({expected_revision:revision,action:id?'update':'create',...(id?{id}:{}),changes})});onCatalog(await api<Catalog>('/api/catalog'));setEditing(null);setDraft(null);}
    catch(e){setError(String(e));setRefreshNeeded(String(e).includes('changed'));}finally{setBusy(false);}
  };
  return <>
    <section className="funding-tools" aria-label="Funding project ideas">
      <label>Compare funding for <select aria-label="Funding project idea" value={selected} onChange={e=>onSelect(e.target.value)}><option value="all">All ideas</option>{(catalog.project_ideas||[]).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <button onClick={()=>open(catalog.project_ideas?.find(p=>p.id===selected)||catalog.project_ideas?.[0]||empty())}>Edit project ideas</button>
      <button onClick={()=>open(empty())}>New project idea</button>
      <span>Exploratory ideas · possible routes, not eligibility decisions</span>
    </section>
    {editing&&draft&&<div className="modal-backdrop"><section className="modal funding-editor" role="dialog" aria-modal="true" aria-labelledby="project-editor-title">
      <h2 id="project-editor-title">{draft.id?'Edit project idea':'New project idea'}</h2>
      <p>Your goals and assumptions stay separate from source evidence. Changes make earlier funding assessments need review.</p>
      <nav className="actions" aria-label="Choose project idea">{(catalog.project_ideas||[]).map(p=><button key={p.id} onClick={()=>open(p)}>{p.label}</button>)}</nav>
      <form onSubmit={save}>
        <label>Name<input required maxLength={160} aria-label="Project idea name" value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/></label>
        <label>Goals<textarea required aria-label="Project goals" value={draft.goals} onChange={e=>setDraft({...draft,goals:e.target.value})}/></label>
        <label>Proposed geography<input aria-label="Proposed geography" value={draft.proposed_geography} onChange={e=>setDraft({...draft,proposed_geography:e.target.value})}/></label>
        <fieldset><legend>Applicant arrangements to explore</legend>{Object.entries(applicantLabels).map(([id,label])=><label key={id}><input type="checkbox" checked={draft.applicant_options.includes(id)} onChange={e=>setDraft({...draft,applicant_options:e.target.checked?[...draft.applicant_options,id]:draft.applicant_options.filter(x=>x!==id)})}/>{label}</label>)}</fieldset>
        {fields.map(key=><label key={key}>{labels[key]}<input aria-label={labels[key]} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
        <label>Linked graph concepts<select multiple size={4} aria-label="Linked graph concepts" value={draft.topic_ids} onChange={e=>setDraft({...draft,topic_ids:Array.from(e.target.selectedOptions,o=>o.value)})}>{catalog.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        {latest&&latest.version!==editing.version&&<section className="notice"><h3>Current saved version · {latest.version}</h3><p><strong>{latest.label}</strong></p><p>{latest.goals}</p><dl>{fields.map(k=><React.Fragment key={k}><dt>{labels[k]}</dt><dd>{latest[k]}</dd></React.Fragment>)}</dl><p>Geography: {latest.proposed_geography}</p><p>Possible applicants: {latest.applicant_options.join(', ')||'Unconfirmed'}</p><p>Linked concepts: {latest.topic_ids.map(id=>catalog.topics.find(t=>t.id===id)?.label||id).join(', ')||'None'}</p><p>Your draft is still in the form above.</p><label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I have reviewed the current version and want to save this draft.</label></section>}
        {error&&<p role="alert">{error}</p>}
        <div className="actions"><button type="submit" className="primary" disabled={busy||refreshNeeded||!!latest&&latest.version!==editing.version&&!ack}>{busy?'Saving…':'Save project idea'}</button><button type="button" onClick={refresh}>Refresh collection, keep draft</button><button type="button" disabled={busy} onClick={()=>{setEditing(null);setDraft(null);}}>Cancel</button></div>
      </form>
    </section></div>}
  </>;
}

export function FundingDetails({catalog,ids,selected,open}:{catalog:Catalog;ids:string[];selected:string;open:(r:Ref)=>void}){
  const [expanded,setExpanded]=useState<string|null>(null);
  const reviews=fundingReviews(ids,catalog);
  const topics=catalog.topics.filter(t=>ids.includes(t.id)&&t.domain==='funding');
  const references=topics.length>0&&topics.every(t=>t.funding_role==='reference');
  const contexts=[...new Set(topics.flatMap(t=>t.funding_context_ids||[]))];
  if(!ids.some(id=>catalog.topics.some(t=>t.id===id&&t.domain==='funding')))return null;
  const ideas=[...(catalog.project_ideas||[])].sort((a,b)=>Number(b.id===selected)-Number(a.id===selected));
  return <section className="funding-details" aria-label="Project suitability">
    <h3>{references?'Supporting reference':'Project suitability'}</h3><p>{references?'This describes a rule, authority, tool or historical context. It is not a standalone application. Linked reviews below belong to their named funding routes.':'Reviewed possibilities for your ideas. Applicant, land and partner requirements remain separate from thematic relevance.'}</p>
    {contexts.length>0&&<p>Funding contexts: {contexts.map(id=>catalog.topics.find(t=>t.id===id)?.label||id).join(' · ')}. Context links do not establish eligibility.</p>}
    {references&&reviews.length>0&&<nav className="actions" aria-label="Linked funding reviews">{reviews.map(r=><button key={r.id} onClick={()=>{setExpanded(r.id);requestAnimationFrame(()=>document.getElementById('funding-'+r.id)?.scrollIntoView({block:'nearest'}));}}>{catalog.topics.find(t=>t.id===r.topic_id)?.label||r.topic_id}</button>)}</nav>}
    {!reviews.length&&<p>{references?'No linked funding review is available yet.':'Project fit and availability have not been reviewed for this option.'}</p>}
    {reviews.length>1&&<p>{reviews.length} reviewed calls or routes. Their dates and conditions differ.</p>}
    {reviews.map(r=><details className="funding-review" id={'funding-'+r.id} key={r.id} open={reviews.length===1||expanded===r.id}>
      <summary><strong>{catalog.topics.find(t=>t.id===r.topic_id)?.label||r.topic_id}</strong></summary>
      <p><strong>{AVAILABILITY[r.availability]}</strong> · {INSTRUMENT[r.instrument_type]} · Checked {r.checked_on}{r.verification_state!=='confirmed'&&<> · <strong>Verification {r.verification_state}</strong></>}</p>
      <p>{r.availability_note}</p>
      {r.deadlines.length>0&&<ul>{r.deadlines.map((d,i)=><li key={i}>{d.label}: {d.value}{d.timezone?' · '+d.timezone:''}{d.note?' · '+d.note:''}</li>)}</ul>}
      {(catalog.funding_state?.reviews[r.id]||[]).map((w,i)=><p className="notice" key={i}>{w}</p>)}
      {r.verification_note&&<p>{r.verification_note}</p>}
      <dl><dt>Territory</dt><dd>{r.territory}</dd><dt>Applicants</dt><dd>{r.applicants}</dd><dt>Activities</dt><dd>{r.activities}</dd>{r.financial_summary&&<><dt>Finance</dt><dd>{r.financial_summary}</dd></>}</dl>
      <Refs catalog={catalog} refs={r.source_refs} open={open}/>
      {ideas.map(p=>{
        const a=catalog.funding_assessments?.find(a=>a.project_id===p.id&&a.review_id===r.id);
        const warnings=a?assessmentWarnings(a,catalog):[];
        return <section className="idea-assessment" key={p.id}><h5>{p.label}</h5>
          <p><strong>{!a?'Not yet reviewed':warnings.length?'Needs review':RELEVANCE[a.relevance]}</strong></p>
          {a&&<><p>Possible route: {a.applicant_route}</p>{warnings.map((w,i)=><p className="notice" key={i}>{w}</p>)}<p>{warnings.length?'Earlier reasoning: ':''}{a.reasons.join(' ')}</p>
            {a.exclusions.map((e,i)=><p key={i}>Exclusion · {e.scope}: {e.reason}</p>)}
            {a.requirements.length>0&&<><h6>Conditions to resolve</h6><ul>{a.requirements.map((x,i)=><li key={i}>{x}</li>)}</ul></>}
            <p><strong>Next action:</strong> {a.next_action}</p><small>Reviewed against idea version {a.project_version} · {a.checked_on}</small><Refs catalog={catalog} refs={a.source_refs} open={open}/>
          </>}
        </section>;
      })}
    </details>)}
  </section>;
}
