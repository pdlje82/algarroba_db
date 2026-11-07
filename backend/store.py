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

from pydantic import BaseModel, ConfigDict, Field

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
    page: int = Field(ge=1)
    locator: str = ""


class Topic(Record):
    label: str = Field(min_length=1)
    kind: str
    domain: Literal["ecosystem", "technology", "funding"]
    description: str = Field(min_length=1)
    aliases: list[str] = []
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
    anchor_topic_id: str
    members: list[BrowseMember] = []
    maintenance_rule: str = Field(min_length=1)

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


class Store:
    def __init__(self, path: Path = DB_PATH):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists() and self.path.stat().st_size:
            with sqlite3.connect(self.path) as migration:
                tables={row[0] for row in migration.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            if "meta" in tables and "browse_groups" not in tables:
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
            """)

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
        if table not in {"sources", "topics", "relationships", "findings", "unresolved", "browse_groups"}:
            raise ValueError("Unknown record collection")
        if c is not None:
            return [json.loads(r[0]) for r in c.execute(f"SELECT data FROM {table} ORDER BY id")]
        with self.connect() as connection:
            return self.records(table, connection)

    def register_sources(self, manifest: dict):
        with self.connect() as c:
            changed=False
            for source in manifest["sources"]:
                source = dict(source, path=str(Path(manifest["source_root"]) / source["filename"]))
                previous = c.execute("SELECT data FROM sources WHERE id=?", (source["id"],)).fetchone()
                if previous and json.loads(previous[0])["sha256"] != source["sha256"]:
                    raise ValueError(f"Edition update required for {source['id']}")
                changed |= not previous or json.loads(previous[0])!=source
                c.execute("INSERT INTO sources VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data", (source["id"], json.dumps(source)))
            if changed and self.revision(c)>0:
                c.execute("UPDATE meta SET value=CAST(value AS INTEGER)+1 WHERE key='revision'")

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
            sources = {s["id"]: s for s in self.records("sources", c)}
            existing = {t["id"] for t in self.records("topics", c)}
            ids = existing | {t.id for t in batch.topics}
            for collection in (batch.topics, batch.relationships, batch.findings):
                if len({x.id for x in collection}) != len(collection):
                    raise ValueError("Duplicate IDs within the candidate batch")
                for record in collection:
                    for ref in record.source_refs:
                        if ref.source_id not in sources or ref.page > sources[ref.source_id]["pdf_pages"]:
                            raise ValueError(f"Invalid source page for {record.id}: {ref.source_id} p{ref.page}")
                        # Coverage can expand only through an explicit later batch, never by source metadata alone.
                        allowed = {p for a,b in sources[ref.source_id]["initial_pdf_page_ranges"] for p in range(a,b+1)}
                        candidate = {(x.source_id,x.page) for x in batch.coverage}
                        accepted = c.execute("SELECT 1 FROM coverage WHERE source_id=? AND page=?", (ref.source_id,ref.page)).fetchone()
                        if ref.page not in allowed and (ref.source_id,ref.page) not in candidate and not accepted:
                            raise ValueError(f"Explicit inspected coverage is required for {ref.source_id} p{ref.page}")
            for edge in batch.relationships:
                if edge.source not in ids or edge.target not in ids:
                    raise ValueError(f"Unknown endpoint in {edge.id}: {edge.source} / {edge.target}")
            for finding in batch.findings:
                if not set(finding.topic_ids) <= ids:
                    raise ValueError(f"Unknown topic in finding {finding.id}")
            for page in batch.coverage:
                if page.source_id not in sources or page.page > sources[page.source_id]["pdf_pages"]:
                    raise ValueError("Invalid coverage page")
            for old, new in batch.redirects.items():
                if new not in ids or old == new:
                    raise ValueError("Invalid identity redirect")
            groups={g["id"]:g for g in self.records("browse_groups",c)}
            if len({g.id for g in batch.browse_groups}) != len(batch.browse_groups):
                raise ValueError("Duplicate browsing group IDs")
            groups.update({g.id:g.model_dump() for g in batch.browse_groups})
            primary={}
            for gid,group in groups.items():
                if not gid.startswith("browse:") or gid in ids:
                    raise ValueError("Browsing group IDs must use the browse: namespace")
                if group["anchor_topic_id"] not in ids:
                    raise ValueError("Unknown browsing group anchor")
                if group["parent_id"] not in ROOT_BROWSE_GROUPS | groups.keys():
                    raise ValueError("Unknown browsing group parent")
                members=[m["topic_id"] for m in group["members"]]
                if len(set(members))!=len(members) or not set(members)<=ids or group["anchor_topic_id"] in members:
                    raise ValueError("Invalid or duplicate browsing group members")
                for member in group["members"]:
                    if member["role"]=="primary":
                        if member["topic_id"] in primary:
                            raise ValueError("A topic has more than one primary browsing group")
                        primary[member["topic_id"]]=gid
                visited=set();at=gid
                while at in groups:
                    if at in visited:raise ValueError("Cyclic browsing group hierarchy")
                    visited.add(at);at=groups[at]["parent_id"]
            changes = {k: len(getattr(batch, k)) for k in ("topics", "relationships", "findings", "coverage", "unresolved", "browse_groups")}
            if dry_run:
                return {"status": "validated", "revision": self.revision(c), **changes}
        if self.revision():
            self.backup()
        with self.connect() as c:
            c.execute("BEGIN IMMEDIATE")
            revision = self.revision(c)
            if batch.base_revision is not None and batch.base_revision != revision:
                raise ValueError(f"Knowledge changed: batch expects revision {batch.base_revision}; current revision is {revision}. Reconcile first.")
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
            c.execute("INSERT INTO search VALUES (?,?,?,?,?)", (t["id"],"topic",t["label"]," ".join(t.get("aliases",[])),t["description"]))
        for f in self.records("findings", c):
            c.execute("INSERT INTO search VALUES (?,?,?,?,?)", (f["id"],"finding",f["label"],"",f["text"]))
        for p in c.execute("SELECT * FROM page_text").fetchall():
            c.execute("INSERT INTO search VALUES (?,?,?,?,?)", (f"{p['source_id']}:{p['page']}","passage",p["source_id"],"",p["text"]))

    def search(self, term: str) -> list[dict]:
        tokens = re.findall(r"\w+", term, re.UNICODE)
        if not tokens:
            return []
        expression = " AND ".join('"'+t.replace('"','')+'"*' for t in tokens[:12])
        with self.connect() as c:
            return [dict(r) for r in c.execute("SELECT id,kind,label,snippet(search,4,'[',']',' … ',18) AS excerpt,bm25(search,0,0,8,6,1) AS rank FROM search WHERE search MATCH ? ORDER BY rank,id LIMIT 100",(expression,))]

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
        with self.connect() as c:
            c.execute("BEGIN")
            return {"revision": self.revision(c), **{t:self.records(t,c) for t in ("topics","relationships","findings","sources","unresolved","browse_groups")},
                    "coverage": [dict(r) for r in c.execute("SELECT * FROM coverage ORDER BY source_id,page")]}
