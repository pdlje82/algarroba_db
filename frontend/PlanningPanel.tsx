import React, {useEffect, useRef, useState} from 'react';
import {api, type Catalog, type Ref} from './types';
import {groupDomain, type EditorTarget} from './organization';
import {Refs} from './dialogs';
import {CommunityWorkspace} from './CommunityWorkspace';
import type {PlanSave} from './communityPlan';

type Props={open:boolean;catalog:Catalog;target:EditorTarget;close:()=>void;changed:(catalog:Catalog)=>Promise<void>;navigate:(id:string)=>void;openSource:(ref:Ref)=>void;researchContext:()=>any;taskCreated:(task:any)=>void};

function title(id:string,c:Catalog){const t=c.topics.find(t=>t.id===id);return t?[t.spanish_name,t.english_name,t.scientific_name].filter(Boolean).join(' · ')||t.label:id;}
function includes(text:string,term:string){return text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(term.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());}

export function PlanningPanel({open,catalog:c,target,close,changed,navigate,openSource,researchContext,taskCreated}:Props){
  const [group,setGroup]=useState(''),[communityId,setCommunityId]=useState('');
  const [setup,setSetup]=useState(false);
  const [name,setName]=useState(''),[parent,setParent]=useState('ecosystem:habitats'),[search,setSearch]=useState(''),[chosen,setChosen]=useState<string[]>([]),[destination,setDestination]=useState('');
  const [sourceId,setSourceId]=useState(''),[sourcePlants,setSourcePlants]=useState<string[]>([]),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [editRevision,setEditRevision]=useState(c.revision),opened=useRef(false),lastTarget=useRef('');
  const history=useRef<Record<EditorTarget['kind'],{undo:string[];redo:string[];head:number|null}>>({group:{undo:[],redo:[],head:null},community:{undo:[],redo:[],head:null}});
  const edits=history.current[target.kind];
  const folders=[...(c.organization_roots||[]),...c.browse_groups];
  const ecosystemFolders=folders.filter(g=>groupDomain(g.id,c)==='ecosystem');
  useEffect(()=>{
    const key=JSON.stringify(target);
    if(open && (!opened.current || lastTarget.current!==key)){
      setEditRevision(c.revision);setName('');setSearch('');setChosen([]);setDestination('');setSourcePlants([]);setError('');setStatus('');
      if(target.kind==='group'){
        const id=target.id || c.organization_roots[0].id;
        setGroup(id);setParent(id);setSourceId('');setCommunityId('');
      }else{
        setSetup(!target.id);
        const community=c.communities.find(g=>g.id===target.id);
        setCommunityId(target.id || '');setGroup('');setParent(community?.parent_id || 'ecosystem:habitats');
        setSourceId(target.sourceId || (community?.kind==='source'?community.id:''));
      }
      lastTarget.current=key;
    }
    opened.current=open;
  },[open,target,c.revision]);
  const execute=async(action:string,data:Record<string,unknown>,kind:'new'|'undo'|'redo'='new',expectedRevision=editRevision)=>{
    setBusy(true);setError('');setStatus('');
    try{
      if(kind!=='new' && edits.head!==c.revision)throw new Error('Undo conflicts with a later change. Refresh without overwriting it.');
      const endpoint=target.kind==='group'?'/api/organization/edit':'/api/communities/edit';
      const result=await api(endpoint,{method:'POST',body:JSON.stringify({expected_revision:expectedRevision,action,data})});
      if(kind==='new'){edits.undo.push(result.event_id);edits.redo=[];}
      else if(kind==='undo'){edits.undo.pop();edits.redo.push(result.event_id);}
      else{edits.redo.pop();edits.undo.push(result.event_id);}
      edits.head=result.revision;
      setEditRevision(result.revision);
      const fresh=await api<Catalog>('/api/catalog');
      await changed(fresh);
      if(result.affected_id?.startsWith('community:')){setCommunityId(result.affected_id);setSetup(false);}
      else if(result.affected_id?.startsWith('browse:')){setGroup(result.affected_id);setParent(result.affected_id);}
      setStatus('Saved.');return fresh;
    }catch(e){setError(String(e));return null;}finally{setBusy(false);}
  };
  const save:PlanSave=(a,d,r)=>execute(a,d,'new',r);
  const refreshEditor=async()=>{try{const fresh=await api<Catalog>('/api/catalog');await changed(fresh);setEditRevision(fresh.revision);setError('');setStatus('Refreshed. Review current values before saving your retained draft.');return fresh;}catch(e){setError(String(e));return null;}};
  const selectedGroup=folders.find(g=>g.id===group),custom=c.browse_groups.find(g=>g.id===group);
  const community=c.communities?.find(g=>g.id===communityId);
  const originCommunity=c.communities?.find(g=>g.id===sourceId);
  const originTopic=c.topics.find(g=>g.id===sourceId);
  const candidateIds=originCommunity?originCommunity.plants.map(p=>p.topic_id):c.relationships.filter(e=>e.source===sourceId||e.target===sourceId).map(e=>e.source===sourceId?e.target:e.source).filter(id=>c.topics.find(t=>t.id===id)?.kind==='species');
  const references=c.topics.filter(t=>t.kind==='habitat');
  const toggle=(id:string,values:string[],setter:(v:string[])=>void)=>setter(values.includes(id)?values.filter(v=>v!==id):[...values,id]);
  if(!open)return null;
  if(target.kind==='community' && community && !setup)return <CommunityWorkspace key={community.id} community={community} catalog={c} save={save} refresh={refreshEditor} close={close} manage={!target.id?()=>{setCommunityId('');setSetup(true);}:undefined} copy={()=>{setSourceId(community.id);setSourcePlants([]);setCommunityId('');setName('');setParent(community.parent_id);setSetup(true);}} busy={busy} error={error} status={status} undo={()=>execute('revert',{event_id:edits.undo.at(-1)},'undo')} redo={()=>execute('revert',{event_id:edits.redo.at(-1)},'redo')} canUndo={!!edits.undo.length} canRedo={!!edits.redo.length} researchContext={researchContext} taskCreated={taskCreated}/>;
  const editorLabel=target.kind==='group'?'Group editor':'Community editor';
  return <div className="modal-shade"><section className="modal planning-panel" role="dialog" aria-modal="true" aria-label={editorLabel}>
    <header><div><p className="eyebrow">{target.kind==='group'?'ORGANIZE':'COMMUNITY & IRRIGATION'}</p><h2>{editorLabel}</h2></div><button aria-label="Close editor" onClick={close}>Close</button></header>
    <div className="actions"><button disabled={busy||!edits.undo.length} onClick={()=>execute('revert',{event_id:edits.undo.at(-1)},'undo')}>Undo edit</button><button disabled={busy||!edits.redo.length} onClick={()=>execute('revert',{event_id:edits.redo.at(-1)},'redo')}>Redo edit</button><button disabled={busy} onClick={()=>void refreshEditor()}>Refresh editor</button></div>
    {editRevision!==c.revision&&<p className="notice">Data changed while this draft was open. Refresh the editor to review current values before saving.</p>}{error&&<p role="alert" className="notice">{error}</p>}{status&&<p role="status">{status}</p>}
    <fieldset disabled={busy} className="planning-content">
    {target.kind==='group'?<div className="planning-columns">
      <div><h3>Permanent groups</h3>{!target.id&&<select aria-label="Selected group" value={group} onChange={e=>{setGroup(e.target.value);setParent(e.target.value);setChosen([]);}}>{folders.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select>}
      {selectedGroup?<><p><strong>{selectedGroup.label}</strong></p><small>{group}</small><div className="actions"><button onClick={()=>navigate(group)}>Open group in graph</button><button disabled={!custom?.user_created||!!custom.anchor_topic_id} onClick={async()=>{if(await save('group-delete',{id:group}))setGroup('ecosystem:habitats');}}>Delete empty group</button></div>
      <form onSubmit={e=>{e.preventDefault();void save('group-rename',{id:group,label:name});}}><label>Name<input aria-label="Group name" value={name} onChange={e=>setName(e.target.value)} maxLength={160} required/></label><button type="submit">Rename group</button></form></>:<p>Group unavailable. Choose another group or return to the overview.</p>}
      <label>Parent / destination<select aria-label="Group parent" value={parent} onChange={e=>setParent(e.target.value)}>{['ecosystem','technology','funding'].map(d=><option key={d} value={'domain:'+d}>{d} · top level</option>)}{folders.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      <div className="actions"><button disabled={!name.trim()} onClick={()=>save('group-create',{label:name,parent_id:parent})}>New group / subgroup</button><button disabled={!custom} onClick={()=>save('group-move',{id:group,parent_id:parent})}>Move group to parent</button></div>
      <p className="muted">Folders organize records. They do not change source-backed names or create factual connections.</p></div>
      <div><h3>Organize topics</h3><label>Find topics<input aria-label="Find topics to organize" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="planning-picker">{c.topics.filter(t=>includes([t.label,...t.aliases||[],t.spanish_name,t.english_name,t.scientific_name].join(' '),search)).map(t=><label key={t.id}><input type="checkbox" checked={chosen.includes(t.id)} onChange={()=>toggle(t.id,chosen,setChosen)}/>{title(t.id,c)}</label>)}</div>
      <p>{chosen.length} selected</p><label>Destination folder<select aria-label="Membership destination" value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Choose a folder</option>{c.browse_groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label><div className="actions"><button disabled={!chosen.length||!destination} onClick={()=>save('members-move',{group_id:destination,topic_ids:chosen})}>Move to…</button><button disabled={!chosen.length||!destination} onClick={()=>save('members-share',{group_id:destination,topic_ids:chosen})}>Also show in…</button><button disabled={!chosen.length||!custom} onClick={()=>save('members-remove',{group_id:group,topic_ids:chosen})}>Remove from selected group</button></div>
      {custom&&<details><summary>Direct members · {custom.members.length}</summary>{custom.members.map(m=><p key={m.topic_id}>{title(m.topic_id,c)} <small>({m.role})</small></p>)}<p>{custom.maintenance_rule}</p></details>}</div>
    </div>:<>
      {(!target.id||community?.kind==='source'||setup)&&<div className="planning-columns"><div><h3>Working communities</h3>{!target.id&&<label>Community<select aria-label="Selected community" value={communityId} onChange={e=>{setCommunityId(e.target.value);setSetup(false);}}><option value="">Choose a community</option>{c.communities?.map(g=><option key={g.id} value={g.id}>{g.label} · {g.kind==='source'?'Source-described':'User-defined'}</option>)}</select></label>}
      <label>New community name<input aria-label="New community name" value={name} onChange={e=>setName(e.target.value)} maxLength={160}/></label><label>Community folder<select aria-label="Community folder" value={parent} onChange={e=>setParent(e.target.value)}>{ecosystemFolders.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label><button disabled={!name.trim()} onClick={()=>save('community-create',{label:name,parent_id:parent})}>New community</button></div>
      <div><h3>Start from research</h3><label>Source-described reference<select aria-label="Source community reference" value={sourceId} onChange={e=>{setSourceId(e.target.value);setSourcePlants([]);}}><option value="">Choose a reference</option>{references.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}{c.communities?.filter(g=>g.kind==='source').map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      {sourceId&&<><p>{originTopic?.description||originCommunity?.context}</p><Refs catalog={c} refs={originTopic?.source_refs||originCommunity?.basis||[]} open={openSource}/><p>Select associations for your mix. This selection is not a documented planting recipe.</p><div className="planning-picker">{[...new Set(candidateIds)].map(id=><label key={id}><input type="checkbox" checked={sourcePlants.includes(id)} onChange={()=>toggle(id,sourcePlants,setSourcePlants)}/>{title(id,c)}</label>)}</div><button disabled={!name.trim()} onClick={()=>save('community-copy',{label:name,parent_id:parent,origin_id:sourceId,topic_ids:sourcePlants})}>Create editable community from this</button></>}</div></div>}
      {target.id&&!community&&!setup&&<p>Community unavailable. Close the editor and select an existing community.</p>}
    </>}
    </fieldset>
  </section></div>;
}
