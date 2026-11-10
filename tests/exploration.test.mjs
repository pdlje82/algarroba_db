import { recordedPlaceId, placeLabel } from "../frontend/organization.ts";
import { speciesNames } from "../frontend/speciesNames.ts";
import { ROOT_GROUPS,GROUP_LABELS } from "../frontend/types.ts";
import { hoverFrameGeometry } from "../frontend/sceneMeshes.ts";
import { openingSource, highlightOpeningSources } from "../frontend/opening.ts";
import { closeLayer } from "../frontend/layerClosing.ts";
import {
  controlIsOccluded,
  projectControlOccluders,
} from "../frontend/layerControls.ts";
import * as THREE from "three";
import {
  layerPoint,
  viewAngles,
  BACKGROUND_BRIGHTNESS,
} from "../frontend/interactions.ts";
import { moveLayer } from "../frontend/exploration.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  reduceExploration,
  isInPlaceAction,
  groupOpeningAction,
  contextLabel,
  commitHistory,
  query,
  reconcile,
} from "../frontend/exploration.ts";
import {
  buildScene,
  previousScenes,
  isInteractiveRecord,
  scenePresentationKey,
} from "../frontend/scene.ts";
import {
  migrate,
  migrateHistory,
  legacyTab,
  reconcileIdentities,
  migrateExpandedGroup,
} from "../frontend/migration.ts";
import {
  saveBrowserSession,
  restoreBrowserSession,
  STATE_KEY,
} from "../frontend/explorationStorage.ts";
import { readFileSync } from "node:fs";
import { compactGrid } from "../frontend/compactLayout.ts";
import { loadExploration } from '../frontend/explorationQuery.ts';
import { relationshipCircle,boxesOverlap } from '../frontend/relationshipCircle.ts';
const topics = [
  {
    id: "carob",
    label: "Carob",
    kind: "species",
    domain: "ecosystem",
    group_id: "species",
  },
  {
    id: "restoration",
    label: "Restoration",
    kind: "method",
    domain: "ecosystem",
    group_id: "restoration-methods",
  },
  {
    id: "drones",
    label: "Drones",
    kind: "equipment",
    domain: "technology",
    group_id: "drones",
  },
  {
    id: "monitoring",
    label: "Monitoring",
    kind: "method",
    domain: "technology",
    group_id: "monitoring",
  },
];
const relationships = [
  { id: "a", source: "carob", target: "restoration", label: "used in" },
  { id: "b", source: "restoration", target: "drones", label: "monitored by" },
  {
    id: "c",
    source: "restoration",
    target: "monitoring",
    label: "followed by",
  },
];
const catalog = {
  topics,
  relationships,
  browse_groups: [],
  organization_roots:ROOT_GROUPS.map(id=>({id,label:GROUP_LABELS[id.split(':')[1]],domain:id.split(':')[0]})),
  communities:[],irrigation_evidence:[],
  findings: [],
  sources: [],
  coverage: [],
  unresolved: [],
  revision: 3,
  root_groups: [],
  topic_kinds: ["species", "method", "equipment"],
};
const r1 = {
    id: "route:drones:new",
    endpoint: "drones",
    nodes: ["carob", "restoration", "drones"],
    edges: ["a", "b"],
    why: "stored steps",
  },
  r2 = {
    id: "route:monitoring:new",
    endpoint: "monitoring",
    nodes: ["carob", "restoration", "monitoring"],
    edges: ["a", "c"],
    why: "stored steps",
  };
