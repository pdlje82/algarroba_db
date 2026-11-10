"""Codex Desktop maintenance entry point. No browser endpoint can mutate accepted knowledge."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader
from .store import Store, ROOT, now
from .graph import Graph


def read(path): return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def bootstrap(store):
    if store.records('topics'):
        return {'status':'unchanged','revision':store.revision(),'note':'Existing accepted collection retained; use checked imports for updates.'}
    manifest=read(ROOT/"imports/source-manifest.json")
    for s in manifest["sources"]:
        path=Path(manifest["source_root"])/s["filename"]
        with path.open("rb") as f:
            if hashlib.file_digest(f,"sha256").hexdigest()!=s["sha256"]:
                raise ValueError(f"Edition mismatch: {s['id']}")
        if len(PdfReader(path).pages)!=s["pdf_pages"]:
            raise ValueError(f"Page count mismatch: {s['id']}")
    store.register_sources(manifest)
    batch={"batch_id":"initial-nine-documents-2026-11-05","summary":"Curated selected 68 PDF pages across nine verified editions.",
           "topics":[],"relationships":[],"findings":[],"coverage":[],"unresolved":[]}
    for name in ("ecosystems.json","water-technology.json","funding.json"):
        source=read(ROOT/"imports"/name)
        for key in ("topics","relationships","findings","coverage","unresolved"):
            batch[key].extend(source.get(key,[]))
    batch["batch_id"] += "-"+hashlib.sha256(json.dumps(batch,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:12]
    result=store.import_batch(batch)
    # Only pages accepted as inspected are indexed. Reading a complete PDF does not import its remaining pages.
    with store.connect() as c:
        for source in manifest["sources"]:
            reader=PdfReader(Path(manifest["source_root"])/source["filename"])
            rows=c.execute("SELECT page FROM coverage WHERE source_id=? AND status='inspected'",(source["id"],)).fetchall()
            for row in rows:
                page=row[0]; text=reader.pages[page-1].extract_text() or ""
                c.execute("INSERT INTO page_text VALUES (?,?,?) ON CONFLICT(source_id,page) DO UPDATE SET text=excluded.text",(source["id"],page,text))
        store.reindex(c)
    return result


def main():
    parser=argparse.ArgumentParser(description="Knowledge maintenance for Codex Desktop")
    sub=parser.add_subparsers(dest="command",required=True)
    sub.add_parser("bootstrap")
    p=sub.add_parser("import");p.add_argument("file");p.add_argument("--check",action="store_true")
    p=sub.add_parser("search");p.add_argument("term")
    p=sub.add_parser("inspect");p.add_argument("id")
    p=sub.add_parser("export");p.add_argument("--output")
    sub.add_parser("backup")
    sub.add_parser("groups")
    p=sub.add_parser('audit-organization');p.add_argument('--batch')
    p=sub.add_parser('edit');p.add_argument('file');p.add_argument('--check',action='store_true')
    p=sub.add_parser('project-edit');p.add_argument('file');p.add_argument('--check',action='store_true')
    sub.add_parser("media-integrity")
    sub.add_parser("backup-media")
    p=sub.add_parser("register-sources");p.add_argument("manifest")
    p=sub.add_parser("task-complete");p.add_argument("id");p.add_argument("--summary",required=True);p.add_argument("--needs-answer",action="store_true")
    p=sub.add_parser("task-files");p.add_argument("id")
    args=parser.parse_args();store=Store()
    if args.command=="bootstrap": result=bootstrap(store)
    elif args.command=="import": result=store.import_batch(read(args.file),args.check)
    elif args.command=="search": result=store.search(args.term)
    elif args.command=="inspect": result=Graph(store).inspect(args.id)
    elif args.command=="export":
        result=store.snapshot();graph=Graph(store);result['topic_organization']={t['id']:graph.organization(t['id']) for t in result['topics']}
        if args.output: Path(args.output).write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding="utf-8");result={"saved":args.output,"revision":result["revision"]}
    elif args.command=="media-integrity": result=store.media_integrity()
    elif args.command=="backup-media": result={"backup":str(store.backup_media())}
    elif args.command=="groups": result=store.records("browse_groups")
    elif args.command=='audit-organization':
        from .organization import organization_review
        snapshot=store.snapshot();previous=snapshot
        if args.batch:
            candidate=read(args.batch);store.import_batch(candidate,True)
            snapshot=dict(snapshot)
            for collection in ['topics','browse_groups']:
                records={x['id']:x for x in snapshot[collection]}
                records.update({x['id']:x for x in candidate.get(collection,[])})
                snapshot[collection]=list(records.values())
        result=dict(revision=store.revision(),**organization_review(snapshot,previous if args.batch else None))
    elif args.command=='edit':
        from .planning import Edit,apply_edit
        result=apply_edit(store,Edit.model_validate(read(args.file)),actor='Codex',dry_run=args.check)
    elif args.command=='project-edit':
        from .funding import ProjectEdit,edit_project
        result=edit_project(store,ProjectEdit.model_validate(read(args.file)),actor='Codex',dry_run=args.check)
    elif args.command=="backup": result={"backup":str(store.backup())}
    elif args.command=="register-sources": store.register_sources(read(args.manifest));result={"status":"registered"}
    else:
        with store.connect() as c:
            row=c.execute("SELECT data FROM tasks WHERE id=?",(args.id,)).fetchone()
            if not row: raise ValueError("Task not found")
            data=json.loads(row[0])
            if args.command=="task-complete":
                data.update(status="Needs an answer" if args.needs_answer else "Completed",summary=args.summary,completed=now(),completed_revision=store.revision(c))
                c.execute("UPDATE tasks SET status=?,data=? WHERE id=?",(data["status"],json.dumps(data,ensure_ascii=False),args.id))
            folder=ROOT/"research"/args.id;folder.mkdir(parents=True,exist_ok=True)
            (folder/"context.json").write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
            (folder/"prompt.txt").write_text(data["prompt"],encoding="utf-8")
            (folder/"brief.md").write_text(data["prompt"],encoding="utf-8")
            result={"status":data["status"],"folder":str(folder)}
    print(json.dumps(result,indent=2,ensure_ascii=False))


if __name__=="__main__": main()
