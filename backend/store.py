"""The single authoritative SQLite store, including atomic curated imports."""
from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import unicodedata
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from .plant_media import PlantImage, validate_image, managed_path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("KGB_DATABASE", ROOT / "data" / "knowledge.sqlite"))


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalized(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text.casefold()) if not unicodedata.combining(c))


class Record(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(min_length=1, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$")


class SourceRef(BaseModel):
    model_config = ConfigDict(extra="allow")
    source_id: str
    page: int | None = Field(default=None, ge=1)
    locator: str = ""

    @model_validator(mode='before')
    @classmethod
    def check_optional_label(cls, value):
        # Keep legacy/snapshot shapes unchanged; new labels are validated when supplied.
        if isinstance(value, dict) and 'label' in value:
            label=value['label']
            if not isinstance(label,str) or not label.strip() or len(label)>240:
                raise ValueError('Citation label must be a nonempty heading or keyword of at most 240 characters')
        return value


class NameReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1)
    url: str = Field(pattern=r"^https://")
    fields: list[Literal["spanish_name", "english_name", "scientific_name"]] = Field(min_length=1)
    accessed: str
    note: str = ""


class Topic(Record):
    label: str = Field(min_length=1)
    kind: str
    domain: Literal["ecosystem", "technology", "funding"]
    description: str = Field(min_length=1)
    aliases: list[str] = []
    spanish_name: str | None = Field(default=None, min_length=1)
    english_name: str | None = Field(default=None, min_length=1)
    scientific_name: str | None = Field(default=None, min_length=1)
    name_note: str = ""
    name_status: Literal["recorded", "source-spelling", "genus-only"] = "recorded"
    name_references: list[NameReference] = []
    group_id: str = "other"
    source_refs: list[SourceRef] = Field(min_length=1)


class Relationship(Record):
    source: str
    target: str
    label: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    basis: Literal["source", "curated"] = "source"
    source_refs: list[SourceRef] = Field(min_length=1)
    traversable: bool = True


class Finding(Record):
    label: str
    text: str = Field(min_length=1)
    topic_ids: list[str] = Field(min_length=1)
    kind: Literal["finding", "recommendation"] = "finding"
    source_refs: list[SourceRef] = Field(min_length=1)


class Coverage(BaseModel):
    source_id: str
    page: int = Field(ge=1)
    status: Literal["inspected", "unresolved"]
    note: str = Field(min_length=1)


ROOT_BROWSE_GROUPS = {"ecosystem:species", "ecosystem:habitats", "ecosystem:restoration-methods", "technology:irrigation", "technology:drones", "technology:monitoring", "funding:programmes", "funding:activities", "funding:requirements"}

class BrowseMember(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic_id: str
    role: Literal["primary", "shared"] = "primary"

class BrowseGroup(Record):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1)
    parent_id: str
    anchor_topic_id: str | None = None
    user_created: bool = False
    members: list[BrowseMember] = []
    maintenance_rule: str = Field(min_length=1)
    description: str = ""
    source_refs: list[SourceRef] = []
    member_layout: Literal["grid", "vertical"] = "grid"
    presentation: Literal["standard", "hierarchy"] = "standard"

class Batch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    batch_id: str = Field(min_length=1)
    summary: str
    base_revision: int | None = None
    topics: list[Topic] = []
    relationships: list[Relationship] = []
    findings: list[Finding] = []
    coverage: list[Coverage] = []
    unresolved: list[dict] = []
    redirects: dict[str, str] = {}
    browse_groups: list[BrowseGroup] = []
    plant_images: list[PlantImage] = []
    sources: list[dict] = []
    communities: list[dict] = []
    irrigation_evidence: list[dict] = []


class Store:
    def __init__(self, path: Path = DB_PATH, media_root: Path = ROOT):
        self.media_root = Path(media_root).resolve()
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists() and self.path.stat().st_size:
            with sqlite3.connect(self.path) as migration:
                tables={row[0] for row in migration.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            if "meta" in tables and ("browse_groups" not in tables or "plant_images" not in tables):
                self.backup()
        with self.connect() as c:
            c.executescript("""
                CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
                INSERT OR IGNORE INTO meta VALUES ('revision','0');
                CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS topics(id TEXT PRIMARY KEY, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS relationships(
                    id TEXT PRIMARY KEY, source TEXT NOT NULL REFERENCES topics(id),
                    target TEXT NOT NULL REFERENCES topics(id), data TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS rel_source ON relationships(source);
                CREATE INDEX IF NOT EXISTS rel_target ON relationships(target);
                CREATE TABLE IF NOT EXISTS findings(id TEXT PRIMARY KEY, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS coverage(source_id TEXT REFERENCES sources(id),page INTEGER,status TEXT,note TEXT,
                    PRIMARY KEY(source_id,page));
                CREATE TABLE IF NOT EXISTS unresolved(id TEXT PRIMARY KEY, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY, digest TEXT NOT NULL, revision INTEGER, created TEXT, data TEXT);
                CREATE TABLE IF NOT EXISTS redirects(old_id TEXT PRIMARY KEY, new_id TEXT REFERENCES topics(id));
                CREATE TABLE IF NOT EXISTS page_text(source_id TEXT,page INTEGER,text TEXT,PRIMARY KEY(source_id,page));
                CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(id UNINDEXED,kind UNINDEXED,label,aliases,body,
                    tokenize='unicode61 remove_diacritics 2');
                CREATE TABLE IF NOT EXISTS explorations(id TEXT PRIMARY KEY,label TEXT,updated TEXT,data TEXT);
                CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,status TEXT,created TEXT,data TEXT);
                CREATE TABLE IF NOT EXISTS browse_groups(id TEXT PRIMARY KEY,data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS plant_images(id TEXT PRIMARY KEY,topic_id TEXT NOT NULL REFERENCES topics(id),role TEXT NOT NULL CHECK(role IN ('whole','detail')),data TEXT NOT NULL,UNIQUE(topic_id,role));
            """)
        from .planning import initialize
        initialize(self)

    @contextmanager
    def connect(self):
        c = sqlite3.connect(self.path, timeout=15)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys=ON")
        try:
            yield c
            c.commit()
        except Exception:
            c.rollback()
            raise
        finally:
            c.close()

    def revision(self, c=None) -> int:
        if c is not None:
            return int(c.execute("SELECT value FROM meta WHERE key='revision'").fetchone()[0])
        with self.connect() as connection:
            return self.revision(connection)

    def records(self, table: str, c=None) -> list[dict]:
        if table not in {"sources", "topics", "relationships", "findings", "unresolved", "browse_groups", "plant_images"}:
            raise ValueError("Unknown record collection")
        if c is not None:
            return [json.loads(r[0]) for r in c.execute(f"SELECT data FROM {table} ORDER BY id")]
        with self.connect() as connection:
            return self.records(table, connection)

    def register_sources(self, manifest: dict):
        with self.connect() as c:
            changed=False
            for source in manifest["sources"]:
                if 'managed_path' in source:
                    self.validate_source(source)
                else:
                    if source.get('kind','pdf')!='pdf':raise ValueError('Image/web source registration requires a managed project copy')
                    source = dict(source, path=str(Path(manifest["source_root"]) / source["filename"]))
                previous = c.execute("SELECT data FROM sources WHERE id=?", (source["id"],)).fetchone()
                if previous and json.loads(previous[0])["sha256"] != source["sha256"]:
                    raise ValueError(f"Edition update required for {source['id']}")
                changed |= not previous or json.loads(previous[0])!=source
                c.execute("INSERT INTO sources VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data", (source["id"], json.dumps(source)))
            if changed and self.revision(c)>0:
                c.execute("UPDATE meta SET value=CAST(value AS INTEGER)+1 WHERE key='revision'")

    def validate_source(self, source: dict):
        required={'id','title','kind','filename','sha256','managed_path'}
        if not required <= source.keys() or source['kind'] not in {'pdf','image','web'}:
            raise ValueError('Source requires id, title, kind, filename, sha256 and managed_path')
        path=managed_path(self.media_root,source['managed_path'],'sources')
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:
            raise ValueError(f"Source file missing or checksum mismatch: {source['id']}")
        if source['kind']=='pdf':
            from pypdf import PdfReader
            if len(PdfReader(path).pages)!=source.get('pdf_pages') or not source.get('initial_pdf_page_ranges'):
                raise ValueError('PDF source requires verified pages and inspected ranges')
        if 'page_labels' in source:
            labels=source['page_labels']
            if source['kind']!='pdf' or not isinstance(labels,dict):
                raise ValueError('Source page_labels requires a PDF and a page-to-heading object')
            for page,label in labels.items():
                if not isinstance(page,str) or not re.fullmatch(r'[1-9][0-9]*',page) or not 1<=int(page)<=source['pdf_pages']:
                    raise ValueError('Source page_labels keys must be exact one-based PDF pages')
                if not isinstance(label,str) or not label.strip() or len(label)>240:
                    raise ValueError('Source page_labels requires nonempty headings of at most 240 characters')
        if source['kind']=='image':
            from PIL import Image
            with Image.open(path) as im: im.verify()
        elif source['kind']=='web' and (not source.get('url','').startswith('https://') or not source.get('retrieved_on') or not source.get('excerpt')):
            raise ValueError('Web source requires HTTPS URL, retrieval date and reviewed excerpt')

    def source_path(self, source: dict):
        return managed_path(self.media_root,source['managed_path'],'sources') if 'managed_path' in source else Path(source['path'])

    def media_integrity(self):
        images=self.records('plant_images');problems=[]
        topics={t['id']:t for t in self.records('topics')};pairs={}
        for raw in images:
            try:
                if topics.get(raw['topic_id'],{}).get('kind')!='species':raise ValueError('Image references a missing or non-species topic: '+raw['id'])
                roles=pairs.setdefault(raw['topic_id'],set())
                if raw['role'] in roles:raise ValueError('Duplicate image role: '+raw['id'])
                roles.add(raw['role'])
                validate_image(self.media_root,PlantImage.model_validate(raw))
            except Exception as error:problems.append(str(error))
        for source in self.records('sources'):
            if 'managed_path' in source:
                try:self.validate_source(source)
                except Exception as error:problems.append(str(error))
        for topic,roles in pairs.items():
            if roles!={'whole','detail'}:problems.append('Incomplete image pair: '+topic)
        if problems:raise ValueError('Media integrity failed: '+ '; '.join(problems))
        return {'status':'verified','images':len(images),'topics':len({x['topic_id'] for x in images})}

    def backup_media(self):
        import zipfile
        target=self.backup().with_suffix('.media.zip')
        files={f['path'] for image in self.records('plant_images') for f in image['files'].values()}
        files.update(s['managed_path'] for s in self.records('sources') if 'managed_path' in s)
        provenance=self.media_root/'media/plants/provenance'
        if provenance.is_dir():files.update(p.relative_to(self.media_root).as_posix() for p in provenance.rglob('*') if p.is_file())
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
            for name in sorted(files):archive.write(self.media_root/name,name)
        return target

    def backup(self) -> Path:
        folder = ROOT / "backups"
        folder.mkdir(exist_ok=True)
        target = folder / f"knowledge-r{self.revision()}-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}.sqlite"
        with self.connect() as c, sqlite3.connect(target) as destination:
            c.backup(destination)
        return target

    def import_batch(self, raw: dict, dry_run=False) -> dict:
        batch = Batch.model_validate(raw)
        digest = hashlib.sha256(json.dumps(raw, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with self.connect() as c:
            prior = c.execute("SELECT digest,revision FROM batches WHERE id=?", (batch.batch_id,)).fetchone()
            if prior:
                if prior["digest"] != digest:
                    raise ValueError("This batch ID is already accepted with different contents. Use a new batch ID.")
                return {"status": "unchanged", "revision": self.revision(c), "batch_revision": prior["revision"]}
            if batch.base_revision is not None and batch.base_revision != self.revision(c):
                raise ValueError(f"Knowledge changed: batch expects revision {batch.base_revision}; current revision is {self.revision(c)}. Reconcile first.")
            sources = {s["id"]: s for s in self.records("sources", c)}
            if len({x['id'] for x in batch.sources}) != len(batch.sources):
                raise ValueError("Duplicate source IDs")
            for source in batch.sources:
                self.validate_source(source)
                if source['id'] in sources and sources[source['id']]['sha256'] != source['sha256']:
                    raise ValueError(f"Edition update required for {source['id']}")
                sources[source['id']] = source
            existing = {t["id"] for t in self.records("topics", c)}
            ids = existing | {t.id for t in batch.topics}
            for collection in (batch.topics, batch.relationships, batch.findings, batch.browse_groups):
                if len({x.id for x in collection}) != len(collection):
                    raise ValueError("Duplicate IDs within the candidate batch")
                for record in collection:
                    for ref in record.source_refs:
                        if ref.source_id not in sources:
                            raise ValueError(f"Unknown source for {record.id}: {ref.source_id}")
                        source = sources[ref.source_id]
                        if source.get('kind','pdf') != 'pdf':
                            if ref.page is not None or not ref.locator.strip():
                                raise ValueError(f"Non-PDF reference requires a locator and no page: {record.id}")
                            continue
                        if ref.page is None or ref.page > source['pdf_pages']:
                            raise ValueError(f"Invalid source page for {record.id}: {ref.source_id} p{ref.page}")
                        allowed = {p for a,b in source['initial_pdf_page_ranges'] for p in range(a,b+1)}
                        candidate = {(x.source_id,x.page) for x in batch.coverage if x.status == 'inspected'}
                        accepted = c.execute("SELECT 1 FROM coverage WHERE source_id=? AND page=? AND status='inspected'", (ref.source_id,ref.page)).fetchone()
                        if ref.page not in allowed and (ref.source_id,ref.page) not in candidate and not accepted:
                            raise ValueError(f"Explicit inspected coverage is required for {ref.source_id} p{ref.page}")
            image_records={x['id']:x for x in self.records('plant_images',c)}
            if len({x.id for x in batch.plant_images}) != len(batch.plant_images):
                raise ValueError('Duplicate plant image IDs')
            topic_records={t['id']:t for t in self.records('topics',c)}
            topic_records.update({t.id:t.model_dump() for t in batch.topics})
            for image in batch.plant_images:
                if image.topic_id not in topic_records or topic_records[image.topic_id]['kind'] != 'species':
                    raise ValueError(f'Image must reference an existing species: {image.id}')
                validate_image(self.media_root,image)
                image_records[image.id]=image.model_dump()
            pairs={}
            for image in image_records.values():
                if image['topic_id'] not in topic_records or topic_records[image['topic_id']]['kind']!='species':
                    raise ValueError('Registered image must retain a species topic')
                role=(image['topic_id'],image['role'])
                if role in pairs:raise ValueError('Duplicate image role for topic')
                pairs[role]=image['id']
            for tid in {x['topic_id'] for x in image_records.values()}:
                if not all((tid,role) in pairs for role in ['whole','detail']):
                    raise ValueError(f'Whole/detail image pair required: {tid}')
            for edge in batch.relationships:
                if edge.source not in ids or edge.target not in ids:
                    raise ValueError(f"Unknown endpoint in {edge.id}: {edge.source} / {edge.target}")
            for finding in batch.findings:
                if not set(finding.topic_ids) <= ids:
                    raise ValueError(f"Unknown topic in finding {finding.id}")
            for page in batch.coverage:
                if page.source_id not in sources or sources[page.source_id].get("kind","pdf") != "pdf" or page.page > sources[page.source_id]["pdf_pages"]:
                    raise ValueError("Invalid coverage page")
            for old, new in batch.redirects.items():
                if new not in ids or old == new:
                    raise ValueError("Invalid identity redirect")
            groups={g["id"]:g for g in self.records("browse_groups",c)}
            if len({g.id for g in batch.browse_groups}) != len(batch.browse_groups):
                raise ValueError("Duplicate browsing group IDs")
            groups.update({g.id:g.model_dump() for g in batch.browse_groups})
            from .planning import validate_groups, validate_intake,validate_community,records as planning_records
            validate_groups(groups, ids)
            for community in planning_records(c,'communities'):validate_community(community,groups,topic_records)
            inspected={(r['source_id'],r['page']) for r in c.execute("SELECT source_id,page FROM coverage WHERE status='inspected'")}
            inspected.update((r.source_id,r.page) for r in batch.coverage if r.status=='inspected')
            planned_communities, evidence=validate_intake(c,batch.communities,batch.irrigation_evidence,groups,topic_records,sources,inspected)
            changes = {k: len(getattr(batch, k)) for k in ("topics", "relationships", "findings", "coverage", "unresolved", "browse_groups", "plant_images", "sources", "communities", "irrigation_evidence")}
            if dry_run:
                return {"status": "validated", "revision": self.revision(c), **changes}
        if self.revision():
            self.backup()
        with self.connect() as c:
            c.execute("BEGIN IMMEDIATE")
            revision = self.revision(c)
            if batch.base_revision is not None and batch.base_revision != revision:
                raise ValueError(f"Knowledge changed: batch expects revision {batch.base_revision}; current revision is {revision}. Reconcile first.")
            for source in batch.sources:
                c.execute("INSERT INTO sources VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",(source['id'],json.dumps(source,ensure_ascii=False)))
            # Topic rows go first so all connection endpoints can be checked by SQLite itself.
            for topic in batch.topics:
                c.execute("INSERT INTO topics VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data", (topic.id, topic.model_dump_json()))
            for edge in batch.relationships:
                c.execute("INSERT INTO relationships VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET source=excluded.source,target=excluded.target,data=excluded.data",
                          (edge.id, edge.source, edge.target, edge.model_dump_json()))
            for finding in batch.findings:
                c.execute("INSERT INTO findings VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data", (finding.id, finding.model_dump_json()))
            for page in batch.coverage:
                c.execute("INSERT INTO coverage VALUES (?,?,?,?) ON CONFLICT(source_id,page) DO UPDATE SET status=excluded.status,note=excluded.note",
                          (page.source_id, page.page, page.status, page.note))
            for item in batch.unresolved:
                c.execute("INSERT INTO unresolved VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data", (item["id"], json.dumps(item)))
            for group in batch.browse_groups:
                c.execute("INSERT INTO browse_groups VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data", (group.id,group.model_dump_json()))
            for table,items in [('communities',planned_communities),('irrigation_evidence',evidence)]:
                for item in items:
                    c.execute(f'INSERT INTO {table} VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',(item['id'],json.dumps(item,ensure_ascii=False)))
            for image in batch.plant_images:
                c.execute("INSERT INTO plant_images VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET topic_id=excluded.topic_id,role=excluded.role,data=excluded.data",(image.id,image.topic_id,image.role,image.model_dump_json()))
            for old, new in batch.redirects.items():
                c.execute("INSERT INTO redirects VALUES (?,?) ON CONFLICT(old_id) DO UPDATE SET new_id=excluded.new_id", (old, new))
            revision += 1
            c.execute("UPDATE meta SET value=? WHERE key='revision'", (str(revision),))
            accepted=dict(raw,_changes={"added_topic_ids":[t.id for t in batch.topics if t.id not in existing],"relationship_ids":[e.id for e in batch.relationships],"finding_ids":[f.id for f in batch.findings],"browse_group_ids":[g.id for g in batch.browse_groups]})
            c.execute("INSERT INTO batches VALUES (?,?,?,?,?)", (batch.batch_id,digest,revision,now(),json.dumps(accepted,ensure_ascii=False)))
            self.reindex(c)
        return {"status": "accepted", "revision": revision, **changes}

    def reindex(self, c):
        c.execute("DELETE FROM search")
        for t in self.records("topics", c):
            names=list(dict.fromkeys([*t.get("aliases",[]),*[t[k] for k in ("spanish_name","english_name","scientific_name") if t.get(k)]]))
            c.execute("INSERT INTO search VALUES (?,?,?,?,?)", (t["id"],"topic",t["label"]," ".join(names),t["description"]))
        for f in self.records("findings", c):
            c.execute("INSERT INTO search VALUES (?,?,?,?,?)", (f["id"],"finding",f["label"],"",f["text"]))
        for p in c.execute("SELECT * FROM page_text").fetchall():
            c.execute("INSERT INTO search VALUES (?,?,?,?,?)", (f"{p['source_id']}:{p['page']}","passage",p["source_id"],"",p["text"]))

    def search(self, term: str, limit: int | None = 100) -> list[dict]:
        tokens = re.findall(r"\w+", term, re.UNICODE)
        if not tokens:
            return []
        expression = " AND ".join('"'+t.replace('"','')+'"*' for t in tokens[:12])
        with self.connect() as c:
            return [dict(r) for r in c.execute("SELECT id,kind,label,snippet(search,4,'[',']',' … ',18) AS excerpt,bm25(search,0,0,8,6,1) AS rank FROM search WHERE search MATCH ? ORDER BY rank,id"+(" LIMIT ?" if limit is not None else ""),(expression,limit) if limit is not None else (expression,))]

    def resolve(self, topic_id: str) -> str:
        with self.connect() as c:
            seen = set()
            while topic_id not in seen:
                seen.add(topic_id)
                row = c.execute("SELECT new_id FROM redirects WHERE old_id=?", (topic_id,)).fetchone()
                if not row:
                    break
                topic_id = row[0]
            return topic_id

    def snapshot(self) -> dict:
        from .planning import records
        with self.connect() as c:
            c.execute("BEGIN")
            return {"revision": self.revision(c), **{t:self.records(t,c) for t in ("topics","relationships","findings","sources","unresolved","browse_groups","plant_images")},
                    **{t:records(c,t) for t in ('organization_roots','communities','irrigation_evidence')},
                    "coverage": [dict(r) for r in c.execute("SELECT * FROM coverage ORDER BY source_id,page")]}