const view = {
  scope: "search",
  centre: "carob",
  group_id: null,
  search: "monitor",
  domain: "all",
  kinds: [],
  depth: 6,
  revision: 3,
  nodes: topics,
  edges: relationships,
  endpoint_ids: ["drones", "monitoring"],
  routes: [r1, r2],
  matches: [topics[2], topics[3]],
  passages: [],
  notices: [],
  complete: true,
  route_search: {
    complete: true,
    budget_exhausted: false,
    expansions: 4,
    depth: 6,
  },
};
const state = () => ({
  ...initialState(),
  scope: "search",
  layerRoot: false,
  centre: "carob",
  anchor: "carob",
  search: "monitor",
  view,
});
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v),
};
const mirror = new Map();
globalThis.indexedDB = {
  open() {
    const req = {};
    queueMicrotask(() => {
      req.result = {
        objectStoreNames: { contains: () => true },
        transaction() {
          const tx = {
            objectStore() {
              return {
                put(value, key) {
                  mirror.set(key, structuredClone(value));
                  queueMicrotask(() => tx.oncomplete?.());
                },
                get(key) {
                  const r = {};
                  queueMicrotask(() => {
                    r.result = structuredClone(mirror.get(key));
                    r.onsuccess?.();
                  });
                  return r;
                },
              };
            },
          };
          return tx;
        },
      };
      req.onsuccess?.();
    });
    return req;
  },
};
test("Explore sets the centre once and opens direct neighbours without a search", () => {
  const s = initialState(),
    n = reduceExploration(s, { type: "explore", id: "carob" });
  assert.equal(n.scope, "neighbors");
  assert.equal(n.centre, "carob");
  assert.equal(s.centre, null);
  assert.equal(
    reduceExploration(state(), { type: "explore", id: "drones" }).scope,
    "search",
  );
});
test("clear centre removes its card while retaining query results and origin", () => {
  const s = state(),
    n = reduceExploration(s, { type: "clearCentre" });
  assert.equal(n.centre, null);
  assert.equal(n.anchor, "carob");
  assert.deepEqual(n.view, s.view);
  assert.ok(
    !buildScene(n, n.view, catalog).cards.some((c) =>
      c.members.includes("carob"),
    ),
  );
  assert.deepEqual(n.positions, {});
  assert.ok(isInPlaceAction({ type: "clearCentre" }));
  assert.equal(reconcile(n, view).centre, null);
  assert.match(query(n), /centre=carob/);
  assert.equal(
    reduceExploration(n, { type: "search", text: "" }).scope,
    "overview",
  );
});
test("clearing search restores direct neighbourhood and filters preserve the question", () => {
  assert.equal(
    reduceExploration(state(), { type: "search", text: "" }).scope,
    "neighbors",
  );
  const f = reduceExploration(state(), {
    type: "filters",
    kinds: ["condition"],
  });
  assert.equal(f.search, "monitor");
  assert.equal(f.centre, "carob");
  assert.equal(f.view, undefined);
});
test("route expansion shares intermediates and every constituent factual ID once", () => {
  let s = state(),
    before = buildScene(s, view, catalog);
  assert.deepEqual(
    new Set(before.cards.map((c) => c.id)),
    new Set(["carob", "drones", "monitoring"]),
  );
  s = reduceExploration(s, {
    type: "allRoutes",
    routes: view.routes,
    show: true,
  });
  const expanded = buildScene(s, view, catalog);
  assert.equal(expanded.cards.filter((c) => c.id === "restoration").length, 1);
  assert.deepEqual(
    new Set(expanded.links.flatMap((l) => l.relationshipIds)),
    new Set(["a", "b", "c"]),
  );
  s = reduceExploration(s, {
    type: "allRoutes",
    routes: view.routes,
    show: false,
  });
  assert.equal(buildScene(s, view, catalog).signature, before.signature);
});
test("individual and all-route toggles share one expansion set", () => {
  let s = reduceExploration(state(), { type: "toggleRoute", id: r1.id });
  assert.deepEqual(s.expandedRoutes, [r1.id]);
  s = reduceExploration(s, {
    type: "allRoutes",
    routes: view.routes,
    show: true,
  });
  assert.deepEqual(
    reduceExploration(s, { type: "toggleRoute", id: r1.id }).expandedRoutes,
    [r2.id],
  );
});
test("route expansion and hiding repack every card into a complete tight grid", () => {
  let s = state(),
    first = buildScene(s, view, catalog);
  s.positions = first.positions;
  s = reduceExploration(s, {
    type: "allRoutes",
    routes: view.routes,
    show: true,
  });
  const next = buildScene(s, view, catalog);
  assert.deepEqual(next.cards.map((c) => c.position), compactGrid(next.cards.length, 1.6, 234, 124).points);
  s.positions = next.positions;
  const hidden = buildScene(reduceExploration(s, { type: "allRoutes", routes: view.routes, show: false }), view, catalog);
  assert.deepEqual(hidden.cards.map((c) => c.position), first.cards.map((c) => c.position));
  for (const a of next.cards)
    for (const b of next.cards)
      if (a.id !== b.id)
        assert.ok(
          Math.abs(a.position.x - b.position.x) >= 258 ||
            Math.abs(a.position.y - b.position.y) >= 148,
        );
});
test("grouping summarizes facts without creating relationships or duplicate topics", () => {
  const s = { ...state(), scope: "group", grouping: "type" },
    v = {
      ...view,
      scope: "group",
      endpoint_ids: topics.map((t) => t.id),
      routes: [],
    },
    scene = buildScene(s, v, catalog);
  assert.equal(new Set(scene.cards.flatMap((c) => c.members)).size, 4);
  assert.deepEqual(
    [
      ...scene.links.flatMap((l) => l.relationshipIds),
      ...scene.internal.flatMap((i) => i.ids),
    ].sort(),
    ["a", "b", "c"],
  );
  const group = scene.cards.find((c) => c.record.kind === "group");
  const action = groupOpeningAction(s, group.record, group.members);
  const opened = reduceExploration(s, action);
  const membersView = {
    ...v,
    scope: "group",
    centre: null,
    endpoint_ids: group.members,
    nodes: v.nodes.filter((t) => group.members.includes(t.id)),
    routes: [],
  };
  const focused = buildScene(
    reconcile(opened, membersView),
    membersView,
    catalog,
  );
  assert.deepEqual(
    new Set(focused.cards.flatMap((c) => c.members)),
    new Set(group.members),
  );
  assert.ok(focused.cards.every((c) => c.record.kind !== "group"));
});
test("history cuts forward branches and retains at most 100 complete states", () => {
  let h = { entries: [state()], index: 0 };
  for (let i = 0; i < 120; i++)
    h = commitHistory(h, { ...state(), search: String(i) });
  assert.equal(h.entries.length, 100);
  h.index = 3;
  h = commitHistory(h, { ...state(), search: "new" });
  assert.equal(h.entries.length, 5);
  assert.equal(h.entries[4].search, "new");
});
test("only two distinct prior graph snapshots are derived from history", () => {
  const s = state(),
    expanded = { ...s, expandedRoutes: [r1.id] },
    all = { ...s, expandedRoutes: [r1.id, r2.id] },
    previous = previousScenes(
      [s, { ...s, compare: ["carob"] }, expanded, all],
      3,
      catalog,
      1.6,
    );
  assert.equal(previous.length, 2);
  assert.equal(previous[0].cards.length, 4);
  assert.equal(previous[1].cards.length, 3);
});
test("legacy pooled v3/v4/v5 and v1 list histories map into the canonical state", () => {
  for (const format of [3, 4, 5]) {
    const h = migrateHistory(
      {
        format,
        index: 0,
        entries: [
          {
            perspective: "places",
            centre: "carob",
            overview: false,
            positionsRef: 0,
          },
        ],
        pool: [{ carob: { x: 21, y: 39 } }],
      },
      null,
    );
    assert.equal(h.entries[0].version, 6);
    assert.equal(h.entries[0].grouping, "place");
    assert.deepEqual(h.entries[0].positions.carob, { x: 21, y: 39 });
  }
  assert.equal(
    migrate({ layoutVersion: 1, centre: "carob", perspective: "technology" })
      .domain,
    "technology",
  );
  assert.deepEqual(migrate({ perspective: "conditions" }).kinds, [
    "condition",
    "equipment",
  ]);
  assert.equal(legacyTab({ perspective: "sources" }), "evidence");
  assert.equal(legacyTab({ perspective: "time" }), "dates");
  assert.equal(legacyTab({ perspective: "comparison" }), "comparison");
});
test("legacy active group and positions migrate without changing their original payload", () => {
  const raw = {
      centre: "carob",
      perspective: "combined",
      scene: { mode: "layered" },
      layerView: {
        currentId: "g",
        layers: {
          g: {
            id: "g",
            scope: { kind: "group", key: "browse:cocoon" },
            slots: { layered: { cocoon: { x: 5, y: 9 } } },
          },
        },
      },
    },
    before = JSON.stringify(raw),
    s = migrate(raw);
  assert.equal(s.scope, "group");
  assert.equal(s.groupId, "browse:cocoon");
  assert.equal(JSON.stringify(raw), before);
});
test("IndexedDB preserves the session when localStorage is full", async () => {
  storage.clear();
  mirror.clear();
  const setter = localStorage.setItem;
  localStorage.setItem = () => {
    throw Error("quota");
  };
  try {
    await saveBrowserSession({ entries: [state()], index: 0 });
    assert.equal(
      (await restoreBrowserSession()).history.entries[0].centre,
      "carob",
    );
  } finally {
    localStorage.setItem = setter;
  }
});
test("restoring and saving legacy browser state leaves the old keys unchanged", async () => {
  storage.clear();
  mirror.clear();
  const raw = { centre: "carob", perspective: "time", overview: false };
  storage.set("kgb:exploration:v5", JSON.stringify(raw));
  const s = await restoreBrowserSession();
  assert.equal(s.tab, "dates");
  assert.equal(s.history.entries[0].centre, "carob");
  await saveBrowserSession(s.history);
  assert.equal(storage.get("kgb:exploration:v5"), JSON.stringify(raw));
  assert.ok(storage.has(STATE_KEY));
});
test("obsolete modes, endpoints, and dependencies are absent from current source", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url)),
  );
  for (const name of ["cytoscape", "cytoscape-fcose", "react-rnd"])
    assert.ok(!pkg.dependencies[name]);
  const main = readFileSync(
    new URL("../frontend/main.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(!main.includes("/api/view"));
  for (const label of [
    "Show centre view",
    "Show results",
    "Expand all",
    "Full routes",
    "Background effects",
    "Flat view",
  ])
    assert.ok(!main.includes(label));
  const renderer = readFileSync(
    new URL("../frontend/SceneView.tsx", import.meta.url),
    "utf8",
  );
  assert.match(renderer, /if\s*\(\s*!historical\s*\)/);
  assert.ok(!renderer.includes("onBroaden"));
});

test("redirected saved IDs are translated and missing comparison topics are excluded", () => {
  const s = {
      ...state(),
      centre: "old-carob",
      anchor: "old-carob",
      compare: ["old-carob", "missing"],
      positions: { "old-carob": { x: 2, y: 3 } },
    },
    c = { ...catalog, identity_redirects: { "old-carob": "carob" } },
    n = reconcileIdentities(s, c);
  assert.equal(n.centre, "carob");
  assert.equal(n.anchor, "carob");
  assert.deepEqual(n.compare, ["carob"]);
  assert.deepEqual(n.positions.carob, { x: 2, y: 3 });
  assert.equal(s.centre, "old-carob");
});

