"""Prepare an explicit, revision-bound organization edit; never apply it here."""
from pathlib import Path
import argparse
import copy
import json
import sqlite3

ROOT=Path(__file__).resolve().parents[1]


def prepare(database):
    with sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True) as c:
        topics={t['id']:t for row in c.execute('SELECT data FROM topics') if (t:=json.loads(row[0]))}
        existing={g['id']:g for row in c.execute('SELECT data FROM browse_groups') if (g:=json.loads(row[0]))}
        revision=int(c.execute("SELECT value FROM meta WHERE key='revision'").fetchone()[0])
    reserved={'browse:irrigation-lifecycle','browse:plant-communities','browse:habitat-types','browse:site-conditions','browse:places-trials'}
    if reserved & existing.keys():raise ValueError('This organization migration is already present or its IDs are occupied. Review current organization instead of rebuilding its memberships.')
    def folder(id,label,parent,members=(),shared=()):
        return dict(id='browse:'+id,label=label,parent_id=parent,anchor_topic_id=None,
                    members=[dict(topic_id=t,role='primary') for t in members]+[dict(topic_id=t,role='shared') for t in shared],
                    maintenance_rule='Organize existing records by their recorded subject. Preserve source contexts and identities; membership is not factual evidence. Community planning values remain separate from source knowledge.')
    required={'nursery-irrigation','settlement-irrigation','maintenance-irrigation','support-irrigation'}
    if not required<=topics.keys():raise ValueError('Lifecycle topics changed; reconcile the migration mapping')
    if 'browse:cocoon' not in existing:raise ValueError('Expected existing Cocoon organization is missing')
    cocoon=copy.deepcopy(existing['browse:cocoon']);cocoon['label']='Cocoon irrigation'
    owned={m['topic_id'] for g in existing.values() for m in g['members'] if m['role']=='primary'}
    broad={'coastal-rocky-scrub','mediterranean-dryland','semi-arid-shrubland'}
    communities={'acidic-scrub','carob-community','cork-oak-woodland','esparto-grassland','jujube-thorn-scrub','kermes-oak-scrub','mastic-scrub','pine-woodland','rosemary-scrub','seasonal-watercourse','warm-woodland','wild-olive-scrub','xerothermic-scrub'}
    actual={t['id'] for t in topics.values() if t['kind']=='habitat' and t['domain']=='ecosystem'}
    if actual != broad|communities:raise ValueError('Habitat topics changed; review and extend the explicit mapping')
    # Capture every actual ID in the resulting reviewable edit, leaving existing primary homes intact.
    conditions=[];places=[]
    for t in sorted(topics.values(),key=lambda t:t['id']):
        if t['domain']!='ecosystem' or t['group_id'] in {'species','restoration-methods','monitoring'} or t['id'] in owned or t['kind']=='habitat':continue
        if t['kind'] in {'place','event'}:places.append(t['id'])
        elif t['kind'] in {'condition','aspect'}:conditions.append(t['id'])
        else:raise ValueError('Review habitat-root classification for '+t['id'])
    groups=[
        folder('irrigation-lifecycle','Irrigation lifecycle','technology:irrigation',sorted(required)),cocoon,
        folder('plant-communities','Plant communities','ecosystem:habitats',sorted(communities-owned)),
        folder('habitat-types','Habitats & vegetation types','ecosystem:habitats',sorted(broad-owned),sorted(communities)),
        folder('site-conditions','Site & establishment conditions','ecosystem:habitats',conditions),
        folder('places-trials','Places & field trials','ecosystem:habitats',places),
    ]
    return dict(expected_revision=revision,action='organization-initialize',data=dict(root_labels={'technology:irrigation':'Irrigation'},groups=groups))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--database',type=Path,default=ROOT/'data/knowledge.sqlite');parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    result=prepare(args.database)
    if args.output.exists():raise ValueError('Use a new migration filename; do not overwrite a reviewed edit')
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared organization edit at revision',result['expected_revision'],str(args.output))
