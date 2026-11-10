import {
  type State,
  type Catalog,
  GROUP_LABELS,
  type Grouping,
  type ExploreView,
  type Route,
  type Item,
} from "./types.ts";
import { placeLabel, groupLabel, fixedGroupLayout, isReviewGroup, navigationGroup } from "./organization.ts";
import { hasCompactGridPositions } from "./compactLayout.ts";
export const initialState = (): State => ({
  version: 6,
  layerRoot: true,
  scope: "overview",
  groupId: null,
  centre: null,
  anchor: null,
  search: "",
  domain: "all",
  kinds: [],
  grouping: "none",
  expandedGroups: [],
  expandedRoutes: [],
  alternatives: [],
  depth: 6,
  compare: [],
  positions: {},
  revision: 0,
});
export type Action =
  | { type: "explore"; id: string }
  | { type: "group"; id: string; sourceId?: string }
  | { type: "overview" }
  | { type: "clearCentre" }
  | { type: "search"; text: string }
  | { type: "filters"; kinds: string[] }
  | { type: "previewDomain"; domain: string }
  | { type: "updateDomain" }
  | { type: "grouping"; value: Grouping }
  | { type: "openMembers"; id: string; sourceId: string; members: string[] }
  | { type: "toggleRoute"; id: string }
  | { type: "allRoutes"; routes: Route[]; show: boolean }
  | { type: "alternatives"; routes: Route[] }
  | { type: "depth" }
  | { type: "compare"; id: string }
  | { type: "tidy" }
  | { type: "fundingProject"; id:string };