test("layer offsets move presentation without changing facts, local positions or signature", () => {
  const s = state(),
    before = buildScene(s, view, catalog),
    moved = moveLayer(s, before.key, { x: 240, y: -110 }),
    after = buildScene(moved, view, catalog);
  assert.deepEqual(after.offset, { x: 240, y: -110 });
  assert.equal(after.key, before.key);
  assert.equal(after.signature, before.signature);
  assert.deepEqual(after.positions, before.positions);
  assert.deepEqual(after.links, before.links);
  assert.equal(s.layerOffsets, undefined);
  const h = [s, { ...s, expandedRoutes: [r1.id] }],
    previous = previousScenes(h, 1, catalog, 1.6)[0];
  h[1] = moveLayer(h[1], previous.key, { x: -130, y: 70 });
  assert.deepEqual(previousScenes(h, 1, catalog, 1.6)[0].offset, {
    x: -130,
    y: 70,
  });
  assert.equal(h.length, 2);
});
test("view rotation clamps symmetrically to sixty degrees around both axes", () => {
  assert.deepEqual(viewAngles(120, -120), { side: 60, tilt: -60 });
  assert.deepEqual(viewAngles(-90, 90), { side: -60, tilt: 60 });
  assert.deepEqual(viewAngles(-40, -35), { side: -40, tilt: -35 });
  assert.ok(BACKGROUND_BRIGHTNESS < 0.75);
});
test("ray-plane dragging maps projected points back into each layer XY without changing Z", () => {
  const bounds = { left: 10, top: 20, width: 1200, height: 750 };
  for (const [side, tilt] of [
    [0, 25],
    [60, 60],
    [-60, -60],
    [35, -40],
  ])
    for (const z of [0, -1560, -3120]) {
      const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 250000),
        sphere = new THREE.Spherical(
          5000,
          THREE.MathUtils.degToRad(90 - tilt),
          THREE.MathUtils.degToRad(side),
        );
      camera.position.setFromSpherical(sphere);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const original = new THREE.Vector3(125, -90, z),
        projected = original.clone().project(camera),
        screen = {
          x: bounds.left + ((projected.x + 1) * bounds.width) / 2,
          y: bounds.top + ((1 - projected.y) * bounds.height) / 2,
        },
        actual = layerPoint(screen, bounds, camera, z);
      assert.ok(actual.distanceTo(original) < 1e-6);
    }
});
test("layer placements survive saved-session translation and reject invalid movement", () => {
  const s = state(),
    scene = buildScene(s, view, catalog),
    moved = moveLayer(s, scene.key, { x: 19, y: 27 });
  assert.deepEqual(migrate(moved).layerOffsets, moved.layerOffsets);
  assert.equal(moveLayer(s, scene.key, { x: NaN, y: 0 }), s);
});

test("return to overview is a single-layer boundary and keeps the selected domain", () => {
  const s = { ...state(), domain: "technology", layerRoot: false },
    overview = reduceExploration(s, { type: "overview" }),
    v = {
      ...view,
      scope: "overview",
      domain: "technology",
      endpoint_ids: ["drones", "monitoring"],
      routes: [],
    };
  overview.view = v;
  assert.equal(overview.domain, "technology");
  assert.equal(overview.layerRoot, true);
  assert.deepEqual(previousScenes([s, overview], 1, catalog, 1.6), []);
  const scene = buildScene(overview, v, catalog);
  assert.ok(scene.cards.every((c) => c.record.domain === "technology"));
  assert.ok(!scene.cards.flatMap((c) => c.members).includes("carob"));
  const grouped = reduceExploration(overview, {
    type: "group",
    id: "technology:drones",
  });
  grouped.view = { ...v, scope: "group" };
  assert.equal(grouped.layerRoot, false);
  assert.equal(previousScenes([overview, grouped], 1, catalog, 1.6).length, 1);
  const next = reduceExploration(grouped, { type: "explore", id: "drones" });
  next.view = {
    ...v,
    scope: "neighbors",
    centre: "drones",
    endpoint_ids: ["restoration"],
  };
  assert.equal(next.layerRoot, false);
  assert.equal(
    previousScenes([overview, grouped, next], 2, catalog, 1.6).length,
    2,
  );
});
test("grouping and domain updates replace the current layer; group opening creates an exploration", () => {
  const s = {
    ...state(),
    camera: {
      position: { x: 0, y: 300, z: 900 },
      target: { x: 0, y: 0, z: 0 },
    },
  };
  const grouping = { type: "grouping", value: "type" };
  assert.ok(isInPlaceAction(grouping));
  assert.deepEqual(reduceExploration(s, grouping).camera, s.camera);
  for (const a of [
    { type: "group", id: "technology:drones" },
    {
      type: "openMembers",
      id: "display-group:type:method",
      sourceId: "display-group:method",
      members: ["restoration", "monitoring"],
    },
  ]) {
    assert.ok(!isInPlaceAction(a));
    assert.equal(reduceExploration(s, a).camera, undefined);
    assert.equal(reduceExploration(s, a).layerRoot, false);
  }
});

test("opening a group after overview only retains that overview, never earlier closed layers", () => {
  const old = state(),
    overview = reduceExploration(old, { type: "overview" }),
    filtered = reduceExploration(
      reduceExploration(overview, {
        type: "previewDomain",
        domain: "technology",
      }),
      { type: "updateDomain" },
    );
  filtered.view = {
    ...view,
    scope: "overview",
    domain: "technology",
    routes: [],
    endpoint_ids: ["drones", "monitoring"],
  };
  const members = reduceExploration(filtered, {
    type: "group",
    id: "technology:drones",
  });
  members.view = {
    ...view,
    scope: "group",
    domain: "technology",
    routes: [],
    endpoint_ids: ["drones"],
  };
  assert.equal(members.layerRoot, false);
  const previous = previousScenes([old, filtered, members], 2, catalog, 1.6);
  assert.equal(previous.length, 1);
  assert.equal(
    previous[0].key,
    buildScene(filtered, filtered.view, catalog).key,
  );
});

test("closing a background removes only that snapshot, without backfilling older views", () => {
  const a = {
      ...initialState(),
      view: {
        ...view,
        scope: "overview",
        centre: null,
        endpoint_ids: topics.map((t) => t.id),
        routes: [],
      },
    },
    b = state(),
    c = { ...state(), expandedRoutes: [r1.id] },
    d = { ...state(), expandedRoutes: [r1.id, r2.id] },
    h = { entries: [a, b, c, d], index: 3 };
  const before = previousScenes(h.entries, h.index, catalog, 1.6);
  assert.equal(before.length, 2);
  const closed = closeLayer(h, before[0].key, catalog, 1.6);
  assert.equal(closed.kind, "background");
  assert.equal(closed.state.view, d.view);
  assert.deepEqual(closed.state.positions, d.positions);
  const entries = [...h.entries];
  entries[3] = closed.state;
  const after = previousScenes(entries, 3, catalog, 1.6);
  assert.deepEqual(
    after.map((s) => s.key),
    [before[1].key],
  );
  assert.equal(h.entries[3].closedLayers, undefined);
});
test("closing the foreground restores its nearest visible predecessor and keeps original history", () => {
  const a = state(),
    b = { ...state(), expandedRoutes: [r1.id] },
    h = { entries: [a, b], index: 1 },
    key = buildScene(b, view, catalog).key,
    closed = closeLayer(h, key, catalog, 1.6);
  assert.equal(closed.kind, "foreground");
  assert.deepEqual(closed.state.expandedRoutes, []);
  assert.ok(closed.state.closedLayers.includes(key));
  const committed = commitHistory(h, closed.state);
  assert.equal(committed.entries.length, 3);
  assert.deepEqual(committed.entries[1], b);
  assert.ok(
    !previousScenes(committed.entries, 2, catalog, 1.6).some(
      (s) => s.key === key,
    ),
  );
  assert.deepEqual(
    migrate(closed.state).closedLayers,
    closed.state.closedLayers,
  );
});
test("closing a lone topic layer returns to its domain overview while the base overview stays open", () => {
  const s = {
      ...state(),
      scope: "neighbors",
      domain: "technology",
      layerRoot: true,
    },
    h = { entries: [s], index: 0 },
    key = buildScene(s, view, catalog).key,
    closed = closeLayer(h, key, catalog, 1.6);
  assert.equal(closed.state.scope, "overview");
  assert.equal(closed.state.domain, "technology");
  assert.equal(closed.state.layerRoot, true);
  const overview = { ...closed.state, view: { ...view, scope: "overview" } },
    root = { entries: [overview], index: 0 };
  assert.equal(
    closeLayer(
      root,
      buildScene(overview, overview.view, catalog).key,
      catalog,
      1.6,
    ),
    null,
  );
  assert.equal(closeLayer(h, "nonexistent-layer", catalog, 1.6), null);
});

