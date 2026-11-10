"""Read-only placement resolution and advisory organization checks."""
from __future__ import annotations

ROOT_GROUPS = ['ecosystem:species','ecosystem:habitats','ecosystem:restoration-methods','technology:irrigation','technology:drones','technology:monitoring','funding:programmes','funding:activities','funding:requirements']
REVIEW_LABELS = {'ecosystem':'Needs organization · Ecosystems','technology':'Needs organization · Technology','funding':'Needs organization · Funding'}
REVIEW_IDS = {f'review:{domain}' for domain in REVIEW_LABELS}
BASE_ROOTS = {
    'ecosystem': {'species':'species','habitats':'habitats','restoration-methods':'restoration-methods','monitoring':'restoration-methods','requirements':'habitats'},
    'technology': {'irrigation':'irrigation','drones':'drones','monitoring':'monitoring'},
    'funding': {'programmes':'programmes','activities':'activities','requirements':'requirements'},
}


def organization_review(snapshot, previous=None):
    topics={t['id']:t for t in snapshot.get('topics',[])}
    groups={g['id']:g for g in snapshot.get('browse_groups',[])}
    primary={m['topic_id']:g['id'] for g in groups.values() for m in g['members'] if m['role']=='primary'}
    roots={};warnings=[]
    def warn(code,message,topic_ids=(),group_ids=()):
        warnings.append(dict(code=code,message=message,topic_ids=list(topic_ids),group_ids=list(group_ids)))
    for id,t in topics.items():
        if id in primary:
            at=primary[id];last=at;seen=set()
            while at in groups and at not in seen:
                seen.add(at);last=at;at=groups[at]['parent_id']
            roots[id]=last if at.startswith('domain:') else at
        else:
            base=BASE_ROOTS.get(t['domain'],{}).get(t.get('group_id'))
            context=t['kind'] in {'place','organization','event'}
            roots[id]=f"{t['domain']}:{base}" if base and not context else f"review:{t['domain']}"
        if roots[id] in REVIEW_IDS:
            warn('ambiguous_placement','Choose a documented primary folder; this topic is shown in Needs organization.',[id])

    def members(id,seen=frozenset()):
        if id in seen:return set()
        own={m['topic_id'] for m in groups.get(id,{}).get('members',[])}
        return own|set().union(*(members(g['id'],seen|{id}) for g in groups.values() if g['parent_id']==id))
    for id in [*ROOT_GROUPS,*groups]:
        g=groups.get(id,{})
        children=[child for child in groups.values() if child['parent_id']==id]
        visible=members(id)
        if id in ROOT_GROUPS:visible|={tid for tid,root in roots.items() if root==id}
        covered=set().union(*(members(child['id'])|({child['anchor_topic_id']} if child.get('anchor_topic_id') else set()) for child in children))
        direct=visible-covered
        count=len(direct)+len(children)
        if count>8 and not g.get('catalogue',False):
            warn('crowded_branch',f'{count} immediate choices; review meaningful subgroups or declare a genuine peer catalogue.',group_ids=[id])
        kinds={topics[t]['kind'] for t in direct if t in topics}
        if not g.get('catalogue',False) and len(direct)>4 and kinds & {'place','organization','event'} and kinds-{'place','organization','event'}:
            warn('mixed_context','Project/context records and other concepts share a level; review their ownership and roles.',sorted(direct),[id])
    if previous:
        for old in previous.get('browse_groups',[]):
            new=groups.get(old['id'])
            if not new:continue
            lost={m['topic_id'] for m in old['members']}-{m['topic_id'] for m in new['members']}
            if lost:warn('membership_removed','Existing member references were removed; review the placement manifest.',sorted(lost),[old['id']])
            lost_fields=[k for k in ['description','source_refs','maintenance_rule','anchor_topic_id'] if old.get(k) and not new.get(k)]
            old_refs={repr(sorted(r.items())) for r in old.get('source_refs',[])}
            new_refs={repr(sorted(r.items())) for r in new.get('source_refs',[])}
            if old_refs-new_refs and 'source_refs' not in lost_fields:lost_fields.append('source_refs')
            if old.get('presentation')=='hierarchy' and new.get('presentation','standard')!='hierarchy':lost_fields.append('presentation')
            if old.get('member_layout')=='vertical' and new.get('member_layout','grid')!='vertical':lost_fields.append('member_layout')
            if old.get('catalogue') and not new.get('catalogue'):lost_fields.append('catalogue')
            if lost_fields:warn('metadata_removed','Review removed group metadata: '+', '.join(lost_fields),group_ids=[old['id']])
            lost_homes=[m['topic_id'] for m in old['members'] if m['role']=='primary' and m['topic_id'] not in primary]
            if lost_homes:warn('primary_home_removed','A previous primary home was removed without another primary folder.',lost_homes,[old['id']])
    pending=[]
    for domain,label in REVIEW_LABELS.items():
        ids=sorted(id for id,root in roots.items() if root==f'review:{domain}')
        if ids:pending.append(dict(id=f'review:{domain}',label=label,domain=domain,member_ids=ids,readonly=True,presentation='hierarchy'))
    return dict(topic_roots=roots,warnings=warnings,pending_groups=pending)
