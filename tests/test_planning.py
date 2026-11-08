import copy
import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.store import Store,ROOT
from backend.app import create_app
from backend.planning import Edit,Conflict,apply_edit,field_history
from backend.graph import Graph


@pytest.fixture
def store(tmp_path):
    s=Store(tmp_path/'plan.sqlite')
    manifest=json.loads((ROOT/'imports/source-manifest.json').read_text(encoding='utf-8'));s.register_sources(manifest)
    batch=dict(batch_id='planning-fixture',summary='Initial collection',topics=[],relationships=[],findings=[],coverage=[],unresolved=[])
    for name in ['ecosystems.json','water-technology.json','funding.json']:
        data=json.loads((ROOT/'imports'/name).read_text(encoding='utf-8'))
        for k in ['topics','relationships','findings','coverage','unresolved']:batch[k]+=data[k]
    s.import_batch(batch)
    s.import_batch(dict(json.loads((ROOT/'imports/cocoon-browse-group.json').read_text()),base_revision=s.revision()))
    return s


def edit(s,action,**data):return apply_edit(s,Edit(expected_revision=s.revision(),action=action,data=data))
def community(s,name='Test community'):
    return edit(s,'community-create',label=name,parent_id='ecosystem:habitats')['affected_id']
def member(s,id):return next(c for c in s.snapshot()['communities'] if c['id']==id)['plants'][0]
def field(s,id,key='amount'):return member(s,id)['irrigation']['settlement']['fields'][key]


def evidence(s,id='irrigation-evidence:test',value=10,units='L/plant/watering',species='carob',key='amount'):
    raw=dict(id=id,species_id=species,stage='settlement',field=key,value=value,units=units,wording='Synthetic test evidence, not a real recommendation',context='Region A, test only',applicability='Test species context',limitations='Synthetic',source_refs=[dict(source_id='IRR-003',page=142,locator='Test fixture locator')])
    s.import_batch(dict(batch_id=id.replace(':','-'),summary='Synthetic test',base_revision=s.revision(),irrigation_evidence=[raw]))
    return raw


def test_groups_atomic_revision_shared_undo_and_cycles(store):
    s=store;before=s.snapshot()
    a=edit(s,'group-create',label='Folder A',parent_id='domain:ecosystem')['affected_id']
    b=edit(s,'group-create',label='Folder B',parent_id=a)['affected_id']
    with pytest.raises(ValueError,match='Cyclic'):edit(s,'group-move',id=a,parent_id=b)
    with pytest.raises(ValueError):edit(s,'group-move',id='ecosystem:species',parent_id=a)
    edit(s,'members-move',group_id=b,topic_ids=['carob','mastic'])
    edit(s,'members-share',group_id=a,topic_ids=['carob'])
    assert 'carob' in Graph(s).group_members(a)
    assert Graph(s).root_group(next(t for t in s.snapshot()['topics'] if t['id']=='carob'))==a
    saved=edit(s,'group-rename',id='technology:irrigation',label='Irrigation')
    undo=edit(s,'revert',event_id=saved['event_id'])
    assert next(r for r in s.snapshot()['organization_roots'] if r['id']=='technology:irrigation')['label']=='Establishment water'
    edit(s,'revert',event_id=undo['event_id'])
    with pytest.raises(Conflict):apply_edit(s,Edit(expected_revision=0,action='group-rename',data=dict(id=a,label='Stale')))
    stable=s.snapshot()
    with pytest.raises(ValueError):edit(s,'members-move',group_id=b,topic_ids=['carob','missing'])
    assert stable==s.snapshot()
    with pytest.raises(ValueError):edit(s,'group-delete',id=a)
    for k in ['topics','relationships','findings','sources','coverage','plant_images']:assert before[k]==s.snapshot()[k]


def test_communities_selection_is_not_factual_and_independent(store):
    s=store;before=s.snapshot()
    id=edit(s,'community-copy',label='Region B',parent_id='ecosystem:habitats',origin_id='carob-community',topic_ids=['carob','mastic'])['affected_id']
    edit(s,'stage-set',id=id,topic_id='carob',stage='settlement',status='configured')
    edit(s,'field-set',id=id,topic_id='carob',stage='settlement',field='amount',mode='user',value=0)
    other=community(s,'Other region');edit(s,'plants-add',id=other,topic_ids=['carob'])
    assert field(s,id)['value']==0 and not member(s,other)['irrigation']
    assert Graph(s).explore(scope='group',group_id=id)['endpoint_ids']==['carob','mastic']
    assert s.snapshot()['relationships']==before['relationships']
    with pytest.raises(ValueError):edit(s,'plants-add',id=id,topic_ids=['carob'])
    with pytest.raises(ValueError):edit(s,'plants-add',id=id,topic_ids=['carob-community'])
    with pytest.raises(ValueError):edit(s,'community-copy',label='Bad selection',parent_id='ecosystem:habitats',origin_id='carob-community',topic_ids=['aleppo-pine'])
    edit(s,'plant-remove',id=id,topic_id='carob')
    assert any(t['id']=='carob' for t in s.snapshot()['topics'])