test("foreground restoration never duplicates the active graph as a background layer", () => {
  const a = state(),
    b = { ...state(), expandedRoutes: [r1.id] },
    h = { entries: [a, b, a], index: 2 };
  const active = buildScene(a, view, catalog);
  assert.ok(
    previousScenes(h.entries, h.index, catalog, 1.6).every(
      (scene) => scene.key !== active.key,
    ),
  );
  const closed = closeLayer(
      { entries: [a, b], index: 1 },
      buildScene(b, view, catalog).key,
      catalog,
      1.6,
    ),
    restored = commitHistory({ entries: [a, b], index: 1 }, closed.state);
  assert.ok(
    previousScenes(restored.entries, restored.index, catalog, 1.6).every(
      (scene) => scene.key !== active.key,
    ),
  );
});

test("opening a group records its exact visible source and highlights only that background card", () => {
  const s = {
      ...initialState(),
      view: {
        ...view,
        scope: "overview",
        centre: null,
        endpoint_ids: topics.map((t) => t.id),
        routes: [],
      },
    },
    parent = buildScene(s, s.view, catalog);
  const action = { type: "group", id: "ecosystem:species" },
    ref = openingSource(action, parent, catalog);
  assert.deepEqual(ref, {
    layerKey: parent.key,
    cardId: "display-group:ecosystem:species",
  });
  const child = {
      ...reduceExploration(s, action),
      openedFrom: ref,
      view: {
        ...view,
        scope: "group",
        centre: null,
        endpoint_ids: ["carob"],
        routes: [],
      },
    },
    background = previousScenes([s, child], 1, catalog, 1.6);
  assert.deepEqual(background[0].openedCardIds, [
    "display-group:ecosystem:species",
  ]);
  assert.equal(background[0].signature, parent.signature);
  assert.deepEqual(background[0].links, parent.links);
  assert.equal(
    openingSource({ type: "grouping", value: "type" }, parent, catalog),
    undefined,
  );
});
test("each visible child highlights its own parent source and a closed child removes that highlight", () => {
  const a = buildScene(state(), view, catalog),
    b = {
      ...a,
      key: "parent-b",
      openingCandidates: [],
      openedFrom: { layerKey: a.key, cardId: "carob" },
    },
    c = {
      ...a,
      key: "front-c",
      openedFrom: { layerKey: b.key, cardId: "drones" },
    };
  let layers = highlightOpeningSources(c, [b, a]);
  assert.deepEqual(layers[0].openedCardIds, ["drones"]);
  assert.deepEqual(layers[1].openedCardIds, ["carob"]);
  layers = highlightOpeningSources(b, [a]);
  assert.deepEqual(layers[0].openedCardIds, ["carob"]);
  assert.ok(!layers[0].openedCardIds.includes("drones"));
  assert.deepEqual(
    highlightOpeningSources(
      { ...c, openedFrom: { layerKey: "closed-parent", cardId: "carob" } },
      [a],
    )[0].openedCardIds,
    [],
  );
});
test("legacy explorations infer source nodes while new opening references survive session migration", () => {
  const s = {
      ...initialState(),
      view: {
        ...view,
        scope: "overview",
        centre: null,
        endpoint_ids: topics.map((t) => t.id),
        routes: [],
      },
    },
    child = {
      ...state(),
      scope: "neighbors",
      view: { ...view, scope: "neighbors", endpoint_ids: ["restoration"] },
    };
  const layers = previousScenes([s, child], 1, catalog, 1.6);
  assert.deepEqual(layers[0].openedCardIds, [
    "display-group:ecosystem:species",
  ]);
  const ref = {
    layerKey: layers[0].key,
    cardId: "display-group:ecosystem:species",
  };
  assert.deepEqual(migrate({ ...child, openedFrom: ref }).openedFrom, ref);
  assert.equal(
    reduceExploration({ ...child, openedFrom: ref }, { type: "overview" })
      .openedFrom,
    undefined,
  );
});

test("layer close controls hide for nearer opaque surfaces including edge overlaps", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const parent = new THREE.Group();
  parent.userData.layerKey = "front";
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 100),
    new THREE.MeshBasicMaterial(),
  );
  parent.add(card);
  parent.updateMatrixWorld(true);
  const occluders = projectControlOccluders([card], camera, {
    width: 800,
    height: 800,
  });
  const hidden = (x, y, z = -1000, key = "back") =>
    controlIsOccluded({ x, y }, { x: 14, y: 14 }, z, key, occluders);
  assert.ok(hidden(400, 400));
  assert.ok(
    hidden(497, 400),
    "edge of button overlaps even when its centre does not",
  );
  assert.ok(!hidden(520, 400), "uncovered button remains available");
  assert.ok(!hidden(400, 400, 0, "front"), "own layer cannot hide its control");
  assert.ok(
    !hidden(400, 400, 100),
    "farther geometry cannot hide a nearer control",
  );
  parent.position.set(600, 0, 0);
  parent.updateMatrixWorld(true);
  assert.ok(
    !controlIsOccluded(
      { x: 400, y: 400 },
      { x: 14, y: 14 },
      -1000,
      "back",
      projectControlOccluders([card], camera, { width: 800, height: 800 }),
    ),
  );
  card.geometry.dispose();
  card.material.dispose();
});

test("layer control occlusion follows turning, camera clipping and both previous planes", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
  const parent = new THREE.Group();
  parent.userData.layerKey = "middle";
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 200),
    new THREE.MeshBasicMaterial(),
  );
  parent.add(card);
  parent.updateMatrixWorld(true);
  for (const side of [-60, 0, 60])
    for (const tilt of [-60, 0, 60]) {
      camera.position.setFromSpherical(
        new THREE.Spherical(
          3000,
          THREE.MathUtils.degToRad(90 - tilt),
          THREE.MathUtils.degToRad(side),
        ),
      );
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const surfaces = projectControlOccluders([card], camera, {
        width: 800,
        height: 800,
      });
      assert.ok(
        controlIsOccluded(
          { x: 400, y: 400 },
          { x: 14, y: 14 },
          -3120,
          "oldest",
          surfaces,
        ),
      );
    }
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  parent.position.z = 2000;
  parent.updateMatrixWorld(true);
  assert.equal(
    projectControlOccluders([card], camera, { width: 800, height: 800 }).length,
    0,
    "behind-camera surfaces are clipped",
  );
  parent.position.z = 999;
  parent.rotation.y = Math.PI / 3;
  parent.updateMatrixWorld(true);
  for (const surface of projectControlOccluders([card], camera, {
    width: 800,
    height: 800,
  }))
    assert.ok(
      surface.polygon.every(
        (p) =>
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          p.x >= -0.001 &&
          p.x <= 800.001 &&
          p.y >= -0.001 &&
          p.y <= 800.001,
      ),
    );
  card.geometry.dispose();
  card.material.dispose();
});

test("domain preview dims without changing graph identity, facts, query, positions or ancestry", () => {
  const s = {
    ...state(),
    expandedRoutes: [r1.id, r2.id],
    openedFrom: { layerKey: "origin", cardId: "carob" },
    camera: {
      position: { x: 0, y: 300, z: 900 },
      target: { x: 0, y: 0, z: 0 },
    },
  };
  const before = buildScene(s, view, catalog);
  s.positions = before.positions;
  s.layerOffsets = { [before.key]: { x: 150, y: -80 } };
  const staged = reduceExploration(s, {
    type: "previewDomain",
    domain: "ecosystem",
  });
  const scene = buildScene(staged, staged.view, catalog);
  assert.equal(staged.domain, "all");
  assert.equal(staged.pendingDomain, "ecosystem");
  assert.equal(
    new URL(query(staged), "http://local").searchParams.get("domain"),
    "all",
  );
  assert.equal(scene.signature, before.signature);
  assert.deepEqual(scene.positions, before.positions);
  assert.deepEqual(scene.offset, { x: 150, y: -80 });
  assert.deepEqual(staged.openedFrom, s.openedFrom);
  assert.deepEqual(staged.camera, s.camera);
  assert.deepEqual(
    scene.cards
      .filter((c) => c.outOfDomain)
      .map((c) => c.id)
      .sort(),
    ["drones", "monitoring"],
  );
  assert.deepEqual(scene.links, before.links);
  const cancelled = reduceExploration(staged, {
    type: "previewDomain",
    domain: "all",
  });
  assert.equal(cancelled.pendingDomain, undefined);
  assert.ok(
    buildScene(cancelled, cancelled.view, catalog).cards.every(
      (c) => !c.outOfDomain,
    ),
  );
  assert.equal(
    s.pendingDomain,
    undefined,
    "original committed state remains untouched",
  );
});

