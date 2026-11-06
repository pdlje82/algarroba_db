import copy
import hashlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.graph import Graph,PERSPECTIVES
from backend.store import ROOT,Store


@pytest.fixture
def store(tmp_path):
    s=Store(tmp_path/'test.sqlite')
    manifest=json.loads((ROOT/'imports/source-manifest.json').read_text(encoding='utf-8'))
    s.register_sources(manifest)
    batch={"batch_id":"fixture","summary":"Selected initial collection","topics":[],"relationships":[],"findings":[],"coverage":[],"unresolved":[]}
    for name in ['ecosystems.json','water-technology.json','funding.json']:
        data=json.loads((ROOT/'imports'/name).read_text(encoding='utf-8'))
        for key in ['topics','relationships','findings','coverage','unresolved']:batch[key]+=data[key]
    s.import_batch(batch)
    return s,batch


def test_exact_scope_evidence_and_safe_repeat(store):
    s,batch=store
    snap=s.snapshot();assert len(snap['sources'])==9 and len(snap['coverage'])==68
    assert len({(p['source_id'],p['page']) for p in snap['coverage']})==68
    assert all(t['source_refs'] for t in snap['topics'])
    assert all(e['source_refs'] and e['explanation'] for e in snap['relationships'])
    assert s.import_batch(batch)['status']=='unchanged'
    assert s.revision()==1
    assert s.snapshot()==snap


def test_invalid_and_stale_import_leave_accepted_knowledge_intact(store):
    s,batch=store;before=s.snapshot()
    bad={'batch_id':'invalid','summary':'invalid','relationships':[dict(batch['relationships'][0],id='invalid-edge',target='missing-topic')]}
    with pytest.raises(ValueError,match='endpoint'):s.import_batch(bad)
    with pytest.raises(ValueError,match='changed'):s.import_batch({'batch_id':'stale','summary':'stale','base_revision':0})
    assert s.snapshot()==before


def test_mid_transaction_failure_rolls_back_records_and_revision(store,monkeypatch):
    s,batch=store;before=s.snapshot()
    def fail(_):raise RuntimeError('simulated indexing failure')
    monkeypatch.setattr(s,'reindex',fail)
    topic=dict(batch['topics'][0],id='rollback-topic',label='Must roll back')
    with pytest.raises(RuntimeError,match='indexing failure'):s.import_batch({'batch_id':'rollback','summary':'transaction test','topics':[topic]})
    assert s.snapshot()==before
    bad=copy.deepcopy(batch);bad['topics'][0]['label']='Different'
    with pytest.raises(ValueError,match='different contents'):s.import_batch(bad)
    assert s.snapshot()==before


def test_all_perspectives_share_anchor_and_search_and_have_content(store):
    s,_=store;g=Graph(s)
    for perspective,_ in PERSPECTIVES:
        v=g.view('carob','drone',perspective)
        assert v['centre']=='carob' and v['search']=='drone'
        assert any(n['id']=='carob' for n in v['nodes'])
        assert len(v['nodes'])>1
    funding=g.view('carob','drone','funding')
    assert any(n['domain']=='funding' for n in funding['nodes'])
    hierarchy=g.view('carob','','hierarchy')
    assert any(n['id']=='fabaceae' for n in hierarchy['nodes'])
    places=g.view('carob','','places')
    assert any(n['kind']=='place' for n in places['nodes'])
    time=g.view('carob','','time')
    assert any(n['record_type']=='event' for n in time['nodes'])


def test_routes_are_complete_bounded_and_never_traverse_source_or_classification_hubs(store):
    s,_=store;g=Graph(s);v=g.view('carob','drone','technology',48,8)
    edges={e['id']:e for e in s.records('relationships')}
    assert any(len(r['nodes'])>2 for r in v['routes'])
    for route in v['routes']:
        assert len(route['edges'])==len(route['nodes'])-1<=8
        assert len(route['nodes'])==len(set(route['nodes']))
        for a,b,e in zip(route['nodes'],route['nodes'][1:],route['edges']):
            assert {a,b}=={edges[e]['source'],edges[e]['target']}
            assert edges[e].get('traversable',True)
    assert len(v['nodes'])<=120 and len(v['edges'])<=240
    paths=g.paths('carob','drones',8,3)
    assert 1<=len(paths)<=3


def test_comparison_values_belong_to_each_method_and_keep_gaps(store):
    s,_=store;g=Graph(s)
    v=g.view('cocoon','','comparison')
    assert {'cocoon','traditional-reforestation','individual-fog-water-collector'}<={n['id'] for n in v['nodes']}
    assert any(e['source']=='cocoon' and '57.4' in e['label'] for e in v['edges'])
    assert any(e['source']=='traditional-reforestation' and '133.5' in e['label'] for e in v['edges'])
    v=g.view('carob','','comparison',compare=['cocoon','drones'])
    assert any(e['source']=='drones' and e['record_type']=='gap' for e in v['edges'])


