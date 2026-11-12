import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  type Catalog,
  type State,
  type Ref,
} from "./types";
import {
  initialState,
  reduceExploration,
  isInPlaceAction,
  groupOpeningAction,
  moveLayer,
  allRoutes,
  reconcile,
  commitHistory,
  contextLabel,
  type Action,
  type History,
} from "./exploration";
import {
  migrateHistory,
  legacyTab,
  migrateExpandedGroup,
  normalizeNavigationHistory,
} from "./migration";
import {
  restoreBrowserSession,
  saveBrowserSession,
} from "./explorationStorage";
import { openingSource } from "./opening";
import { loadExploration } from "./explorationQuery";
import { closeLayer } from "./layerClosing";
import { buildScene, previousScenes, isInteractiveRecord } from "./scene";
import { SceneView, GraphBoundary, type SceneHandle } from "./SceneView";
import { useAppearance, useFullScreen } from "./workspace";
import { ResearchPanel, Refs } from "./dialogs";
import { groupLabel, groupDomain, groupMembers, navigationContainers, editorTarget, fixedGroupLayout, isHierarchyGroup, type EditorTarget } from "./organization";
import { FundingProjectTools, FundingDetails } from './FundingPanel';
import { PlanningPanel } from './PlanningPanel';
import { topicNames } from "./speciesNames";
import { SourcePanel } from "./SourcePanel";
import { PlantImages } from "./PlantImages";
import { NavigationTree } from "./KnowledgeTree";
import { useSidebarLayout } from "./useSidebarLayout";
import "./style.css";
import "./sidebars.css";

