import copy
import hashlib
import json
from pathlib import Path

from PIL import Image
from fastapi.testclient import TestClient
import pytest

from backend.app import create_app
from backend.graph import Graph
from backend.store import Store


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

@pytest.fixture
def media(tmp_path):
    store=Store(tmp_path/'knowledge.sqlite',media_root=tmp_path)
    source=tmp_path/'sources/reference.txt';source.parent.mkdir();source.write_text('Reviewed botanical identity and habitat.',encoding='utf-8')
    batch={'batch_id':'illustrated-species','base_revision':0,'summary':'Test intake','sources':[{
        'id':'BOTANY','title':'Botanical reference','kind':'web','filename':source.name,'managed_path':'sources/reference.txt','sha256':sha(source),
        'url':'https://example.org/botany','retrieved_on':'2026-11-08','excerpt':'Reviewed botanical identity and habitat.'}],
        'topics':[{'id':'plant','label':'Test plant','kind':'species','domain':'ecosystem','group_id':'species','description':'A sourced plant.',
                   'source_refs':[{'source_id':'BOTANY','locator':'Identity and habitat'}]}],'plant_images':[]}
    for role in ['whole','detail']:
        files={}
        for variant in ['original','preview']+(['thumbnail'] if role=='whole' else []):
            relative=f'media/plants/{role}-{variant}.png';p=tmp_path/relative;p.parent.mkdir(parents=True,exist_ok=True)
            Image.new('RGBA',(12,12),(10,80,40,128)).save(p)
            files[variant]={'path':relative,'sha256':sha(p),'width':12,'height':12,'mime':'image/png'}
        batch['plant_images'].append({'id':'plant-'+role,'topic_id':'plant','role':role,'alt':'Test plant illustration','caption':'Illustration, not to scale.',
            'provenance':{'tool':'image_gen','source_asset':role+'.png'},'references':[],'files':files})
    return store,batch


def test_atomic_intake_idempotency_search_export_and_api(media):
    s,b=media
    before=s.snapshot()
    assert s.import_batch(b,True)['plant_images']==2
    assert s.snapshot()==before
    assert s.import_batch(b)['status']=='accepted'
    accepted=s.snapshot()
    assert s.import_batch(b)['status']=='unchanged'
    assert s.snapshot()==accepted
    assert s.media_integrity()=={'status':'verified','images':2,'topics':1}
    assert s.search('Test plant')[0]['id']=='plant'
    g=Graph(s)
    assert len(g.inspect('plant')['record']['plant_images'])==2
    assert len(g.explore('neighbors',centre='plant')['nodes'][0]['plant_images'])==2
    client=TestClient(create_app(s))
    catalog=client.get('/api/catalog').json()
    assert len(catalog['plant_images'])==2
    assert 'files' not in catalog['plant_images'][0]
    for role in ['whole','detail']:
        for variant in b['plant_images'][0 if role=='whole' else 1]['files']:
            response=client.get(f'/api/plant-images/plant-{role}/{variant}')
            assert response.status_code==200 and response.headers['content-type']=='image/png'
            assert client.get(f'/api/plant-images/plant-{role}/{variant}',headers={'If-None-Match':response.headers['etag']}).status_code==304
    assert client.get('/api/plant-images/plant-detail/thumbnail').status_code==404
    assert client.get('/api/plant-images/missing/original').status_code==404
    assert client.get('/api/sources/BOTANY/file').headers['content-type'].startswith('text/plain')


