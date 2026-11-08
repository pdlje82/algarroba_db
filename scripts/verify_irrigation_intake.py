"""Apply and audit the accepted proposal against an isolated clone; never write live knowledge."""
from pathlib import Path
import copy
import json
import sqlite3
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.store import Store
from backend.graph import Graph
from backend.planning import Edit,apply_edit


def verify():
    qa=ROOT/'output/irrigation-audit';qa.mkdir(exist_ok=True)
    target=qa/'qa.sqlite'
    if target.exists():raise RuntimeError('Use a fresh isolated QA database; do not overwrite prior evidence.')
    with sqlite3.connect((ROOT/'data/knowledge.sqlite').as_uri()+'?mode=ro',uri=True) as source:
        with sqlite3.connect(target) as destination:source.backup(destination)
    store=Store(target);before=store.snapshot()
    raw=json.loads((ROOT/'imports/irrigation-lifecycle-carob-context-2026-11-08.json').read_text(encoding='utf-8'))
    assert store.import_batch(raw,True)['status']=='validated'
    assert store.snapshot()==before
    accepted=store.import_batch(raw);after=store.snapshot()
    assert store.import_batch(raw)['status']=='unchanged' and store.snapshot()==after
    stale=copy.deepcopy(raw);stale['batch_id']+='-stale-test'
    try:store.import_batch(stale)
    except ValueError as error:assert 'Knowledge changed' in str(error)
    else:raise AssertionError('Stale candidate accepted')
    assert store.snapshot()==after
    for table in ['sources','plant_images','communities','irrigation_evidence']:
        if table!='irrigation_evidence':assert before[table]==after[table],table
        else:
            indexed={x['id']:x for x in after[table]}
            assert all(indexed[x['id']]==x for x in before[table])
    old={x['id']:x for x in before['topics']};new={x['id']:x for x in after['topics']}
    assert all(new[id]==t for id,t in old.items() if t['kind']=='species')
    graph=Graph(store)
    guide=graph.inspect('browse:irrigation-lifecycle')['record']
    assert guide['member_layout']=='vertical' and guide['description'] and guide['source_refs']
    assert [m['topic_id'] for m in guide['members']]==['nursery-irrigation','settlement-irrigation','maintenance-irrigation','support-irrigation']
    for id in [m['topic_id'] for m in guide['members']]:
        assert all(k in new[id]['aspects'] for k in ['Amount','Frequency or trigger','Applicable period','Age and stock','Limitations'])
    assert new['carob-community']['label']=='Mediterranean carob associations'
    assert {m['topic_id'] for m in graph.groups['browse:carob-communities']['members']}=={'carob-community','carob-community-almeria'}
    assert 'carob-community' in {x['id'] for x in store.search('Carob plant communities')}
    regional=graph.inspect('carob-community-almeria')
    assert not any('cork-oak' in [e['source'],e['target']] for e in regional['relationships'])
    assert {'las-labores','la-tortola','la-alcantarilla'}<=set(new)
    evidence={x['id']:x for x in after['irrigation_evidence']}
    assert evidence['irrigation-evidence:life-nursery-average']['value']==0.3
    assert evidence['irrigation-evidence:labores-season-total']['units']!='L/plant/event'
    assert evidence['irrigation-evidence:life-support-unquantified']['value'] is None
    # Working-copy mutations are tested only in this clone, then reverted by reopening the clone before serving.
    def edit(action,**data):return apply_edit(store,Edit(expected_revision=store.revision(),action=action,data=data))
    id=edit('community-create',label='QA unit compatibility',parent_id='ecosystem:habitats')['affected_id']
    edit('plants-add',id=id,topic_ids=['carob'])
    edit('stage-set',id=id,topic_id='carob',stage='summer-maintenance',status='configured')
    for eid in ['irrigation-evidence:labores-season-total','irrigation-evidence:life-maintenance-ind']:
        try:edit('field-set',id=id,topic_id='carob',stage='summer-maintenance',field='amount',mode='source',evidence_id=eid)
        except ValueError:pass
        else:raise AssertionError('Incompatible/general evidence auto-filled')
    edit('field-set',id=id,topic_id='carob',stage='summer-maintenance',field='amount',mode='source',evidence_id='irrigation-evidence:buenavista-dose')
    with store.connect() as c:
        assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        assert not c.execute('PRAGMA foreign_key_check').fetchall()
    report=dict(accepted=accepted,checks=['Dry-run no mutation','Repeat no-op','Stale rejection','Species/source/media/working-plan preservation','Ordered guide and phase context','Two community topics and finca identities','No inherited cork-oak companion','Source dose versus seasonal/general safeguards','SQLite integrity'],qa_database=str(target))
    (qa/'intake-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':verify()
