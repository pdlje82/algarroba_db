import copy
import hashlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.graph import Graph,LIMITS
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


def test_hierarchy_group_metadata_and_editor_preserve_factual_records(store):
    from backend.planning import Edit, apply_edit
    s,_=store
    before=s.snapshot()
    group=dict(id='browse:hierarchy-test',label='Hierarchy',parent_id='funding:programmes',anchor_topic_id='leader',members=[dict(topic_id='al20',role='primary')],maintenance_rule='Test organization only',presentation='hierarchy',description='Retained guide',member_layout='vertical')
    s.import_batch(dict(batch_id='hierarchy-metadata-test',base_revision=s.revision(),summary='Isolated hierarchy metadata',browse_groups=[group]))
    client=TestClient(create_app(s))
    assert client.get('/api/catalog').json()['browse_groups'][0]['presentation']=='hierarchy'
    assert client.get('/api/explore',params=dict(scope='group',group_id=group['id'])).json()['endpoint_ids']==['al20']
    apply_edit(s,Edit(expected_revision=s.revision(),action='group-rename',data=dict(id=group['id'],label='Renamed hierarchy')))
    saved=s.snapshot()['browse_groups'][0]
    assert saved['presentation']=='hierarchy' and saved['member_layout']=='vertical'
    assert saved['description']=='Retained guide' and saved['members']==group['members']
    for key in ['topics','relationships','findings','sources','coverage']:
        assert s.snapshot()[key]==before[key]


def test_group_presentation_defaults_and_rejects_unknown_modes():
    from backend.store import BrowseGroup
    from backend.planning import validate_groups
    group=dict(id='browse:default-test',label='Default',parent_id='funding:programmes',members=[],maintenance_rule='Test')
    assert BrowseGroup.model_validate(group).presentation=='standard'
    with pytest.raises(ValueError):BrowseGroup.model_validate(dict(group,presentation='unsupported'))
    with pytest.raises(ValueError,match='presentation'):validate_groups({group['id']:dict(group,presentation='unsupported')},set())


def test_species_names_are_stored_searchable_and_keep_source_identities(store):
    s,_=store
    before=s.snapshot()
    batch=json.loads((ROOT/'imports/species-names-es-en-scientific-2026-11-08.json').read_text(encoding='utf-8'))
    batch['base_revision']=s.revision()
    assert s.import_batch(batch,True)['topics']==34
    assert s.snapshot()==before
    assert s.import_batch(batch)['status']=='accepted'
    assert s.import_batch(batch)['status']=='unchanged'
    after=s.snapshot()
    for key in ['relationships','findings','sources','coverage','browse_groups','unresolved']:
        assert after[key]==before[key]
    old={t['id']:t for t in before['topics']};new={t['id']:t for t in after['topics']}
    assert old.keys()==new.keys()
    allowed={'spanish_name','english_name','scientific_name','name_status','name_note','name_references'}
    for id,topic in old.items():
        if topic['kind']!='species':assert new[id]==topic
        assert {k:v for k,v in topic.items() if k not in allowed}=={k:v for k,v in new[id].items() if k not in allowed}
    client=TestClient(create_app(s))
    for term,id in [('Algarrobo','carob'),('Ceratonia siliqua','carob'),('Cantueso','lavandula-stoechas'),('French lavender','lavandula-stoechas'),('Bayón','osyris-quadripartita')]:
        assert id in {x['id'] for x in s.search(term) if x['kind']=='topic'}
        assert id in client.get('/api/explore',params={'scope':'search','search':term}).json()['endpoint_ids']
    assert new['carob']['spanish_name']=='Algarrobo'
    assert new['carob']['english_name']=='Carob tree'
    assert new['carob']['scientific_name']=='Ceratonia siliqua'
    assert new['whitania-frutescens-source']['spanish_name'] is None
    assert new['chamaespartium-source']['english_name'] is None
    assert new['pine-menaqua']['scientific_name']=='Pinus halapensis [source spelling]'
    assert new['citrus']['scientific_name']=='Citrus spp.' and new['citrus']['name_status']=='genus-only'
    assert {'holm-oak','holm-oak-rotundifolia'} <= new.keys()
    result=client.post('/api/research/preview',json={'context':{'selected_topic_ids':['carob'],'knowledge_revision':s.revision()},'instruction':'Research Algarrobo'})
    assert result.status_code==200
    assert result.json()['context']['species_names']['carob']['spanish_name']=='Algarrobo'
    assert 'Algarrobo' in result.json()['prompt'] and 'Ceratonia siliqua' in result.json()['prompt']


