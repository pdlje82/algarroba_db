import {
  initialState,
  reduceExploration,
  groupOpeningAction,
  type History,
} from "./exploration.ts";
import { buildScene } from "./scene.ts";
import type { State, CameraPose, Catalog } from "./types.ts";
export const LEGACY_KEYS = [
  "kgb:exploration:v5",
  "kgb:exploration:v4",
  "kgb:exploration:v3",
  "kgb:exploration:v1",
];
const finite = (p: any) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
export function legacyHistory(
  value: any,
): { entries: any[]; index: number } | null {
  if (!value) return null;
  if (typeof value === "string") value = JSON.parse(value);
  if (!value.entries?.length) return null;
  if ([3, 4, 5].includes(value.format)) {
    const unpack = (o: any) => {
      if (!o?.poolFields) return o;
      const n = { ...o };
      for (const [k, id] of Object.entries(o.poolFields))
        n[k] = value.pool[id as number];
      delete n.poolFields;
      return n;
    };
    return {
      index: value.index,
      entries: value.entries.map((s: any) => ({
        ...s,
        positions: value.pool[s.positionsRef] || s.positions || {},
        layerView: s.layerView
          ? {
              ...unpack(s.layerView),
              layers: Object.fromEntries(
                Object.entries(s.layerView.layers).map(([k, v]) => [
                  k,
                  unpack(typeof v === "number" ? value.pool[v] : v),
                ]),
              ),
            }
          : undefined,
        scene: s.scene
          ? {
              ...s.scene,
              contexts: Object.fromEntries(
                Object.entries(s.scene.contexts || {}).map(([k, v]) => [
                  k,
                  unpack(typeof v === "number" ? value.pool[v] : v),
                ]),
              ),
            }
          : undefined,
      })),
    };
  }
  return value;
}
export function migrate(raw: any): State {
  if (!raw) return initialState();
  if (raw.version === 6) {
    const s = {
      ...initialState(),
      ...structuredClone(raw),
      layerRoot: raw.layerRoot ?? raw.scope === "overview",
    };
    s.positions = Object.fromEntries(
      Object.entries(s.positions || {}).filter(([, p]) => finite(p)),
    );
    return s;
  }
  const s = initialState(),
    p = raw.perspective,
    active = raw.layerView?.layers?.[raw.layerView?.currentId];
  s.centre = raw.centre || null;
  s.anchor = s.centre;
  s.search = raw.search || "";
  s.depth = raw.depth === 8 ? 8 : 6;
  s.compare = raw.compare?.slice(0, 4) || [];
  s.domain =
    (
      {
        ecosystems: "ecosystem",
        technology: "technology",
        funding: "funding",
      } as any
    )[p] || "all";
  s.grouping = p === "hierarchy" ? "family" : p === "places" ? "place" : "none";
  s.kinds = p === "conditions" ? ["condition", "equipment"] : [];
  s.scope = raw.overview
    ? "overview"
    : s.search
      ? "search"
      : s.centre
        ? "neighbors"
        : "overview";
  if (
    active?.scope?.kind === "group" ||
    (active?.scope?.kind === "root" && active.id !== "overview")
  ) {
    s.scope = "group";
    s.groupId = active.scope.key;
    s.search = "";
  } else if (
    !raw.overview &&
    active?.scope?.kind === "neighbors" &&
    active.scope.anchorId
  ) {
    s.scope = "neighbors";
    s.centre = active.scope.anchorId;
    s.anchor = s.centre;
  } else if (!raw.overview && !s.search && raw.expandedGroups?.length) {
    s.scope = "group";
    s.groupId = raw.expandedGroups.at(-1);
  }
  s.expandedRoutes = raw.expandedRoutes || [];
  s.alternatives = raw.alternatives || [];
  const key = p + ":" + (raw.centre || "overview") + ":" + s.search,
    ctx = raw.scene?.contexts?.[key];
  const positions =
    active?.slots?.[raw.scene?.mode || "layered"] ||
    ctx?.homes ||
    raw.positions ||
    {};
  for (const [id, v] of Object.entries(positions))
    if (finite(v))
      s.positions[id.replace(/^.*?:focus:[^:]+:/, "")] = {
        x: (v as any).x,
        y: (v as any).y,
      };
  const camera = ctx?.cameras?.layered || ctx?.cameras?.flat;
  if (
    camera &&
    finite(camera.position) &&
    finite(camera.target) &&
    Number.isFinite(camera.position.z) &&
    Number.isFinite(camera.target.z)
  )
    s.camera = {
      position: camera.position,
      target: camera.target,
    } as CameraPose;
  s.layerRoot = s.scope === "overview";
  return s;
}
export function migrateHistory(
  raw: any,
  fallback: any,
  index?: number,
): History {
  const h = legacyHistory(raw);
  if (!h) return { entries: [migrate(fallback)], index: 0 };
  const at = Math.max(0, Math.min(h.entries.length - 1, index ?? h.index ?? 0)),
    from = Math.max(0, at - 99),
    entries = h.entries.slice(from, from + 100).map(migrate);
  return { entries, index: at - from };
}
export function legacyTab(raw: any) {
  return raw?.perspective === "sources"
    ? "evidence"
    : raw?.perspective === "time"
      ? "dates"
      : raw?.perspective === "comparison"
        ? "comparison"
        : "details";
}

/** Resolve stable IDs without running an old viewer or editing the saved payload. */
export function reconcileIdentities(state: State, catalog: Catalog): State {
  const resolve = (id: string) => {
    const seen = new Set<string>();
    while (catalog.identity_redirects?.[id] && !seen.has(id)) {
      seen.add(id);
      id = catalog.identity_redirects[id];
    }
    return id;
  };
  const valid = new Set(catalog.topics.map((t) => t.id));
  return {
    ...state,
    groupId: state.groupId?.startsWith("display-group:place:")
      ? "display-group:place:" +
        resolve(state.groupId.slice("display-group:place:".length))
      : state.groupId,
    centre: state.centre ? resolve(state.centre) : null,
    anchor: state.anchor ? resolve(state.anchor) : null,
    compare: state.compare.map(resolve).filter((id) => valid.has(id)),
    ...(state.groupMembers
      ? { groupMembers: [...new Set(state.groupMembers.map(resolve))] }
      : {}),
    positions: Object.fromEntries(
      Object.entries(state.positions).map(([id, p]) => [resolve(id), p]),
    ),
  };
}

/** Translate the last legacy expanded card into an exact focused membership scope. */
export function migrateExpandedGroup(
  s: State,
  catalog: Catalog,
  aspect: number,
): State | null {
  if (
    !s.view ||
    s.groupMembers ||
    !s.expandedGroups.length ||
    s.scope === "overview" ||
    s.grouping === "none"
  )
    return null;
  const parent = { ...s, expandedGroups: [] };
  const card = buildScene(parent, s.view, catalog, aspect).cards.find(
    (c) => c.id === s.expandedGroups.at(-1),
  );
  if (!card) return null;
  const action = groupOpeningAction(parent, card.record, card.members);
  if (!action) return null;
  return {
    ...reduceExploration(parent, action),
    camera: s.camera,
    openedFrom: s.openedFrom,
    layerRoot: s.layerRoot,
  };
}