export function reduceExploration(s: State, a: Action, catalog?: Catalog): State {
  const n = structuredClone(s);
  delete n.camera;
  const createsView = [
    "group",
    "openMembers",
    "explore",
    "search",
    "filters",
    "toggleRoute",
    "allRoutes",
    "alternatives",
    "depth",
  ].includes(a.type);
  if (createsView) {
    delete n.openedFrom;
    n.layerRoot =
      a.type === "filters" && (s.layerRoot || s.scope === "overview")
        ? true
        : false;
  }
  const reset = () => {
    n.domain = n.pendingDomain ?? n.domain;
    delete n.pendingDomain;
    n.expandedRoutes = [];
    n.expandedGroups = [];
    n.alternatives = [];
    n.anchor = n.centre;
    delete n.view;
  };
  switch (a.type) {
    case "explore":
      reset();
      delete n.groupMembers;
      n.centre = a.id;
      n.anchor = a.id;
      n.scope = n.search.trim() ? "search" : "neighbors";
      n.groupId = null;
      break;
    case "group":
      reset();
      delete n.groupMembers;
      n.centre = null;
      n.anchor = null;
      n.positions = {};
      n.scope = "group";
      n.groupId = navigationGroup(a.id,catalog);
      if(fixedGroupLayout(a.id,catalog))n.grouping="none";
      n.search = "";
      break;
    case "openMembers":
      reset();
      n.scope = "group";
      n.groupId = a.id;
      n.groupMembers = [...new Set(a.members)];
      n.centre = null;
      n.anchor = null;
      n.search = "";
      n.grouping = "none";
      n.positions = {};
      break;
    case "overview":
      reset();
      delete n.groupMembers;
      delete n.openedFrom;
      n.scope = "overview";
      n.groupId = null;
      n.layerRoot = true;
      n.positions = {};
      n.layerOffsets = {};
      break;
    case "clearCentre":
      n.anchor = s.centre || s.anchor;
      n.centre = null;
      n.positions = {};
      n.camera = s.camera;
      break;
    case "search":
      reset();
      delete n.groupMembers;
      n.search = a.text;
      n.scope = a.text.trim() ? "search" : n.centre ? "neighbors" : "overview";
      n.groupId = null;
      break;
    case "filters":
      reset();
      n.kinds = a.kinds;
      if (n.scope === "neighbors" && !n.centre) n.scope = "overview";
      break;
    case "previewDomain":
      if (a.domain === n.domain) delete n.pendingDomain;
      else n.pendingDomain = a.domain;
      n.camera = s.camera;
      break;
    case "updateDomain":
      n.domain = n.pendingDomain ?? n.domain;
      delete n.pendingDomain;
      delete n.view;
      n.positions = {};
      n.alternatives = [];
      n.camera = s.camera;
      break;
    case "grouping":
      n.grouping = s.scope === 'group' && fixedGroupLayout(s.groupId,catalog) ? 'none' : a.value;
      n.expandedGroups = [];
      n.positions = {};
      break;
    case "toggleRoute":
      n.expandedRoutes = n.expandedRoutes.includes(a.id)
        ? n.expandedRoutes.filter((x) => x !== a.id)
        : [...n.expandedRoutes, a.id];
      break;
    case "allRoutes":
      n.expandedRoutes = a.show ? a.routes.map((r) => r.id) : [];
      break;
    case "alternatives":
      n.alternatives = [
        ...new Map(
          [...n.alternatives, ...a.routes].map((r) => [r.id, r]),
        ).values(),
      ];
      n.expandedRoutes = [
        ...new Set([...n.expandedRoutes, ...a.routes.map((r) => r.id)]),
      ];
      break;
    case "depth":
      n.depth = 8;
      reset();
      break;
    case "compare":
      n.camera = s.camera;
      n.compare = n.compare.includes(a.id)
        ? n.compare.filter((x) => x !== a.id)
        : n.compare.length < 4
          ? [...n.compare, a.id]
          : n.compare;
      break;
    case "tidy":
      n.positions = {};
      n.camera = s.camera;
      break;
    case 'fundingProject':
      n.fundingProjectId=a.id;
      n.camera=s.camera;
      break;
  }
  if (n.scope === "overview") n.layerRoot = true;
  if (isInPlaceAction(a)) n.camera = s.camera;
  return n;
}
export function isInPlaceAction(a: Action) {
  return ["grouping", "previewDomain", "updateDomain", "clearCentre", "fundingProject"].includes(
    a.type,
  );
}
/** All Open group entry points share the same exploration action. */
export function groupOpeningAction(
  s: State,
  record: Item,
  members: string[] = [],
): Action | null {
  if (!record.displayGroup || !record.groupKey) return null;
  if(record.permanentGroup) return {type:'group',id:record.groupKey,sourceId:record.id};
  if (s.scope === "overview") return { type: "group", id: record.groupKey };
  if (s.grouping === "none" || !members.length) return null;
  return {
    type: "openMembers",
    id: "display-group:" + s.grouping + ":" + record.groupKey,
    sourceId: record.id,
    members: [...members],
  };
}
export function query(s: State) {
  const p = new URLSearchParams({
    scope: s.scope,
    search: s.search,
    domain: s.domain,
    kinds: s.kinds.join(","),
    depth: String(s.depth),
  });
  if (s.groupId) p.set("group_id", s.groupId);
  if (s.groupMembers) p.set("member_ids", s.groupMembers.join(","));
  if (s.anchor && s.scope !== "group") p.set("centre", s.anchor);
  return "/api/explore?" + p;
}
export function allRoutes(s: State, v: ExploreView) {
  return [
    ...new Map([...v.routes, ...s.alternatives].map((r) => [r.id, r])).values(),
  ];
}
export function reconcile(s: State, v: ExploreView): State {
  const routes = allRoutes(s, v);
  const group = v.scope === "group";
  const staleCentreSlot = !s.centre && s.anchor && s.positions[s.anchor];
  // Root overview cards have no individual drag state. Rebuild the full grid
  // instead of restoring partial/scattered slots from a smaller domain view.
  const fullOverview =
    v.scope === "overview" && v.domain === "all" && !s.pendingDomain;
  const focusedMembers =
    !!s.groupMembers &&
    s.grouping === "none" &&
    !s.pendingDomain &&
    !hasCompactGridPositions(v.endpoint_ids.map((id) => s.positions[id]));
  return {
    ...s,
    scope: v.scope,
    ...(s.groupMembers && v.group_member_ids
      ? { groupMembers: v.group_member_ids }
      : {}),
    centre: group ? null : s.centre === s.anchor ? v.centre : s.centre,
    // A cleared centre remains the captured origin/omitted card, not a live centre.
    anchor: group ? (!s.centre ? s.anchor : null) : v.centre,
    positions:
      fullOverview || focusedMembers || (group && s.centre) || staleCentreSlot
        ? {}
        : s.positions,
    revision: v.revision,
    view: v,
    expandedRoutes: routes
      .filter(
        (r) =>
          s.expandedRoutes.includes(r.id) ||
          s.expandedRoutes.includes("route:" + r.endpoint),
      )
      .map((r) => r.id),
  };
}
export type History = { entries: State[]; index: number };
export function commitHistory(h: History, s: State): History {
  const entries = [...h.entries.slice(0, h.index + 1), s].slice(-100);
  return { entries, index: entries.length - 1 };
}
export function contextLabel(s: State, catalog?: Catalog | null) {
  const focused =
    s.groupMembers &&
    s.groupId?.match(/^display-group:(type|family|place):(.*)$/);
  if (focused) {
    const [, grouping, key] = focused;
    if (grouping === "type") return key;
    if (grouping === "place") return placeLabel(key, catalog);
    if(catalog?.organization_roots?.some(g=>g.id===key))return groupLabel(key,catalog);
    return (
      catalog?.browse_groups.find((g) => g.id === key)?.label ||
      GROUP_LABELS[key.split(":").at(-1)!] ||
      key
    );
  }
  const expanded = s.expandedGroups.at(-1)?.replace(/^display-group:/, "");
  if (expanded) {
    if(catalog?.organization_roots.some(g=>g.id===expanded))return groupLabel(expanded,catalog);
    const group = catalog?.browse_groups.find((g) => g.id === expanded);
    return (
      group?.label ||
      catalog?.topics.find((t) => t.id === expanded)?.label ||
      GROUP_LABELS[expanded.split(":").at(-1)!] ||
      (expanded === "unrecorded" ? "Place not recorded" : expanded)
    );
  }
  if (s.scope === "group") {
    if(isReviewGroup(s.groupId))return groupLabel(s.groupId!,catalog);
    if(s.groupId && (catalog?.browse_groups.some(g=>g.id===s.groupId) || catalog?.organization_roots?.some(g=>g.id===s.groupId) || catalog?.communities?.some(g=>g.id===s.groupId))) return groupLabel(s.groupId,catalog);
    const group = catalog?.browse_groups.find((g) => g.id === s.groupId);
    return (
      catalog?.topics.find((t) => t.id === group?.anchor_topic_id)?.label ||
      group?.label ||
      GROUP_LABELS[s.groupId?.split(":").at(-1) || ""] ||
      "Group"
    );
  }
  return s.scope === "overview"
    ? "Knowledge overview"
    : s.scope === "search"
      ? "Search connections"
      : "Direct connections";
}

/** A label drag is presentation state, with no extra exploration or factual mutation. */
export function moveLayer(
  s: State,
  key: string,
  point: { x: number; y: number },
): State {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return s;
  return { ...s, layerOffsets: { ...s.layerOffsets, [key]: { ...point } } };
}