def test_invalid_species_name_metadata_preserves_knowledge(store):
    from pydantic import ValidationError
    s,_=store;before=s.snapshot()
    topic=next(t for t in before['topics'] if t['id']=='carob')
    with pytest.raises(ValidationError):
        s.import_batch({'batch_id':'invalid-naming','summary':'Invalid','topics':[{**topic,'spanish_name':''}]})
    with pytest.raises(ValidationError):
        s.import_batch({'batch_id':'invalid-ref','summary':'Invalid','topics':[{**topic,'name_references':[{'url':'javascript:alert(1)','title':'Invalid','fields':['spanish_name'],'accessed':'2026-11-08'}]}]})
    assert s.snapshot()==before


def test_browsing_groups_are_transactional_organization_not_factual_edges(store):
    s,_=store;before=s.snapshot()
    batch=json.loads((ROOT/'imports/cocoon-browse-group.json').read_text())
    batch['base_revision']=s.revision()
    assert s.import_batch(batch,True)['status']=='validated'
    assert s.snapshot()==before
    assert s.import_batch(batch)['status']=='accepted'
    assert s.import_batch(batch)['status']=='unchanged'
    after=s.snapshot()
    for key in ['topics','relationships','findings','sources','coverage']:
        assert after[key]==before[key]
    assert len(after['browse_groups'])==1
    assert len(after['browse_groups'][0]['members'])==9
    client=TestClient(create_app(s))
    assert client.get('/api/catalog').json()['browse_groups']==after['browse_groups']
    response=client.post('/api/research/preview',json={'context':{'centre':'cocoon','knowledge_revision':1},'instruction':'Inspect Cocoon','areas':['Irrigation']})
    assert response.status_code==200
    assert response.json()['context']['browse_groups']==after['browse_groups']
    assert 'Reuse the existing Cocoon identity' in response.json()['prompt']


@pytest.mark.parametrize('error',['cycle','missing','primary','anchor','duplicate'])
def test_invalid_browsing_groups_preserve_accepted_records(store,error):
    s,_=store;before=s.snapshot()
    batch=json.loads((ROOT/'imports/cocoon-browse-group.json').read_text());batch['base_revision']=s.revision()
    group=batch['browse_groups'][0]
    if error=='cycle':group['parent_id']=group['id']
    if error=='missing':group['members'][0]['topic_id']='unknown'
    if error=='anchor':group['anchor_topic_id']='unknown'
    if error=='duplicate':group['members'].append(copy.deepcopy(group['members'][0]))
    if error=='primary':batch['browse_groups'].append(dict(copy.deepcopy(group),id='browse:conflicting'))
    with pytest.raises(ValueError):s.import_batch(batch)
    assert s.snapshot()==before


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
    context={**state,'knowledge_revision':0,'selected_topic_ids':['carob','drones'],'selected_relationship_ids':[],'routes':Graph(s).explore(scope='search',centre='carob',search='drone')['routes'][:1],'view_state':state}
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
    assert Graph(s).explore(scope='search',centre='old-carob-id',search='drone')['centre']=='carob'
    assert Graph(s).routes('carob','new-in-domain-discovery',8)['routes']


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






