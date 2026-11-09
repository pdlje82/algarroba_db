"""Prepare synthetic Evidence desk fixtures in a fresh isolated copy; optionally serve on 8769."""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import os
import sqlite3
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))


def prepare(target):
    from backend.store import Store
    from backend.planning import Edit,apply_edit
    if target.exists():raise ValueError('Use a fresh QA destination; previous verification is preserved.')
    target.parent.mkdir(parents=True,exist_ok=True)
    original=ROOT/'data/knowledge.sqlite'
    with sqlite3.connect(original.as_uri()+'?mode=ro',uri=True) as source:
        with sqlite3.connect(target) as destination:source.backup(destination)
    target.with_suffix('.baseline.json').write_text(json.dumps({'accepted_sha256':hashlib.sha256(original.read_bytes()).hexdigest()},indent=2))
    store=Store(target)
    template=copy.deepcopy(next(e for e in store.snapshot()['irrigation_evidence'] if e['species_id']=='carob' and e['field']=='amount'))
    evidence=[]
    for suffix,field,value,units,species in [
        ('amount','amount',10,'L/plant/event','carob'),
        ('frequency','frequency','Every 20 days','','carob'),
        ('period','period','First dry season','','carob'),
        ('general','amount',90,'L/plant/event',None),
        ('range','amount','5–15','L/plant/event','carob'),
        ('total','amount',400,'L/plant/season','carob'),
    ]:
        item=copy.deepcopy(template)
        item.update(id='irrigation-evidence:desk-'+suffix,species_id=species,stage='settlement',field=field,value=value,units=units,
                    wording='QA '+suffix+' — synthetic test evidence',context='Synthetic Region A, young plants, test-only method',
                    applicability='Test fixture only. Do not use as an irrigation recommendation.',limitations='Synthetic QA evidence. No factual intake.')
        evidence.append(item)
    store.import_batch(dict(batch_id='evidence-desk-qa-fixtures',summary='Synthetic browser fixtures only',base_revision=store.revision(),irrigation_evidence=evidence))
    def edit(action,**data):return apply_edit(store,Edit(expected_revision=store.revision(),action=action,data=data))
    id=edit('community-copy',label='Evidence desk QA',parent_id='browse:plant-communities',origin_id='carob-community',topic_ids=['carob','mastic'])['affected_id']
    edit('stage-set',id=id,topic_id='carob',stage='settlement',status='configured')
    edit('field-set',id=id,topic_id='carob',stage='settlement',field='amount',mode='user',value=7,rationale='Existing unsourced test planning value')
    edit('field-set',id=id,topic_id='carob',stage='settlement',field='frequency',mode='user',value='Existing monitoring trigger')
    return {'database':str(target),'community_id':id,'revision':store.revision()}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',required=True,type=Path)
    parser.add_argument('--serve',action='store_true')
    args=parser.parse_args();target=args.database.resolve()
    target.relative_to(ROOT/'output')
    os.environ['KGB_DATABASE']=str(target)
    if not target.exists():print(json.dumps(prepare(target)))
    elif not args.serve:raise ValueError('QA database exists. Use a new path or --serve to inspect it.')
    if args.serve:
        with sqlite3.connect(target) as connection:
            if not connection.execute("SELECT 1 FROM batches WHERE id='evidence-desk-qa-fixtures'").fetchone():raise ValueError('This database has no isolated Evidence desk fixtures.')
        os.environ['KGB_DATABASE']=str(target)
        import backend.app as module
        import uvicorn
        module.ROOT=ROOT/'output/consolidation-qa';module.ROOT.mkdir(parents=True,exist_ok=True)
        uvicorn.run(module.app,host='127.0.0.1',port=8769)