test("domain preview keeps necessary route context and handles mixed-domain group cards", () => {
  const s = { ...state(), expandedRoutes: [r1.id] };
  const staged = reduceExploration(s, {
    type: "previewDomain",
    domain: "technology",
  });
  const scene = buildScene(staged, view, catalog);
  for (const id of ["carob", "restoration"]) {
    const card = scene.cards.find((c) => c.id === id);
    assert.ok(!card.outOfDomain);
    assert.ok(card.record.context);
  }
  const grouped = {
    ...staged,
    scope: "group",
    grouping: "type",
    centre: null,
    anchor: null,
    view: {
      ...view,
      scope: "group",
      centre: null,
      endpoint_ids: topics.map((t) => t.id),
      routes: [],
    },
    expandedRoutes: [],
  };
  const group = buildScene(grouped, grouped.view, catalog).cards.find(
    (c) => c.record.groupKey === "method",
  );
  assert.equal(group.members.length, 2);
  assert.equal(group.matchingDomainCount, 1);
  assert.ok(!group.outOfDomain);
  const empty = reduceExploration(grouped, {
    type: "previewDomain",
    domain: "funding",
  });
  assert.ok(
    buildScene(empty, empty.view, catalog).cards.every((c) => c.outOfDomain),
  );
});

test("Update domain re-queries and tightly repacks while preserving expansions, camera and source", () => {
  const s = {
    ...state(),
    expandedRoutes: [r1.id],
    expandedGroups: ["display-group:method"],
    alternatives: [r2],
    positions: { carob: { x: 20, y: 30 } },
    openedFrom: { layerKey: "parent", cardId: "carob" },
    camera: {
      position: { x: 0, y: 300, z: 900 },
      target: { x: 0, y: 0, z: 0 },
    },
  };
  const staged = reduceExploration(s, {
    type: "previewDomain",
    domain: "technology",
  });
  const applied = reduceExploration(staged, { type: "updateDomain" });
  assert.ok(isInPlaceAction({ type: "previewDomain", domain: "technology" }));
  assert.ok(isInPlaceAction({ type: "updateDomain" }));
  assert.equal(applied.domain, "technology");
  assert.equal(applied.pendingDomain, undefined);
  assert.equal(applied.view, undefined);
  assert.deepEqual(applied.expandedRoutes, s.expandedRoutes);
  assert.deepEqual(applied.expandedGroups, s.expandedGroups);
  assert.deepEqual(applied.positions, {});
  assert.deepEqual(applied.openedFrom, s.openedFrom);
  assert.deepEqual(applied.camera, s.camera);
  assert.deepEqual(
    applied.alternatives,
    [],
    "old out-of-domain alternatives cannot resurrect removed endpoints",
  );
  assert.equal(
    new URL(query(applied), "http://local").searchParams.get("domain"),
    "technology",
  );
  const hydrated = reconcile(applied, {
    ...view,
    domain: "technology",
    routes: [r1],
  });
  assert.deepEqual(hydrated.expandedRoutes, [r1.id]);
  const packed = buildScene(hydrated, hydrated.view, catalog);
  assert.deepEqual(
    packed.cards.map((c) => c.position),
    compactGrid(packed.cards.length, 1.6, 234, 124).points,
  );
  assert.ok(
    packed.links.every(
      (e) =>
        packed.cards.some((c) => c.id === e.source) &&
        packed.cards.some((c) => c.id === e.target),
    ),
  );
  assert.deepEqual(
    s.positions,
    { carob: { x: 20, y: 30 } },
    "accepted preview layout remains intact until Update succeeds",
  );
});

test("pending domain survives persistence, stays a preview during route reveal, and applies to new exploration", () => {
  const s = reduceExploration(state(), {
    type: "previewDomain",
    domain: "funding",
  });
  assert.equal(migrate(s).pendingDomain, "funding");
  const route = reduceExploration(s, { type: "toggleRoute", id: r1.id });
  assert.equal(route.pendingDomain, "funding");
  assert.equal(route.domain, "all");
  const overview = reduceExploration(s, { type: "overview" });
  assert.equal(overview.domain, "funding");
  assert.equal(overview.pendingDomain, undefined);
  assert.ok(overview.layerRoot);
  const explored = reduceExploration(s, { type: "explore", id: "drones" });
  assert.equal(explored.domain, "funding");
  assert.equal(explored.pendingDomain, undefined);
});

test("opening membership clears the previous centre and packs only real members", () => {
  const s = {
    ...state(),
    centre: "drones",
    anchor: "drones",
    positions: { drones: { x: 0, y: 0 }, carob: { x: 999, y: 999 } },
  };
  const opened = reduceExploration(s, {
    type: "group",
    id: "ecosystem:species",
  });
  assert.equal(opened.centre, null);
  assert.equal(opened.anchor, null);
  assert.deepEqual(opened.positions, {});
  assert.ok(!new URL(query(opened), "http://local").searchParams.has("centre"));
  const oldView = {
    ...view,
    scope: "group",
    centre: "drones",
    endpoint_ids: ["carob", "restoration"],
    routes: [],
  };
  const scene = buildScene({ ...opened, view: oldView }, oldView, catalog);
  assert.deepEqual(
    scene.cards.map((c) => c.id),
    ["carob", "restoration"],
  );
  assert.deepEqual(
    scene.cards.map((c) => c.position),
    compactGrid(2, 1.6, 234, 124).points,
  );
  const restored = reconcile(
    { ...s, scope: "group", groupId: "ecosystem:species" },
    oldView,
  );
  assert.equal(restored.centre, null);
  assert.equal(restored.anchor, null);
  assert.deepEqual(restored.positions, {});
});

test("Remove centre uses a packed grid, does not create a layer, and routes cannot reinsert the removed card", () => {
  const s = {
    ...state(),
    expandedRoutes: [r1.id, r2.id],
    camera: {
      position: { x: 0, y: 300, z: 900 },
      target: { x: 0, y: 0, z: 0 },
    },
    openedFrom: { layerKey: "parent", cardId: "carob" },
  };
  const before = buildScene(s, view, catalog);
  s.positions = before.positions;
  const n = reduceExploration(s, { type: "clearCentre" }),
    scene = buildScene(n, view, catalog);
  assert.deepEqual(
    scene.cards.map((c) => c.id),
    ["drones", "monitoring", "restoration"],
  );
  assert.deepEqual(
    scene.cards.map((c) => c.position),
    compactGrid(3, 1.6, 234, 124).points,
  );
  assert.deepEqual(n.camera, s.camera);
  assert.deepEqual(n.openedFrom, s.openedFrom);
  assert.ok(
    scene.links.every((e) => e.source !== "carob" && e.target !== "carob"),
  );
  for (const a of [
    { type: "allRoutes", routes: view.routes, show: true },
    { type: "grouping", value: "type" },
    { type: "previewDomain", domain: "technology" },
  ]) {
    const next = reduceExploration(n, a);
    assert.ok(
      buildScene(next, next.view, catalog).cards.every(
        (c) => !c.members.includes("carob"),
      ),
    );
  }
  const h = {
    entries: [
      {
        ...initialState(),
        view: {
          ...view,
          scope: "overview",
          centre: null,
          routes: [],
          endpoint_ids: topics.map((t) => t.id),
        },
      },
      s,
    ],
    index: 1,
  };
  const replacement = { ...h, entries: [h.entries[0], { ...n, view }] };
  assert.equal(
    previousScenes(replacement.entries, 1, catalog, 1.6).length,
    previousScenes(h.entries, 1, catalog, 1.6).length,
  );
  assert.ok(
    !buildScene(migrate(n), view, catalog).cards.some((c) => c.id === "carob"),
  );
  // Removing a centre which is also a matching endpoint must still remove that card.
  const selfMatch = { ...view, endpoint_ids: ["carob", "drones"] };
  assert.ok(
    !buildScene(n, selfMatch, catalog).cards.some((c) => c.id === "carob"),
  );
});