def test_dynamic_organization_is_discovered_without_topic_specific_instructions(store):
    s,_=store;group=json.loads((ROOT/'imports/cocoon-browse-group.json').read_text())['browse_groups'][0]
    group=dict(group,id='browse:synthetic-organization',label='Synthetic organization',maintenance_rule='Reuse this stored synthetic organization; keep wider discoveries.')
    before=s.snapshot();s.import_batch(dict(batch_id='synthetic-organization',base_revision=s.revision(),summary='Isolated organization',browse_groups=[group]))
    client=TestClient(create_app(s));anchor=client.get('/api/inspect/cocoon').json()['organization']
    assert anchor['revision']==s.revision() and anchor['anchored_groups'][0]['id']==group['id']
    member=client.get('/api/inspect/cocoon-reservoir').json()['organization']['memberships'][0]
    assert member['role']=='primary' and member['parent_path'][0]['id']=='technology:irrigation'
    assert len(member['members'])==9 and member['maintenance_rule']==group['maintenance_rule']
    handoff=client.post('/api/research/preview',json={'context':{'centre':'cocoon-reservoir'},'instruction':'Inspect fixture material','areas':['Irrigation']}).json()
    assert handoff['context']['topic_organization']['cocoon-reservoir']['memberships'][0]['id']==group['id']
    assert group['maintenance_rule'] in handoff['prompt']
    for key in ['topics','relationships','findings','coverage','sources']:assert s.snapshot()[key]==before[key]


def test_saved_views_preserve_pooled_v5_history_and_legacy_lists(store):
    s,_=store;client=TestClient(create_app(s));history={'format':5,'index':0,'entries':[{'layoutVersion':5,'positionsRef':0}],'pool':[{}]}
    saved=client.post('/api/explorations',json={'label':'Pooled v5','state':{'layoutVersion':5,'centre':'carob'},'history':history}).json()
    assert client.get('/api/explorations/'+saved['id']).json()['history']==history
    legacy=client.post('/api/explorations',json={'label':'Legacy','state':{},'history':[{'centre':'carob'}]}).json()
    assert legacy['history']==[{'centre':'carob'}]


def test_v6_scopes_are_complete_and_membership_is_not_connectivity(store):
    s,_=store;g=Graph(s);client=TestClient(create_app(s))
    v=client.get('/api/explore').json()
    assert len(v['nodes'])==281 and len(v['edges'])==329 and v['complete']
    assert client.get('/api/view').status_code==404
    direct=g.explore(scope='neighbors',centre='carob')
    expected={e['target'] if e['source']=='carob' else e['source'] for e in g.edges.values() if 'carob' in {e['source'],e['target']}}
    assert set(direct['endpoint_ids'])==expected
    assert len(direct['nodes'])==len(expected|{'carob'})
    group=json.loads((ROOT/'imports/cocoon-browse-group.json').read_text())
    group['base_revision']=s.revision();s.import_batch(group);g=Graph(s)
    members=g.explore(scope='group',group_id='browse:cocoon')
    assert set(members['endpoint_ids'])=={m['topic_id'] for m in group['browse_groups'][0]['members']}
    assert len(g.explore(scope='neighbors',centre='cocoon')['endpoint_ids'])>len(members['endpoint_ids'])
    assert all(e['id'] in g.edges for e in members['edges'])
    # An unrelated prior exploration centre cannot become an organizational member.
    focused=g.explore(scope='group',group_id='browse:cocoon',centre='drones')
    assert focused['centre'] is None
    assert {n['id'] for n in focused['nodes']}==set(members['endpoint_ids'])
    species=g.explore(scope='group',group_id='ecosystem:species',centre='drones')
    assert species['centre'] is None and 'drones' not in {n['id'] for n in species['nodes']}
    assert {n['id'] for n in species['nodes']}==set(species['endpoint_ids'])


