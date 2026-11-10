"""User project ideas and manually reviewed funding context; never an eligibility engine."""
from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

COLLECTIONS = ('project_ideas', 'funding_reviews', 'funding_assessments')
APPLICANT_OPTIONS = ('individual', 'business', 'nonprofit', 'municipality', 'research-partnership')


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False, str_strip_whitespace=True)


class FundingRef(Strict):
    source_id: str
    page: int | None = Field(default=None, ge=1)
    label: str = Field(min_length=1, max_length=240)
    locator: str = Field(min_length=1)


class ProjectIdea(Strict):
    id: str = Field(pattern=r'^idea:[a-zA-Z0-9_.-]+$')
    label: str = Field(min_length=1, max_length=160)
    goals: str = Field(min_length=1, max_length=6000)
    topic_ids: list[str] = []
    proposed_geography: str = 'Alhama de Almería (proposed; site unconfirmed)'
    applicant_options: list[Literal['individual', 'business', 'nonprofit', 'municipality', 'research-partnership']] = list(APPLICANT_OPTIONS)
    applicant_status: str = 'Unconfirmed'
    land_access: str = 'Unconfirmed'
    partners: str = 'Unconfirmed'
    budget: str = 'Unconfirmed'
    readiness: str = 'Unconfirmed'
    version: int = Field(default=1, ge=1, strict=True)
    updated_at: str = ''


class Deadline(Strict):
    label: str = Field(min_length=1)
    value: str
    timezone: str | None = None
    note: str = ''
    kind: Literal['deadline', 'opening'] = 'deadline'

    @model_validator(mode='after')
    def valid_date(self):
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', self.value):
            date.fromisoformat(self.value)
        else:
            parsed = datetime.fromisoformat(self.value.replace('Z', '+00:00'))
            if parsed.tzinfo is None or not self.timezone:
                raise ValueError('Timed deadlines require an explicit UTC offset and named timezone')
        return self


class FundingReview(Strict):
    id: str = Field(pattern=r'^funding-review:[a-zA-Z0-9_.-]+$')
    topic_id: str
    version: int = Field(default=1, ge=1, strict=True)
    instrument_type: Literal['grant', 'partially-repayable', 'loan', 'procurement', 'non-cash', 'framework']
    availability: Literal['open', 'upcoming', 'closed', 'draft', 'unknown']
    availability_note: str = Field(min_length=1)
    territory: str = Field(min_length=1)
    applicants: str = Field(min_length=1)
    activities: str = Field(min_length=1)
    financial_summary: str = ''
    deadlines: list[Deadline] = []
    checked_on: date
    verification_state: Literal['confirmed', 'incomplete', 'failed'] = 'confirmed'
    verification_note: str = ''
    attempted_on: date | None = None
    source_refs: list[FundingRef] = Field(min_length=1)


class Exclusion(Strict):
    scope: Literal['location', 'activity', 'applicant-route']
    reason: str = Field(min_length=1)


class FundingAssessment(Strict):
    id: str = Field(pattern=r'^funding-assessment:[a-zA-Z0-9_.-]+$')
    project_id: str
    project_version: int = Field(ge=1, strict=True)
    review_id: str
    review_version: int = Field(ge=1, strict=True)
    evidence_fingerprint: str = ''
    relevance: Literal['potential', 'conditional', 'needs-review', 'outside-scope']
    applicant_route: str = Field(min_length=1)
    reasons: list[str] = Field(min_length=1)
    requirements: list[str] = []
    next_action: str = Field(min_length=1)
    exclusions: list[Exclusion] = []
    checked_on: date
    source_refs: list[FundingRef] = Field(min_length=1)

    @model_validator(mode='after')
    def explicit_exclusion(self):
        if self.relevance == 'outside-scope' and not self.exclusions:
            raise ValueError('Outside-scope assessments require an explicit evidenced exclusion scope and reason')
        return self


class ProjectEdit(Strict):
    expected_revision: int = Field(ge=0, strict=True)
    action: Literal['create', 'update']
    id: str | None = None
    changes: dict


