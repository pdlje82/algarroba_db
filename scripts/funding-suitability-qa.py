"""Serve an isolated funding suitability collection; never use the accepted database for UI writes."""
import argparse,os,sqlite3,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--database',type=Path,required=True);a=p.parse_args();target=a.database.resolve()
if target==(ROOT/'data/knowledge.sqlite').resolve() or not target.is_relative_to(ROOT/'output'):raise SystemExit('Choose an isolated database under output/.')
target.parent.mkdir(parents=True,exist_ok=True)
if not target.exists():
    with sqlite3.connect((ROOT/'data/knowledge.sqlite').as_uri()+'?mode=ro',uri=True) as source,sqlite3.connect(target) as destination:source.backup(destination)
os.environ['KGB_DATABASE']=str(target);sys.path.insert(0,str(ROOT))
import backend.app as module
store=module.Store(target)
if not store.records('funding_reviews'):
    from prepare_funding_suitability import prepare
    prepare(store,ROOT/'research/funding-suitability-20261110',apply=True,output=target.parent/'initial-candidate.json')
module.ROOT=target.parent
if __name__=='__main__':
    import uvicorn
    uvicorn.run(module.app,host='127.0.0.1',port=8776)