def test_unmatched_term_and_missing_perspective_keep_context(store):
    s,_=store;g=Graph(s)
    v=g.view('carob','a-completely-unrecorded-topic','funding')
    assert v['centre']=='carob' and v['search']=='a-completely-unrecorded-topic'
    assert v['nodes'][0]['id']=='carob' and v['notices']
    assert not v['routes']
    comparison=g.view('carob','a-completely-unrecorded-topic','comparison')
    assert {n['id'] for n in comparison['nodes']}=={'carob'}


def test_inspecting_a_branch_reveals_real_neighbours_without_recentering(store):
    s,_=store;g=Graph(s)
    view=g.view('carob','drone','funding',branches=['kermes-oak'])
    assert view['centre']=='carob' and view['search']=='drone'
    assert any(n['id']=='kermes-oak' and n.get('perspective_support') for n in view['nodes'])
    assert any(e['record_type']=='branch' and e['source_refs'] for e in view['edges'])


def test_text_search_aliases_and_accents(store):
    s,_=store
    assert any(r['id']=='carob' for r in s.search('algarrobo'))
    assert any(r['id']=='almeria' for r in s.search('Almeria'))
    assert any(r['id']=='drones' for r in s.search('UAV'))
    assert s.search('" *')==[]
    assert isinstance(s.search('" OR *'),list)  # Query syntax is treated as literal search tokens.


def test_saved_exploration_and_static_handoff_preserve_exact_context(store,tmp_path,monkeypatch):
    import backend.app as module
    s,_=store;monkeypatch.setattr(module,'ROOT',tmp_path)
    client=TestClient(create_app(s))
    state={'centre':'carob','search':'drone','perspective':'funding','detail':'full','positions':{'carob':{'x':12,'y':9}},'camera':{'zoom':.75,'pan':{'x':3,'y':5},'reference':1}}
    saved=client.post('/api/explorations',json={'label':'Carob and drones','state':state}).json()
    assert client.get('/api/explorations/'+saved['id']).json()['state']==state
    context={**state,'knowledge_revision':0,'selected_topic_ids':['carob','drones'],'selected_relationship_ids':[],'routes':Graph(s).view('carob','drone')['routes'][:1],'view_state':state}
    draft={'context':context,'areas':['Funding','Sources'],'custom_topics':'soil microorganisms','source_scope':'Library only','instruction':'Explain this connection'}
    preview=client.post('/api/research/preview',json=draft).json()
    assert preview['context']['identity_reconciliation_required']
    prompt=preview['prompt']+'\nAn exact user edit.'
    task=client.post('/api/research',json={**draft,'task_id':preview['task_id'],'prompt':prompt}).json()
    assert task['prompt']==prompt and task['id']==preview['task_id']
    assert task['status']=='Prepared'
    assert (tmp_path/'research'/task['id']/'prompt.txt').read_text(encoding='utf-8')==prompt
    assert 'ALL useful supported discoveries' in prompt and 'wider existing graph' in prompt
    assert s.revision()==1  # A research indication never becomes accepted knowledge.
    retried=client.post('/api/research',json={**draft,'task_id':preview['task_id'],'prompt':prompt}).json()
    assert retried['id']==task['id'] and len(client.get('/api/research').json())==1
    assert client.post('/api/explorations',json={'label':'x','state':{}},headers={'Origin':'https://other.example'}).status_code==403


def test_old_identity_is_reconciled_and_a_new_discovery_joins_wider_graph(store):
    s,batch=store
    topic=dict(batch['topics'][0],id='new-in-domain-discovery',label='New in-domain discovery')
    edge=dict(batch['relationships'][0],id='new-supported-connection',source=topic['id'],target='cocoon',traversable=True)
    s.import_batch({'batch_id':'followup','summary':'Research adds a supported wider connection','base_revision':1,'topics':[topic],'relationships':[edge],'redirects':{'old-carob-id':'carob'}})
    assert s.resolve('old-carob-id')=='carob'
    assert Graph(s).view('old-carob-id','drone')['centre']=='carob'
    assert Graph(s).tree('carob',8).get('new-in-domain-discovery')


def test_source_page_access_and_missing_edition_are_explained(store,tmp_path):
    s,_=store;client=TestClient(create_app(s))
    response=client.get('/api/sources/DRONE-004/file',headers={'Range':'bytes=0-63'})
    assert response.status_code==206 and response.content.startswith(b'%PDF')
    sources=s.records('sources'); source=next(x for x in sources if x['id']=='DRONE-004');source['path']=str(tmp_path/'missing.pdf')
    with s.connect() as c:c.execute('UPDATE sources SET data=? WHERE id=?',(json.dumps(source),source['id']))
    r=client.get('/api/sources/DRONE-004/file');assert r.status_code==404 and 'locator' in r.json()['detail']


def test_original_editions_unchanged(store):
    s,_=store
    for source in s.records('sources'):
        with Path(source['path']).open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==source['sha256']