def test_v6_search_routes_context_filters_and_no_added_branches(store):
    s,_=store;g=Graph(s)
    v=g.explore(scope='search',centre='carob',search='drone',domain='technology')
    assert v['centre']=='carob' and v['search']=='drone' and v['routes']
    assert all(g.topics[i]['domain']=='technology' for i in v['endpoint_ids'])
    allowed=set(v['endpoint_ids'])|{'carob'}|{i for r in v['routes'] for i in r['nodes']}
    assert {n['id'] for n in v['nodes']}==allowed
    for r in v['routes']:
        assert len(r['edges'])==len(r['nodes'])-1<=6
        assert len(set(r['nodes']))==len(r['nodes'])
        for a,b,eid in zip(r['nodes'],r['nodes'][1:],r['edges']):
            e=g.edges[eid];assert {a,b}=={e['source'],e['target']} and e.get('traversable',True)
    assert any(n['context'] for n in v['nodes'] if n['domain']!='technology')
    missing=g.explore(scope='search',centre='carob',search='zzzz-unrecorded')
    assert missing['centre']=='carob' and missing['search']=='zzzz-unrecorded' and missing['notices']
    assert {n['id'] for n in missing['nodes']}=={'carob'}
    routes=g.routes('carob','drones',8)
    assert 1<=len(routes['routes'])<=3
    assert any(r['id']==v['routes'][0]['id'] for r in g.routes('carob',v['routes'][0]['endpoint'],6)['routes'])


def test_v6_budget_exhaustion_is_explicit_and_not_false_disconnection(store,monkeypatch):
    s,_=store;g=Graph(s);monkeypatch.setitem(LIMITS,'traversal_expansions',1)
    v=g.explore(scope='search',centre='carob',search='drone')
    assert v['route_search']['budget_exhausted'] and not v['complete']
    assert any('not proof' in n for n in v['notices'])
    result=g.routes('carob','drones',8)
    assert result['route_search']['budget_exhausted']
    assert g.explore(scope='search',centre='carob',search='zzzz')['complete']


def test_v6_comparison_preserves_values_conditions_and_missing_aspects(store):
    s,_=store;client=TestClient(create_app(s))
    result=client.get('/api/comparison?topics=cocoon,traditional-reforestation,drones').json()
    assert len(result['topics'])==3 and result['aspects']
    values={t['id']:t.get('aspects',{}) for t in result['topics']}
    assert '57.4' in str(values['cocoon']) and '133.5' in str(values['traditional-reforestation'])
    assert not values['drones']
    assert all(t['source_refs'] for t in result['topics'])
    assert client.get('/api/comparison?topics=carob,drones,cocoon,kermes-oak,al20').status_code==400
    assert client.get('/api/explore?scope=invalid').status_code==400
    assert client.get('/api/explore?scope=neighbors').status_code==400
    assert client.get('/api/explore?depth=7').status_code==400
    assert client.get('/api/routes?centre=missing&target=carob').status_code==404


def test_v6_large_complete_search_and_direct_neighborhood(store):
    s,_=store;original=s.snapshot()['topics'][0]
    topics=[dict(copy.deepcopy(original),id=f'synthetic-{i}',label=f'Synthetic completeness {i}',aliases=[]) for i in range(150)]
    edges=[dict(id=f'synthetic-edge-{i}',source='carob',target=t['id'],label='Fixture',explanation='Isolated test',basis='source',source_refs=original['source_refs']) for i,t in enumerate(topics)]
    s.import_batch(dict(batch_id='complete-v6',base_revision=s.revision(),summary='Isolated test',topics=topics,relationships=edges))
    g=Graph(s);v=g.explore(scope='search',centre='carob',search='synthetic')
    assert len(v['matches'])==len(v['routes'])==150 and v['complete']
    assert len(g.explore(scope='neighbors',centre='carob')['endpoint_ids'])>=150
    assert len(g.explore(scope='search',search='synthetic')['nodes'])==150