function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [history, setHistory] = useState<History>({
      entries: [initialState()],
      index: 0,
    }),
    historyRef = useRef(history),
    intent = useRef<State | null>(null);
  const [selected, setSelected] = useState<any>(null),
    [tab, setTab] = useState("details"),
    [source, setSource] = useState<Ref | null>(null),
    [research, setResearch] = useState(false),
    [tasks, setTasks] = useState<any[]>([]),
    [library, setLibrary] = useState(false),
    [saved, setSaved] = useState<any[] | null>(null),
    [saving, setSaving] = useState(false),
    [saveName, setSaveName] = useState("");
  const [planning,setPlanning]=useState(false),[planningTarget,setPlanningTarget]=useState<EditorTarget>({kind:'group',id:null});
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [searchInput, setSearchInput] = useState(""),
    [restore, setRestore] = useState(0),
    [aspect, setAspect] = useState(1.6),
    [comparison, setComparison] = useState<any>(null),
    [additions, setAdditions] = useState<string[]>([]);
  const graph = useRef<SceneHandle>(null),
    canvas = useRef<HTMLDivElement>(null),
    generation = useRef(0),
    controller = useRef<AbortController | null>(null),
    ready = useRef(false),
    retry = useRef<(() => void) | null>(null),
    persistTimer = useRef<any>(null),
    state = history.entries[history.index],
    view = state.view;
  const sidebar = useSidebarLayout(() => graph.current?.fit());
  const appearance = useAppearance(),
    message = (s: string) => setToast(s),
    fullscreen = useFullScreen(message);
  const publish = (h: History) => {
    historyRef.current = h;
    setHistory(h);
  };
  const persist = (_h: History) => {
    if (persistTimer.current) return;
    persistTimer.current = setTimeout(() => {
      persistTimer.current = null;
      void saveBrowserSession(historyRef.current).catch((e) =>
        setError(String(e)),
      );
    }, 150);
  };
  const snapshot = () => {
    const h = historyRef.current,
      p = graph.current?.pose();
    if (!p) return h;
    const entries = [...h.entries];
    const current=entries[h.index];
    const positions=catalog&&current.view ? buildScene(current,current.view,catalog,aspect).positions : current.positions;
    entries[h.index] = { ...current, camera: p,positions };
    const next = { entries, index: h.index };
    historyRef.current = next;
    return next;
  };
  const prepare = async (
    s: State,
    c: Catalog,
    signal: AbortSignal,
    force = false,
    presentationOffset?: { x: number; y: number },
  ) => {
    const loaded = await loadExploration(s, c, signal, force);
    s = loaded.state;
    c = loaded.catalog;
    if(s.scope==='overview')s={...s,grouping:'none',expandedGroups:[],expandedRoutes:[],alternatives:[]};
    if(s.scope==='group' && fixedGroupLayout(s.groupId,c))s={...s,grouping:"none"};
    if(s.scope==='group' && isHierarchyGroup(s.groupId,c))s={...s,expandedGroups:[],expandedRoutes:[],alternatives:[]};
    let v = loaded.view;
    const bounds = canvas.current?.getBoundingClientRect();
    const layoutAspect =
      bounds && bounds.width > 0 && bounds.height > 0
        ? bounds.width / bounds.height
        : aspect;
    let migratedOffset;
    const focused = migrateExpandedGroup({ ...s, view: v }, c, layoutAspect);
    if (focused) {
      migratedOffset = buildScene(s, v, c, layoutAspect).offset;
      s = focused;
      const focusedQuery = await loadExploration(s, c, signal, true);
      s = focusedQuery.state;
      c = focusedQuery.catalog;
      v = focusedQuery.view;
    }
    const offset =
      presentationOffset ||
      migratedOffset ||
      (s.view && Object.keys(s.positions).length
        ? buildScene(s, s.view, c, layoutAspect).offset
        : undefined);
    const n = reconcile(s, v);
    const scene = buildScene(n, v, c, layoutAspect);
    return { catalog: c, state: {
      ...n,
      positions: scene.positions,
      closedLayers: n.closedLayers?.filter((key) => key !== scene.key),
      ...(offset
        ? {
            layerOffsets: {
              ...n.layerOffsets,
              [scene.key]: offset,
            },
          }
        : {}),
    } };
  };
  const perform = async (
    candidate: State,
    c: Catalog,
    base: History,
    mode: "commit" | "travel" | "replace" = "commit",
    at = base.index,
    force = false,
    presentationOffset?: { x: number; y: number },
  ) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const token = ++generation.current;
    setLoading(true);
    setError("");
    intent.current = candidate;
    retry.current = () => {
      void perform(candidate, c, base, mode, at, force, presentationOffset);
    };
    try {
      const prepared = await prepare(
        candidate,
        c,
        ctrl.signal,
        force,
        presentationOffset,
      );
      if (ctrl.signal.aborted || token !== generation.current) return;
      let completed:State = prepared.state;
      c = prepared.catalog;
      let h: History;
      if (mode === "commit") h = commitHistory(base, completed);
      else {
        const entries = [...base.entries];
        entries[at] = completed;
        h = { entries, index: at };
      }
      // Old saved histories may have no query snapshots. Hydrate only the two background views.
      const missing = [h.index - 1, h.index - 2].filter(
        (i) => i >= 0 && !h.entries[i].view,
      );
      for (const i of missing) {
        try {
          const background = await prepare(h.entries[i], c, ctrl.signal);
          h.entries[i] = background.state;
          c = background.catalog;
        } catch (e) {
          if (ctrl.signal.aborted) throw e;
        }
      }
      if (ctrl.signal.aborted || token !== generation.current) return;
      h=normalizeNavigationHistory(h,c);
      completed=h.entries[h.index];
      intent.current = null;
      setCatalog(c);
      publish(h);
      setSearchInput(completed.search);
      setSelected((prev: any) => {
        if (!prev) return null;
        if ((completed.hiddenTopicIds || []).includes(prev.id) && c.topics.some(t => t.id === prev.id)) return prev;
        const scene = buildScene(completed, completed.view!, c, aspect);
        if (!isInteractiveRecord(scene, prev.id)) return null;
        return scene.cards.some((card) => card.id === prev.id) ||
          scene.links.some((link) => link.id === prev.id) ||
          allRoutes(completed, completed.view!).some((r) => r.id === prev.id)
          ? prev
          : null;
      });
      setRestore((x) => x + 1);
      setLoading(false);
      ready.current = true;
      void saveBrowserSession(h).catch((e) => setError(String(e)));
      return true;
    } catch (e) {
      if (ctrl.signal.aborted || token !== generation.current) return;
      intent.current = null;
      setLoading(false);
      setError(String(e));
      return false;
    }
  };
  const dispatch = (action: Action) => {
    if (!catalog) return;
    const base = snapshot(),
      previous =
        action.type === "previewDomain"
          ? base.entries[base.index]
          : intent.current || base.entries[base.index],
      candidate = reduceExploration(previous, action, catalog);
    if (
      previous.view &&
      ["explore", "group", "openMembers"].includes(action.type)
    ) {
      candidate.openedFrom = openingSource(
        action,
        buildScene(previous, previous.view, catalog, aspect),
        catalog,
      );
    }
    if (isInPlaceAction(action)) {
      const offset = previous.view
        ? buildScene(previous, previous.view, catalog, aspect).offset
        : undefined;
      void perform(
        candidate,
        catalog,
        { ...base, entries: base.entries.slice(0, base.index + 1) },
        "replace",
        base.index,
        false,
        offset,
      ).then(ok => {
        if(ok && ['visibility','resetVisibility'].includes(action.type))
          requestAnimationFrame(() => requestAnimationFrame(() => graph.current?.fit()));
      });
    } else void perform(candidate, catalog, base);
  };
  const closeGraphLayer = (key: string) => {
    if (!catalog || loading) return;
    const base = snapshot(),
      result = closeLayer(base, key, catalog, aspect);
    if (!result) return;
    if (result.kind === "background") {
      const entries = [...base.entries];
      entries[base.index] = result.state;
      const next = { entries, index: base.index };
      publish(next);
      void saveBrowserSession(next).catch((e) => setError(String(e)));
    } else void perform(result.state, catalog, base);
  };
  const travel = (index: number) => {
    if (!catalog || index < 0 || index >= historyRef.current.entries.length)
      return;
    const base = snapshot();
    void perform(base.entries[index], catalog, base, "travel", index);
  };
  const reopen = (payload: any) => {
    if (!catalog) return;
    const raw = payload.state || payload.view_state || payload,
      h = migrateHistory(
        payload.history || payload.view_history,
        raw,
        payload.history_index,
      );
    h.entries[h.index] = {
      ...h.entries[h.index],
      ...migrateHistory(null, raw).entries[0],
    };
    setTab(legacyTab(raw));
    void perform(h.entries[h.index], catalog, h, "replace", h.index, true).then(
      () => {
        if (raw.selected) {
          const id = catalog.identity_redirects?.[raw.selected] || raw.selected;
          setSelected(
            catalog.topics.find((t) => t.id === id) ||
              catalog.relationships.find((e) => e.id === id) ||
              null,
          );
        }
      },
    );
  };
  useEffect(() => {
    let alive = true;
    Promise.all([
      api<Catalog>("/api/catalog"),
      restoreBrowserSession(),
      api("/api/research"),
    ])
      .then(([c, session, t]) => {
        if (!alive) return;
        setCatalog(c);
        setTasks(t);
        setTab(session.tab || "details");
        void perform(
          session.history.entries[session.history.index],
          c,
          session.history,
          "replace",
          session.history.index,
          true,
        ).then(() => {
          if (session.selection)
            setSelected(
              c.topics.find((t) => t.id === session.selection) ||
                c.relationships.find((e) => e.id === session.selection) ||
                null,
            );
        });
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
        retry.current = () => location.reload();
      });
    return () => {
      alive = false;
      controller.current?.abort();
      clearTimeout(persistTimer.current);
    };
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if(r.width>0&&r.height>0)setAspect(r.width/r.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [!!catalog]);
  useEffect(() => {
    const save = () => {
      if (ready.current) void saveBrowserSession(snapshot());
    };
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, []);
  useEffect(() => {
    document.querySelector('.inspector-content')?.scrollTo(0, 0);
  }, [selected?.id, tab, state.groupId]);
  useEffect(() => {
    if (!catalog) return;
    const ctrl = new AbortController();
    api(
      "/api/comparison?" +
        new URLSearchParams({ topics: state.compare.join(",") }),
      { signal: ctrl.signal },
    )
      .then(setComparison)
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(String(e));
      });
    return () => ctrl.abort();
  }, [state.compare.join(","), catalog?.revision]);
  const scene = useMemo(
    () => (catalog && view ? buildScene(state, view, catalog, aspect) : null),
    [
      catalog,
      view,
      state.positions,
      state.layerOffsets,
      state.centre,
      state.groupId,
      state.groupMembers,
      state.grouping,
      state.hiddenTopicIds,
      state.expandedGroups,
      state.expandedRoutes,
      state.alternatives,
      state.openedFrom,
      state.pendingDomain,
      state.fundingProjectId,
      aspect,
    ],
  );
  useEffect(()=>{
    if(!ready.current||!scene||scene.layout!=='circle'||!view)return;
    const h=historyRef.current,current=h.entries[h.index];
    if(current.view!==view||current.scope!=='neighbors'||current.centre!==state.centre)return;
    if(Object.keys(current.positions).length===scene.cards.length&&scene.cards.every(c=>current.positions[c.id]?.x===c.position.x&&current.positions[c.id]?.y===c.position.y))return;
    // Responsive reflow updates presentation in place, without a new exploration.
    // Capture the visible offset before replacing any legacy geometry-based alias.
    const entries=[...h.entries];
    entries[h.index]={...current,positions:scene.positions,layerOffsets:{...current.layerOffsets,[scene.key]:scene.offset}};
    const next={entries,index:h.index};publish(next);persist(next);
  },[scene?.signature,view,state.centre]);
  const graphHistoryKey = JSON.stringify(
    history.entries.map((s) => [
      s.scope,
      s.centre,
      s.groupId,
      s.groupMembers,
      s.search,
      s.domain,
      s.pendingDomain,
      s.kinds,
      s.grouping,
      s.hiddenTopicIds,
      s.positions,
      s.expandedRoutes,
      s.expandedGroups,
      s.openedFrom,
      s.layerRoot,
    ]),
  );
  const previous = useMemo(
    () =>
      catalog
        ? previousScenes(history.entries, history.index, catalog, aspect)
        : [],
    [
      catalog,
      history.index,
      graphHistoryKey,
      aspect,
      state.layerOffsets,
      state.closedLayers,
    ],
  );
  const completeScene = useMemo(() => catalog && view && state.hiddenTopicIds?.length
    ? buildScene({...state, hiddenTopicIds: []}, view, catalog, aspect) : scene,
    [scene, catalog, view, state.hiddenTopicIds, aspect]);
  const routes = view ? allRoutes(state, view).filter(r => r.nodes.every(id => !state.hiddenTopicIds?.includes(id))) : [],
    selectedRoute = routes.find((r) => r.id === selected?.id),
    selectedTopic = catalog?.topics.find((t) => t.id === selected?.id),
    inspectedGroup = catalog?.browse_groups.find(g=>g.id===(selected?.displayGroup ? selected.groupKey : !selected && state.scope==='group' ? state.groupId : null)),
    inspectedReview = catalog?.organization_review?.pending_groups.find(g=>g.id===(selected?.displayGroup ? selected.groupKey : !selected && state.scope==='group' ? state.groupId : null)),
    selectedEdge = catalog?.relationships.find((e) => e.id === selected?.id),
    selectedCard = scene?.cards.find((c) => c.id === selected?.id);
  const selectedEditor = editorTarget(selected?.displayGroup ? selected.groupKey : selected?.id, catalog);
  const connectionTopic = selectedTopic || catalog?.topics.find(t=>t.id===inspectedGroup?.anchor_topic_id);
  const activeEditor = selectedEditor || (!selected?.displayGroup && state.scope==='group' ? editorTarget(state.groupId,catalog) : null);
  const openEditor = (target: EditorTarget) => {setPlanningTarget(target);setPlanning(true);};
  const relationshipIds =
    selectedRoute?.edges ||
    selected?.constituent_ids ||
    (selectedEdge ? [selectedEdge.id] : []);
  const activeEdges = relationshipIds.length
    ? relationshipIds
    : selectedTopic
      ? catalog!.relationships
          .filter((e) => [e.source, e.target].includes(selectedTopic.id))
          .map((e) => e.id)
      : [];
  const visibleIds = [...new Set(scene?.cards.flatMap((c) => c.members) || [])],
    scopeIds =
      selectedRoute?.nodes ||
      (selectedCard ? completeScene?.cards.find(c => c.id === selectedCard.id)?.members || selectedCard.members : undefined) ||
      (selectedEdge
        ? [selectedEdge.source, selectedEdge.target]
        : relationshipIds.length
          ? catalog!.relationships
              .filter((e) => relationshipIds.includes(e.id))
              .flatMap((e) => [e.source, e.target])
          : selectedTopic
            ? [selectedTopic.id]
            : [...new Set(completeScene?.cards.flatMap(c => c.members) || [])]),
    scopeSet = new Set(scopeIds);
  const findings =
      catalog?.findings.filter((f) =>
        f.topic_ids.some((id: string) => scopeSet.has(id)),
      ) || [],
    relatedSources = new Set<string>(
      [
        ...(catalog?.topics
          .filter((t) => scopeSet.has(t.id))
          .flatMap((t) => t.source_refs || []) || []),
        ...findings.flatMap((f) => f.source_refs || []),
        ...(catalog?.relationships
          .filter((e) => relationshipIds.includes(e.id))
          .flatMap((e) => e.source_refs || []) || []),
      ].map((r) => r.source_id),
    );
  const pending = [
    ...new Set(
      tasks
        .filter((t) => t.status !== "Completed")
        .flatMap((t) => [
          t.context?.centre,
          ...(t.context?.selected_topic_ids || []),
        ])
        .filter(Boolean),
    ),
  ] as string[];
  const getContext = () => {
    const h = snapshot(),
      s = h.entries[h.index],
      selectedIds = selectedTopic
        ? [selectedTopic.id]
        : selectedRoute
          ? selectedRoute.nodes
          : relationshipIds.length
            ? scopeIds
            : selectedCard?.members || [];
    return {
      version: 6,
      scope: s.scope,
      group_id: s.groupId,
      group_member_ids: s.groupMembers,
      group_label: s.scope === "group" ? contextLabel(s, catalog) : undefined,
      centre: s.centre,
      centre_label:
        catalog?.topics.find((t) => t.id === s.centre)?.label || "No centre",
      search: s.search,
      raw_search_term: s.search,
      matched_topic_ids: view?.matches.map((t) => t.id) || [],
      filters: {
        domain: s.domain,
        kinds: s.kinds,
        pending_domain: s.pendingDomain,
      },
      grouping: s.grouping,
      expanded_route_ids: s.expandedRoutes,
      selected_topic_ids: selectedIds,
      selected_relationship_ids: relationshipIds,
      routes: selectedRoute ? [selectedRoute] : routes,
      visible_topic_ids: visibleIds,
      knowledge_revision: catalog?.revision,
      view_state: s,
      view_history: h,
      history_index: h.index,
    };
  };
  const refresh = async () => {
    try {
      const changes = await api("/api/changes?since=" + state.revision);
      const c = await api<Catalog>("/api/catalog");
      const updatedTasks = await api("/api/research");
      const h = snapshot();
      if (await perform(h.entries[h.index], c, h, "replace", h.index, true)) {
        setTasks(updatedTasks);
        setAdditions(changes.added_topic_ids);
        message(
          changes.added_topic_ids.length +
            " additions highlighted. Exploration retained.",
        );
      }
    } catch (e) {
      setError(String(e));
    }
  };
  const alternatives = async () => {
    if (!selectedRoute || !state.centre) return;
    try {
      const result = await api(
          "/api/routes?" +
            new URLSearchParams({
              centre: state.centre,
              target: selectedRoute.endpoint,
              depth: String(state.depth),
            }),
        ),
        extra = result.routes.filter((r: any) => r.id !== selectedRoute.id);
      if (result.route_search.budget_exhausted)
        message(
          "Route search reached its work limit; alternatives may be incomplete.",
        );
      else message(extra.length + " alternative route(s) recorded.");
      if (extra.length) dispatch({ type: "alternatives", routes: extra });
    } catch (e) {
      setError(String(e));
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const h = snapshot(),
        s = h.entries[h.index];
      await api("/api/explorations", {
        method: "POST",
        body: JSON.stringify({
          label: saveName.trim(),
          state: s,
          history: h,
          history_index: h.index,
        }),
      });
      setSaving(false);
      message("Exploration saved.");
    } catch (e) {
      setError(String(e));
    }
  };
  const select = (r: any) => {
    if (!r || (scene && !isInteractiveRecord(scene, r.id))) return;
    setSelected(r);
    setTab("details");
    sidebar.showInspector();
  };
  const openGroup = (record: any) => {
    if (!scene || loading) return;
    const card = scene.cards.find((c) => c.id === record.id);
    if (!card || !isInteractiveRecord(scene, card.id)) return;
    const action = groupOpeningAction(state, card.record, card.members);
    if (action) dispatch(action);
  };
  const topicButton = (id: string) => {
    const t = catalog?.topics.find((t) => t.id === id);
    return (
      <button
        key={id}
        disabled={!!scene && !isInteractiveRecord(scene, id)}
        onClick={() => select(t)}
      >
        {t?.label || id}
      </button>
    );
  };
  if (!catalog)
    return (
      <main className="boot">
        <h1>Algarroba</h1>
        <p>{loading ? "Opening your knowledge browser…" : error}</p>
        {!loading && <button onClick={() => retry.current?.()}>Retry</button>}
      </main>
    );
  return (
    <div className={"app-shell sidebar-shell" + (sidebar.resizing ? " is-resizing" : "")} style={{"--inspector-width": sidebar.width + "px"} as React.CSSProperties}>
      <header className="masthead">
        <button
          className="brand"
          onClick={() => dispatch({ type: "overview" })}
        >
          ❧ algarroba <small>KNOWLEDGE BROWSER</small>
        </button>
        <span>One connected landscape</span>
        <div className="actions">
          <button
            onClick={async () => {
              try {
                setSaved(await api("/api/explorations"));
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Saved explorations
          </button>
          <button
            onClick={() => {
              setSaveName(
                state.search ||
                  catalog.topics.find((t) => t.id === state.centre)?.label ||
                  contextLabel(state, catalog),
              );
              setSaving(true);
            }}
          >
            Save view
          </button>
          <button onClick={fullscreen.toggle}>
            {fullscreen.fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </header>
      <div className={"app-body" + (!sidebar.inspectorOpen ? " inspector-collapsed" : "")}>
        {(sidebar.viewport < 1200 && sidebar.navigationOpen || sidebar.viewport < 850 && sidebar.inspectorOpen) && <button className="drawer-backdrop" aria-label="Close sidebar" onClick={sidebar.closeDrawers}/>}
        <aside id="knowledge-navigation" className={"sidebar" + (sidebar.navigationOpen ? " drawer-open" : "")} aria-label="Knowledge navigation panel" role={sidebar.viewport < 1200 && sidebar.navigationOpen ? 'dialog' : undefined} aria-modal={sidebar.viewport < 1200 && sidebar.navigationOpen ? true : undefined}>
          <div className="sidebar-heading"><strong>Knowledge</strong><button className="navigation-close" aria-label="Close navigation" onClick={sidebar.closeNavigation}>×</button></div>
          <NavigationTree catalog={catalog} hiddenIds={state.hiddenTopicIds || []} selectedId={selected?.id} groupId={state.scope === 'group' ? state.groupId : null} busy={loading}
            openGroup={id => {dispatch({type:'group', id}); sidebar.closeNavigation();}}
            inspect={id => select(catalog.topics.find(t => t.id === id))}
            toggle={(ids, included) => dispatch({type:'visibility', ids, included})} reset={() => dispatch({type:'resetVisibility'})}/>
          <div className="sidebar-footer">
          {activeEditor ? <button onClick={()=>openEditor(activeEditor)}>{activeEditor.sourceId?'Create editable community':'Edit '+activeEditor.kind}</button> : <div className="sidebar-management">
            <button onClick={()=>openEditor({kind:'group',id:null})}>Manage groups</button>
            <button onClick={()=>openEditor({kind:'community',id:null})}>Communities</button>
          </div>}
          <hr />
          <button onClick={() => setLibrary(true)}>
            Source library · {catalog.sources.length}
          </button>
          <p>
            {catalog.coverage.length} curated pages · {catalog.topics.length}{" "}
            topics
          </p>
          <details>
            <summary>Research tasks · {tasks.length}</summary>
            {tasks.map((t) => (
              <article key={t.id}>
                <strong>{t.custom_topics || t.instruction}</strong>
                <small>{t.status}</small>
                {t.summary && <p>{t.summary}</p>}
                <button onClick={() => reopen(t.context)}>
                  Reopen context
                </button>
              </article>
            ))}
          </details>
          </div>
        </aside>
        <main className="main-workspace">
          <div className="panel-controls"><button className="navigation-open" aria-controls="knowledge-navigation" aria-expanded={sidebar.navigationOpen} onClick={sidebar.showNavigation}>☰ Navigation</button><button hidden={sidebar.inspectorOpen} aria-controls="topic-inspector" onClick={sidebar.showInspector}>Show details</button></div>
          <section className="controls" aria-label="Exploration controls">
            <label>
              Centre
              <div className="centre-input">
                <select
                  aria-label="Centre"
                  value={state.centre || ""}
                  onChange={(e) =>
                    dispatch(
                      e.target.value
                        ? { type: "explore", id: e.target.value }
                        : { type: "clearCentre" },
                    )
                  }
                >
                  <option value="">No centre</option>
                  {catalog.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {state.centre && (
                  <button
                    aria-label="Remove centre"
                    onClick={() => dispatch({ type: "clearCentre" })}
                  >
                    ×
                  </button>
                )}
              </div>
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({ type: "search", text: searchInput });
              }}
            >
              <label>
                Search stored knowledge
                <div className="search-input">
                  <input
                    aria-label="Search stored knowledge"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <button type="submit">Search</button>
                  {state.search && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => dispatch({ type: "search", text: "" })}
                    >
                      ×
                    </button>
                  )}
                </div>
              </label>
            </form>
            <label>
              Domain
              <select
                aria-label="Domain"
                value={state.pendingDomain ?? state.domain}
                onChange={(e) =>
                  dispatch({ type: "previewDomain", domain: e.target.value })
                }
              >
                <option value="all">All</option>
                <option value="ecosystem">Ecosystems</option>
                <option value="technology">Technology</option>
                <option value="funding">Funding</option>
              </select>
            </label>
            <details className="type-filter">
              <summary>Topic type · {state.kinds.length || "All"}</summary>
              <div>
                {catalog.topic_kinds.map((kind) => (
                  <label key={kind}>
                    <input
                      type="checkbox"
                      checked={state.kinds.includes(kind)}
                      onChange={(e) =>
                        dispatch({
                          type: "filters",
                          kinds: e.target.checked
                            ? [...state.kinds, kind]
                            : state.kinds.filter((k) => k !== kind),
                        })
                      }
                    />
                    {kind}
                  </label>
                ))}
                <button
                  onClick={() => dispatch({ type: "filters", kinds: [] })}
                >
                  All types
                </button>
              </div>
            </details>
            <label>
              Group by
              <select
                aria-label="Group by"
                disabled={state.scope==='overview' || (state.scope==='group' && fixedGroupLayout(state.groupId,catalog))}
                title={state.scope==='overview' || (state.scope==='group' && fixedGroupLayout(state.groupId,catalog))?'This view follows its stored organization.':undefined}
                value={state.grouping}
                onChange={(e) =>
                  dispatch({ type: "grouping", value: e.target.value as any })
                }
              >
                <option value="none">None</option>
                <option value="family">Browsing family</option>
                <option value="type">Topic type</option>
                <option value="place">Place</option>
              </select>
            </label>
          </section>
          <div className="context-strip">
            <span>
              {contextLabel(state, catalog)}
              {state.centre && (
                <>
                  {" "}
                  · Centre:{" "}
                  <strong>
                    {catalog.topics.find((t) => t.id === state.centre)?.label}
                  </strong>
                </>
              )}
              {state.search && (
                <>
                  {" "}
                  · Search: <strong>{state.search}</strong>
                </>
              )}
              {(state.pendingDomain || state.domain !== "all") && (
                <>
                  {" "}
                  · {state.pendingDomain ?? state.domain}
                  {state.pendingDomain ? " (preview)" : ""}
                </>
              )}
            </span>
            <button className="primary" onClick={() => setResearch(true)}>
              Research
            </button>
          </div>
          {(state.domain==='funding'||state.scope==='group'&&state.groupId&&groupDomain(state.groupId,catalog)==='funding')&&<FundingProjectTools catalog={catalog} selected={state.fundingProjectId||'all'} onSelect={id=>dispatch({type:'fundingProject',id})} onCatalog={setCatalog}/>}
          <div className="graph-toolbar">
            <div className="actions">
              <button
                aria-label="Back"
                disabled={history.index === 0}
                onClick={() => travel(history.index - 1)}
              >
                ← Back
              </button>
              <button
                aria-label="Forward"
                disabled={history.index === history.entries.length - 1}
                onClick={() => travel(history.index + 1)}
              >
                Forward →
              </button>
              <button onClick={() => dispatch({ type: "overview" })}>
                Return to overview
              </button>
              <button onClick={refresh}>Refresh</button>
              <button
                disabled={loading || state.scope === "overview" || !scene}
                onClick={() => scene && closeGraphLayer(scene.key)}
              >
                Close layer
              </button>
              {state.pendingDomain && (
                <button
                  disabled={loading}
                  onClick={() => dispatch({ type: "updateDomain" })}
                  aria-label="Update layer domain"
                >
                  Update layer
                </button>
              )}
            </div>
            <div className="actions">
              <label>
                Appearance
                <select
                  aria-label="Appearance"
                  value={appearance.preference}
                  onChange={(e) =>
                    appearance.setPreference(e.target.value as any)
                  }
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <button onClick={() => dispatch({ type: "tidy" })}>
                Tidy graph
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="notice error">
              {error} Your last working exploration is retained.{" "}
              <button onClick={() => retry.current?.()}>Retry</button>
            </div>
          )}
          {view?.notices.map((n) => (
            <div className="notice" key={n}>
              {n}
            </div>
          ))}
          {state.pendingDomain && (
            <div className="notice" role="status">
              Domain preview: topics outside the selected domain are darkened.{" "}
              Update the layer to remove them. Centres and required route steps
              remain as connecting context.
            </div>
          )}
          <div className="graph-and-details">
            <section className="graph-region">
              <div ref={canvas} className="canvas-wrap">
                {scene && (
                  <GraphBoundary onError={setError}>
                    <SceneView
                      ref={graph}
                      scene={scene}
                      previous={previous}
                      theme={appearance.theme}
                      selected={selected?.id || null}
                      activeEdges={activeEdges}
                      pending={pending}
                      additions={additions}
                      camera={state.camera}
                      restore={restore}
                      onSelect={select}
                      onOpenGroup={openGroup}
                      busy={loading}
                      baseLayer={state.scope === "overview"}
                      onCloseLayer={closeGraphLayer}
                      domainUpdatePending={!!state.pendingDomain}
                      onUpdateDomain={() => dispatch({ type: "updateDomain" })}
                      onLayerMove={(key, point) => {
                        const h = historyRef.current,
                          entries = [...h.entries];
                        entries[h.index] = moveLayer(
                          entries[h.index],
                          key,
                          point,
                        );
                        const next = { entries, index: h.index };
                        publish(next);
                        void saveBrowserSession(next).catch((e) =>
                          setError(String(e)),
                        );
                      }}
                      onClear={() => setSelected(null)}
                      onPose={(p) => {
                        if (!ready.current || loading || !scene) return;
                        const h = historyRef.current,
                          entries = [...h.entries];
                        entries[h.index] = { ...entries[h.index], camera: p,positions:scene.positions };
                        const next = { entries, index: h.index };
                        publish(next);
                        persist(next);
                      }}
                      onError={setError}
                    />
                  </GraphBoundary>
                )}
                {scene && !scene.cards.length && !loading && <div className="graph-empty" role="status"><strong>No topics displayed</strong><p>{state.hiddenTopicIds?.length ? 'Topics are excluded in this exploration.' : 'No topics match this view.'}</p>{!!state.hiddenTopicIds?.length && <button onClick={() => dispatch({type:'resetVisibility'})}>Reset visibility</button>}</div>}
                {loading && (
                  <div className="loading" role="status">
                    Preparing the complete graph…
                  </div>
                )}
                <div className="camera-controls">
                  <button
                    aria-label="Turn left"
                    onClick={() => graph.current?.turn(-10, 0)}
                  >
                    ↶
                  </button>
                  <button
                    aria-label="Turn right"
                    onClick={() => graph.current?.turn(10, 0)}
                  >
                    ↷
                  </button>
                  <button
                    aria-label="Tilt up"
                    onClick={() => graph.current?.turn(0, 5)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Tilt down"
                    onClick={() => graph.current?.turn(0, -5)}
                  >
                    ↓
                  </button>
                  <button
                    aria-label="Zoom in"
                    onClick={() => graph.current?.zoom(1 / 1.3)}
                  >
                    +
                  </button>
                  <button
                    aria-label="Zoom out"
                    onClick={() => graph.current?.zoom(1.3)}
                  >
                    −
                  </button>
                  <button onClick={() => graph.current?.fit()}>Fit</button>
                  <button onClick={() => graph.current?.reset()}>
                    Reset view
                  </button>
                </div>
                <p className="canvas-hint">
                  Drag a label to move its layer · Ctrl-drag to rotate ±60° ·
                  Previous views are read-only
                </p>
              </div>
              <div className="graph-footer">
                <span>
                  {scene?.cards.length || 0} foreground cards ·{" "}
                  {visibleIds.length} displayed topics · {Math.max(0, new Set(completeScene?.cards.flatMap(c=>c.members)).size - visibleIds.length)} hidden in this layer ·{" "}
                  {scene?.links.length || 0} displayed connections
                </span>
                {state.depth === 6 && state.scope === "search" && (
                  <button onClick={() => dispatch({ type: "depth" })}>
                    Look farther · 8 steps
                  </button>
                )}
              </div>
              {routes.length > 0 && (
                <div className="route-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={routes.every((r) =>
                        state.expandedRoutes.includes(r.id),
                      )}
                      onChange={(e) =>
                        dispatch({
                          type: "allRoutes",
                          routes,
                          show: e.target.checked,
                        })
                      }
                    />
                    Show all route steps
                  </label>
                  <details>
                    <summary>Connecting routes · {routes.length}</summary>
                    {routes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() =>
                          select({
                            ...r,
                            kind: "route",
                            label: catalog.topics.find(
                              (t) => t.id === r.endpoint,
                            )?.label,
                          })
                        }
                      >
                        {catalog.topics.find((t) => t.id === r.endpoint)?.label}{" "}
                        ·{" "}
                        {r.nodes.length - 2 > 0
                          ? "via " + (r.nodes.length - 2) + " topics"
                          : "direct"}
                      </button>
                    ))}
                  </details>
                </div>
              )}
              <details className="visible-topics">
                <summary>Visible topics · {scene?.cards.length || 0}</summary>
                <div style={state.scope==='group' && catalog.browse_groups.find(g=>g.id===state.groupId)?.member_layout==='vertical'?{gridTemplateColumns:'1fr'}:undefined}>
                  {scene?.cards.map((c) => (
                    <article key={c.id}>
                      <button
                        aria-label={"Inspect " + c.record.label}
                        disabled={c.outOfDomain}
                        onClick={() => select(c.record)}
                      >
                        {c.record.label}
                        {c.outOfDomain ? " · Outside selected domain" : ""}
                        {pending.includes(c.id) ? " · To research" : ""}
                      </button>
                      {c.record.fundingSummary&&<p className="funding-card-summary"><span>{c.record.fundingSummary.relevance}</span><span>{c.record.fundingSummary.availability}</span>{c.record.fundingSummary.payment&&<strong>{c.record.fundingSummary.payment}</strong>}</p>}
                      {topicNames(c.record).length > 0 && (
                        <div className="species-names">
                          {topicNames(c.record).map((name) => (
                            <span key={name.label} lang={name.language}>{name.label}: {name.value}</span>
                          ))}
                        </div>
                      )}
                      {c.record.displayGroup && (
                        <button
                          disabled={c.outOfDomain}
                          onClick={() => openGroup(c.record)}
                        >
                          Open group
                        </button>
                      )}
                      {scene.internal.find((i) => i.cardId === c.id) && (
                        <button
                          disabled={c.outOfDomain}
                          onClick={() =>
                            select({
                              id: "internal:" + c.id,
                              label: "Internal recorded connections",
                              constituent_ids: scene.internal.find(
                                (i) => i.cardId === c.id,
                              )!.ids,
                            })
                          }
                        >
                          Inspect internal connections
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            </section>

          </div>
        </main>
        {sidebar.inspectorOpen && <div className="inspector-divider" {...sidebar.separator}/>}
            <aside
              id="topic-inspector" hidden={!sidebar.inspectorOpen} className="inspector" role={sidebar.viewport < 850 && sidebar.inspectorOpen ? 'dialog' : undefined} aria-modal={sidebar.viewport < 850 && sidebar.inspectorOpen ? true : undefined}
              aria-label="Topic and connection details"
            >
              <div className="inspector-header">
                <div className="inspector-heading"><small>TOPIC DETAILS</small><button aria-label="Collapse topic inspector" onClick={sidebar.closeInspector}>×</button></div>
                <h2 id="inspector-title">{(selected?.displayGroup && selected.groupKey ? groupLabel(selected.groupKey,catalog) : selectedTopic?.label) || selected?.label || inspectedGroup?.label || inspectedReview?.label || 'Select a topic'}</h2>
                {connectionTopic && <div className="inspector-topic-actions"><button className="primary" title={`Show topics connected to ${connectionTopic.label}`} onClick={()=>{setTab('details');dispatch({type:'explore',id:connectionTopic.id});}}>Show connected topics</button></div>}
              <nav className="inspector-tabs">
                {["details", "evidence", "dates", "comparison"].map((name) => (
                  <button
                    key={name}
                    aria-pressed={tab === name}
                    onClick={() => setTab(name)}
                  >
                    {name[0].toUpperCase() + name.slice(1)}
                  </button>
                ))}
              </nav>
              </div>
              <div className="inspector-content">
              {tab === "details" && (
                <>
                  <p className="eyebrow">
                    {selectedRoute
                      ? "CONNECTING ROUTE"
                      : selected?.kind || "EXPLORE THE KNOWLEDGE"}
                  </p>

                  <p style={{whiteSpace:"pre-line"}}>
                    {inspectedGroup?.description || (inspectedReview?'These topics need a documented browsing home. Their placement is unresolved; inspect their evidence before organizing them. This review folder is derived and cannot be edited.':null) || selectedTopic?.description ||
                      selected?.explanation ||
                      selected?.description ||
                      "Select a card to inspect it. Use Show connected topics to follow its direct connections."}
                  </p>
                  {inspectedGroup && <section aria-label="Group guide">
                    <Refs catalog={catalog} refs={inspectedGroup.source_refs || []} open={setSource}/>
                    {inspectedGroup.anchor_topic_id && <button onClick={()=>select(catalog.topics.find(t=>t.id===inspectedGroup.anchor_topic_id))}>About {catalog.topics.find(t=>t.id===inspectedGroup.anchor_topic_id)?.label || 'this topic'}</button>}
                    <ol>{inspectedGroup.members.map(m=><li key={m.topic_id}>{topicButton(m.topic_id)}</li>)}</ol>
                  </section>}
                  {selectedTopic?.aspects && <dl className="topic-context">{Object.entries(selectedTopic.aspects).map(([key,value])=><React.Fragment key={key}><dt>{key}</dt><dd style={{whiteSpace:'pre-line'}}>{String(value)}</dd></React.Fragment>)}</dl>}
                  {!selected&&state.scope==='group'&&state.groupId&&navigationContainers(state.groupId,catalog).map(g=><details key={g.id} aria-label="Funding overview guide"><summary>Funding overview and sources</summary><p>{g.description}</p><Refs catalog={catalog} refs={g.source_refs||[]} open={setSource}/></details>)}
                  <FundingDetails catalog={catalog} ids={selectedTopic?[selectedTopic.id]:selected?.displayGroup?(completeScene?.cards.find(c=>c.id===selected.id)?.members||groupMembers(selected.groupKey,catalog)):state.scope==='group'?(view?.endpoint_ids||[]):[]} selected={state.fundingProjectId||'all'} open={setSource}/>
                  {selected && (
                    <button onClick={() => setSelected(null)}>
                      Clear selection
                    </button>
                  )}
                  {selectedTopic && (
                    <>
                      {selectedTopic.kind==='habitat'&&<button onClick={()=>openEditor({kind:'community',id:null,sourceId:selectedTopic.id})}>Create editable community from this</button>}
                      <div className="actions">
                        <button
                          disabled={
                            state.compare.length >= 4 &&
                            !state.compare.includes(selectedTopic.id)
                          }
                          onClick={() => {
                            dispatch({ type: "compare", id: selectedTopic.id });
                            setTab("comparison");
                          }}
                        >
                          {state.compare.includes(selectedTopic.id)
                            ? "Remove from comparison"
                            : "Compare"}
                        </button>
                      </div>
                      {selectedTopic.kind === "species" && <PlantImages key={selectedTopic.id} topic={selectedTopic}/>}
                      {topicNames(selectedTopic).length > 0 ? (
                        <div className="species-name-details">
                          <dl>
                            {topicNames(selectedTopic).map((name) => (
                              <React.Fragment key={name.label}>
                                <dt>{name.label === "ES" ? "Spanish" : name.label === "EN" ? "English" : "Scientific name"}</dt>
                                <dd lang={name.language}>{name.label === "Sci" ? <em>{name.value}</em> : name.value}</dd>
                              </React.Fragment>
                            ))}
                          </dl>
                          <small>Database ID: {selectedTopic.id}</small>
                          {selectedTopic.kind === "species" && selectedTopic.name_note && <p>{selectedTopic.name_note}</p>}
                          {!!selectedTopic.name_references?.length && (
                            <details>
                              <summary>Naming references</summary>
                              {selectedTopic.name_references.map((ref) => (
                                <p key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a>{ref.note && <small> · {ref.note}</small>}</p>
                              ))}
                            </details>
                          )}
                        </div>
                      ) : selectedTopic.kind!=="habitat" && selectedTopic.scientific_name && <p><em>{selectedTopic.scientific_name}</em></p>}
                      {selectedTopic.plant_profile && <details className="plant-profile"><summary>Illustration notes</summary><p>{selectedTopic.plant_profile.identifying_features}</p><p>{selectedTopic.plant_profile.growth_form}</p><small>{selectedTopic.plant_profile.basis}</small></details>}
                      {(selectedTopic.aliases?.length || 0) > 0 && (
                        <p>
                          Also searchable: {selectedTopic.aliases?.join(" · ")}
                        </p>
                      )}
                      <Refs catalog={catalog}
                        refs={selectedTopic.source_refs || []}
                        open={setSource}
                      />
                      {catalog.browse_groups
                        .filter((g) => g.anchor_topic_id === selectedTopic.id)
                        .map((g) => (
                          <article key={g.id}>
                            <h3>{g.label}</h3>
                            <p>
                              {g.members.length} organized members. Membership
                              is not a factual connection.
                            </p>
                            <div className="actions">
                              <button
                                onClick={() =>
                                  dispatch({ type: "group", id: g.id })
                                }
                              >
                                Members
                              </button>
                              <button
                                onClick={() =>
                                  dispatch({
                                    type: "explore",
                                    id: selectedTopic.id,
                                  })
                                }
                              >
                                Connections
                              </button>
                            </div>
                          </article>
                        ))}
                      {findings.length>0 && <details className="source-guidance"><summary>Source findings and guidance · {findings.length}</summary>{findings.map(f=><article key={f.id}><small>{f.kind==='recommendation'?'Source guidance':'Source finding'}</small><h3>{f.label}</h3><p>{f.text}</p>{f.conditions?.map((condition:string,i:number)=><p key={i}>Condition: {condition}</p>)}<Refs catalog={catalog} refs={f.source_refs || []} open={setSource}/></article>)}</details>}
                      <h3>Recorded connections</h3>
                      {catalog.relationships
                        .filter((e) =>
                          [e.source, e.target].includes(selectedTopic.id),
                        )
                        .map((e) => (
                          <article key={e.id}>
                            <button onClick={() => select(e)}>{e.label}</button>
                            <div>
                              {topicButton(
                                e.source === selectedTopic.id
                                  ? e.target
                                  : e.source,
                              )}
                            </div>
                          </article>
                        ))}
                      {catalog.unresolved
                        .filter((u) => u.topic_ids?.includes(selectedTopic.id))
                        .map((u) => (
                          <p className="notice" key={u.id}>
                            {u.text}
                          </p>
                        ))}
                    </>
                  )}
                  {selectedEditor && !selectedEditor.sourceId && (
                    <button onClick={()=>openEditor(selectedEditor)}>Edit {selectedEditor.kind}</button>
                  )}
                  {selected?.displayGroup && (
                    <button
                      className="primary"
                      onClick={() => openGroup(selected)}
                    >
                      Open group
                    </button>
                  )}
                  {selectedRoute && (
                    <>
                      <p>{selectedRoute.why}</p>
                      <div className="actions">
                        <button
                          onClick={() =>
                            dispatch({
                              type: "toggleRoute",
                              id: selectedRoute.id,
                            })
                          }
                        >
                          {state.expandedRoutes.includes(selectedRoute.id)
                            ? "Hide steps"
                            : "Show steps"}
                        </button>
                        <button onClick={alternatives}>
                          Alternative routes
                        </button>
                      </div>
                      <ol>
                        {selectedRoute.nodes.map((id, i) => (
                          <li key={id}>
                            {topicButton(id)}
                            {i < selectedRoute.edges.length &&
                              (() => {
                                const e = catalog.relationships.find(
                                  (e) => e.id === selectedRoute.edges[i],
                                );
                                return (
                                  e && (
                                    <>
                                      <p>
                                        {e.source === id ? "→" : "←"} {e.label}
                                      </p>
                                      <p>{e.explanation}</p>
                                      <Refs catalog={catalog}
                                        refs={e.source_refs || []}
                                        open={setSource}
                                      />
                                    </>
                                  )
                                );
                              })()}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                  {selectedEdge && (
                    <>
                      <p>
                        {selectedEdge.basis === "curated"
                          ? "Curated discovery association"
                          : "Recorded source relationship"}
                      </p>
                      {topicButton(selectedEdge.source)} →{" "}
                      {topicButton(selectedEdge.target)}
                      <Refs catalog={catalog}
                        refs={selectedEdge.source_refs || []}
                        open={setSource}
                      />
                    </>
                  )}
                  {selected?.constituent_ids?.map((id: string) => {
                    const e = catalog.relationships.find((e) => e.id === id);
                    return (
                      e && (
                        <article key={id}>
                          <button onClick={() => select(e)}>{e.label}</button>
                          <p>
                            {
                              catalog.topics.find((t) => t.id === e.source)
                                ?.label
                            }{" "}
                            →{" "}
                            {
                              catalog.topics.find((t) => t.id === e.target)
                                ?.label
                            }
                          </p>
                          <p>{e.explanation}</p>
                          <Refs catalog={catalog} refs={e.source_refs || []} open={setSource} />
                        </article>
                      )
                    );
                  })}
                  {state.search && (
                    <>
                      <h3>Search matches · {view?.matches.length}</h3>
                      {view?.matches.map((t) => topicButton(t.id))}
                      <h3>Matching source passages</h3>
                      {view?.passages.map((p) => {
                        const [id, page] = p.id.split(":");
                        return (
                          <article key={p.id}>
                            <Refs catalog={catalog} open={setSource} refs={[{source_id:id, page:Number(page), label:`Search match: ${p.excerpt}`}]} />
                            <p>{p.excerpt}</p>
                          </article>
                        );
                      })}
                    </>
                  )}
                </>
              )}
              {tab === "evidence" && (
                <>
                  <h2>Evidence</h2>
                  <p>
                    {selected
                      ? "For the selected topic or connection."
                      : "For the current foreground graph."}
                  </p>
                  {findings.length === 0 && (
                    <p>No findings recorded for this selection.</p>
                  )}
                  {findings.map((f) => (
                    <article key={f.id}>
                      <small>
                        {f.kind === "recommendation"
                          ? "Source guidance"
                          : "Source finding"}
                      </small>
                      <h3>{f.label}</h3>
                      <p>{f.text}</p>
                      {f.conditions?.map((c: any, i: number) => (
                        <p key={i}>
                          Condition:{" "}
                          {typeof c === "string" ? c : JSON.stringify(c)}
                        </p>
                      ))}
                      <Refs catalog={catalog} refs={f.source_refs || []} open={setSource} />
                    </article>
                  ))}
                  {catalog.sources
                    .filter((s) => relatedSources.has(s.id))
                    .map((s) => (
                      <article key={s.id}>
                        <h3>{s.id}</h3>
                        <p>{s.filename}</p>
                        <button
                          onClick={() =>
                            setSource({
                              source_id: s.id,
                              page: (s.kind === undefined || s.kind === "pdf") ? s.initial_pdf_page_ranges[0][0] : undefined,
                            })
                          }
                        >
                          Open document · {s.title || s.filename} · Browse source
                        </button>
                      </article>
                    ))}
                </>
              )}
              {tab === "dates" && (
                <>
                  <h2>Recorded dates</h2>
                  <p>
                    Topic and event dates retain their meaning. Source dates
                    describe their document.
                  </p>
                  {catalog.topics
                    .filter((t) => scopeSet.has(t.id))
                    .map((t) => (
                      <article key={t.id}>
                        <strong>{t.label}</strong>
                        {t.dates?.length ? (
                          t.dates.map((d: any, i: number) => (
                            <p key={i}>
                              {d.meaning}: {d.value}
                            </p>
                          ))
                        ) : (
                          <p>Date not recorded</p>
                        )}
                      </article>
                    ))}
                  <h3>Source dates</h3>
                  {catalog.sources
                    .filter((s) => relatedSources.has(s.id))
                    .map((s) => (
                      <article key={s.id}>
                        <strong>{s.id}</strong>
                        {s.dates?.length ? (
                          s.dates.map((d: any, i: number) => (
                            <p key={i}>
                              {d.meaning}: {d.value}
                            </p>
                          ))
                        ) : (
                          <p>Publication date unknown</p>
                        )}
                      </article>
                    ))}
                </>
              )}
              {tab === "comparison" && (
                <>
                  <h2>Compare topics</h2>
                  <p>Select a topic and choose Compare. Up to four topics.</p>
                  {state.compare.map((id) => (
                    <div className="actions" key={id}>
                      {topicButton(id)}
                      <button
                        aria-label={"Remove " + id + " from comparison"}
                        onClick={() => dispatch({ type: "compare", id })}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {comparison && (
                    <>
                      <p>{comparison.notice}</p>
                      {comparison.topics.length > 0 && (
                        <div className="comparison-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Aspect</th>
                                {comparison.topics.map((t: any) => (
                                  <th key={t.id}>{t.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {comparison.aspects.map((a: string) => (
                                <tr key={a}>
                                  <th>{a.replaceAll("_", " ")}</th>
                                  {comparison.topics.map((t: any) => (
                                    <td key={t.id}>
                                      {a in (t.aspects || {})
                                        ? typeof t.aspects[a] === "object"
                                          ? JSON.stringify(t.aspects[a])
                                          : String(t.aspects[a])
                                        : "Not recorded"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              <tr>
                                <th>Context and sources</th>
                                {comparison.topics.map((t: any) => (
                                  <td key={t.id}>
                                    <p>{t.description}</p>
                                    <Refs catalog={catalog}
                                      refs={t.source_refs || []}
                                      open={setSource}
                                    />
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              </div>
            </aside>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
      {source && (
        <SourcePanel key={source.source_id+":"+source.page} source={source} catalog={catalog} close={() => setSource(null)}/>

      )}
      {research && (
        <ResearchPanel
          context={getContext()}
          catalog={catalog}
          close={() => setResearch(false)}
          complete={(task) => {
            setTasks((t) => [task, ...t.filter((x) => x.id !== task.id)]);
            setResearch(false);
            message(
              "Research task saved. Paste its prompt into Codex Desktop.",
            );
          }}
        />
      )}
      <PlanningPanel open={planning} catalog={catalog} target={planningTarget} close={()=>setPlanning(false)} openSource={ref=>{setPlanning(false);setSource(ref);}} navigate={id=>{setPlanning(false);dispatch({type:'group',id});}} changed={async c=>{setCatalog(c);const h=snapshot();await perform(h.entries[h.index],c,h,'replace',h.index,true);}} researchContext={getContext} taskCreated={task=>setTasks(tasks=>[task,...tasks.filter(t=>t.id!==task.id)])}/>
      {library && (
        <div className="modal-shade">
          <section className="modal" role="dialog" aria-label="Source library">
            <button className="close" onClick={() => setLibrary(false)}>
              ×
            </button>
            <h2>Source library</h2>
            <p>
              {catalog.coverage.length} curated PDF positions. Viewing other
              pages does not import them.
            </p>
            {catalog.sources.map((s) => (
              <article key={s.id}>
                <h3>{s.id}</h3>
                <p>{s.filename}</p>
                <button
                  onClick={() =>
                    setSource({
                      source_id: s.id,
                      page: (s.kind === undefined || s.kind === "pdf") ? s.initial_pdf_page_ranges[0][0] : undefined,
                    })
                  }
                >
                  Open source · {s.title || s.filename} · Browse source
                </button>
              </article>
            ))}
          </section>
        </div>
      )}
      {saved && (
        <div className="modal-shade">
          <section
            className="modal"
            role="dialog"
            aria-label="Saved explorations"
          >
            <button className="close" onClick={() => setSaved(null)}>
              ×
            </button>
            <h2>Saved explorations</h2>
            {saved.length === 0 && <p>No saved explorations yet.</p>}
            {saved.map((s) => (
              <button
                key={s.id}
                className="saved-view"
                onClick={async () => {
                  try {
                    const value = await api("/api/explorations/" + s.id);
                    reopen(value);
                    setSaved(null);
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                {s.label}
              </button>
            ))}
          </section>
        </div>
      )}
      {saving && (
        <div className="modal-shade">
          <form
            className="modal"
            role="dialog"
            aria-label="Save exploration"
            onSubmit={save}
          >
            <button
              className="close"
              type="button"
              onClick={() => setSaving(false)}
            >
              ×
            </button>
            <h2>Save exploration</h2>
            <label>
              Name
              <input
                autoFocus
                required
                maxLength={160}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </label>
            <button type="submit" disabled={!saveName.trim()}>
              Save exploration
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
