"""Local organization and community plans. Membership never becomes scientific evidence."""
from __future__ import annotations

import copy
import json
import math
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ROOT_LABELS = {
    'ecosystem:species': 'Species & companions', 'ecosystem:habitats': 'Habitats & conditions',
    'ecosystem:restoration-methods': 'Restoration methods', 'technology:irrigation': 'Establishment water',
    'technology:drones': 'Drones & components', 'technology:monitoring': 'Monitoring',
    'funding:programmes': 'Funding programmes', 'funding:activities': 'Activities', 'funding:requirements': 'Requirements',
}
DOMAINS = {'ecosystem', 'technology', 'funding'}
STAGES = ('nursery', 'settlement', 'summer-maintenance', 'support')
FIELDS = ('amount', 'frequency', 'period', 'notes')
EVENT_AMOUNT_UNITS = {'L/plant/event', 'L/plant/watering'}
TABLES = ('organization_roots', 'browse_groups', 'communities')


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class PlannedField(Strict):
    value: float | str | None = None
    origin: Literal['not-set', 'source', 'user-set', 'user-adjusted'] = 'not-set'
    baseline: dict | None = None
    rationale: str = ''
    actor: str = 'Local user'
    changed_at: str | None = None


class IrrigationStage(Strict):
    status: Literal['configured', 'not-applicable'] = 'configured'
    fields: dict[str, PlannedField] = {}


class CommunityPlant(Strict):
    topic_id: str
    count: int | None = Field(default=None, ge=0, strict=True)
    notes: str = ''
    irrigation: dict[str, IrrigationStage] = {}
    basis: list[dict] = []


class Community(Strict):
    id: str
    label: str = Field(min_length=1, max_length=160)
    kind: Literal['working', 'source'] = 'working'
    parent_id: str
    description: str = ''
    region: str = ''
    context: str = ''
    basis: list[dict] = []
    origin: dict | None = None
    plants: list[CommunityPlant] = []


class IrrigationEvidence(Strict):
    id: str
    species_id: str | None = None
    stage: Literal['nursery', 'settlement', 'summer-maintenance', 'support']
    field: Literal['amount', 'frequency', 'period', 'notes']
    value: float | str | None = None
    units: str = ''
    wording: str = Field(min_length=1)
    context: str = Field(min_length=1)
    applicability: str = Field(min_length=1)
    limitations: str = ''
    source_refs: list[dict] = Field(min_length=1)


class Edit(Strict):
    expected_revision: int = Field(ge=0)
    action: str
    data: dict = {}


class PlantPlanDetails(Strict):
    count: int | None = Field(default=None, ge=0, strict=True)
    notes: str = ''


class PlantPlanField(Strict):
    stage: Literal['nursery', 'settlement', 'summer-maintenance', 'support']
    field: Literal['amount', 'frequency', 'period']
    mode: Literal['source', 'clear']
    evidence_id: str | None = None
    reviewed: bool = Field(default=False, strict=True)
    rationale: str = Field(default='', max_length=4000)


class PlantPlanSet(Strict):
    id: str
    topic_id: str
    changes: PlantPlanDetails = Field(default_factory=PlantPlanDetails)
    stages: dict[Literal['nursery', 'settlement', 'summer-maintenance', 'support'], Literal['unconfigured', 'configured', 'not-applicable']] = {}
    fields: list[PlantPlanField] = []