def test_v6_saved_history_and_research_preserve_new_context(store,tmp_path,monkeypatch):
    import backend.app as module
    monkeypatch.setattr(module,'ROOT',tmp_path);s,_=store;client=TestClient(create_app(s));before=s.snapshot()
    state={'version':6,'scope':'neighbors','centre':'carob','search':'','domain':'technology','kinds':['equipment'],'grouping':'place','expandedRoutes':[],'positions':{'carob':{'x':9,'y':12}}}
    history={'entries':[state],'index':0}
    saved=client.post('/api/explorations',json={'label':'v6','state':state,'history':history}).json()
    assert client.get('/api/explorations/'+saved['id']).json()['history']==history
    context={'version':6,'scope':'neighbors','centre':'carob','filters':{'domain':'technology','kinds':['equipment']},'grouping':'place','selected_topic_ids':['carob'],'visible_topic_ids':['carob','cocoon'],'selected_relationship_ids':[],'expanded_route_ids':[],'view_state':state,'view_history':history,'knowledge_revision':s.revision()}
    draft={'context':context,'source_scope':'Library only'}
    preview=client.post('/api/research/preview',json=draft).json()
    assert 'technology' in preview['prompt'] and 'Grouping: place' in preview['prompt'] and 'Scope: neighbors' in preview['prompt']
    task=client.post('/api/research',json={**draft,'prompt':preview['prompt']+' user edit'}).json()
    assert task['context']['view_state']==state and task['prompt'].endswith('user edit')
    assert s.snapshot()==before


def test_display_group_members_are_exact_and_do_not_create_organization(store):
    s,_=store;g=Graph(s);before=s.snapshot();revision=s.revision()
    ids=['al-faisal-pilot','canal-flooding','maysara-carob-trial']
    v=g.explore(scope='group',group_id='display-group:type:event',member_ids=ids,centre='drones')
    assert v['scope']=='group' and v['centre'] is None and v['complete']
    assert set(v['endpoint_ids'])==set(ids) and {n['id'] for n in v['nodes']}==set(ids)
    assert {n['kind'] for n in v['nodes']}=={'event'}
    assert all(e['source'] in ids and e['target'] in ids for e in v['edges'])
    assert len([n for n in g.topics.values() if n['kind']=='event'])>len(ids)
    client=TestClient(create_app(s))
    response=client.get('/api/explore',params={'scope':'group','group_id':'display-group:type:event','member_ids':','.join(ids)})
    assert response.status_code==200 and {n['id'] for n in response.json()['nodes']}==set(ids)
    missing=g.explore(scope='group',group_id='display-group:type:event',member_ids=ids+['gone-topic'])
    assert set(missing['endpoint_ids'])==set(ids) and any('unavailable' in n for n in missing['notices'])
    filtered=g.explore(scope='group',group_id='display-group:type:event',member_ids=ids,domain='technology')
    assert filtered['endpoint_ids']==[]
    mixed=g.explore(scope='group',group_id='display-group:type:event',member_ids=ids+['cover-types'])
    assert {n['kind'] for n in mixed['nodes']}=={'event'} and any('topic type' in n for n in mixed['notices'])
    assert s.revision()==revision and s.snapshot()['browse_groups']==before['browse_groups']


def test_unrecorded_place_scope_rejects_placed_topics_and_keeps_filter_universe(store):
    s,_=store;g=Graph(s);parent=g.explore(scope='group',group_id='ecosystem:habitats')
    all_ids=parent['endpoint_ids']
    expected={n['id'] for n in parent['nodes'] if n['kind']!='place' and not n.get('place_ids')}
    assert expected and not ({'al-faisal','al-faisal-pilot','canal-flooding','maysara-carob-trial'} & expected)
    v=g.explore(scope='group',group_id='display-group:place:unrecorded',member_ids=all_ids)
    assert set(v['endpoint_ids'])==expected and set(v['group_member_ids'])==expected
    assert all(n['kind']!='place' and not n.get('place_ids') for n in v['nodes'])
    assert any('place group' in n for n in v['notices'])
    placed=g.explore(scope='group',group_id='display-group:place:al-faisal',member_ids=all_ids)
    assert set(placed['endpoint_ids'])=={'al-faisal','al-faisal-pilot','canal-flooding'}
    filtered=g.explore(scope='group',group_id='display-group:place:unrecorded',member_ids=all_ids,domain='technology')
    assert filtered['endpoint_ids']==[] and set(filtered['group_member_ids'])==expected
