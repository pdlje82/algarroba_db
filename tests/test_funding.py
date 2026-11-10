import copy
import hashlib
from datetime import datetime,timezone
import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.store import Store
from backend.app import create_app
from backend.funding import ProjectEdit,edit_project,state
from backend.planning import Conflict


@pytest.fixture
def fixture(tmp_path):
    s=Store(tmp_path/'funding.sqlite',media_root=tmp_path)
    path=tmp_path/'sources/test.txt';path.parent.mkdir();path.write_text('Synthetic official-source fixture, not real funding advice.')
    source=dict(id='source-test',title='Synthetic funding source',kind='web',filename='test.txt',managed_path='sources/test.txt',sha256=hashlib.sha256(path.read_bytes()).hexdigest(),url='https://example.org/official',retrieved_on='2026-11-10',excerpt='Synthetic test evidence')
    ref=dict(source_id=source['id'],label='Synthetic funding conditions',locator='Synthetic section')
    s.import_batch(dict(batch_id='fixture',summary='Synthetic fixture',sources=[source],topics=[dict(id=id,label=id,kind='programme' if domain=='funding' else 'method',domain=domain,description='Synthetic topic',group_id='programmes' if domain=='funding' else 'drones',source_refs=[ref]) for id,domain in [('fund','funding'),('method','technology')]]))
    edit_project(s,ProjectEdit(expected_revision=s.revision(),action='create',id='idea:test',changes=dict(label='Test idea',goals='Explore a test method',topic_ids=['method'])))
    review=dict(id='funding-review:test',topic_id='fund',version=1,instrument_type='grant',availability='open',availability_note='Synthetic open call',territory='Test region',applicants='Test institutions',activities='Test activities',deadlines=[dict(label='First stage',value='2026-01-01T12:00:00+01:00',timezone='CET')],checked_on='2025-12-01',source_refs=[ref])
    assessment=dict(id='funding-assessment:test',project_id='idea:test',project_version=1,review_id=review['id'],review_version=1,relevance='conditional',applicant_route='Test partner',reasons=['Test thematic possibility'],requirements=['Applicant unconfirmed'],next_action='Review the test conditions',checked_on='2025-12-01',source_refs=[ref])
    batch=dict(batch_id='funding',summary='Synthetic reviewed context',base_revision=s.revision(),funding_reviews=[review],funding_assessments=[assessment])
    return s,batch


def test_checked_intake_api_export_and_idempotency(fixture):
    s,b=fixture;before=s.snapshot();check=s.import_batch(b,True);assert check['funding_reviews']==1;assert s.snapshot()==before
    accepted=s.import_batch(b);assert s.import_batch(b)['status']=='unchanged'
    c=TestClient(create_app(s));catalog=c.get('/api/catalog').json()
    assert len(catalog['project_ideas'])==len(catalog['funding_reviews'])==len(catalog['funding_assessments'])==1
    assert catalog['funding_state']['assessments']['funding-assessment:test']==[]
    assert c.get('/api/inspect/fund').json()['funding_reviews'][0]['topic_id']=='fund'
    assert s.snapshot()['project_ideas'][0]['applicant_status']=='Unconfirmed'
    assert s.snapshot()['communities']==before['communities']
    assert Store(s.path,media_root=s.media_root).snapshot()==s.snapshot()
    assert accepted['revision']==before['revision']+1


@pytest.mark.parametrize('problem',['reference','version','exclusion','duplicate','fingerprint'])
def test_bad_funding_import_is_atomic(fixture,problem):
    s,b=fixture;b=copy.deepcopy(b);a=b['funding_assessments'][0]
    if problem=='reference':a['source_refs'][0]['page']=2
    elif problem=='version':a['project_version']=2
    elif problem=='exclusion':a['relevance']='outside-scope'
    elif problem=='duplicate':b['funding_assessments'].append(dict(a,id='funding-assessment:duplicate'))
    else:a['evidence_fingerprint']='wrong'
    before=s.snapshot()
    with pytest.raises(ValueError):s.import_batch(b)
    assert s.snapshot()==before