def test_source_adjust_restore_clear_field_history_and_later_research(store):
    s=store;id=community(s);edit(s,'plants-add',id=id,topic_ids=['carob'])
    evidence(s)
    args=dict(id=id,topic_id='carob',stage='settlement')
    edit(s,'stage-set',**args,status='configured')
    edit(s,'field-set',**args,field='frequency',mode='user',value='When needed')
    untouched=copy.deepcopy(field(s,id,'frequency'))
    edit(s,'field-set',**args,field='amount',mode='source',evidence_id='irrigation-evidence:test')
    assert field(s,id)['origin']=='source' and field(s,id)['baseline']['source_refs'][0]['edition_sha256']
    edit(s,'field-set',**args,field='amount',mode='user',value=15,rationale='Different region')
    assert field(s,id)['origin']=='user-adjusted' and field(s,id)['baseline']['value']==10
    assert untouched==field(s,id,'frequency')
    evidence(s,'irrigation-evidence:new',value=25)
    assert field(s,id)['value']==15
    edit(s,'field-set',**args,field='amount',mode='source')
    assert field(s,id)['value']==10
    edit(s,'field-set',**args,field='amount',mode='clear')
    assert field(s,id)['value'] is None and field(s,id)['origin']=='not-set'
    assert len(field_history(s,id,'carob','settlement','amount'))==4
    edit(s,'stage-set',**args,status='not-applicable')
    with pytest.raises(ValueError):edit(s,'field-set',**args,field='amount',mode='user',value=2)
    edit(s,'stage-set',**args,status='unconfigured')
    assert 'settlement' not in member(s,id)['irrigation']
    assert field_history(s,id,'carob','settlement','amount')[-1]['after'] is None


def test_ranges_general_guidance_immutable_evidence_and_bad_units(store):
    s=store;id=community(s);edit(s,'plants-add',id=id,topic_ids=['carob'])
    raw=evidence(s,value='10–20',units='L/week',species=None)
    args=dict(id=id,topic_id='carob',stage='settlement',field='amount')
    edit(s,'stage-set',id=id,topic_id='carob',stage='settlement',status='configured')
    with pytest.raises(ValueError):edit(s,'field-set',**args,mode='source',evidence_id=raw['id'])
    edit(s,'field-set',**args,mode='user',value=12,evidence_id=raw['id'],rationale='Explicit planning decision')
    assert field(s,id)['baseline']['value']=='10–20'
    assert field(s,id)['origin']=='user-adjusted'
    for bad in [-1,float('inf'),'12',True]:
        with pytest.raises(ValueError):edit(s,'field-set',**args,mode='user',value=bad)
    raw['value']=20
    with pytest.raises(ValueError,match='immutable'):s.import_batch(dict(batch_id='bad-correction',summary='Bad',irrigation_evidence=[raw]))
    raw['id']='irrigation-evidence:uninspected';raw['source_refs'][0]['page']=1
    with pytest.raises(ValueError,match='inspected'):s.import_batch(dict(batch_id='uninspected',summary='Bad',irrigation_evidence=[raw]))