test("topic exploration places the marked centre inside a tight, clear neighbour circle", () => {
  for (const endpoint_ids of [
    ["carob"],
    ["carob", "restoration", "monitoring"],
  ]) {
    const v = {
      ...view,
      scope: "neighbors",
      centre: "drones",
      endpoint_ids,
      routes: [],
    };
    const s = {
      ...initialState(),
      scope: "neighbors",
      centre: "drones",
      anchor: "drones",
      view: v,
    };
    const scene = buildScene(s, v, catalog);
    assert.equal(scene.layout,'circle');
    assert.deepEqual(scene.positions.drones,{x:0,y:0});
    const neighbours=scene.cards.filter(c=>c.id!=='drones');
    assert.equal(neighbours.filter(c=>c.position.y<0).length,Math.floor(neighbours.length/2));
    assert.equal(neighbours.filter(c=>c.position.y>0).length,Math.ceil(neighbours.length/2));
    assert.equal(scene.cards.length, endpoint_ids.length + 1);
    assert.ok(scene.cards.find((c) => c.id === "drones").record.viewCentre);
    for (let i = 0; i < scene.cards.length; i++)
      for (let j = i + 1; j < scene.cards.length; j++) {
        const a = scene.cards[i],
          b = scene.cards[j];
        assert.ok(
          !boxesOverlap({...a.position,width:a.width,height:a.height},{...b.position,width:b.width,height:b.height}),
          "cards including the centre have full-size clearance",
        );
      }
    assert.deepEqual(
      buildScene(s, v, catalog).positions,
      scene.positions,
      "packing is deterministic",
    );
  }
});

test("domain-excluded topic/group cards and attached facts share one interaction policy", () => {
  const v = {
    ...view,
    scope: "group",
    centre: null,
    endpoint_ids: topics.map((t) => t.id),
    routes: [],
  };
  const s = { ...initialState(), scope: "group", view: v };
  const all = buildScene(s, v, catalog);
  assert.ok(all.cards.every((c) => isInteractiveRecord(all, c.id)));
  const staged = reduceExploration(s, {
      type: "previewDomain",
      domain: "technology",
    }),
    scene = buildScene(staged, v, catalog);
  assert.ok(!isInteractiveRecord(scene, "carob"));
  assert.ok(!isInteractiveRecord(scene, "restoration"));
  assert.ok(isInteractiveRecord(scene, "drones"));
  assert.ok(isInteractiveRecord(scene, "monitoring"));
  assert.ok(
    scene.links.every((e) => !isInteractiveRecord(scene, e.id)),
    "links touching excluded cards cannot bypass disabled node picking",
  );
  const grouped = buildScene({ ...staged, grouping: "type" }, v, catalog);
  const mixed = grouped.cards.find((c) => c.record.groupKey === "method");
  assert.equal(mixed.matchingDomainCount, 1);
  assert.ok(isInteractiveRecord(grouped, mixed.id));
  const outside = grouped.cards.find((c) => c.record.groupKey === "species");
  assert.ok(!isInteractiveRecord(grouped, outside.id));
  assert.ok(!isInteractiveRecord(grouped, "internal:" + outside.id));
  const cancelled = reduceExploration(staged, {
      type: "previewDomain",
      domain: "all",
    }),
    restored = buildScene(cancelled, v, catalog);
  assert.ok(restored.cards.every((c) => isInteractiveRecord(restored, c.id)));
});

test("hover frame has a real opening so depth precision cannot cover the node label", () => {
  const geometry = hoverFrameGeometry(234, 124),
    material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const frame = new THREE.Mesh(geometry, material);
  frame.updateMatrixWorld();
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 100),
    new THREE.Vector3(0, 0, -1),
  );
  assert.equal(
    ray.intersectObject(frame).length,
    0,
    "the centre of the card is never filled by the hover frame",
  );
  ray.ray.origin.set(120, 0, 100);
  assert.ok(
    ray.intersectObject(frame).length > 0,
    "the outside edge is highlighted",
  );
  geometry.dispose();
  material.dispose();
});

test("all-domain overview repairs partial/scattered slots into its complete compact grid", () => {
  const roots = ROOT_GROUPS.map((id) => ({
    id,
    label: id,
    domain: id.split(":")[0],
    group_id: id.split(":")[1],
    kind: "method",
  }));
  const c = { ...catalog, topics: roots, relationships: [], browse_groups: [] };
  const allView = {
    ...view,
    scope: "overview",
    centre: null,
    search: "",
    domain: "all",
    routes: [],
    edges: [],
    nodes: roots,
    endpoint_ids: roots.map((t) => t.id),
  };
  const techView = {
    ...allView,
    domain: "technology",
    endpoint_ids: roots
      .filter((t) => t.domain === "technology")
      .map((t) => t.id),
  };
  const tech = { ...initialState(), domain: "technology", view: techView };
  tech.positions = buildScene(tech, techView, c).positions;
  const stale = { ...tech, domain: "all", view: allView };
  const scattered = buildScene(stale, allView, c);
  const expected = compactGrid(9, 1.6, 234, 124).points;
  assert.deepEqual(
    scattered.cards.map((c) => c.position),
    expected,
    "the shared builder packs new domain members without fallback slots",
  );
  stale.positions = Object.fromEntries(scattered.cards.map((c, i) => [c.id, {x: i * 743, y: i % 2 * 957}]));
  const originalPositions = structuredClone(stale.positions);
  const pending = reduceExploration(stale, {
    type: "previewDomain",
    domain: "technology",
  });
  assert.deepEqual(
    reconcile(pending, allView).positions,
    stale.positions,
    "a pending preview must not move its current cards",
  );
  const repaired = reconcile(stale, allView),
    scene = buildScene(repaired, allView, c);
  assert.deepEqual(
    scene.cards.map((c) => c.position),
    expected,
  );
  assert.equal(scene.cards.length, 9);
  assert.deepEqual(
    stale.positions,
    originalPositions,
    "normalization leaves original saved data untouched",
  );
  const preview = reduceExploration(tech, {
    type: "previewDomain",
    domain: "all",
  });
  assert.deepEqual(
    reconcile(preview, techView).positions,
    tech.positions,
    "unapplied preview keeps the selected-domain arrangement",
  );
  const update = reduceExploration(preview, { type: "updateDomain" }),
    applied = reconcile(update, allView);
  assert.deepEqual(
    buildScene(applied, allView, c).cards.map((c) => c.position),
    expected,
  );
});

test("double-click and Open group buttons resolve to the same canonical action", () => {
  const record = {
    id: "display-group:ecosystem:species",
    groupKey: "ecosystem:species",
    displayGroup: true,
    label: "Species",
    kind: "group",
    domain: "ecosystem",
  };
  assert.deepEqual(groupOpeningAction(initialState(), record), {
    type: "group",
    id: "ecosystem:species",
  });
  assert.deepEqual(
    groupOpeningAction({ ...state(), grouping: "type" }, record, ["carob"]),
    {
      type: "openMembers",
      id: "display-group:type:ecosystem:species",
      sourceId: record.id,
      members: ["carob"],
    },
  );
  assert.equal(
    groupOpeningAction(initialState(), topics[0]),
    null,
    "ordinary topics have no Open group action",
  );
  assert.equal(
    groupOpeningAction(initialState(), { ...record, groupKey: "" }),
    null,
  );
});

