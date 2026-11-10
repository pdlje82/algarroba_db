from __future__ import annotations
import hashlib
import json
import threading
import uuid
import os
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .graph import Graph, ROOT_GROUPS, LIMITS
from .store import Store, ROOT, now
from .plant_media import enrich_topics, public_image, managed_path
from .planning import Edit, Conflict, apply_edit, field_history
from .organization import organization_review

DOMAIN = "Dryland and Mediterranean restoration, especially carob and associated vegetation; establishment water and irrigation; drone monitoring and water-delivery knowledge; selected Andalusian LEADER funding, with relevant places, organizations, findings, dates and requirements."


class Exploration(BaseModel):
    label: str = Field(min_length=1,max_length=160)
    state: dict
    history: list[dict] | dict = []
    history_index: int = 0


class ResearchDraft(BaseModel):
    task_id: str | None = Field(default=None,pattern=r"^KGB-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$")
    context: dict
    areas: list[str] = []
    custom_topics: str = ""
    instruction: str = "Find more information"
    source_scope: Literal["Library only","Library and web"] = "Library only"
    library_files: list[str] = []
    proposed_extension: str = ""
    prompt: str | None = None


def create_app(store: Store | None = None):
    store = store or Store()
    app = FastAPI(title="Algarroba Knowledge Browser",docs_url=None,redoc_url=None)
    app.add_middleware(TrustedHostMiddleware,allowed_hosts=["127.0.0.1","localhost","testserver"])
    graph_cache = {"revision":-1,"graph":None}
    source_cache={}
    cache_lock=threading.Lock()

    def graph():
        revision=store.revision()
        with cache_lock:
            if graph_cache["revision"]!=revision:
                graph_cache.update(revision=revision,graph=Graph(store))
            return graph_cache["graph"]

    @app.middleware("http")
    async def local_writes(request: Request, call_next):
        origin=request.headers.get("origin")
        if request.method not in {"GET","HEAD","OPTIONS"} and origin and origin != str(request.base_url).rstrip("/"):
            return JSONResponse({"detail":"Open this action from the Knowledge Browser window."},status_code=403)
        response=await call_next(request)
        response.headers["X-Content-Type-Options"]="nosniff"
        return response

    @app.get("/api/catalog")
    def catalog():
        snap=store.snapshot()
        snap["topics"]=enrich_topics(snap["topics"],snap["plant_images"],store.resolve)
        snap["plant_images"]=[public_image(x) for x in snap["plant_images"]]
        for s in snap["sources"]:
            s.pop("path",None)
        with store.connect() as c:
            imported=[dict(r) for r in c.execute("SELECT id,revision,created FROM batches ORDER BY revision")]
            redirects={r["old_id"]:r["new_id"] for r in c.execute("SELECT old_id,new_id FROM redirects")}
        return dict(snap,organization_review=organization_review(snap),identity_redirects=redirects,root_groups=ROOT_GROUPS,topic_kinds=sorted({t["kind"] for t in snap["topics"]}),limits=LIMITS,domain=DOMAIN,batches=imported)

    @app.post('/api/organization/edit')
    def organization_edit(edit: Edit):
        if not (edit.action.startswith('group-') or edit.action.startswith('members-') or edit.action=='revert'):
            raise HTTPException(400,'This endpoint edits organization only.')
        return save_edit(edit)

    @app.post('/api/communities/edit')
    def communities_edit(edit: Edit):
        if not (edit.action.startswith('community-') or edit.action in {'plants-add','plant-remove','plant-edit','plant-plan-set','stage-set','field-set','revert'}):
            raise HTTPException(400,'This endpoint edits working communities only.')
        return save_edit(edit)

    def save_edit(edit):
        try:return apply_edit(store,edit)
        except Conflict as error:raise HTTPException(409,str(error)) from error
        except (ValueError,KeyError,TypeError) as error:raise HTTPException(400,str(error)) from error

    @app.get('/api/communities/{community_id}/history')
    def community_history(community_id:str,topic_id:str,stage:str,field:str):
        return field_history(store,community_id,topic_id,stage,field)

    @app.get("/api/explore")
    def explore(scope:str="overview",group_id:str|None=None,centre:str|None=None,search:str="",domain:str="all",kinds:str="",depth:int=6,member_ids:str|None=None):
        try:return graph().explore(scope,group_id,centre,search,domain,[k for k in kinds.split(',') if k],depth,None if member_ids is None else [i for i in member_ids.split(',') if i])
        except ValueError as e:raise HTTPException(400,str(e)) from e

    @app.get("/api/comparison")
    def comparison(topics:str=""):
        try:return graph().comparison([i for i in topics.split(',') if i])
        except ValueError as e:raise HTTPException(400,str(e)) from e

    @app.get("/api/inspect/{record_id}")
    def inspect(record_id:str):
        result=graph().inspect(record_id)
        if not result["record"]:
            raise HTTPException(404,"This record is unavailable. Your exploration has been kept.")
        return result

    @app.get("/api/routes")
    def routes(centre:str,target:str,depth:int=6):
        try:return graph().routes(centre,target,depth)
        except ValueError as e:raise HTTPException(404,str(e)) from e

    @app.get("/api/sources/{source_id}/file")
    def source_file(source_id:str):
        s=next((s for s in store.records("sources") if s["id"]==source_id),None)
        if not s:
            raise HTTPException(404,"Source is not registered.")
        path=store.source_path(s)
        if not path.is_file():
            raise HTTPException(404,f"Source missing: {s['filename']}. Restore the original edition in the library. The page locator remains available.")
        stat=path.stat(); signature=(stat.st_size,stat.st_mtime_ns)
        if source_cache.get(source_id)!=signature:
            with path.open("rb") as f:
                digest=hashlib.file_digest(f,"sha256").hexdigest()
            if digest!=s["sha256"]:
                raise HTTPException(409,"This source differs from the registered edition. Ask Codex to check the edition before using its references.")
            source_cache[source_id]=signature
        kind=s.get('kind','pdf')
        media_type='application/pdf' if kind=='pdf' else 'image/png' if kind=='image' else 'text/plain; charset=utf-8'
        return FileResponse(path,media_type=media_type,filename=s["filename"],content_disposition_type="inline")

    @app.get('/api/plant-images/{image_id}/{variant}')
    def plant_image(image_id: str, variant: str, request: Request):
        record=next((x for x in store.records('plant_images') if x['id']==image_id),None)
        if not record or variant not in record['files']:
            raise HTTPException(404,'This plant image or variant is not registered.')
        spec=record['files'][variant]
        try:path=managed_path(store.media_root,spec['path'])
        except ValueError as error:raise HTTPException(409,str(error)) from error
        if not path.is_file():raise HTTPException(404,'Plant image unavailable. Restore the managed media files and retry.')
        stat=path.stat();signature=(str(path),stat.st_size,stat.st_mtime_ns)
        if source_cache.get(('plant',image_id,variant))!=signature:
            if hashlib.sha256(path.read_bytes()).hexdigest()!=spec['sha256']:
                raise HTTPException(409,'Plant image checksum mismatch. Restore the registered image and retry.')
            source_cache[('plant',image_id,variant)]=signature
        etag='"'+spec['sha256']+'"'
        from starlette.responses import Response
        headers={'ETag':etag,'Cache-Control':'private, max-age=0, must-revalidate'}
        if request.headers.get('if-none-match')==etag:return Response(status_code=304,headers=headers)
        return FileResponse(path,media_type=spec['mime'],headers=headers,content_disposition_type='inline')

    @app.get("/api/explorations")
    def explorations():
        with store.connect() as c:
            return [dict(r) for r in c.execute("SELECT id,label,updated FROM explorations ORDER BY updated DESC")]

    @app.get("/api/explorations/{exploration_id}")
    def exploration(exploration_id:str):
        with store.connect() as c:
            row=c.execute("SELECT data FROM explorations WHERE id=?",(exploration_id,)).fetchone()
            if not row: raise HTTPException(404,"Saved exploration unavailable.")
            result=json.loads(row[0])
            result["reconciled_revision"]=store.revision(c)
            state=result.get("state",{})
            if state.get("centre"): state["centre"]=store.resolve(state["centre"])
            return result

    @app.post("/api/explorations")
    def save_exploration(value:Exploration):
        eid=uuid.uuid4().hex
        payload=dict(id=eid,label=value.label,revision=store.revision(),state=value.state,history=value.history if isinstance(value.history,dict) else value.history[-100:],history_index=value.history_index)
        with store.connect() as c:
            c.execute("INSERT INTO explorations VALUES (?,?,?,?)",(eid,value.label,now(),json.dumps(payload)))
        return payload

    def prepare(draft:ResearchDraft,task_id:str):
        context=dict(draft.context)
        original_revision=context.get("knowledge_revision",context.get("revision"))
        centre=context.get("centre")
        if centre:
            context["centre"]=store.resolve(centre)
        selection=context.get("selected_topic_ids",[])
        context["selected_topic_ids"]=[store.resolve(x) for x in selection]
        ids=set(context["selected_topic_ids"])
        ids.update(context.get("visible_topic_ids",[]))
        if context.get("centre"): ids.add(context["centre"])
        for route in context.get("routes",[]): ids.update(route.get("nodes",[]))
        g=graph()
        context["topic_labels"]={i:g.topics[i]["label"] for i in ids if i in g.topics}
        context["species_names"]={i:{k:g.topics[i].get(k) for k in ("spanish_name","english_name","scientific_name","name_status","name_note","name_references")} for i in sorted(ids) if i in g.topics and g.topics[i]["kind"]=="species"}
        context["existing_findings"]=[f for f in g.findings if set(f["topic_ids"]) & ids]
        context["knowledge_revision"]=g.snapshot['revision']
        context["captured_revision"]=original_revision
        context["identity_reconciliation_required"]=original_revision is not None and original_revision!=g.snapshot['revision']
        context["browse_groups"]=g.snapshot['browse_groups']
        context["browse_group_revision"]=g.snapshot['revision']
        context['organization_roots']=g.snapshot['organization_roots']
        context['communities']=g.snapshot['communities']
        context['irrigation_evidence']=g.snapshot['irrigation_evidence']
        context["topic_organization"]={i:g.organization(i) for i in ids if i in g.topics}
        context["selected_relationships"]=[g.edges[e] for e in context.get("selected_relationship_ids",[]) if e in g.edges]
        text=f"""# Research task {task_id}
Created: {now()}
Project: {ROOT}
Saved context: {ROOT / 'research' / task_id / 'context.json'}

Requested outcome: {draft.instruction}
Priority areas: {', '.join(draft.areas) or 'Current exploration'}
Additional topics: {draft.custom_topics or 'None'}
Source boundary: {draft.source_scope}
Selected library files: {', '.join(draft.library_files) or 'Use relevant registered library sources within the task; record exactly what you inspect.'}
Proposed domain extension: {draft.proposed_extension or 'None'}

Centre: {context.get('topic_labels',{}).get(context.get('centre'),context.get('centre') or 'Overview')}
Raw search: {context.get('search') or '(empty)'}
Scope: {context.get('scope',context.get('view_state',{}).get('scope','legacy exploration'))}
Filters: {json.dumps(context.get('filters',{}),ensure_ascii=False)}
Grouping: {context.get('grouping','none')}
Expanded routes: {json.dumps(context.get('expanded_route_ids',[]))}
Selected topics: {json.dumps(context['topic_labels'],ensure_ascii=False)}
Species names by stable database ID: {json.dumps({i:{k:n[k] for k in ('spanish_name','english_name','scientific_name','name_status')} for i,n in context['species_names'].items()},ensure_ascii=False)}
Selected relationships and constituent routes: {json.dumps({'relationship_ids':context.get('selected_relationship_ids',[]),'routes':context.get('routes',[])},ensure_ascii=False)}
Captured knowledge revision: {original_revision}; current revision: {store.revision()}.
{('Irrigation evidence request (planning context, not scientific evidence):' + chr(10) + json.dumps(context['irrigation_request'],ensure_ascii=False)) if context.get('irrigation_request') else ''}

Read this brief AND context.json; the live browser is not required. Inspect current records with
python -m backend.cli search / inspect / export. Reconcile all stable IDs and older view state
against the current knowledge before preparing mutations. SQLite is authoritative; exports are not editable masters.
Version-six view_state and view_history use one canonical exploration. Older pooled histories are
read through frontend/migration.ts; pool indices are presentation references, never knowledge IDs.

Persistent browsing groups and maintenance rules:
{json.dumps(context['browse_groups'],ensure_ascii=False)}

Root labels, community plans and irrigation candidates (user decisions are not scientific evidence):
{json.dumps({k:context[k] for k in ('organization_roots','communities','irrigation_evidence')},ensure_ascii=False)}
Review the current group definitions before imports. Reuse their anchors and update primary/shared
memberships with supported discoveries in the same validated batch. Grouping never creates a factual
relationship. Reconcile older captured groups with the current revision; keep wider discoveries.
Follow docs/COMMUNITY_PLANNING.md#knowledge-tree-organization in every domain. Separate reusable
concepts from project/trial details, components, participants, sites and dated events. Use named
hierarchy folders and genuine peer catalogues; do not infer ownership from a shared PDF. Run
python -m backend.cli audit-organization, and review import organization_warnings. Warnings are
advisory, not a reason to invent a parent. Uncertain placement belongs in Needs organization and
must be reported as unfinished. Preserve the established funding responsibility chain.

Required project intake: follow docs/COMMUNITY_PLANNING.md#project-intake-and-summaries in every
domain, including example projects. Inventory each useful project/study/pilot in the run sidecar
with source passages, existing/new topic IDs, documented umbrella/trial context, summary/finding/link
disposition and gaps. Reuse a dedicated topic; a company, source registration or folder alone does
not represent the project. Use project/study/trial kinds as supported, keeping implementers and
genuine programmes distinct. Never infer an umbrella from an acronym, shared PDF or location.
Each new or substantively revised project topic needs a concise cited summary in description:
purpose and work (what and why); techniques and scope; key findings; conditions and limits; dated
status and evidence gaps. Say 'Not reported in the reviewed material' where evidence is absent.
Refresh existing summaries in the same intake when new evidence materially changes work, results,
conditions or status, including projects outside the initial selection.
Keep planting season, site, species/stock, treatment/comparator, duration and denominators where
consequential. An observed benefit in one setting does not establish 'only works if'. Preserve
negative/conflicting findings and distinguish plans from measured outcomes.
Anchor project folders to the real topic and make Project/Study/Pilot visible in new/revised labels.
Use meaningful detail folders/topics only when needed; reuse general concepts through shared
references. Put detailed results in cited findings on the actual project/trial, preserving IDs and
attachments. Do not create empty template levels, duplicate concepts or a node per result sentence.
During the same checked intake, search the whole graph for techniques, species, conditions,
equipment, monitoring, participants, places and documented funding; reuse valid relationships and
add useful justified missing links with meaning, direction, basis, explanation and exact citations.
Cross-linking is required during ingestion, never a reason to invent an edge or infer eligibility.
Before completion reconcile the project inventory, summaries, details, findings and links; inspect
the folder/About-to-summary-to-evidence journey and report missing evidence or unfinished work.
These are curator checks: import --check and audit-organization do not verify PDF project coverage
or summary completeness. Organization warnings remain advisory; no new import blockers.

Agreed domain: {DOMAIN}
Prioritize the requested areas, but capture ALL useful supported discoveries within the agreed
domain from the material actually inspected, including discoveries outside the original task.
Inspect the wider existing graph, including topics absent from this view. Reuse identities and
connect new discoveries to one another and to relevant existing records wherever evidence or
an explicitly explained curated association justifies it. Do not create isolated task graphs.
Connectivity review during ingestion is required for every new or substantively revised topic
in all domains; resolve useful supported links now and report evidence gaps explicitly.
Keep source findings, curated discovery associations and practical recommendations distinct.
Preserve trial/applicant/territory/date conditions, original species spellings and exact PDF pages.
Every source link needs a visible, passage-specific heading or keyword (SourceRef.label), plus
document title and exact page/section. Preserve the precise locator; distinguish links to the same
document. Use only checked headings or faithful paraphrases; never invent a missing heading.
Missing connections mean 'No connection recorded', never proof of impossibility.

Follow the ingestion procedure in README.md and imports/CONTRACT.md: verify editions; read and
visually inspect the indicated material; record actual page coverage; prepare a validated batch;
apply through the single importer. Do not change the old source library. Read current accepted
coverage; the original bootstrap's 68 positions are a historical baseline, not a later task limit.
Reading additional authorized pages must be recorded honestly.
Library only means no web research. If Library and web is selected, use relevant primary sources,
save new source files in this project with KGB-SRC IDs and register their metadata before import.
Ordinary new in-domain topics need no separate approval. Record material domain extensions as
proposals and ask the user before research/factual ingestion into them; continue in-domain work.
No AI API integration or autonomous/background agent system.

Return: (1) task answer, (2) additional useful discoveries, (3) links added across existing knowledge,
(4) inspected and unfinished coverage, (5) unresolved issues and proposed scope extensions,
(6) project inventory reconciliation: identities, summaries, key findings, links and remaining gaps.
Complete the task record with python -m backend.cli task-complete {task_id} --summary "...".
The user can reopen/refresh the original exploration with additions highlighted.
"""
        return context,text

    @app.post("/api/research/preview")
    def preview(draft:ResearchDraft):
        tid=draft.task_id or "KGB-"+now()[:10]+"-"+uuid.uuid4().hex[:8]
        context,prompt=prepare(draft,tid)
        return {"context":context,"prompt":prompt,"task_id":tid}

    @app.post("/api/research")
    def research(draft:ResearchDraft):
        tid=draft.task_id or "KGB-"+now()[:10]+"-"+uuid.uuid4().hex[:8]
        context,prompt=prepare(draft,tid)
        # An edited preview is preserved verbatim together with the exact machine-readable context.
        payload={"id":tid,"created":now(),"status":"Needs an answer" if draft.proposed_extension.strip() else "Prepared",
                 **draft.model_dump(),"context":context,"prompt":draft.prompt if draft.prompt is not None else prompt}
        with store.connect() as c:
            prior=c.execute("SELECT data,status FROM tasks WHERE id=?",(tid,)).fetchone()
            if prior:
                if prior["status"]=="Completed":raise HTTPException(409,"This task is completed. Prepare a new research task to continue.")
                previous=json.loads(prior["data"]);payload["created"]=previous["created"]
                payload["prompt_history"]=previous.get("prompt_history",[])
                if previous.get("prompt")!=payload["prompt"]:payload["prompt_history"]=(payload["prompt_history"]+[previous["prompt"]])[-10:]
                c.execute("UPDATE tasks SET status=?,data=? WHERE id=?",(payload["status"],json.dumps(payload,ensure_ascii=False),tid))
            else:c.execute("INSERT INTO tasks VALUES (?,?,?,?)",(tid,payload["status"],payload["created"],json.dumps(payload,ensure_ascii=False)))
        folder=ROOT/"research"/tid
        try:
            folder.mkdir(parents=True,exist_ok=True)
            (folder/"brief.md").write_text(prompt,encoding="utf-8")
            (folder/"prompt.txt").write_text(payload["prompt"],encoding="utf-8")
            (folder/"context.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding="utf-8")
        except OSError:
            payload["file_warning"]="Task is saved in the database. Retry materializing its files with the maintenance CLI."
        return payload

    @app.get("/api/research")
    def tasks():
        with store.connect() as c:
            return [dict(json.loads(r["data"]),status=r["status"]) for r in c.execute("SELECT * FROM tasks ORDER BY created DESC")]

    @app.get("/api/health")
    def health():
        return {"status":"ready","revision":store.revision(),"database":"SQLite","mode":"local","application":"algarroba-knowledge-browser","project":str(ROOT),"pid":os.getpid()}

    @app.get("/api/changes")
    def changes(since:int=0):
        with store.connect() as c:
            rows=c.execute("SELECT data FROM batches WHERE revision>? ORDER BY revision",(since,)).fetchall()
            ids=set();groups=set()
            for row in rows:
                batch=json.loads(row[0]);groups.update(batch.get("_changes",{}).get("browse_group_ids",[]));ids.update(batch.get("_changes",{}).get("added_topic_ids",[t["id"] for t in batch.get("topics",[])]))
        return {"revision":store.revision(),"added_topic_ids":sorted(ids),"browse_group_ids":sorted(groups)}

    if (ROOT/"dist").exists():
        app.mount("/",StaticFiles(directory=ROOT/"dist",html=True),name="frontend")
    return app


app=create_app()