def test_http_source_lock_conflict_origin_and_backup_reload(store,tmp_path):
    s=store;client=TestClient(create_app(s))
    revision=s.revision()
    response=client.post('/api/organization/edit',json=dict(expected_revision=revision,action='group-rename',data=dict(id='technology:irrigation',label='Irrigation')))
    assert response.status_code==200
    assert client.post('/api/organization/edit',json=dict(expected_revision=revision,action='group-rename',data={})).status_code==409
    assert client.post('/api/communities/edit',headers={'origin':'https://elsewhere.invalid'},json=dict(expected_revision=s.revision(),action='community-create',data={})).status_code==403
    source=dict(id='community:source-test',kind='source',label='Source test',context='Synthetic source context, not a planting recipe',parent_id='ecosystem:habitats',basis=[dict(source_id='FOREST-002',page=18,locator='Source context')],plants=[dict(topic_id='carob',basis=[dict(source_id='FOREST-002',page=18,locator='Source context')])])
    s.import_batch(dict(batch_id='source-community-test',summary='Synthetic',communities=[source]))
    assert client.post('/api/communities/edit',json=dict(expected_revision=s.revision(),action='community-edit',data=dict(id=source['id'],changes=dict(label='Cannot change')))).status_code==400
    original=s.snapshot()
    with sqlite3.connect(tmp_path/'restored.sqlite') as target:
        with s.connect() as current:current.backup(target)
    assert Store(tmp_path/'restored.sqlite').snapshot()==original
    assert client.get('/api/inspect/community:source-test').status_code==200
    assert client.get('/api/inspect/ecosystem:species').json()['member_ids']==Graph(s).explore(scope='group',group_id='ecosystem:species')['endpoint_ids']


def test_initial_migration_preview_preserves_cocoon_and_facts(store):
    # Initial fixture predates the new habitat intake; add its four habitat identities for mapping only.
    s=store
    template=next(t for t in s.snapshot()['topics'] if t['id']=='mediterranean-dryland')
    current={t['id'] for t in s.snapshot()['topics']}
    additions=[]
    for id in ['coastal-rocky-scrub','rosemary-scrub','seasonal-watercourse','semi-arid-shrubland']:
        if id not in current:additions.append(dict(template,id=id,label=id))
    s.import_batch(dict(batch_id='fixture-habitats',summary='Synthetic',topics=additions))
    from scripts.prepare_community_organization import prepare
    edit_value=Edit.model_validate(prepare(s.path));before=s.snapshot()
    assert apply_edit(s,edit_value,actor='Codex',dry_run=True)['status']=='validated'
    assert s.snapshot()==before
    apply_edit(s,edit_value,actor='Codex')
    after=s.snapshot()
    assert next(g for g in after['browse_groups'] if g['id']=='browse:cocoon')['members']==next(g for g in before['browse_groups'] if g['id']=='browse:cocoon')['members']
    assert len(next(g for g in after['browse_groups'] if g['id']=='browse:irrigation-lifecycle')['members'])==4
    assert not after['communities']
    for key in ['topics','relationships','findings','sources','coverage']:assert before[key]==after[key]


def test_multiple_undo_redo_conflicts_and_failed_io_are_atomic(store):
    s=store
    first=edit(s,'group-create',label='First folder',parent_id='ecosystem:habitats')
    second=edit(s,'group-rename',id=first['affected_id'],label='Changed folder')
    undo_second=edit(s,'revert',event_id=second['event_id'])
    undo_first=edit(s,'revert',event_id=first['event_id'])
    assert not any(g['id']==first['affected_id'] for g in s.snapshot()['browse_groups'])
    edit(s,'revert',event_id=undo_first['event_id'])
    edit(s,'revert',event_id=undo_second['event_id'])
    assert next(g for g in s.snapshot()['browse_groups'] if g['id']==first['affected_id'])['label']=='Changed folder'
    edit(s,'group-rename',id=first['affected_id'],label='Another change')
    with pytest.raises(Conflict):edit(s,'revert',event_id=second['event_id'])
    before=s.snapshot()
    with s.connect() as c:
        event_count=c.execute('SELECT count(*) FROM planning_events').fetchone()[0]
        c.execute("CREATE TRIGGER fail_planning_write BEFORE UPDATE ON meta WHEN NEW.key='revision' BEGIN SELECT RAISE(ABORT,'Injected disk-write failure'); END")
    with pytest.raises(sqlite3.IntegrityError):edit(s,'group-rename',id=first['affected_id'],label='Must roll back')
    assert s.snapshot()==before
    with s.connect() as c:assert c.execute('SELECT count(*) FROM planning_events').fetchone()[0]==event_count


def test_intake_cannot_break_existing_plant_memberships(store):
    s=store;id=community(s);edit(s,'plants-add',id=id,topic_ids=['carob'])
    carob=next(t for t in s.snapshot()['topics'] if t['id']=='carob')
    before=s.snapshot()
    with pytest.raises(ValueError,match='species'):
        s.import_batch(dict(batch_id='invalid-species-change',summary='Must fail',base_revision=s.revision(),topics=[dict(carob,kind='method')]))
    assert s.snapshot()==before