test("opening a type group clears prior expansions and creates a compact exact-members scope", () => {
  const v = {
    ...view,
    scope: "group",
    centre: null,
    routes: [],
    endpoint_ids: topics.map((t) => t.id),
  };
  const s = {
    ...initialState(),
    scope: "group",
    groupId: "ecosystem:habitats",
    grouping: "type",
    expandedGroups: ["display-group:equipment"],
    view: v,
  };
  const base = buildScene({ ...s, expandedGroups: [] }, v, catalog);
  const group = base.cards.find((c) => c.record.groupKey === "method");
  const action = groupOpeningAction(s, group.record, group.members),
    opened = reduceExploration(s, action);
  assert.equal(opened.scope, "group");
  assert.equal(opened.groupId, "display-group:type:method");
  assert.deepEqual(opened.groupMembers, ["restoration", "monitoring"]);
  assert.deepEqual(opened.expandedGroups, []);
  assert.equal(opened.grouping, "none");
  assert.deepEqual(opened.positions, {});
  assert.equal(
    new URL(query(opened), "http://local").searchParams.get("member_ids"),
    "restoration,monitoring",
  );
  const mv = {
    ...v,
    scope: "group",
    group_id: opened.groupId,
    endpoint_ids: group.members,
    nodes: topics.filter((t) => group.members.includes(t.id)),
  };
  const scene = buildScene(reconcile(opened, mv), mv, catalog);
  assert.deepEqual(
    scene.cards.map((c) => c.position),
    compactGrid(2, 1.6, 234, 124).points,
  );
  assert.equal(scene.label, "method");
  assert.ok(scene.cards.every((c) => c.record.kind === "method"));
  const regrouped = reduceExploration(
    { ...opened, view: mv },
    { type: "grouping", value: "place" },
  );
  assert.deepEqual(
    regrouped.groupMembers,
    opened.groupMembers,
    "grouping cannot broaden a focused membership",
  );
  const all = reduceExploration(
    reduceExploration(
      { ...opened, view: mv },
      { type: "previewDomain", domain: "technology" },
    ),
    { type: "updateDomain" },
  );
  assert.deepEqual(
    all.groupMembers,
    opened.groupMembers,
    "domain filtering stays inside the selected membership",
  );
  assert.equal(
    reduceExploration(opened, { type: "overview" }).groupMembers,
    undefined,
  );
  const legacy = {
    ...s,
    expandedGroups: ["display-group:equipment", group.id],
  };
  const converted = migrateExpandedGroup(legacy, catalog, 1.6);
  assert.deepEqual(converted.groupMembers, group.members);
  assert.deepEqual(converted.expandedGroups, []);
  assert.deepEqual(
    legacy.expandedGroups,
    ["display-group:equipment", group.id],
    "old snapshots are not mutated",
  );
});

test("place grouping separates explicitly placed records, place anchors and unrecorded members", () => {
  const ts = [
    {
      id: "site",
      kind: "place",
      label: "Pilot site",
      domain: "ecosystem",
      place_ids: ["region"],
    },
    { id: "region", kind: "place", label: "Region", domain: "ecosystem" },
    {
      id: "trial",
      kind: "event",
      label: "Trial",
      domain: "ecosystem",
      place_ids: ["old-site"],
    },
    {
      id: "general",
      kind: "condition",
      label: "General condition",
      domain: "ecosystem",
    },
    {
      id: "missing-place",
      kind: "event",
      label: "Unresolved location",
      domain: "ecosystem",
      place_ids: ["missing-site"],
    },
  ];
  const c = {
    ...catalog,
    topics: ts,
    relationships: [],
    identity_redirects: { "old-site": "site" },
  };
  const v = {
    ...view,
    scope: "group",
    centre: null,
    nodes: ts,
    endpoint_ids: ts.map((t) => t.id),
    routes: [],
    edges: [],
  };
  const s = { ...initialState(), scope: "group", grouping: "place", view: v };
  const scene = buildScene(s, v, c);
  assert.deepEqual(
    scene.cards.find((c) => c.id === "display-group:unrecorded").members,
    ["general"],
  );
  assert.deepEqual(
    scene.cards.find((c) => c.id === "display-group:site").members,
    ["site", "trial"],
  );
  assert.equal(
    recordedPlaceId(ts[0], c),
    "site",
    "place anchors belong to their own place rather than the parent region",
  );
  assert.equal(
    recordedPlaceId(ts[2], c),
    "site",
    "redirected annotations resolve consistently",
  );
  assert.equal(
    placeLabel("missing-site", c),
    "Place unavailable (missing-site)",
  );
  assert.ok(
    scene.cards.find((c) => c.id === "display-group:missing-site").record
      .label !== "Place not recorded",
  );
});

test("focused member restore clears scattered slots but preserves preview positions and validated membership universe", () => {
  const s = {
    ...state(),
    scope: "group",
    centre: null,
    anchor: null,
    groupId: "display-group:place:unrecorded",
    groupMembers: topics.map((t) => t.id),
    grouping: "none",
    positions: {
      carob: { x: 2000, y: -1000 },
      restoration: { x: -1600, y: 900 },
    },
  };
  const v = {
    ...view,
    scope: "group",
    centre: null,
    nodes: topics,
    endpoint_ids: ["carob", "restoration"],
    routes: [],
    group_member_ids: ["carob", "restoration"],
  };
  const restored = reconcile(s, v),
    scene = buildScene(restored, v, catalog);
  assert.deepEqual(
    scene.cards.map((c) => c.position),
    compactGrid(2, 1.6, 234, 124).points,
  );
  const healthy = { ...restored, positions: scene.positions };
  assert.deepEqual(
    reconcile(healthy, v).positions,
    scene.positions,
    "an already compact saved layout is preserved exactly",
  );
  assert.deepEqual(
    restored.groupMembers,
    ["carob", "restoration"],
    "server-validated membership removes stale/misassigned IDs",
  );
  const empty = { ...v, domain: "technology", endpoint_ids: [] };
  assert.deepEqual(
    reconcile(restored, empty).groupMembers,
    ["carob", "restoration"],
    "an empty filtered view must not erase the source membership",
  );
  const preview = reduceExploration(s, {
    type: "previewDomain",
    domain: "technology",
  });
  assert.deepEqual(reconcile(preview, v).positions, s.positions);
});


test("all scopes and grouping choices repair scattered layouts and retain healthy circles or grids", () => {
  for (const scope of ["overview", "group", "neighbors", "search"])
    for (const grouping of ["none", "family", "type", "place"])
      for (const aspect of [0.6, 1.6, 3]) {
        const v = { ...view, scope, endpoint_ids: topics.map((t) => t.id) };
        const s = { ...state(), scope, grouping };
        const fresh = buildScene(s, v, catalog, aspect);
        s.positions = Object.fromEntries(fresh.cards.map((c, i) => [c.id, { x: i * 888, y: i * 377 }]));
        const repaired = buildScene(s, v, catalog, aspect);
        assert.deepEqual(repaired.positions,fresh.positions);
        if(scope!=='neighbors')assert.deepEqual(repaired.cards.map((c) => c.position), compactGrid(repaired.cards.length, aspect, 234, 124).points);
        else assert.equal(repaired.layout,'circle');
        s.positions = repaired.positions;
        const resized=buildScene(s,v,catalog,2.3);
        if(scope==='neighbors'){
          assert.equal(resized.key,repaired.key,'Viewport adaptation retains the same logical layer');
          assert.deepEqual(resized.positions.carob,{x:0,y:0});
        }else assert.deepEqual(resized.positions,repaired.positions,'Grid viewport changes retain a healthy layout');
      }
});

test("packing old background layers preserves moved offsets, source highlights and closed state", () => {
  const parent = { ...state(), scope: "neighbors", layerRoot: false, view: { ...view, scope: "neighbors", routes: [] } };
  const first = buildScene(parent, parent.view, catalog);
  parent.positions = Object.fromEntries(first.cards.map((c, i) => [c.id, { x: i * 912, y: -i * 417 }]));
  const oldKey = scenePresentationKey(JSON.stringify([
    first.cards.map((c) => [c.id, parent.positions[c.id]]), first.links.map((e) => e.id),
  ]));
  parent.layerOffsets = { [oldKey]: { x: 71, y: -35 } };
  const packed = buildScene(parent, parent.view, catalog);
  assert.equal(packed.previousKey, oldKey);
  assert.deepEqual(packed.offset, { x: 71, y: -35 });
  const child = { ...initialState(), scope: "group", layerRoot: false, groupId: "ecosystem:species", openedFrom: { layerKey: oldKey, cardId: "carob" }, view: { ...view, scope: "group", centre: null, endpoint_ids: ["carob"], routes: [] }, layerOffsets: { [oldKey]: { x: 91, y: 42 } } };
  const previous = previousScenes([parent, child], 1, catalog, 1.6);
  assert.deepEqual(previous[0].openedCardIds, ["carob"]);
  assert.deepEqual(previous[0].offset, { x: 91, y: 42 });
  assert.equal(previousScenes([parent, { ...child, closedLayers: [oldKey] }], 1, catalog, 1.6).length, 0);
  const closed = closeLayer({ entries: [parent, child], index: 1 }, packed.key, catalog, 1.6);
  assert.equal(closed.kind, "background");
  assert.equal(previousScenes([parent, closed.state], 1, catalog, 1.6).length, 0);
});