@pytest.mark.parametrize('problem',['missing','corrupt','dimensions','escape','missing-pair','duplicate-role','wrong-topic','non-species','web-page','no-locator','stale'])
def test_invalid_intakes_leave_all_records_unchanged(media,problem):
    s,b=media;b=copy.deepcopy(b);before=s.snapshot();f=b['plant_images'][0]['files']['original']
    if problem=='missing':(s.media_root/f['path']).unlink()
    elif problem=='corrupt':
        (s.media_root/f['path']).write_bytes(b'not an image');f['sha256']=sha(s.media_root/f['path'])
    elif problem=='dimensions':f['width']=14
    elif problem=='escape':f['path']='../../outside.png'
    elif problem=='missing-pair':b['plant_images'].pop()
    elif problem=='duplicate-role':b['plant_images'][1]['role']='whole'
    elif problem=='wrong-topic':b['plant_images'][0]['topic_id']='unknown'
    elif problem=='non-species':b['topics'][0]['kind']='habitat'
    elif problem=='web-page':b['topics'][0]['source_refs'][0]['page']=1
    elif problem=='no-locator':b['topics'][0]['source_refs'][0]['locator']=''
    elif problem=='stale':b['base_revision']=8
    with pytest.raises((ValueError,OSError)):s.import_batch(b)
    assert s.snapshot()==before


def test_runtime_missing_corrupt_files_and_explicit_integrity_errors(media):
    s,b=media;s.import_batch(b);client=TestClient(create_app(s));p=s.media_root/b['plant_images'][0]['files']['thumbnail']['path']
    p.write_bytes(b'corrupt')
    assert client.get('/api/plant-images/plant-whole/thumbnail').status_code==409
    with pytest.raises(ValueError,match='checksum mismatch'):s.media_integrity()
    p.unlink()
    assert client.get('/api/plant-images/plant-whole/thumbnail').status_code==404


def test_managed_source_registration_and_setup_preserve_portability(media):
    from backend.cli import bootstrap
    s,b=media
    s.register_sources({'sources':b['sources']})
    assert 'path' not in s.records('sources')[0]
    b['base_revision']=s.revision();s.import_batch(b)
    before=s.snapshot()
    assert bootstrap(s)['status']=='unchanged'
    assert s.snapshot()==before
    with pytest.raises(ValueError,match='managed project copy'):
        s.register_sources({'source_root':'unused','sources':[{'id':'unsafe','kind':'web','filename':'external.html'}]})


def test_later_import_cannot_turn_illustrated_species_into_a_habitat(media):
    s,b=media;s.import_batch(b);before=s.snapshot()
    topic=copy.deepcopy(b['topics'][0]);topic['kind']='habitat'
    with pytest.raises(ValueError,match='retain a species'):
        s.import_batch({'batch_id':'bad-kind','base_revision':s.revision(),'summary':'Invalid update','topics':[topic]})
    assert s.snapshot()==before


def test_full_media_backup_contains_its_database_and_all_registered_files(media,monkeypatch):
    import zipfile
    import backend.store as store_module
    s,b=media;s.import_batch(b);monkeypatch.setattr(store_module,'ROOT',s.media_root)
    archive=s.backup_media()
    assert archive.with_suffix('').with_suffix('.sqlite').is_file()
    with zipfile.ZipFile(archive) as z:
        expected={f['path'] for image in b['plant_images'] for f in image['files'].values()}|{'sources/reference.txt'}
        assert set(z.namelist())==expected


def test_collection_mapping_and_original_hashes():
    root=Path(__file__).resolve().parents[1]
    candidate=root/'imports/plant-illustrations-and-profiles-2026-11-08.json'
    if not candidate.exists():pytest.skip('Prepared collection is not present')
    batch=json.loads(candidate.read_text(encoding='utf-8'))
    images=batch['plant_images'];assert len(images)==46 and len({x['topic_id'] for x in images})==23
    for topic in {x['topic_id'] for x in images}:assert {x['role'] for x in images if x['topic_id']==topic}=={'whole','detail'}
    for image in images:
        assert sha(root/image['files']['original']['path'])==image['files']['original']['sha256']
    assert all(x['topic_id']=='holm-oak-rotundifolia' for x in images if x['provenance']['source_asset'].split('/')[-1]=='holm_oak.png')
    assert not any(x['topic_id']=='holm-oak' for x in images)
    assert {'rhamnus-alaternus','rhamnus-lycioides','esparto','tamarix'}<={x['topic_id'] for x in images}