def apply_plant_plan(plant, raw, evidence, actor, stamp):
    """Patch one plant atomically. Irrigation values are always read from checked evidence."""
    plan = PlantPlanSet.model_validate(raw)
    changes = plan.changes.model_dump(exclude_unset=True)
    if not (changes or plan.stages or plan.fields):
        raise ValueError('Choose a plant change or adopt researched evidence before saving')
    plant.update(changes)
    for stage, status in plan.stages.items():
        if status == 'unconfigured':
            plant['irrigation'].pop(stage, None)
        else:
            plant['irrigation'].setdefault(stage, IrrigationStage().model_dump())['status'] = status
    seen = set()
    for operation in plan.fields:
        key = (operation.stage, operation.field)
        if key in seen:
            raise ValueError('Choose only one operation per phase and parameter')
        seen.add(key)
        irrigation = plant['irrigation'].get(operation.stage)
        if irrigation is None or irrigation['status'] != 'configured':
            raise ValueError('Configure this phase before changing its values')
        previous = irrigation['fields'].get(operation.field, PlannedField().model_dump())
        field = dict(previous, actor=actor, changed_at=stamp, rationale=operation.rationale.strip())
        if operation.mode == 'clear':
            if operation.evidence_id is not None:
                raise ValueError('Clear does not adopt evidence')
            field.update(value=None, origin='not-set')
        else:
            if not operation.reviewed or not field['rationale']:
                raise ValueError('Review the source conditions and explain applicability before adoption')
            source = evidence.get(operation.evidence_id)
            if source is None or source['species_id'] != plant['topic_id'] or source['stage'] != operation.stage or source['field'] != operation.field:
                raise ValueError('Choose species-specific evidence for this phase and parameter')
            value = source['value']
            if operation.field == 'amount':
                if source['units'] not in EVENT_AMOUNT_UNITS or type(value) not in (int, float) or not math.isfinite(value) or value < 0:
                    raise ValueError('Adopt a quantified amount in L/plant/event; ranges and other units remain guidance')
            elif not isinstance(value, str) or not value.strip():
                raise ValueError('Unquantified evidence remains guidance; research this parameter')
            field.update(value=value, origin='source', baseline=copy.deepcopy(source))
        irrigation['fields'][operation.field] = field


class Conflict(ValueError):
    pass


def initialize(store):
    """Versioned additive migration; back up an existing store before first installation."""
    with store.connect() as c:
        version = c.execute("SELECT value FROM meta WHERE key='planning_schema'").fetchone()
    if version:
        if version[0] != '1':
            raise ValueError('Unsupported planning schema. Restore a compatible application.')
        with store.connect() as c:
            roots=records(c,'organization_roots')
            if {g['id'] for g in roots}!=set(ROOT_LABELS) or any(not g['label'].strip() for g in roots):
                raise ValueError('Organization root metadata is incomplete. Restore the SQLite backup; no substitute labels were used.')
        return
    if store.revision():
        store.backup()
    with store.connect() as c:
        c.execute('BEGIN IMMEDIATE')
        c.execute('CREATE TABLE IF NOT EXISTS organization_roots(id TEXT PRIMARY KEY,data TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS communities(id TEXT PRIMARY KEY,data TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS irrigation_evidence(id TEXT PRIMARY KEY,data TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS planning_events(id TEXT PRIMARY KEY,revision INTEGER UNIQUE NOT NULL,data TEXT NOT NULL)')
        for id, label in ROOT_LABELS.items():
            c.execute('INSERT OR IGNORE INTO organization_roots VALUES (?,?)', (id, json.dumps(dict(id=id, label=label, domain=id.split(':')[0]))))
        c.execute("INSERT INTO meta VALUES ('planning_schema','1')")


def records(c, table):
    if table not in {*TABLES, 'irrigation_evidence', 'planning_events'}:
        raise ValueError('Unknown planning collection')
    return [json.loads(r[0]) for r in c.execute(f'SELECT data FROM {table} ORDER BY id')]


def workspace(c):
    return {table: records(c, table) for table in TABLES}


def group_domain(id, groups):
    seen = set()
    while id in groups:
        if id in seen:
            raise ValueError('Cyclic browsing group hierarchy')
        seen.add(id)
        id = groups[id]['parent_id']
    if id in ROOT_LABELS:
        return id.split(':')[0]
    if id.startswith('domain:') and id[7:] in DOMAINS:
        return id[7:]
    raise ValueError('Unknown browsing group parent')


def validate_groups(groups, topic_ids):
    primary = set()
    for id, group in groups.items():
        if not id.startswith('browse:') or id in topic_ids:
            raise ValueError('Browsing group IDs must use the browse: namespace')
        if not group['label'].strip() or len(group['label'])>160 or not group['maintenance_rule'].strip():
            raise ValueError('Group label and maintenance rule are required')
        anchor = group.get('anchor_topic_id')
        if group.get('presentation', 'standard') not in {'standard', 'hierarchy'}:
            raise ValueError('Unknown browsing group presentation')
        if group.get('navigation', 'normal') not in {'normal', 'transparent'}:
            raise ValueError('Unknown browsing group navigation')
        if group.get('navigation') == 'transparent' and (anchor is not None or group.get('presentation') != 'hierarchy'):
            raise ValueError('Transparent navigation requires an unanchored hierarchy container')
        if not isinstance(group.get('catalogue',False),bool):
            raise ValueError('Catalogue must be a boolean')
        if anchor is not None and anchor not in topic_ids:
            raise ValueError('Unknown browsing group anchor')
        domain = group_domain(id, groups)
        if group.get('domain') is not None and group['domain'] != domain:
            raise ValueError('Group domain does not match its parent')
        members = [m['topic_id'] for m in group['members']]
        if len(set(members)) != len(members) or not set(members) <= topic_ids or anchor in members:
            raise ValueError('Invalid or duplicate browsing group members')
        for member in group['members']:
            if member['role'] not in {'primary', 'shared'}:
                raise ValueError('Invalid membership role')
            if member['role'] == 'primary':
                if member['topic_id'] in primary:
                    raise ValueError('A topic has more than one primary browsing group')
                primary.add(member['topic_id'])