test("species cards share explicit Spanish, English and scientific names with canonical IDs", () => {
  const carob = { ...topics.find((t) => t.id === "carob"), spanish_name: "Algarrobo", english_name: "Carob tree", scientific_name: "Ceratonia siliqua" };
  assert.deepEqual(speciesNames(carob).map((n) => n.value), ["Algarrobo", "Carob tree", "Ceratonia siliqua"]);
  assert.deepEqual(speciesNames({ ...carob, spanish_name: null, english_name: null }).map((n) => n.value), ["Sin confirmar", "Not verified", "Ceratonia siliqua"]);
  assert.deepEqual(speciesNames({ ...carob, kind: "group" }), []);
  const c = { ...catalog, topics: catalog.topics.map((t) => t.id === carob.id ? carob : t) };
  const stale = { ...view, nodes: view.nodes.map((t) => t.id === carob.id ? { ...t, spanish_name: "Old display name" } : t) };
  const scene = buildScene(state(), stale, c);
  assert.equal(scene.cards.find((card) => card.id === "carob").record.spanish_name, "Algarrobo");
  assert.equal(scene.cards.filter((card) => card.id === "carob").length, 1);
  assert.deepEqual(scene.links, buildScene(state(), view, catalog).links);
});

test('permanent folders keep shared references, empty folders and community openings without factual edges',()=>{
  const folders=[
    {id:'browse:primary',label:'Primary collection',parent_id:'ecosystem:species',anchor_topic_id:null,members:[{topic_id:'carob',role:'primary'}]},
    {id:'browse:shared',label:'Shared collection',parent_id:'ecosystem:species',anchor_topic_id:null,members:[{topic_id:'carob',role:'shared'}]},
    {id:'browse:empty',label:'Empty folder',parent_id:'ecosystem:species',anchor_topic_id:null,members:[]},
  ];
  const c={...catalog,browse_groups:folders,communities:[{id:'community:test',label:'Working community',parent_id:'ecosystem:species',plants:[{topic_id:'carob'}]}]};
  const v={...view,scope:'group',centre:null,nodes:[topics[0]],edges:[],endpoint_ids:['carob'],routes:[]};
  const s={...initialState(),scope:'group',groupId:'ecosystem:species',view:v};
  const scene=buildScene(s,v,c);
  for(const key of ['browse:primary','browse:shared','browse:empty','community:test']){
    const card=scene.cards.find(card=>card.record.groupKey===key);
    assert.ok(card,key+' must remain visible');
    assert.deepEqual(groupOpeningAction(s,card.record,card.members),{type:'group',id:key,sourceId:card.id});
    assert.deepEqual(openingSource(groupOpeningAction(s,card.record,card.members),scene,c),{layerKey:scene.key,cardId:card.id});
  }
  assert.deepEqual(scene.links,[]);
  assert.equal(scene.cards.some(card=>card.id==='carob'),false);
});

test('root labels and historical headings resolve from authoritative organization metadata',()=>{
  const c={...catalog,organization_roots:catalog.organization_roots.map(g=>g.id==='ecosystem:species'?{...g,label:'My plants'}:g)};
  assert.equal(contextLabel({...initialState(),scope:'group',groupId:'ecosystem:species'},c),'My plants');
  assert.equal(contextLabel({...initialState(),expandedGroups:['display-group:ecosystem:species']},c),'My plants');
  const scene=buildScene({...initialState()}, {...view,scope:'overview',centre:null,endpoint_ids:topics.map(t=>t.id),routes:[]},c);
  assert.equal(scene.cards.find(g=>g.record.groupKey==='ecosystem:species').record.label,'My plants');
});

test('new intake topics refresh the catalog before projection instead of forming a blank unopenable group',async()=>{
  const added=Array.from({length:34},(_,i)=>({id:`new-${i}`,label:`New topic ${i}`,domain:i%2?'funding':'technology',kind:'condition',group_id:i%2?'requirements':'irrigation'}));
  const current={...catalog,revision:4,topics:[...topics,...added],browse_groups:[{id:'browse:new',label:'New organization',parent_id:'ecosystem:habitats',members:[{topic_id:'new-0',role:'primary'}]}]};
  const live={...view,revision:4,scope:'overview',centre:null,nodes:current.topics,endpoint_ids:current.topics.map(t=>t.id),routes:[]};
  const state=initialState(),before=structuredClone({state,catalog}),calls=[],signal=new AbortController().signal;
  // The reported 34-topic card comes from projecting a live result against the old catalog.
  const broken=buildScene(state,live,catalog).cards.find(c=>!c.record.label);
  assert.equal(broken.members.length,34);
  assert.equal(groupOpeningAction(state,broken.record,broken.members),null);
  const loaded=await loadExploration(state,catalog,signal,false,async(url,options)=>{
    calls.push(url);assert.equal(options.signal,signal);
    return url==='/api/catalog'?current:live;
  });
  const scene=buildScene(loaded.state,loaded.view,loaded.catalog);
  assert.equal(calls.length,2);assert.equal(calls[1],'/api/catalog');
  assert.equal(loaded.catalog.revision,loaded.view.revision);
  assert.ok(scene.cards.every(c=>c.record.label && groupOpeningAction(state,c.record,c.members)));
  assert.deepEqual(scene.cards.flatMap(c=>c.members).sort(),current.topics.map(t=>t.id).sort());
  assert.ok(scene.cards.find(c=>c.record.groupKey==='ecosystem:habitats').members.includes('new-0'));
  assert.deepEqual({state,catalog},before);
});

test('query catches up if intake advances again between the view and catalog reads',async()=>{
  const responses=[{...view,revision:4},{...catalog,revision:5},{...view,revision:5}],calls=[];
  const loaded=await loadExploration(initialState(),catalog,new AbortController().signal,false,async url=>{calls.push(url);return responses.shift();});
  assert.equal(calls.length,3);assert.equal(calls[1],'/api/catalog');
  assert.equal(loaded.view.revision,5);assert.equal(loaded.catalog.revision,5);
});

test('captured older views retain their exact membership without requesting current results',async()=>{
  const state={...initialState(),view},original=structuredClone(state);
  const loaded=await loadExploration(state,{...catalog,revision:20},new AbortController().signal,false,async()=>{throw Error('Historical view was re-queried');});
  assert.equal(loaded.view,view);assert.deepEqual(state,original);
});

test('a captured newer view refreshes only its catalog and preserves the saved payload',async()=>{
  const state={...initialState(),view:{...view,revision:4}},original=structuredClone(state),calls=[];
  const loaded=await loadExploration(state,catalog,new AbortController().signal,false,async url=>{calls.push(url);return {...catalog,revision:4};});
  assert.deepEqual(calls,['/api/catalog']);assert.equal(loaded.view,state.view);assert.deepEqual(state,original);
});

test('catalog failure and repeated revision races reject without modifying the accepted exploration',async()=>{
  const state=initialState(),original=structuredClone(state),signal=new AbortController().signal;
  await assert.rejects(loadExploration(state,catalog,signal,false,async url=>{
    if(url==='/api/catalog')throw Error('Catalog unavailable');return {...view,revision:4};
  }),/Catalog unavailable/);
  let requests=0;
  await assert.rejects(loadExploration(state,catalog,signal,false,async url=>{
    requests++;return url==='/api/catalog'?{...catalog,revision:5}:{...view,revision:4};
  }),/knowledge changed.*Retry/);
  assert.equal(requests,6);assert.deepEqual(state,original);
});
