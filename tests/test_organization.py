import copy

from backend.organization import organization_review


def topic(id,kind='method',group='monitoring',domain='technology'):
    return dict(id=id,label=id,kind=kind,group_id=group,domain=domain)


def group(id,members,**extra):
    return dict(id=id,label=id,parent_id='technology:monitoring',anchor_topic_id=None,members=[dict(topic_id=id,role='primary') for id in members],**extra)


def test_ambiguous_context_uses_read_only_review_instead_of_category_fallback():
    snapshot=dict(topics=[topic('farm','organization','organizations'),topic('date','event','dates'),topic('site','place','places'),topic('method')],browse_groups=[])
    before=copy.deepcopy(snapshot);review=organization_review(snapshot)
    assert review['topic_roots']==dict(farm='review:technology',date='review:technology',site='review:technology',method='technology:monitoring')
    assert review['pending_groups'][0]['member_ids']==['date','farm','site']
    assert review['pending_groups'][0]['readonly'] is True
    assert len(review['warnings'])==3 and snapshot==before


def test_documented_primary_home_resolves_review_and_pending_folder_disappears():
    snapshot=dict(topics=[topic('farm','organization','organizations')],browse_groups=[group('browse:participants',['farm'])])
    review=organization_review(snapshot)
    assert review['topic_roots']['farm']=='technology:monitoring'
    assert review['pending_groups']==[] and review['warnings']==[]


def test_catalogue_suppresses_size_warning_but_not_ambiguous_placement():
    topics=[topic(str(i)) for i in range(12)]
    peers=group('browse:peers',[t['id'] for t in topics])
    snapshot=dict(topics=topics,browse_groups=[peers])
    assert any(w['code']=='crowded_branch' and w['group_ids']==[peers['id']] for w in organization_review(snapshot)['warnings'])
    peers['catalogue']=True
    snapshot['topics'].append(topic('unknown','place','places'))
    review=organization_review(snapshot)
    assert [w['code'] for w in review['warnings']]==['ambiguous_placement']


def test_removed_members_and_metadata_are_advisory_and_source_ownership_is_not_inferred():
    old=group('browse:peers',['a','b'],description='Source context',presentation='hierarchy',catalogue=True)
    new=group('browse:peers',['a'])
    snapshot=dict(topics=[topic('a'),topic('b'),topic('farm','organization','organizations')],browse_groups=[new])
    review=organization_review(snapshot,dict(browse_groups=[old]))
    assert {'membership_removed','metadata_removed','ambiguous_placement'} <= {w['code'] for w in review['warnings']}
    assert review['topic_roots']['farm']=='review:technology'
