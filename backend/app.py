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

from .graph import Graph, PERSPECTIVES, LIMITS
from .store import Store, ROOT, now

DOMAIN = "Dryland and Mediterranean restoration, especially carob and associated vegetation; establishment water and irrigation; drone monitoring and water-delivery knowledge; selected Andalusian LEADER funding, with relevant places, organizations, findings, dates and requirements."


class Exploration(BaseModel):
    label: str = Field(min_length=1,max_length=160)
    state: dict
    history: list[dict] = []
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
        for s in snap["sources"]:
            s.pop("path",None)
        with store.connect() as c:
            imported=[dict(r) for r in c.execute("SELECT id,revision,created FROM batches ORDER BY revision")]
        return dict(snap,perspectives=[{"id":i,"label":l} for i,l in PERSPECTIVES],limits=LIMITS,domain=DOMAIN,batches=imported)

    @app.get("/api/view")
    def view(centre: str | None=None, search: str="", perspective: str="combined", limit:int=12,depth:int=6,compare:str="",branches:str=""):
        try:
            return graph().view(centre,search,perspective,limit,depth,[x for x in compare.split(",") if x],[x for x in branches.split(",") if x])
        except ValueError as e:
            raise HTTPException(400,str(e)) from e

    @app.get("/api/inspect/{record_id}")
    def inspect(record_id:str):
        result=graph().inspect(record_id)
        if not result["record"]:
            raise HTTPException(404,"This record is unavailable. Your exploration has been kept.")
        return result

    @app.get("/api/routes")
    def routes(centre:str,target:str,depth:int=6):
        g=graph(); centre=store.resolve(centre); target=store.resolve(target)
        if centre not in g.topics or target not in g.topics:
            raise HTTPException(404,"An endpoint is no longer available. Refresh the exploration.")
        paths=g.paths(centre,target,min(8,max(1,depth)),3)
        return {"routes":[{"id":f"route:{target}:alt:{i}","endpoint":target,"nodes":ns,"edges":es,"why":"Alternative recorded route"} for i,(ns,es) in enumerate(paths)],"limits":LIMITS}

    @app.get("/api/sources/{source_id}/file")
    def source_file(source_id:str):
        s=next((s for s in store.records("sources") if s["id"]==source_id),None)
        if not s:
            raise HTTPException(404,"Source is not registered.")
        path=Path(s["path"])
        if not path.is_file():
            raise HTTPException(404,f"Source missing: {s['filename']}. Restore the original edition in the library. The page locator remains available.")
        stat=path.stat(); signature=(stat.st_size,stat.st_mtime_ns)
        if source_cache.get(source_id)!=signature:
            with path.open("rb") as f:
                digest=hashlib.file_digest(f,"sha256").hexdigest()
            if digest!=s["sha256"]:
                raise HTTPException(409,"This PDF differs from the registered edition. Ask Codex to check the edition before using its page references.")
            source_cache[source_id]=signature
        return FileResponse(path,media_type="application/pdf",filename=s["filename"],content_disposition_type="inline")

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
        payload=dict(id=eid,label=value.label,revision=store.revision(),state=value.state,history=value.history[-100:],history_index=value.history_index)
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
        if context.get("centre"): ids.add(context["centre"])
        for route in context.get("routes",[]): ids.update(route.get("nodes",[]))
        g=graph()
        context["topic_labels"]={i:g.topics[i]["label"] for i in ids if i in g.topics}
        context["existing_findings"]=[f for f in g.findings if set(f["topic_ids"]) & ids][:30]
        context["knowledge_revision"]=store.revision()
        context["captured_revision"]=original_revision
        context["identity_reconciliation_required"]=original_revision is not None and original_revision!=store.revision()
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
Perspective: {dict(PERSPECTIVES).get(context.get('perspective'),context.get('perspective'))}
Connection detail: {context.get('detail','abbreviated')}
Selected topics: {json.dumps(context['topic_labels'],ensure_ascii=False)}
Selected relationships and constituent routes: {json.dumps({'relationship_ids':context.get('selected_relationship_ids',[]),'routes':context.get('routes',[])},ensure_ascii=False)}
Captured knowledge revision: {original_revision}; current revision: {store.revision()}.

Read this brief AND context.json; the live browser is not required. Inspect current records with
python -m backend.cli search / inspect / export. Reconcile all stable IDs and older view state
against the current knowledge before preparing mutations. SQLite is authoritative; exports are not editable masters.

Agreed domain: {DOMAIN}
Prioritize the requested areas, but capture ALL useful supported discoveries within the agreed
domain from the material actually inspected, including discoveries outside the original task.
Inspect the wider existing graph, including topics absent from this view. Reuse identities and
connect new discoveries to one another and to relevant existing records wherever evidence or
an explicitly explained curated association justifies it. Do not create isolated task graphs.
Keep source findings, curated discovery associations and practical recommendations distinct.
Preserve trial/applicant/territory/date conditions, original species spellings and exact PDF pages.
Missing connections mean 'No connection recorded', never proof of impossibility.

Follow the ingestion procedure in README.md and imports/CONTRACT.md: verify editions; read and
visually inspect the indicated material; record actual page coverage; prepare a validated batch;
apply through the single importer. Do not change the old source library. Initial coverage is 68
pages; reading additional pages is an explicit part of this later task and must be recorded.
Library only means no web research. If Library and web is selected, use relevant primary sources,
save new source files in this project with KGB-SRC IDs and register their metadata before import.
Ordinary new in-domain topics need no separate approval. Record material domain extensions as
proposals and ask the user before research/factual ingestion into them; continue in-domain work.
No AI API integration or autonomous/background agent system.

Return: (1) task answer, (2) additional useful discoveries, (3) links added across existing knowledge,
(4) inspected and unfinished coverage, (5) unresolved issues and proposed scope extensions.
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
            ids=set()
            for row in rows:
                batch=json.loads(row[0]);ids.update(batch.get("_changes",{}).get("added_topic_ids",[t["id"] for t in batch.get("topics",[])]))
        return {"revision":store.revision(),"added_topic_ids":sorted(ids)}

    if (ROOT/"dist").exists():
        app.mount("/",StaticFiles(directory=ROOT/"dist",html=True),name="frontend")
    return app


app=create_app()
