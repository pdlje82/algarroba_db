"""Canonical v6 exploration queries. Presentation never becomes factual knowledge."""
from __future__ import annotations
from collections import defaultdict, deque
import hashlib
from .store import Store, normalized
from .plant_media import enrich_topics

LIMITS = {"route_steps":6,"extended_steps":8,"alternatives":3,"traversal_expansions":10000}
ROOT_GROUPS = ["ecosystem:species","ecosystem:habitats","ecosystem:restoration-methods","technology:irrigation","technology:drones","technology:monitoring","funding:programmes","funding:activities","funding:requirements"]

class Graph:
    def __init__(self, store: Store):
        self.store=store; self.snapshot=store.snapshot()
        self.topics={t['id']:t for t in enrich_topics(self.snapshot['topics'],self.snapshot['plant_images'],store.resolve)}
        self.edges={e['id']:e for e in self.snapshot['relationships']}
        self.findings=self.snapshot['findings']; self.groups={g['id']:g for g in self.snapshot.get('browse_groups',[])}
        self.communities={g['id']:g for g in self.snapshot['communities']}
        self.adj=defaultdict(list)
        for e in self.edges.values():
            if e.get('traversable',True):
                self.adj[e['source']].append((e['target'],e['id']))
                self.adj[e['target']].append((e['source'],e['id']))
        for key in self.adj:
            self.adj[key].sort(key=lambda pair:(self.edges[pair[1]].get('basis')=='curated',self.topics[pair[0]]['label'],pair[1]))

    def root_group(self, topic):
        group=next((g for g in self.groups.values() if any(m['topic_id']==topic['id'] and m['role']=='primary' for m in g['members'])),None)
        if group:
            parent=group['parent_id'];seen=set()
            last=group['id']
            while parent in self.groups and parent not in seen:
                seen.add(parent);last=parent;parent=self.groups[parent]['parent_id']
            return last if parent.startswith('domain:') else parent
        domain=topic['domain'];g=topic.get('group_id','other')
        if domain=='ecosystem':return domain+':'+('species' if g=='species' else 'restoration-methods' if g in {'restoration-methods','monitoring'} else 'habitats')
        if domain=='technology':return domain+':'+('irrigation' if g=='irrigation' else 'drones' if g in {'drones','requirements'} else 'monitoring')
        return domain+':'+('activities' if g=='activities' else 'requirements' if g in {'requirements','places'} else 'programmes')

    def traverse(self, centre, targets, depth=6, count=1):
        """One bounded traversal for shortest routes and alternative simple routes."""
        depth=min(8,max(1,depth));targets=set(targets)-{centre};found={i:[] for i in targets}
        queue=deque([([centre],[])]);visited={centre};expansions=0;exhausted=False
        while queue and any(len(v)<count for v in found.values()):
            ns,es=queue.popleft()
            if len(es)>=depth:continue
            for other,eid in self.adj[ns[-1]]:
                if expansions>=LIMITS['traversal_expansions']:
                    exhausted=True;break
                expansions+=1
                if other in ns:continue
                route=(ns+[other],es+[eid])
                if other in found and len(found[other])<count and route not in found[other]:found[other].append(route)
                if len(route[1])<depth and (count>1 or other not in visited):
                    visited.add(other);queue.append(route)
            if exhausted:break
        return found,{'complete':not exhausted,'budget_exhausted':exhausted,'expansions':expansions,'depth':depth}

    def route_record(self, endpoint, nodes, edges):
        token=hashlib.sha256('|'.join(edges).encode()).hexdigest()[:16]
        return {'id':f'route:{endpoint}:{token}','endpoint':endpoint,'nodes':nodes,'edges':edges,'why':'Recorded connecting steps; not a recommendation.'}

    def routes(self, centre, target, depth=6):
        centre=self.store.resolve(centre);target=self.store.resolve(target)
        if centre not in self.topics or target not in self.topics:raise ValueError('A route endpoint is unavailable. Refresh the exploration.')
        paths,status=self.traverse(centre,{target},depth,3)
        return {'routes':[self.route_record(target,ns,es) for ns,es in paths.get(target,[])], 'route_search':status,'limits':LIMITS}

    def explore(self, scope='overview', group_id=None, centre=None, search='', domain='all', kinds=None, depth=6, member_ids=None):
        if scope not in {'overview','group','neighbors','search'}:raise ValueError('Unknown exploration scope.')
        if domain not in {'all','ecosystem','technology','funding'}:raise ValueError('Unknown domain.')
        if depth not in {6,8}:raise ValueError('Route depth must be 6 or 8.')
        notices=[];kinds=set(kinds or []);centre=self.store.resolve(centre) if centre and scope!='group' else None
        if centre and centre not in self.topics:
            notices.append('The previous centre is unavailable. Showing the overview.');centre=None
            if scope=='neighbors':scope='overview'
        accepts=lambda t:(domain=='all' or t['domain']==domain) and (not kinds or t['kind'] in kinds)
        matched=set();hits=[];routes=[];missing=set();status={'complete':True,'budget_exhausted':False,'expansions':0,'depth':depth}
        if scope=='group':
            if group_id and group_id.startswith('display-group:') and member_ids is not None:
                requested={self.store.resolve(i) for i in member_ids}
                endpoints=requested & self.topics.keys()
                if requested-endpoints:notices.append(f'{len(requested-endpoints)} previously selected topic(s) are unavailable.')
                if group_id.startswith('display-group:type:'):
                    kind=group_id.removeprefix('display-group:type:')
                    compatible={i for i in endpoints if self.topics[i]['kind']==kind}
                    if endpoints-compatible:notices.append(f'{len(endpoints-compatible)} topic(s) no longer match this topic type.')
                    endpoints=compatible
                elif group_id.startswith('display-group:place:'):
                    key=group_id.removeprefix('display-group:place:')
                    key=None if key=='unrecorded' else self.store.resolve(key)
                    def recorded_place(i):
                        t=self.topics[i]
                        place=t['id'] if t['kind']=='place' else next(iter(t.get('place_ids') or []),None)
                        return self.store.resolve(place) if place else None
                    compatible={i for i in endpoints if recorded_place(i)==key}
                    if endpoints-compatible:notices.append(f'{len(endpoints-compatible)} topic(s) no longer match this place group.')
                    endpoints=compatible
            elif group_id in self.communities:endpoints={m['topic_id'] for m in self.communities[group_id]['plants']}
            elif group_id in self.groups:endpoints=self.group_members(group_id)
            elif group_id in ROOT_GROUPS:
                endpoints={i for i,t in self.topics.items() if self.root_group(t)==group_id}
                endpoints.update(self.group_members(group_id))
            else:raise ValueError('This browsing group is unavailable. Return to overview.')
        elif scope=='neighbors':
            if not centre:raise ValueError('Choose a centre to explore its direct connections.')
            endpoints={e['target'] if e['source']==centre else e['source'] for e in self.edges.values() if centre in {e['source'],e['target']}}
        elif scope=='search':
            hits=self.store.search(search,limit=None) if search.strip() else []
            matched={h['id'] for h in hits if h['kind']=='topic'}
            finding_ids={h['id'] for h in hits if h['kind']=='finding'}
            for f in self.findings:
                if f['id'] in finding_ids:matched.update(f['topic_ids'])
            endpoints=matched.copy()
        else:endpoints=set(self.topics)
        scope_members=sorted(endpoints) if scope=='group' and member_ids is not None and group_id and group_id.startswith('display-group:') else None
        endpoints={i for i in endpoints if i in self.topics and accepts(self.topics[i])}
        selected=set(endpoints)
        if centre:selected.add(centre)
        if scope=='search' and centre:
            paths,status=self.traverse(centre,endpoints,depth)
            for endpoint in sorted(endpoints):
                if endpoint==centre:continue
                if paths[endpoint]:
                    ns,es=paths[endpoint][0];routes.append(self.route_record(endpoint,ns,es));selected.update(ns)
                else:missing.add(endpoint)
            edge_ids={i for r in routes for i in r['edges']}
        else:edge_ids={i for i,e in self.edges.items() if e['source'] in selected and e['target'] in selected}
        if scope=='search' and not endpoints:notices.append('No topic matches these search and filter choices. The centre and question are preserved; inspect source passages or prepare research.')
        if status['budget_exhausted']:notices.append('Route search reached its work limit. Some matches have not been checked completely; this is not proof that no route exists.')
        elif missing:notices.append(f'{len(missing)} matching topic(s) have no recorded route within {depth} steps. They remain visible.')
        if not endpoints and scope!='search':notices.append('No topics match this scope and its filters.')
        return {**({'group_member_ids':scope_members} if scope_members is not None else {}),'revision':self.snapshot['revision'],'scope':scope,'group_id':group_id,'centre':centre,'search':search,'domain':domain,'kinds':sorted(kinds),'depth':depth,
            'nodes':[dict(self.topics[i],record_type='topic',context=i not in endpoints,missing=i in missing) for i in sorted(selected)],
            'edges':[dict(self.edges[i],record_type='relationship') for i in sorted(edge_ids)],'endpoint_ids':sorted(endpoints),
            'routes':routes,'matches':[self.topics[i] for i in sorted(endpoints) if i in matched],
            'passages':[h for h in hits if h['kind']=='passage'],'notices':notices,'complete':status['complete'],'route_search':status,'limits':LIMITS}

    def comparison(self, ids):
        ids=list(dict.fromkeys(self.store.resolve(i) for i in ids))
        if len(ids)>4:raise ValueError('Choose at most four comparison topics.')
        if any(i not in self.topics for i in ids):raise ValueError('A comparison topic is unavailable. Refresh and choose another topic.')
        topics=[self.topics[i] for i in ids]
        return {'topics':topics,'aspects':sorted({k for t in topics for k in t.get('aspects',{})}),
                'notice':"Each value retains its source and trial conditions; these are not controlled head-to-head trials."}

    def inspect(self, record_id):
        record_id=self.store.resolve(record_id)
        if record_id in self.communities:
            community=self.communities[record_id]
            ids={p['topic_id'] for p in community['plants']}
            return dict(record=community,relationships=[e for e in self.edges.values() if e['source'] in ids and e['target'] in ids],findings=[],unresolved=[])
        if record_id in self.groups or record_id in ROOT_GROUPS:
            record=self.groups.get(record_id) or next(g for g in self.snapshot['organization_roots'] if g['id']==record_id)
            ids=self.group_members(record_id)
            if record_id in ROOT_GROUPS:ids.update(i for i,t in self.topics.items() if self.root_group(t)==record_id)
            return dict(record=record,relationships=[],findings=[],unresolved=[],member_ids=sorted(ids))
        if record_id in self.topics:
            return {"record":self.topics[record_id],"relationships":[e for e in self.edges.values() if record_id in {e["source"],e["target"]}],
                    "findings":[f for f in self.findings if record_id in f["topic_ids"]],
                    "unresolved":[u for u in self.snapshot["unresolved"] if record_id in u.get("topic_ids",[])],"organization":self.organization(record_id)}
        edge=self.edges.get(record_id)
        finding=next((f for f in self.findings if f["id"]==record_id.removeprefix("finding:")),None)
        return {"record":edge or finding,"relationships":[],"findings":[],"unresolved":[]}


    def organization(self, topic_id):
        groups={g['id']:g for g in self.snapshot.get('browse_groups',[])}
        def entry(group, role=None):
            path=[];at=group['parent_id'];seen=set()
            while at not in seen:
                seen.add(at)
                parent=groups.get(at)
                roots={g['id']:g['label'] for g in self.snapshot['organization_roots']}
                path.append({'id':at,'label':parent['label'] if parent else roots.get(at,at)})
                if not parent:break
                at=parent['parent_id']
            return dict(group,role=role,parent_path=list(reversed(path)))
        return {'revision':self.snapshot['revision'],
                'memberships':[entry(g,m['role']) for g in groups.values() for m in g['members'] if m['topic_id']==topic_id],
                'anchored_groups':[entry(g) for g in groups.values() if g['anchor_topic_id']==topic_id]}

    def group_members(self, group_id):
        result=set()
        group=self.groups.get(group_id)
        if group:
            result.update(m['topic_id'] for m in group['members'])
        for child in self.groups.values():
            if child['parent_id']==group_id:result.update(self.group_members(child['id']))
        return result