def checked_refs(refs, sources, coverage):
    if not refs:
        raise ValueError('Source evidence requires references')
    result = []
    for ref in refs:
        source = sources.get(ref.get('source_id'))
        if source is None:
            raise ValueError('Unknown evidence source')
        if not str(ref.get('locator', '')).strip():
            raise ValueError('Evidence requires a passage locator')
        page = ref.get('page')
        if source.get('kind', 'pdf') == 'pdf':
            if not isinstance(page, int) or isinstance(page, bool) or page < 1 or page > source['pdf_pages'] or (source['id'], page) not in coverage:
                raise ValueError('Evidence requires an inspected PDF page')
        elif page is not None:
            raise ValueError('Non-PDF references cannot specify a page')
        result.append(dict(ref, edition_sha256=source['sha256']))
    return result


def validate_community(raw, groups, topics):
    community = Community.model_validate(raw).model_dump()
    if not community['id'].startswith('community:') or not community['label'].strip():
        raise ValueError('Community requires a namespaced ID and a nonempty label')
    parent = community['parent_id']
    if parent not in groups and parent not in ROOT_LABELS:
        raise ValueError('Community parent is unavailable')
    if (parent.split(':')[0] if parent in ROOT_LABELS else group_domain(parent, groups)) != 'ecosystem':
        raise ValueError('Plant communities belong in the ecosystem domain')
    seen = set()
    for plant in community['plants']:
        id = plant['topic_id']
        if id in seen or topics.get(id, {}).get('kind') != 'species':
            raise ValueError('Community members must be unique existing species')
        seen.add(id)
        for stage, irrigation in plant['irrigation'].items():
            if stage not in STAGES or not set(irrigation['fields']) <= set(FIELDS):
                raise ValueError('Unknown irrigation stage or field')
            for key, field in irrigation['fields'].items():
                value = field['value']
                if key == 'amount' and value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0):
                    raise ValueError('Amount must be a finite nonnegative number of liters per plant per event')
                if key != 'amount' and value is not None and not isinstance(value, str):
                    raise ValueError('Frequency, period and notes must be text')
                if field['origin'] == 'not-set' and value is not None:
                    raise ValueError('An unset field cannot contain a value')
                if field['origin'] != 'not-set' and value is None:
                    raise ValueError('A configured field needs an explicit value')
    return community


def validate_intake(c, raw_communities, raw_evidence, groups, topics, sources, coverage):
    existing = {e['id']: e for e in records(c, 'irrigation_evidence')}
    evidence = []
    for raw in raw_evidence:
        if isinstance(raw.get('value'),bool):raise ValueError('Evidence values cannot be booleans')
        item = IrrigationEvidence.model_validate(raw).model_dump()
        if not item['id'].startswith('irrigation-evidence:'):
            raise ValueError('Evidence needs an irrigation-evidence: ID')
        if item['species_id'] is not None and topics.get(item['species_id'], {}).get('kind') != 'species':
            raise ValueError('Evidence species must resolve to a species')
        item['source_refs'] = checked_refs(item['source_refs'], sources, coverage)
        if item['id'] in existing and existing[item['id']] != item:
            raise ValueError('Evidence is immutable; use a new evidence ID for corrections')
        evidence.append(item)
    communities = []
    for raw in raw_communities:
        item = validate_community(raw, groups, topics)
        if item['kind'] != 'source':
            raise ValueError('Checked intake adds source-described communities, not working plans')
        if not item['context'].strip():raise ValueError('A source-described community requires its source-specific context')
        item['basis'] = checked_refs(item['basis'], sources, coverage)
        for plant in item['plants']:
            plant['basis'] = checked_refs(plant['basis'], sources, coverage)
            if plant['irrigation']:
                raise ValueError('Import irrigation evidence separately; do not prefill community planning values')
        old = c.execute('SELECT data FROM communities WHERE id=?', (item['id'],)).fetchone()
        if old and json.loads(old[0])['kind'] != 'source':
            raise ValueError('Cannot replace a working community through research intake')
        communities.append(item)
    if len({x['id'] for x in evidence}) != len(evidence) or len({x['id'] for x in communities}) != len(communities):
        raise ValueError('Duplicate evidence or community IDs')
    return communities, evidence


