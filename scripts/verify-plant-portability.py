"""Verify the relocated installation with an audit hook forbidding the old repository."""
from pathlib import Path
import argparse, json, shutil, sqlite3, subprocess, sys

def check():
    forbidden=str(Path.home()/'git_private/algarrobos').casefold()
    def guard(event,args):
        if event=='open' and isinstance(args[0],(str,bytes)):
            path=str(Path(args[0]).resolve()).casefold()
            if path==forbidden or path.startswith(forbidden+'\\') or path.startswith(forbidden+'/'):
                raise RuntimeError('Portable installation attempted to read the old repository: '+path)
    sys.addaudithook(guard)
    from backend.store import Store, ROOT
    from backend.app import create_app
    from fastapi.testclient import TestClient
    store=Store();assert store.media_root==ROOT.resolve()
    assert store.media_integrity()['images']==46
    client=TestClient(create_app(store))
    catalog=client.get('/api/catalog').json()
    assert len(catalog['plant_images'])==46
    count=0
    for image in catalog['plant_images']:
        for variant in image['variants'].values():
            assert client.get(variant['url']).status_code==200;count+=1
    for source in catalog['sources']:
        assert 'managed_path' in source and 'path' not in source
        assert client.get('/api/sources/'+source['id']+'/file').status_code==200;count+=1
    assert client.get('/').status_code==200
    result={'status':'verified','relocated_root':str(ROOT),'old_repository_access':'forbidden by audit hook','media_and_source_requests':count,'sources':len(catalog['sources'])}
    print(json.dumps(result,indent=2));(ROOT.parent/'portability-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    if args.check:
        sys.path.insert(0,str(root));check()
    else:
        target=root/'output/plant-images-qa/portable';target.mkdir(parents=True,exist_ok=True)
        for name in ['backend','dist','media','sources']:
            shutil.copytree(root/name,target/name,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__'))
        (target/'scripts').mkdir(exist_ok=True);shutil.copyfile(__file__,target/'scripts/verify-plant-portability.py')
        (target/'data').mkdir(exist_ok=True)
        with sqlite3.connect(root/'output/plant-images-qa/knowledge.sqlite') as source,sqlite3.connect(target/'data/knowledge.sqlite') as destination:source.backup(destination)
        subprocess.run([sys.executable,str(target/'scripts/verify-plant-portability.py'),'--check'],cwd=target,check=True)