def fingerprint(review, sources, topic, assessment_refs=()):
    raw = {'review': review, 'topic': topic,
           'editions': {r['source_id']: sources.get(r['source_id']) for r in [*review['source_refs'], *assessment_refs]}}
    return hashlib.sha256(json.dumps(raw, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def validate_intake(store, connection, review_models, assessment_models, topics, sources, inspected):
    from .planning import checked_refs
    reviews = {r['id']: r for r in store.records('funding_reviews', connection)}
    projects = {p['id']: p for p in store.records('project_ideas', connection)}
    prepared_reviews, prepared_assessments = [], []
    for collection in (review_models, assessment_models):
        if len({r.id for r in collection}) != len(collection):
            raise ValueError('Duplicate funding record IDs')
    for model in review_models:
        review = model.model_dump(mode='json')
        if topics.get(review['topic_id'], {}).get('domain') != 'funding':
            raise ValueError('Funding review must reference an existing funding topic')
        checked_refs(review['source_refs'], sources, inspected)
        old = reviews.get(review['id'])
        if old and review != old and review['version'] <= old['version']:
            raise ValueError('Changed funding reviews require a greater version')
        if old and review['verification_state'] == 'failed':
            facts = ('topic_id', 'instrument_type', 'availability', 'availability_note', 'territory', 'applicants', 'activities', 'financial_summary', 'deadlines', 'checked_on', 'source_refs')
            if any(review[k] != old[k] for k in facts):
                raise ValueError('Failed verification must preserve last-confirmed facts, date and sources')
        reviews[review['id']] = review
        prepared_reviews.append(review)
    existing = {a['id']: a for a in store.records('funding_assessments', connection)}
    candidate_ids = {a.id for a in assessment_models}
    pairs = {(a['project_id'], a['review_id']) for a in existing.values() if a['id'] not in candidate_ids}
    for model in assessment_models:
        item = model.model_dump(mode='json')
        project, review = projects.get(item['project_id']), reviews.get(item['review_id'])
        if not project or not review:
            raise ValueError('Funding assessment requires an existing project idea and funding review')
        if item['project_version'] != project['version'] or item['review_version'] != review['version']:
            raise ValueError('Assessment must be checked against current project and review versions')
        pair = (item['project_id'], item['review_id'])
        if pair in pairs:
            raise ValueError('Keep one assessment identity per project and funding review')
        pairs.add(pair)
        checked_refs(item['source_refs'], sources, inspected)
        signature = fingerprint(review, sources, topics[review['topic_id']], item['source_refs'])
        if item['evidence_fingerprint'] and item['evidence_fingerprint'] != signature:
            raise ValueError('Assessment evidence fingerprint differs from current evidence')
        item['evidence_fingerprint'] = signature
        prepared_assessments.append(item)
    return prepared_reviews, prepared_assessments


def state(snapshot, as_of=None):
    instant = as_of or datetime.now(timezone.utc)
    projects = {p['id']: p for p in snapshot.get('project_ideas', [])}
    reviews = {r['id']: r for r in snapshot.get('funding_reviews', [])}
    sources = {s['id']: s for s in snapshot['sources']}
    topics = {t['id']: t for t in snapshot['topics']}
    result = {'assessments': {}, 'reviews': {}}
    for id, review in reviews.items():
        warnings = []
        for deadline in review['deadlines']:
            value = deadline['value']
            past = date.fromisoformat(value) < instant.date() if len(value) == 10 else datetime.fromisoformat(value.replace('Z', '+00:00')) < instant
            if past:
                if deadline.get('kind')=='opening':
                    warnings.append(f"{deadline['label']}: opening date has passed ({value}); verify current availability.")
                else:
                    warnings.append(f"{deadline['label']}: deadline has passed ({value}); this does not verify closure or amendments.")
        if review['verification_state'] != 'confirmed':
            warnings.append(review['verification_note'] or 'Verification is incomplete; retain the last checked facts.')
        result['reviews'][id] = warnings
    for assessment in snapshot.get('funding_assessments', []):
        project, review = projects.get(assessment['project_id']), reviews.get(assessment['review_id'])
        reasons = []
        if not project or project['version'] != assessment['project_version']:
            reasons.append('Project idea changed; reconsider this assessment.')
        if not review or review['version'] != assessment['review_version'] or assessment['evidence_fingerprint'] != fingerprint(review, sources, topics.get(review['topic_id']), assessment['source_refs']):
            reasons.append('Funding evidence changed; reconsider this assessment.')
        if review and review['verification_state'] != 'confirmed':
            reasons.append('Funding verification requires attention.')
        result['assessments'][assessment['id']] = reasons
    return result


def edit_project(store, edit: ProjectEdit, actor='Local user', dry_run=False):
    from .planning import Conflict
    from .store import now
    allowed = set(ProjectIdea.model_fields) - {'id', 'version', 'updated_at'}
    if not edit.changes or not set(edit.changes) <= allowed:
        raise ValueError('Choose supported project idea fields; versions are managed by the application')
    with store.connect() as c:
        c.execute('BEGIN IMMEDIATE')
        revision = store.revision(c)
        if edit.expected_revision != revision:
            raise Conflict('The collection changed. Refresh project ideas; your draft is preserved.')
        id = edit.id or 'idea:' + uuid.uuid4().hex
        row = c.execute('SELECT data FROM project_ideas WHERE id=?', (id,)).fetchone()
        old = json.loads(row[0]) if row else None
        if (edit.action == 'create' and old) or (edit.action == 'update' and not old):
            raise ValueError('Project idea already exists' if old else 'Project idea is unavailable')
        idea = ProjectIdea.model_validate({**(old or {}), **edit.changes, 'id': id,
                                          'version': old['version'] + 1 if old else 1, 'updated_at': now()}).model_dump(mode='json')
        topic_ids = {t['id'] for t in store.records('topics', c)}
        if len(set(idea['topic_ids'])) != len(idea['topic_ids']) or not set(idea['topic_ids']) <= topic_ids:
            raise ValueError('Project concepts must be unique existing graph topics')
        if len(set(idea['applicant_options'])) != len(idea['applicant_options']):
            raise ValueError('Choose unique applicant options')
        if dry_run:
            return {'status': 'validated', 'revision': revision, 'project': idea}
        c.execute('INSERT INTO project_ideas VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', (id, json.dumps(idea, ensure_ascii=False)))
        event = dict(id=uuid.uuid4().hex, actor=actor, revision=revision + 1, before=old, after=idea)
        c.execute('INSERT INTO project_idea_events VALUES (?,?)', (event['id'], json.dumps(event, ensure_ascii=False)))
        c.execute("UPDATE meta SET value=? WHERE key='revision'", (str(revision + 1),))
        return {'status': 'saved', 'revision': revision + 1, 'project': idea}