def test_project_edits_preserve_evidence_and_flag_assessments(fixture):
    s,b=fixture;s.import_batch(b);before=s.snapshot();c=TestClient(create_app(s));rev=s.revision()
    payload=dict(expected_revision=rev,action='update',id='idea:test',changes=dict(goals='A revised idea'))
    response=c.post('/api/projects/edit',json=payload);assert response.status_code==200;assert response.json()['project']['version']==2
    assert c.post('/api/projects/edit',json=payload).status_code==409
    assert c.post('/api/projects/edit',json=dict(payload,expected_revision=s.revision(),changes=dict(version=99))).status_code==400
    assert c.post('/api/projects/edit',json=dict(payload,expected_revision=s.revision()),headers={'Origin':'https://elsewhere.example'}).status_code==403
    after=s.snapshot();assert after['funding_assessments']==before['funding_assessments'];assert after['funding_reviews']==before['funding_reviews']
    assert state(after)['assessments']['funding-assessment:test']==['Project idea changed; reconsider this assessment.']
    assert s.revision()==rev+1


def test_changes_to_review_topic_or_source_mark_previous_assessment(fixture):
    s,b=fixture;s.import_batch(b)
    old=s.snapshot()['funding_assessments'][0]
    source=s.records('sources')[0];source['excerpt']='Updated passage interpretation'
    s.import_batch(dict(batch_id='source-update',summary='Synthetic source annotation correction',sources=[source]))
    assert state(s.snapshot())['assessments'][old['id']]
    assert s.snapshot()['funding_assessments'][0]==old
    review=copy.deepcopy(s.records('funding_reviews')[0]);review['availability_note']='A changed notice'
    with pytest.raises(ValueError,match='greater version'):s.import_batch(dict(batch_id='bad-review',summary='Invalid version',funding_reviews=[review]))
    review['version']=2;s.import_batch(dict(batch_id='new-review',summary='Reviewed update',funding_reviews=[review]))
    assert state(s.snapshot())['assessments'][old['id']]


def test_failed_checks_keep_last_facts_and_deadlines_do_not_infer_closure(fixture):
    s,b=fixture;s.import_batch(b);review=copy.deepcopy(s.records('funding_reviews')[0])
    review.update(version=2,verification_state='failed',attempted_on='2026-11-10',verification_note='Synthetic retrieval failure; retry the official notice.')
    review['availability']='closed'
    with pytest.raises(ValueError,match='last-confirmed'):s.import_batch(dict(batch_id='bad-failure',summary='Invalid failed check',funding_reviews=[review]))
    review['availability']='open';s.import_batch(dict(batch_id='failure',summary='Failed check recorded without changing facts',funding_reviews=[review]))
    snap=s.snapshot();status=state(snap,datetime(2026,11,10,tzinfo=timezone.utc));assert snap['funding_reviews'][0]['availability']=='open'
    assert any('does not verify closure' in w for w in status['reviews'][review['id']])
    assert any('retrieval failure' in w for w in status['reviews'][review['id']])


def test_assessment_only_source_changes_flag_review(fixture):
    s,b=fixture
    extra=copy.deepcopy(s.records('sources')[0]);extra['id']='assessment-source'
    s.import_batch(dict(batch_id='extra-source',summary='Assessment-specific source',sources=[extra]))
    b['base_revision']=s.revision()
    b['funding_assessments'][0]['source_refs']=[dict(source_id=extra['id'],label='Additional applicant conditions',locator='Synthetic applicant section')]
    s.import_batch(b);before=s.records('funding_assessments')
    assert not state(s.snapshot())['assessments'][before[0]['id']]
    extra['excerpt']='Corrected applicant conditions'
    s.import_batch(dict(batch_id='extra-correction',summary='Assessment-specific evidence correction',sources=[extra]))
    assert state(s.snapshot())['assessments'][before[0]['id']]
    assert s.records('funding_assessments')==before


