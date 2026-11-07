"""Bounded, explained view projections. A displayed route is never a new assertion."""
from __future__ import annotations
from collections import defaultdict, deque
from typing import Any
from .store import Store, normalized

PERSPECTIVES = [
    ("combined", "Combined overview"), ("ecosystems", "Ecosystems"),
    ("technology", "Technology"), ("funding", "Funding"),
    ("sources", "Sources and findings"), ("hierarchy", "Hierarchy"),
    ("comparison", "Comparison"), ("places", "Places"), ("time", "Time"),
    ("conditions", "Conditions and dependencies"),
]
DOMAINS = {"ecosystems":"ecosystem", "technology":"technology", "funding":"funding"}
LIMITS = {"initial_results":12,"maximum_results":48,"route_steps":6,"extended_steps":8,
          "alternatives":3,"nodes":120,"edges":240,"traversal_expansions":10000}


class Graph:
    def __init__(self, store: Store):
        self.store = store
        self.snapshot = store.snapshot()
        self.topics = {t["id"]:t for t in self.snapshot["topics"]}
        self.edges = {e["id"]:e for e in self.snapshot["relationships"]}
        self.findings = self.snapshot["findings"]
        self.adj = defaultdict(list)
        for e in self.edges.values():
            if e.get("traversable",True):
                self.adj[e["source"]].append((e["target"],e["id"]))
                self.adj[e["target"]].append((e["source"],e["id"]))
        for key in self.adj:
            self.adj[key].sort(key=lambda pair:(self.edges[pair[1]].get("basis")=="curated",self.topics[pair[0]]["label"],pair[1]))

    def paths(self, centre: str, target: str, depth=6, count=1):
        queue = deque([([centre],[])])
        found = []
        expansions = 0
        while queue and len(found)<count and expansions<LIMITS["traversal_expansions"]:
            nodes, edges = queue.popleft()
            if len(edges)>=depth:
                continue
            for neighbor, edge in self.adj[nodes[-1]]:
                expansions += 1
                if neighbor in nodes:
                    continue
                route = (nodes+[neighbor],edges+[edge])
                if neighbor==target:
                    found.append(route)
                elif len(route[1])<depth:
                    queue.append(route)
        return found

    def tree(self, centre, depth):
        paths = {centre:([centre],[])}
        queue = deque([centre])
        while queue:
            node = queue.popleft()
            ns, es = paths[node]
            if len(es)>=depth:
                continue
            for other, edge in self.adj[node]:
                if other not in paths:
                    paths[other]=(ns+[other],es+[edge])
                    queue.append(other)
        return paths

    def view(self, centre=None, search="", perspective="combined", limit=12, depth=6, compare=None, branches=None, all_results=False):
        if perspective not in dict(PERSPECTIVES):
            raise ValueError("Unknown perspective")
        limit=len(self.topics) if all_results else max(12,min(48,limit)); depth=max(1,min(8,depth))
        notices=[]
        if centre:
            centre=self.store.resolve(centre)
            if centre not in self.topics:
                notices.append("The previous centre is no longer available. The overview is preserved.")
                centre=None
        hits=self.store.search(search,limit=None if all_results else 100) if search.strip() else []
        matches=[]
        hit_findings={h["id"] for h in hits if h["kind"]=="finding"}
        matched={h["id"] for h in hits if h["kind"]=="topic"}
        for f in self.findings:
            if f["id"] in hit_findings:
                matched.update(f["topic_ids"])
        matched.discard(centre)
        for t in sorted(matched, key=lambda x:(normalized(self.topics[x]["label"])!=normalized(search),self.topics[x]["label"])):
            matches.append(self.topics[t])
        if search.strip() and not matched:
            notices.append(f'No topic match recorded for “{search}”. Search has not changed the centre. Prepare a research task or inspect passage matches.')
        routes=[]; selected=set(); selected_edges=set(); missing=[]; total=0
        domain=DOMAINS.get(perspective)
        tree=self.tree(centre,depth) if centre else {}
        if centre:
            selected.add(centre)
            candidates=[]
            if search.strip():
                corridor={centre}
                for match in (matches if all_results else matches[:48]):
                    if match["id"] in tree:
                        path=tree[match["id"]]
                        corridor.update(path[0])
                        candidates.append((match["id"],path,"Matches your search"))
                    else:
                        missing.append(match["id"])
                # Supporting perspective branches must attach to the actual search corridor.
                if domain and len(corridor)>1:
                    attached={}
                    for node in sorted(corridor):
                        for other,(ns,es) in self.tree(node,2).items():
                            if other!=centre and self.topics[other]["domain"]==domain and other not in matched:
                                combined_ns=tree[node][0]+ns[1:]
                                combined_es=tree[node][1]+es
                                if len(set(combined_ns))==len(combined_ns) and len(combined_es)<=depth:
                                    reason=f"Connected to the search route through {self.topics[node]['label']}"
                                    if other not in attached or len(combined_es)<len(attached[other][0][1]):
                                        attached[other]=((combined_ns,combined_es),reason)
                    candidates += [(i,p,r) for i,(p,r) in attached.items()]
                    if not attached and not any(self.topics[i]["domain"]==domain for i in corridor if i!=centre):
                        notices.append(f"No {domain} connection recorded for this search context. The search matches remain visible.")
            else:
                candidates=[(i,p,"Connected to your centre") for i,p in tree.items() if i!=centre and (not domain or self.topics[i]["domain"]==domain)]
            def rank(item):
                topic,path,reason=item
                t=self.topics[topic]
                context_penalty=int(t["kind"] in {"place","event","organization","family"})
                if perspective=="conditions":
                    context_penalty=0 if t["kind"] in {"condition","equipment"} else 1
                exact_match=normalized(search) in [normalized(t["label"]),*[normalized(a) for a in t.get("aliases",[])]] if search else False
                return (not exact_match, bool(domain and t["domain"]!=domain),topic not in matched,context_penalty,len(path[1]),sum(self.edges[e].get("basis")=="curated" for e in path[1]),t["label"])
            candidates.sort(key=rank)
            seen=set()
            for endpoint,(ns,es),reason in candidates:
                if endpoint in seen: continue
                seen.add(endpoint); total+=1
                if len(routes)>=limit: continue
                # Reserve all intermediate records even while the interface abbreviates them.
                if not all_results and (len(selected | set(ns))>96 or len(selected_edges | set(es))>210):
                    continue
                selected.update(ns); selected_edges.update(es)
                routes.append({"id":f"route:{endpoint}","endpoint":endpoint,"nodes":ns,"edges":es,"why":reason})
            if search and missing:
                notices.append(f"{len(missing)} matching topic(s) have no route within {depth} steps. They remain available below; this does not mean a connection is impossible.")
            if not routes and not search:
                notices.append(f"No {domain or 'further'} connection recorded within {depth} steps.")
        else:
            selected=(matched if search.strip() else {i for i,t in self.topics.items() if not domain or t['domain']==domain}) if all_results else set(self.topics)
            selected_edges={i for i,e in self.edges.items() if e['source'] in selected and e['target'] in selected}
            total=len(selected)
        nodes=[dict(self.topics[i],record_type="topic",matched=i in matched,missing=False) for i in sorted(selected)]
        if centre:
            for i in (missing if all_results else missing[:12]):
                nodes.append(dict(self.topics[i],record_type="topic",matched=True,missing=True))
        edges=[dict(self.edges[i],record_type="relationship") for i in sorted(selected_edges)]
        if centre and perspective!="comparison":
            for branch in ((branches or []) if all_results else (branches or [])[-6:]):
                branch=self.store.resolve(branch)
                if branch not in self.topics: continue
                if branch not in tree:
                    if (all_results or len(nodes)<96) and not any(n["id"]==branch for n in nodes):nodes.append(dict(self.topics[branch],record_type="topic",missing=True,perspective_support=True))
                    notices.append(f"{self.topics[branch]['label']} can be inspected, but no connecting route is recorded within {depth} steps.")
                    continue
                path_nodes,path_edges=tree[branch]
                new_ids=set(path_nodes)-{n["id"] for n in nodes}
                if not all_results and len(nodes)+len(new_ids)>96:
                    notices.append("Collapse displayed connections before opening more branch detail.");continue
                for i in path_nodes:
                    if not any(n["id"]==i for n in nodes):nodes.append(dict(self.topics[i],record_type="topic",perspective_support=True))
                    else:next(n for n in nodes if n["id"]==i)["perspective_support"]=True
                for e in path_edges:
                    existing_edge=next((item for item in edges if item["id"]==e),None)
                    if existing_edge:existing_edge["record_type"]="branch"
                    else:edges.append(dict(self.edges[e],record_type="branch"))
                for other,edge_id in (self.adj[branch] if all_results else self.adj[branch][:8]):
                    if not all_results and (len(nodes)>=96 or len(edges)>=210):break
                    if not any(n["id"]==other for n in nodes):nodes.append(dict(self.topics[other],record_type="topic",perspective_support=True))
                    else:next(n for n in nodes if n["id"]==other)["perspective_support"]=True
                    existing_edge=next((item for item in edges if item["id"]==edge_id),None)
                    if existing_edge:existing_edge["record_type"]="branch"
                    else:edges.append(dict(self.edges[edge_id],record_type="branch"))
        if perspective in {"hierarchy","places","conditions"} and centre:
            kinds={"hierarchy":{"family"},"places":{"place"},"conditions":{"condition","equipment"}}[perspective]
            for edge in self.edges.values():
                for a,b in ((edge["source"],edge["target"]),(edge["target"],edge["source"])):
                    if a in selected and self.topics[b]["kind"] in kinds and (all_results or (len(nodes)<100 and len(edges)<220)):
                        if not any(n["id"]==b for n in nodes): nodes.append(dict(self.topics[b],record_type="topic",perspective_support=True))
                        if not any(e["id"]==edge["id"] for e in edges): edges.append(dict(edge,record_type="relationship"))
        if perspective=="time":
            refs={ref["source_id"] for n in nodes for ref in n.get("source_refs",[])}
            for source in self.snapshot["sources"]:
                if source["id"] not in refs: continue
                for i,date in enumerate(source.get("dates",[])):
                    if not all_results and (len(nodes)>=108 or len(edges)>=220): continue
                    sid=f"date:{source['id']}:{i}"
                    nodes.append({"id":sid,"label":f"{date['value']} · {source['id']}\n{date['meaning']}","kind":"event","domain":"source","record_type":"event","description":"A source date with its original meaning; it is not the date of every finding in that document.","dates":[date],"source_refs":[{"source_id":source["id"],"page":source["initial_pdf_page_ranges"][0][0],"locator":"Edition metadata; opening the selected scope. The exact date location is not asserted on this page."}]})
                    for node in nodes[:]:
                        if not all_results and len(edges)>=230: break
                        if node["id"]!=sid and any(r["source_id"]==source["id"] for r in node.get("source_refs",[])) and node.get("record_type")=="topic":
                            edges.append({"id":sid+":"+node["id"],"source":node["id"],"target":sid,"label":"documented in this source","record_type":"evidence","source_refs":node.get("source_refs",[])})
        # Source evidence is a representation, and is explicitly absent from domain-route traversal.
        if perspective=="sources":
            relevant=[f for f in self.findings if set(f["topic_ids"]) & selected]
            admitted=0
            for f in (relevant if all_results else relevant[:8]):
                source_ids={"source:"+r["source_id"] for r in f["source_refs"]}
                extra_sources=source_ids-{n["id"] for n in nodes}
                extra_edges=len(set(f["topic_ids"]) & selected)+len(f["source_refs"])
                if not all_results and (len(nodes)+len(extra_sources)+1>108 or len(edges)+extra_edges>230): break
                admitted+=1
                fid="finding:"+f["id"]
                nodes.append(dict(f,id=fid,record_id=f["id"],record_type="finding",domain="source",kind=f["kind"],description=f["text"],group_id="findings"))
                for t in f["topic_ids"]:
                    if t in selected:
                        edges.append({"id":fid+":"+t,"source":t,"target":fid,"label":"reported in" if f["kind"]=="finding" else "guidance in","record_type":"evidence","source_refs":f["source_refs"]})
                for ref in f["source_refs"]:
                    sid="source:"+ref["source_id"]
                    if not any(n["id"]==sid for n in nodes):
                        source=next(s for s in self.snapshot["sources"] if s["id"]==ref["source_id"])
                        nodes.append(dict(source,id=sid,label=source["id"],description=source["filename"],record_type="source",domain="source",kind="source",group_id="sources"))
                    edges.append({"id":fid+":"+sid+":"+str(ref["page"]),"source":fid,"target":sid,"label":f"PDF p{ref['page']}","record_type":"evidence","source_refs":[ref]})
            if len(relevant)>admitted: notices.append(f"Showing {admitted} of {len(relevant)} findings on canvas. All findings remain available in the inspector.")
        if perspective=="comparison":
            methods=[t for t in self.topics.values() if t["kind"] in {"method","equipment"} and t.get("aspects")]
            if centre:
                if search.strip():
                    allowed=set()
                    if len(corridor)>1:
                        for node in corridor: allowed.update(self.tree(node,2))
                else: allowed=set(tree)
                methods=[t for t in methods if t["id"] in allowed]
            preferred=["cocoon","traditional-reforestation","individual-fog-water-collector","afds"]
            default=sorted(methods,key=lambda t:(preferred.index(t["id"]) if t["id"] in preferred else 99,t["label"]))[:3]
            chosen=[self.topics[x] for x in (compare or []) if x in self.topics][:4] or default
            if not chosen: notices.append("No comparison information recorded for this search context. The centre and search have been kept.")
            facets=sorted({k for t in chosen for k in t.get("aspects",{})}); facets=facets if all_results else facets[:8]
            nodes=[dict(t,record_type="topic") for t in chosen]
            if centre and centre not in {t["id"] for t in nodes}: nodes.append(dict(self.topics[centre],record_type="topic"))
            edges=[]
            for facet in facets:
                aid="aspect:"+facet
                nodes.append({"id":aid,"label":facet.replace("_"," ").capitalize(),"kind":"aspect","domain":"comparison","record_type":"aspect","description":"A comparison aspect. Values retain their source and trial context.","group_id":"comparison"})
                for t in chosen:
                    if facet in t.get("aspects",{}):
                        value=t["aspects"][facet]
                        edges.append({"id":f"compare:{t['id']}:{facet}","source":t["id"],"target":aid,"label":str(value) if not isinstance(value,dict) else str(value.get("value",value)),"explanation":t["description"]+" Value: "+str(value),"source_refs":t["source_refs"],"record_type":"comparison"})
                    else:
                        edges.append({"id":f"missing:{t['id']}:{facet}","source":t["id"],"target":aid,"label":"Not recorded","record_type":"gap","source_refs":[]})
            notices.append("Comparison retains each trial's conditions. Different contexts are not a controlled head-to-head comparison. Use Compare in a topic's inspector to choose up to four items.")
        topic_count=sum(n.get('record_type')=='topic' for n in nodes)
        complete_endpoints=(len(routes)+len(missing)) if centre and perspective!='comparison' else topic_count
        counts={'topics':topic_count,'findings':sum(n.get('record_type')=='finding' for n in nodes),
                'sources':sum(n.get('record_type')=='source' for n in nodes),'items':len(nodes),'relationships':len(edges),'unrouted_matches':len(missing)}
        return {"revision":self.snapshot["revision"],"centre":centre,"search":search,"perspective":perspective,
                "scope_counts":counts,"nodes":nodes,"edges":edges,"routes":routes,"complete":all_results,"matches":matches if all_results else matches[:48],"passages":[h for h in hits if h["kind"]=="passage"] if all_results else [h for h in hits if h["kind"]=="passage"][:10],
                "notices":notices,"total_results":complete_endpoints if all_results else total,"shown_results":complete_endpoints if all_results else (len(routes) if centre else len(nodes)),"limits":LIMITS,"depth":depth}

    def inspect(self, record_id):
        record_id=self.store.resolve(record_id)
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
                labels={'species':'Species & companions','habitats':'Habitats & conditions','restoration-methods':'Restoration methods','irrigation':'Establishment water','drones':'Drones & components','monitoring':'Monitoring','programmes':'Funding programmes','activities':'Activities','requirements':'Requirements'}
                path.append({'id':at,'label':parent['label'] if parent else labels.get(at.split(':')[-1],at)})
                if not parent:break
                at=parent['parent_id']
            return dict(group,role=role,parent_path=list(reversed(path)))
        return {'revision':self.snapshot['revision'],
                'memberships':[entry(g,m['role']) for g in groups.values() for m in g['members'] if m['topic_id']==topic_id],
                'anchored_groups':[entry(g) for g in groups.values() if g['anchor_topic_id']==topic_id]}
