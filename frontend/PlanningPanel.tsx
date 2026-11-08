import React, {useEffect, useRef, useState} from 'react';
import {api, type Catalog, type Community, type CommunityPlant, type IrrigationEvidence, type PlannedField, type Ref} from './types';
import {groupDomain} from './organization';
import {Refs} from './dialogs';

const stages = [['nursery','Nursery'],['settlement','Settlement'],['summer-maintenance','Summer maintenance'],['support','Support']];
const origins:Record<string,string>={'not-set':'Not set',source:'Using source value','user-set':'User-set','user-adjusted':'User-adjusted'};
type Props={open:boolean;catalog:Catalog;initialGroup:string|null;close:()=>void;changed:(catalog:Catalog)=>Promise<void>;navigate:(id:string)=>void;openSource:(ref:Ref)=>void};
type Save=(action:string,data:Record<string,unknown>)=>Promise<boolean>;

function title(id:string,c:Catalog){const t=c.topics.find(t=>t.id===id);return t?[t.spanish_name,t.english_name,t.scientific_name].filter(Boolean).join(' · ')||t.label:id;}
function includes(text:string,term:string){return text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(term.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());}

export function PlanningPanel({open,catalog:c,initialGroup,close,changed,navigate,openSource}:Props){
  const [tab,setTab]=useState('groups'),[group,setGroup]=useState('technology:irrigation'),[communityId,setCommunityId]=useState('');
  const [name,setName]=useState(''),[parent,setParent]=useState('ecosystem:habitats'),[search,setSearch]=useState(''),[chosen,setChosen]=useState<string[]>([]),[destination,setDestination]=useState('');
  const [sourceId,setSourceId]=useState(''),[sourcePlants,setSourcePlants]=useState<string[]>([]),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [editRevision,setEditRevision]=useState(c.revision),opened=useRef(false);
  const undo=useRef<string[]>([]),redo=useRef<string[]>([]),head=useRef<number|null>(null);
  const folders=[...(c.organization_roots||[]),...c.browse_groups];
  const ecosystemFolders=folders.filter(g=>groupDomain(g.id,c)==='ecosystem');
  useEffect(()=>{if(open&&!opened.current){opened.current=true;setEditRevision(c.revision);}},[open,c.revision]);
  useEffect(()=>{if(open && initialGroup){if(initialGroup.startsWith('community:')){setTab('communities');setCommunityId(initialGroup);}else if(folders.some(g=>g.id===initialGroup)){setGroup(initialGroup);setParent(initialGroup);}else if(c.topics.some(t=>t.id===initialGroup&&t.kind==='habitat')){setTab('communities');setSourceId(initialGroup);setSourcePlants([]);setParent('browse:plant-communities');}}},[open,initialGroup]);
  const execute=async(action:string,data:Record<string,unknown>,kind:'new'|'undo'|'redo'='new')=>{
    setBusy(true);setError('');setStatus('');
    try{
      if(kind!=='new' && head.current!==c.revision)throw new Error('Undo conflicts with a later change. Refresh without overwriting it.');
      const endpoint=action.startsWith('group-')||action.startsWith('members-')||action==='revert'?'/api/organization/edit':'/api/communities/edit';
      const result=await api(endpoint,{method:'POST',body:JSON.stringify({expected_revision:editRevision,action,data})});
      if(kind==='new'){undo.current.push(result.event_id);redo.current=[];}
      else if(kind==='undo'){undo.current.pop();redo.current.push(result.event_id);}
      else{redo.current.pop();undo.current.push(result.event_id);}
      head.current=result.revision;
      setEditRevision(result.revision);
      const fresh=await api<Catalog>('/api/catalog');
      await changed(fresh);
      if(result.affected_id?.startsWith('community:')){setCommunityId(result.affected_id);setTab('communities');}
      else if(result.affected_id?.startsWith('browse:')){setGroup(result.affected_id);setParent(result.affected_id);}
      setStatus('Saved.');return true;
    }catch(e){setError(String(e));return false;}finally{setBusy(false);}
  };
  const save:Save=(a,d)=>execute(a,d);
  const selectedGroup=folders.find(g=>g.id===group),custom=c.browse_groups.find(g=>g.id===group);
  const community=c.communities?.find(g=>g.id===communityId);
  const originCommunity=c.communities?.find(g=>g.id===sourceId);
  const originTopic=c.topics.find(g=>g.id===sourceId);
  const candidateIds=originCommunity?originCommunity.plants.map(p=>p.topic_id):c.relationships.filter(e=>e.source===sourceId||e.target===sourceId).map(e=>e.source===sourceId?e.target:e.source).filter(id=>c.topics.find(t=>t.id===id)?.kind==='species');
  const references=c.topics.filter(t=>t.kind==='habitat');
  const toggle=(id:string,values:string[],setter:(v:string[])=>void)=>setter(values.includes(id)?values.filter(v=>v!==id):[...values,id]);
  if(!open)return null;
  return <div className="modal-shade"><section className="modal planning-panel" role="dialog" aria-modal="true" aria-label="Groups and communities">
    <header><div><p className="eyebrow">ORGANIZE & PLAN</p><h2>Groups and communities</h2></div><button aria-label="Close editor" onClick={close}>Close</button></header>
    <div className="actions"><button aria-pressed={tab==='groups'} onClick={()=>setTab('groups')}>Groups</button><button aria-pressed={tab==='communities'} onClick={()=>{setTab('communities');if(!ecosystemFolders.some(g=>g.id===parent))setParent('ecosystem:habitats');}}>Communities</button><button disabled={busy||!undo.current.length} onClick={()=>execute('revert',{event_id:undo.current.at(-1)},'undo')}>Undo edit</button><button disabled={busy||!redo.current.length} onClick={()=>execute('revert',{event_id:redo.current.at(-1)},'redo')}>Redo edit</button><button disabled={busy} onClick={async()=>{try{const fresh=await api<Catalog>('/api/catalog');await changed(fresh);setEditRevision(fresh.revision);setStatus('Refreshed. Review current values before saving your retained draft.');}catch(e){setError(String(e));}}}>Refresh editor</button></div>
    {editRevision!==c.revision&&<p className="notice">Data changed while this draft was open. Refresh the editor to review current values before saving.</p>}{error&&<p role="alert" className="notice">{error}</p>}{status&&<p role="status">{status}</p>}
    <fieldset disabled={busy} className="planning-content">
    {tab==='groups'?<div className="planning-columns">
      <div><h3>Permanent groups</h3><select aria-label="Selected group" value={group} onChange={e=>{setGroup(e.target.value);setParent(e.target.value);setChosen([]);}}>{folders.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select>
      {selectedGroup?<><p><strong>{selectedGroup.label}</strong></p><small>{group}</small><div className="actions"><button onClick={()=>navigate(group)}>Open group in graph</button><button disabled={!custom?.user_created||!!custom.anchor_topic_id} onClick={async()=>{if(await save('group-delete',{id:group}))setGroup('ecosystem:habitats');}}>Delete empty group</button></div>
      <form onSubmit={e=>{e.preventDefault();void save('group-rename',{id:group,label:name});}}><label>Name<input aria-label="Group name" value={name} onChange={e=>setName(e.target.value)} maxLength={160} required/></label><button type="submit">Rename group</button></form></>:<p>Group unavailable. Choose another group or return to the overview.</p>}
      <label>Parent / destination<select aria-label="Group parent" value={parent} onChange={e=>setParent(e.target.value)}>{['ecosystem','technology','funding'].map(d=><option key={d} value={'domain:'+d}>{d} · top level</option>)}{folders.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      <div className="actions"><button disabled={!name.trim()} onClick={()=>save('group-create',{label:name,parent_id:parent})}>New group / subgroup</button><button disabled={!custom} onClick={()=>save('group-move',{id:group,parent_id:parent})}>Move group to parent</button></div>
      <p className="muted">Folders organize records. They do not change source-backed names or create factual connections.</p></div>
      <div><h3>Organize topics</h3><label>Find topics<input aria-label="Find topics to organize" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="planning-picker">{c.topics.filter(t=>includes([t.label,...t.aliases||[],t.spanish_name,t.english_name,t.scientific_name].join(' '),search)).map(t=><label key={t.id}><input type="checkbox" checked={chosen.includes(t.id)} onChange={()=>toggle(t.id,chosen,setChosen)}/>{title(t.id,c)}</label>)}</div>
      <p>{chosen.length} selected</p><label>Destination folder<select aria-label="Membership destination" value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Choose a folder</option>{c.browse_groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label><div className="actions"><button disabled={!chosen.length||!destination} onClick={()=>save('members-move',{group_id:destination,topic_ids:chosen})}>Move to…</button><button disabled={!chosen.length||!destination} onClick={()=>save('members-share',{group_id:destination,topic_ids:chosen})}>Also show in…</button><button disabled={!chosen.length||!custom} onClick={()=>save('members-remove',{group_id:group,topic_ids:chosen})}>Remove from selected group</button></div>
      {custom&&<details><summary>Direct members · {custom.members.length}</summary>{custom.members.map(m=><p key={m.topic_id}>{title(m.topic_id,c)} <small>({m.role})</small></p>)}<p>{custom.maintenance_rule}</p></details>}</div>
    </div>:<>
      <div className="planning-columns"><div><h3>Working communities</h3><label>Community<select aria-label="Selected community" value={communityId} onChange={e=>setCommunityId(e.target.value)}><option value="">Choose a community</option>{c.communities?.map(g=><option key={g.id} value={g.id}>{g.label} · {g.kind==='source'?'Source-described':'User-defined'}</option>)}</select></label>
      <label>New community name<input aria-label="New community name" value={name} onChange={e=>setName(e.target.value)} maxLength={160}/></label><label>Community folder<select aria-label="Community folder" value={parent} onChange={e=>setParent(e.target.value)}>{ecosystemFolders.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label><button disabled={!name.trim()} onClick={()=>save('community-create',{label:name,parent_id:parent})}>New community</button></div>
      <div><h3>Start from research</h3><label>Source-described reference<select aria-label="Source community reference" value={sourceId} onChange={e=>{setSourceId(e.target.value);setSourcePlants([]);}}><option value="">Choose a reference</option>{references.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}{c.communities?.filter(g=>g.kind==='source').map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      {sourceId&&<><p>{originTopic?.description||originCommunity?.context}</p><Refs refs={originTopic?.source_refs||originCommunity?.basis||[]} open={openSource}/><p>Select associations for your mix. This selection is not a documented planting recipe.</p><div className="planning-picker">{[...new Set(candidateIds)].map(id=><label key={id}><input type="checkbox" checked={sourcePlants.includes(id)} onChange={()=>toggle(id,sourcePlants,setSourcePlants)}/>{title(id,c)}</label>)}</div><button disabled={!name.trim()} onClick={()=>save('community-copy',{label:name,parent_id:parent,origin_id:sourceId,topic_ids:sourcePlants})}>Create editable community from this</button></>}</div></div>
      {community&&<CommunityEditor key={community.id} community={community} catalog={c} save={save} navigate={navigate} openSource={openSource}/>}
    </>}
    </fieldset>
  </section></div>;
}

function CommunityEditor({community:g,catalog:c,save,navigate,openSource}:{community:Community;catalog:Catalog;save:Save;navigate:(id:string)=>void;openSource:(ref:Ref)=>void}){
  const [draft,setDraft]=useState({label:g.label,description:g.description,region:g.region,context:g.context,parent_id:g.parent_id});
  const [search,setSearch]=useState(''),[plants,setPlants]=useState<string[]>([]),[memberId,setMemberId]=useState('');
  const readonly=g.kind==='source';
  const folders=[...(c.organization_roots||[]),...c.browse_groups].filter(g=>groupDomain(g.id,c)==='ecosystem');
  return <section className="community-editor"><h3>{g.label} <small>{readonly?'Source-described':'User-defined'}</small></h3><button onClick={()=>navigate(g.id)}>Open community in graph</button>
    {g.origin&&<p>Based on {g.origin.label} · {g.origin.selection}</p>}<Refs refs={g.basis} open={openSource}/>
    <fieldset disabled={readonly}><form onSubmit={async e=>{e.preventDefault();await save('community-edit',{id:g.id,changes:draft});}}><div className="planning-columns"><div><label>Name<input aria-label="Community name" value={draft.label} required onChange={e=>setDraft({...draft,label:e.target.value})}/></label><label>Region<input aria-label="Community region" value={draft.region} onChange={e=>setDraft({...draft,region:e.target.value})}/></label><label>Folder<select aria-label="Edit community folder" value={draft.parent_id} onChange={e=>setDraft({...draft,parent_id:e.target.value})}>{folders.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label></div><div><label>Description<textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label><label>Local context<textarea aria-label="Community context" value={draft.context} onChange={e=>setDraft({...draft,context:e.target.value})}/></label></div></div><div className="actions"><button type="submit">Save community</button><button type="button" onClick={()=>setDraft({label:g.label,description:g.description,region:g.region,context:g.context,parent_id:g.parent_id})}>Cancel changes</button></div></form></fieldset>
    {!readonly&&<details><summary>Add existing plants</summary><label>Search plants<input aria-label="Search community plants" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="planning-picker">{c.topics.filter(t=>t.kind==='species'&&!g.plants.some(p=>p.topic_id===t.id)&&includes([title(t.id,c),t.label,...t.aliases||[]].join(' '),search)).map(t=><label key={t.id}><input type="checkbox" checked={plants.includes(t.id)} onChange={()=>setPlants(plants.includes(t.id)?plants.filter(id=>id!==t.id):[...plants,t.id])}/>{title(t.id,c)}</label>)}</div><button disabled={!plants.length} onClick={async()=>{if(await save('plants-add',{id:g.id,topic_ids:plants}))setPlants([]);}}>Add selected plants</button></details>}
    <h4>Member plants · {g.plants.length}</h4>{!g.plants.length&&<p>No plants yet. Add existing plants to configure irrigation.</p>}
    <div className="planning-members">{g.plants.map(p=><button key={p.topic_id} aria-pressed={memberId===p.topic_id} onClick={()=>setMemberId(p.topic_id)}>{title(p.topic_id,c)}</button>)}</div>
    {g.plants.filter(p=>p.topic_id===memberId).map(p=><PlantEditor key={p.topic_id} community={g} plant={p} catalog={c} save={save} openSource={openSource}/>)}
  </section>;
}

function PlantEditor({community:g,plant:p,catalog:c,save,openSource}:{community:Community;plant:CommunityPlant;catalog:Catalog;save:Save;openSource:(ref:Ref)=>void}){
  const [count,setCount]=useState(p.count===null?'':String(p.count)),[notes,setNotes]=useState(p.notes),[stage,setStage]=useState('settlement');
  const irrigation=p.irrigation[stage];
  const readonly=g.kind==='source';
  return <section className="plant-irrigation"><h4>{title(p.topic_id,c)}</h4><Refs refs={p.basis} open={openSource}/><fieldset disabled={readonly}><label>Plant count (optional)<input aria-label="Plant count" type="number" min="0" step="1" value={count} onChange={e=>setCount(e.target.value)}/></label><label>Membership notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="actions"><button onClick={()=>save('plant-edit',{id:g.id,topic_id:p.topic_id,changes:{count:count===''?null:Number(count),notes}})}>Save plant details</button><button onClick={()=>{setCount(p.count===null?'':String(p.count));setNotes(p.notes);}}>Cancel plant changes</button><button onClick={()=>save('plant-remove',{id:g.id,topic_id:p.topic_id})}>Remove plant from community</button></div>
  <h4>Irrigation in this community</h4><p>Amounts are liters per plant per watering. Blank means unknown; no values are inferred.</p><label>Lifecycle stage<select aria-label="Irrigation stage" value={stage} onChange={e=>setStage(e.target.value)}>{stages.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Stage status<select aria-label="Stage status" value={irrigation?.status||'unconfigured'} onChange={e=>save('stage-set',{id:g.id,topic_id:p.topic_id,stage,status:e.target.value})}><option value="unconfigured">Not configured</option><option value="configured">Configure values</option><option value="not-applicable">Not applicable</option></select></label>
  {irrigation?.status==='configured'&&['amount','frequency','period','notes'].map(key=><FieldEditor key={stage+':'+key} communityId={g.id} topicId={p.topic_id} stage={stage} field={key} current={irrigation.fields[key]} candidates={(c.irrigation_evidence||[]).filter(e=>e.stage===stage&&e.field===key&&(e.species_id===null||e.species_id===p.topic_id))} save={save} openSource={openSource}/>)}
  {irrigation?.status==='not-applicable'&&<p>This stage is explicitly not applicable. Earlier values remain in the change history.</p>}
  </fieldset></section>;
}

function FieldEditor({communityId,topicId,stage,field,current,candidates,save,openSource}:{communityId:string;topicId:string;stage:string;field:string;current?:PlannedField;candidates:IrrigationEvidence[];save:Save;openSource:(ref:Ref)=>void}){
  const [value,setValue]=useState(current?.value===null||current?.value===undefined?'':String(current.value)),[rationale,setRationale]=useState(current?.rationale||''),[evidenceId,setEvidenceId]=useState(''),[history,setHistory]=useState<any[]|null>(null),[error,setError]=useState('');
  const labels:Record<string,string>={amount:'Amount (L/plant/watering)',frequency:'Frequency or trigger',period:'Applicable period',notes:'Notes'};
  const baseline=current?.baseline;
  const data={id:communityId,topic_id:topicId,stage,field};
  const candidate=candidates.find(e=>e.id===evidenceId)||(!evidenceId?baseline:null);
  const compatible=candidate && candidate.species_id===topicId && candidate.value!==null && (field!=='amount'||(typeof candidate.value==='number'&&candidate.units==='L/plant/watering'));
  const showHistory=async()=>{try{setError('');setHistory(await api('/api/communities/'+encodeURIComponent(communityId)+'/history?'+new URLSearchParams({topic_id:topicId,stage,field})));}catch(e){setError(String(e));}};
  return <article className="irrigation-field"><div className="field-heading"><strong>{labels[field]}</strong><span className={'origin-badge origin-'+(current?.origin||'not-set')}>{origins[current?.origin||'not-set']}</span></div>
    <p className="current-value">Current: {current?.value===null||current?.value===undefined?'Not set':String(current.value)}{field==='amount'&&current?.value!==null&&current?.value!==undefined?' L/plant/watering':''}</p>
    <form onSubmit={async e=>{e.preventDefault();if(await save('field-set',{...data,mode:'user',value:field==='amount'?Number(value):value,rationale,evidence_id:evidenceId||undefined}))setHistory(null);}}>
      <label>Edit {field}<input aria-label={'Edit '+field} type={field==='amount'?'number':'text'} min={field==='amount'?0:undefined} step={field==='amount'?'any':undefined} value={value} required onChange={e=>setValue(e.target.value)}/></label><label>Adjustment note (optional)<input aria-label={'Adjustment note for '+field} value={rationale} onChange={e=>setRationale(e.target.value)}/></label><div className="actions"><button type="submit">Save {field}</button><button type="button" onClick={()=>{setValue(current?.value===null||current?.value===undefined?'':String(current.value));setRationale(current?.rationale||'');}}>Cancel</button><button type="button" onClick={async()=>{if(await save('field-set',{...data,mode:'clear',rationale})){setValue('');setHistory(null);}}}>Clear value</button></div>
    </form>
    {(candidates.length>0||baseline)&&<><label>Source baseline<select aria-label={'Source baseline for '+field} value={evidenceId} onChange={e=>setEvidenceId(e.target.value)}><option value="">{baseline?'Retained source baseline':'Choose evidence'}</option>{candidates.map(e=><option key={e.id} value={e.id}>{e.wording} {e.species_id===null?'(general guidance)':''}</option>)}</select></label><button disabled={!compatible} onClick={async()=>{if(await save('field-set',{...data,mode:'source',evidence_id:evidenceId||undefined,rationale})){setValue(String(candidate!.value));setHistory(null);}}}>Use source value</button>{candidate&&!compatible&&<p>A range, missing amount, general guidance or incompatible unit needs an explicit user planning decision.</p>}</>}
    <details onToggle={e=>{if(e.currentTarget.open)void showHistory();}}><summary>View evidence & changes</summary>
      {current?.changed_at&&<p>{current.actor} · {new Date(current.changed_at).toLocaleString()} · {current.rationale}</p>}
      {!baseline&&<p>No source amount/value has been adopted for this field.</p>}
      {baseline&&<section><h5>Retained source baseline</h5><Evidence evidence={baseline} openSource={openSource}/></section>}
      {candidates.filter(e=>e.id!==baseline?.id).map(e=><section key={e.id}><h5>Additional evidence candidate</h5><Evidence evidence={e} openSource={openSource}/></section>)}
      {error&&<p role="alert">{error}</p>}{history?.map(e=><p key={e.id}>{e.actor} · {new Date(e.changed_at).toLocaleString()} · {e.action}: {e.before?.value===null||e.before?.value===undefined?'Not set':String(e.before.value)} → {e.after?.value===null||e.after?.value===undefined?'Not set':String(e.after.value)} {e.after?.rationale&&'· '+e.after.rationale}</p>)}{history?.length===0&&<p>No changes yet.</p>}
    </details>
  </article>;
}

function Evidence({evidence:e,openSource}:{evidence:IrrigationEvidence;openSource:(ref:Ref)=>void}){return <><p>{e.wording}</p><p>Documented value: {e.value===null?'Not quantified / see wording':String(e.value)} {e.units}</p><p>Source context: {e.context}</p><p>Applicability: {e.applicability}</p>{e.limitations&&<p>Limitations: {e.limitations}</p>}<Refs refs={e.source_refs} open={openSource}/>{e.source_refs.map((r:any,i)=><small key={i} className="edition-hash">Edition SHA-256: {r.edition_sha256}</small>)}</>;}