def test_funding_metadata_is_checked_context_not_eligibility(fixture):
    s,b=fixture;s.import_batch(b);before=s.records('funding_assessments');topic=s.records('topics')[0]
    topic.update(funding_role='route',funding_context_ids=[])
    s.import_batch(dict(batch_id='funding-role',summary='Curated funding role',topics=[topic]))
    assert not state(s.snapshot())['assessments'][before[0]['id']]
    reference=dict(topic,id='rule',kind='condition',label='Supporting rule',funding_role='reference',funding_context_ids=['fund'])
    s.import_batch(dict(batch_id='context-link',summary='Curated reference link',topics=[reference]))
    inspected=TestClient(create_app(s)).get('/api/inspect/rule').json()
    assert inspected['funding_reviews'][0]['topic_id']=='fund'
    assert len(inspected['funding_assessments'])==1
    assert s.records('funding_assessments')==before
    for contexts in [['absent'],['rule'],['fund','fund']]:
        with pytest.raises(ValueError,match='Funding contexts'):s.import_batch(dict(batch_id='bad-context-'+str(len(contexts))+str(contexts[0]),summary='Invalid link',topics=[dict(reference,funding_context_ids=contexts)]))
    method=next(t for t in s.records('topics') if t['id']=='method')
    with pytest.raises(ValueError,match='Funding metadata'):s.import_batch(dict(batch_id='nonfunding-role',summary='Invalid role',topics=[dict(method,funding_role='reference')]))
    topic['description']='A factual eligibility correction'
    s.import_batch(dict(batch_id='factual-change',summary='Factual correction',topics=[topic]))
    assert state(s.snapshot())['assessments'][before[0]['id']]


def test_date_precision_and_opening_warnings(fixture):
    s,b=fixture;review=b['funding_reviews'][0]
    review['deadlines']=[dict(label='Opening',value='2026-01-01',kind='opening'),dict(label='Inclusive deadline',value='2026-11-10',note='Time unknown')]
    s.import_batch(b);warnings=state(s.snapshot(),datetime(2026,11,10,tzinfo=timezone.utc))['reviews'][review['id']]
    assert len(warnings)==1 and 'opening date has passed' in warnings[0]
    bad=copy.deepcopy(review);bad['version']=2;bad['deadlines']=[dict(label='Invalid time',value='2026-11-10T12:00:00')]
    with pytest.raises(ValueError,match='UTC offset'):s.import_batch(dict(batch_id='bad-time',summary='Invalid time',funding_reviews=[bad]))


def test_navigation_validation_alias_and_additive_migration(fixture,tmp_path,monkeypatch):
    s,_=fixture;group=dict(id='browse:wrapper',label='Wrapper',parent_id='funding:programmes',anchor_topic_id=None,members=[dict(topic_id='fund',role='primary')],maintenance_rule='Test wrapper',presentation='hierarchy',navigation='transparent')
    s.import_batch(dict(batch_id='wrapper',summary='Test transparent navigation',browse_groups=[group]))
    c=TestClient(create_app(s));assert c.get('/api/explore',params=dict(scope='group',group_id='browse:wrapper')).json()['group_id']=='funding:programmes'
    bad=dict(group,anchor_topic_id='method')
    with pytest.raises(ValueError,match='unanchored'):s.import_batch(dict(batch_id='bad-wrapper',summary='Invalid anchor',browse_groups=[bad]))
    rev=s.revision();snap=s.snapshot()
    with sqlite3.connect(s.path) as conn:
        for table in ['project_ideas','funding_reviews','funding_assessments','project_idea_events']:conn.execute('DROP TABLE '+table)
    monkeypatch.setattr('backend.store.ROOT',tmp_path)
    restored=Store(s.path,media_root=s.media_root)
    assert restored.revision()==rev;assert restored.records('topics')==snap['topics'];assert restored.snapshot()['project_ideas']==[]
    assert list((tmp_path/'backups').glob('*.sqlite'))