def apply_edit(store, edit: Edit, actor='Local user', dry_run=False):
    from .store import now
    with store.connect() as c:
        c.execute('BEGIN IMMEDIATE')
        revision = store.revision(c)
        if edit.expected_revision != revision:
            raise Conflict(f'Data changed from revision {edit.expected_revision} to {revision}. Refresh the editor; your draft is preserved.')
        before = workspace(c)
        after = copy.deepcopy(before)
        groups = {g['id']: g for g in after['browse_groups']}
        roots = {g['id']: g for g in after['organization_roots']}
        communities = {g['id']: g for g in after['communities']}
        topics = {t['id']: t for t in store.records('topics', c)}
        action, data = edit.action, edit.data
        stamp = now()
        affected = None
        if action == 'revert':
            event = c.execute('SELECT data FROM planning_events WHERE id=?', (data['event_id'],)).fetchone()
            if event is None:
                raise ValueError('Edit history is unavailable')
            event = json.loads(event[0])
            if event['actor'] != 'Local user' or event['after'] != before:
                raise Conflict('Undo conflicts with a later change. Refresh without overwriting it.')
            after = event['before']
            groups = {g['id']: g for g in after['browse_groups']}
            roots = {g['id']: g for g in after['organization_roots']}
            communities = {g['id']: g for g in after['communities']}
        elif action == 'organization-initialize':
            if actor != 'Codex':
                raise ValueError('Initial organization is a checked maintenance operation')
            for id,label in data['root_labels'].items():
                if id not in roots or not label.strip():raise ValueError('Invalid root label')
                roots[id]['label']=label
            for group in data['groups']:
                groups[group['id']]=group
        elif action == 'group-create':
            id = 'browse:' + uuid.uuid4().hex
            parent = data['parent_id']
            group = dict(id=id, label=data['label'].strip(), parent_id=parent, anchor_topic_id=None, user_created=True, members=[], maintenance_rule='User-managed organization. Membership is not factual evidence.')
            groups[id] = group
            affected = id
        elif action == 'group-rename':
            target = roots.get(data['id']) or groups.get(data['id'])
            if target is None:
                raise ValueError('Group unavailable')
            label = data['label'].strip()
            if not label or len(label) > 160:
                raise ValueError('Group names require 1–160 characters')
            target['label'] = label
        elif action == 'group-move':
            if data['id'] not in groups:
                raise ValueError('Existing root groups cannot be reparented')
            group = groups[data['id']]
            old_domain = group_domain(group['id'], groups)
            group['parent_id'] = data['parent_id']
            if group_domain(group['id'], groups) != old_domain:
                raise ValueError('Move a group within its current domain')
        elif action == 'group-delete':
            id = data['id']
            if id not in groups or not groups[id].get('user_created',False) or groups[id].get('anchor_topic_id') is not None:
                raise ValueError('Only empty user folders can be deleted')
            if groups[id]['members'] or any(g['parent_id'] == id for g in groups.values()) or any(g['parent_id'] == id for g in communities.values()):
                raise ValueError('Move members, subgroups and communities before deleting this folder')
            del groups[id]
        elif action in {'members-move', 'members-share', 'members-remove'}:
            ids = data['topic_ids']
            if not ids or len(set(ids)) != len(ids) or not set(ids) <= topics.keys():
                raise ValueError('Choose unique existing topics')
            target = data['group_id']
            if target not in groups and target not in roots:
                raise ValueError('Destination group unavailable')
            if action == 'members-remove':
                if target not in groups:
                    raise ValueError('Base root categorization cannot be removed; move topics to a folder instead')
                if not set(ids) <= {m['topic_id'] for m in groups[target]['members']}:
                    raise ValueError('A selected topic is not a direct member of this folder')
                groups[target]['members'] = [m for m in groups[target]['members'] if m['topic_id'] not in ids]
            else:
                if target in roots:
                    raise ValueError('Select a custom folder for topic membership')
                if action == 'members-move':
                    for group in groups.values():
                        group['members'] = [m for m in group['members'] if not (m['topic_id'] in ids and m['role'] == 'primary')]
                existing = {m['topic_id']: m for m in groups[target]['members']}
                for id in ids:
                    if id == groups[target].get('anchor_topic_id'):
                        raise ValueError('An anchored topic cannot be its own member')
                    if action == 'members-share' and id in existing:
                        raise ValueError('A selected topic already belongs to this folder')
                    existing[id] = dict(topic_id=id, role='primary' if action == 'members-move' else 'shared')
                groups[target]['members'] = list(existing.values())
        elif action in {'community-create', 'community-copy'}:
            id = 'community:' + uuid.uuid4().hex
            community = Community(id=id, label=data['label'].strip(), parent_id=data['parent_id']).model_dump()
            if action == 'community-copy':
                origin_id = data['origin_id']
                selected = data.get('topic_ids', [])
                if len(set(selected)) != len(selected):
                    raise ValueError('Duplicate species selection')
                if origin_id in communities:
                    origin = communities[origin_id]
                    if origin['kind'] != 'source':
                        raise ValueError('Choose a source-described community')
                    allowed = {p['topic_id']: p['basis'] for p in origin['plants']}
                    community.update(basis=origin['basis'], region=origin['region'], context=origin['context'])
                elif origin_id in topics:
                    origin = topics[origin_id]
                    if origin['kind'] != 'habitat':
                        raise ValueError('Choose a source-described habitat/community topic')
                    allowed = {}
                    for edge in store.records('relationships', c):
                        if origin_id in {edge['source'], edge['target']}:
                            other = edge['target'] if edge['source'] == origin_id else edge['source']
                            if topics.get(other, {}).get('kind') == 'species':
                                allowed.setdefault(other, []).extend(edge['source_refs'])
                    community['basis'] = origin['source_refs']
                    community['context'] = origin['description']
                else:
                    raise ValueError('Source community unavailable')
                if not set(selected) <= allowed.keys():
                    raise ValueError('Select only explicitly recorded associations from this source')
                community['plants'] = [CommunityPlant(topic_id=plant, basis=allowed[plant]).model_dump() for plant in selected]
                community['origin'] = dict(id=origin_id, revision=revision, label=origin['label'], selection='User-defined selection of recorded associations')
            communities[id] = community
            affected = id
        elif action.startswith('community-') or action in {'plants-add', 'plant-remove', 'plant-edit', 'plant-plan-set', 'stage-set', 'field-set'}:
            id = data['id']
            community = communities.get(id)
            if community is None or community['kind'] != 'working':
                raise ValueError('Source-described communities are read-only; create an editable community first')
            if action == 'community-edit':
                allowed = {'label', 'description', 'region', 'context', 'parent_id'}
                if not set(data['changes']) <= allowed:
                    raise ValueError('Unsupported community changes')
                community.update(data['changes'])
            elif action == 'plants-add':
                ids = data['topic_ids']
                existing = {p['topic_id'] for p in community['plants']}
                if not ids or len(set(ids)) != len(ids) or existing & set(ids):
                    raise ValueError('Choose plants not already in the community')
                community['plants'].extend(CommunityPlant(topic_id=pid).model_dump() for pid in ids)
            else:
                plant = next((p for p in community['plants'] if p['topic_id'] == data['topic_id']), None)
                if plant is None:
                    raise ValueError('Plant membership unavailable')
                if action == 'plant-remove':
                    community['plants'].remove(plant)
                elif action == 'plant-edit':
                    if not set(data['changes']) <= {'count', 'notes'}:
                        raise ValueError('Unsupported plant changes')
                    plant.update(data['changes'])
                elif action == 'plant-plan-set':
                    apply_plant_plan(plant, data, {e['id']: e for e in records(c, 'irrigation_evidence')}, actor, stamp)
                    affected = id
                elif action in {'stage-set', 'field-set'}:
                    stage = data['stage']
                    if stage not in STAGES:
                        raise ValueError('Unknown irrigation stage')
                    irrigation = plant['irrigation'].setdefault(stage, IrrigationStage().model_dump())
                    if action == 'stage-set':
                        if data['status'] == 'unconfigured':
                            del plant['irrigation'][stage]
                        elif data['status'] in {'configured', 'not-applicable'}:
                            irrigation['status'] = data['status']
                        else:
                            raise ValueError('Invalid irrigation stage status')
                    else:
                        if irrigation['status'] != 'configured':
                            raise ValueError('Configure this stage before editing its values')
                        key = data['field']
                        if key not in FIELDS:
                            raise ValueError('Unknown irrigation field')
                        previous = irrigation['fields'].get(key, PlannedField().model_dump())
                        field = dict(previous, rationale=data.get('rationale', ''), actor=actor, changed_at=stamp)
                        mode = data['mode']
                        if data.get('evidence_id'):
                            selected = next((e for e in records(c, 'irrigation_evidence') if e['id']==data['evidence_id']),None)
                            if selected is None or selected['stage']!=stage or selected['field']!=key or selected['species_id'] not in {None,plant['topic_id']}:
                                raise ValueError('Select compatible source evidence')
                            field['baseline']=copy.deepcopy(selected)
                        if mode == 'clear':
                            field.update(value=None, origin='not-set')
                        elif mode == 'source':
                            baseline = field['baseline']
                            if baseline is None or baseline['stage'] != stage or baseline['field'] != key:
                                raise ValueError('Select compatible source evidence')
                            if baseline['species_id'] != plant['topic_id'] or baseline['value'] is None:
                                raise ValueError('General guidance or unquantified evidence cannot supply a species-specific value')
                            if key == 'amount' and (baseline['units'] not in EVENT_AMOUNT_UNITS or not isinstance(baseline['value'], (int, float))):
                                raise ValueError('A range or incompatible unit requires an explicit user planning value')
                            field.update(value=baseline['value'], origin='source', baseline=copy.deepcopy(baseline))
                        elif mode == 'user':
                            if 'value' not in data or data['value'] is None:
                                raise ValueError('Enter a value or use Clear value')
                            if key=='amount' and (type(data['value']) not in (int,float) or not math.isfinite(data['value']) or data['value']<0):
                                raise ValueError('Amount must be a finite nonnegative number of liters per plant per event')
                            field.update(value=data['value'], origin='user-adjusted' if field['baseline'] is not None else 'user-set')
                        else:
                            raise ValueError('Unknown field editing mode')
                        irrigation['fields'][key] = field
                else:
                    raise ValueError('Unknown community action')
        else:
            raise ValueError('Unknown editing action')
        validate_groups(groups, set(topics))
        communities = {id: validate_community(item, groups, topics) for id, item in communities.items()}
        after = dict(organization_roots=sorted(roots.values(), key=lambda x:x['id']), browse_groups=sorted(groups.values(), key=lambda x:x['id']), communities=sorted(communities.values(), key=lambda x:x['id']))
        if dry_run:
            return dict(status='validated', revision=revision, workspace=after)
        event_id = uuid.uuid4().hex
        for table in TABLES:
            c.execute(f'DELETE FROM {table}')
            c.executemany(f'INSERT INTO {table} VALUES (?,?)', ((item['id'], json.dumps(item, ensure_ascii=False)) for item in after[table]))
        event = dict(id=event_id, revision=revision+1, action=action, actor=actor, changed_at=stamp, before=before, after=after)
        c.execute('INSERT INTO planning_events VALUES (?,?,?)', (event_id, revision+1, json.dumps(event, ensure_ascii=False)))
        c.execute("UPDATE meta SET value=? WHERE key='revision'", (str(revision+1),))
        return dict(status='saved', revision=revision+1, event_id=event_id, affected_id=affected)


def field_history(store, community_id, topic_id, stage, key):
    def extract(snapshot):
        community = next((x for x in snapshot['communities'] if x['id'] == community_id), None)
        plant = next((x for x in community['plants'] if x['topic_id'] == topic_id), None) if community else None
        return plant.get('irrigation', {}).get(stage, {}).get('fields', {}).get(key) if plant else None
    with store.connect() as c:
        result = []
        for row in c.execute('SELECT data FROM planning_events ORDER BY revision'):
            event = json.loads(row[0])
            before, after = extract(event['before']), extract(event['after'])
            if before != after:
                result.append({k:event[k] for k in ('id','revision','action','actor','changed_at')} | dict(before=before, after=after))
        return result
