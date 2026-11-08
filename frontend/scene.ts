import {
  type State,
  type ExploreView,
  type Catalog,
  type Item,
  type Edge,
  type Point,
  ROOT_GROUPS,
  GROUP_LABELS,
} from "./types.ts";
import {
  rootGroup,
  primaryGroup,
  recordedPlaceId,
  placeLabel,
} from "./organization.ts";
import { allRoutes, contextLabel } from "./exploration.ts";
import { openingCandidates, highlightOpeningSources } from "./opening.ts";
import {
  compactGrid,
  hasCompactGridPositions,
  CARD_WIDTH,
  CARD_HEIGHT,
} from "./compactLayout.ts";
export { CARD_WIDTH, CARD_HEIGHT } from "./compactLayout.ts";
export const PLANE_GAP = 1560;
export type SceneCard = {
  id: string;
  record: Item;
  position: Point;
  width: number;
  height: number;
  members: string[];
  outOfDomain?: boolean;
  matchingDomainCount?: number;
};
export type SceneLink = {
  id: string;
  source: string;
  target: string;
  record: any;
  relationshipIds: string[];
};
export type Scene = {
  openedFrom?: State["openedFrom"];
  openingCandidates?: string[];
  openedCardIds?: string[];
  key: string;
  previousKey?: string;
  offset: Point;
  cards: SceneCard[];
  links: SceneLink[];
  internal: { cardId: string; ids: string[] }[];
  positions: Record<string, Point>;
  label: string;
  signature: string;
};
/** Displayed, domain-excluded cards and their attached links cannot be selected. */
export function isInteractiveRecord(scene: Scene, id: string) {
  const card = scene.cards.find(
    (c) => c.id === id || "internal:" + c.id === id,
  );
  if (card) return !card.outOfDomain;
  const link = scene.links.find((e) => e.id === id);
  return (
    !link ||
    [link.source, link.target].every((nodeId) =>
      scene.cards.some((c) => c.id === nodeId && !c.outOfDomain),
    )
  );
}
function family(t: Item, c: Catalog) {
  const g = primaryGroup(t.id, c);
  return {
    id: g?.id || rootGroup(t.id, c),
    label:
      g?.label || GROUP_LABELS[rootGroup(t.id, c).split(":").at(-1)!] || t.kind,
  };
}
export function buildScene(
  s: State,
  v: ExploreView,
  c: Catalog,
  aspect = 1.6,
): Scene {
  const topicMap = new Map(c.topics.map((t) => [t.id, t])),
    routes = allRoutes(s, v),
    records = new Map(v.nodes.map((t) => [t.id, t])),
    visible = new Set(v.endpoint_ids),
    expanded = routes.filter((r) => s.expandedRoutes.includes(r.id)),
    factIds = new Set<string>();
  const centre =
    v.scope === "neighbors" || v.scope === "search" ? s.centre : null;
  if (centre) visible.add(centre);
  for (const r of expanded) {
    r.nodes.forEach((id) => {
      visible.add(id);
      if (topicMap.has(id) && !records.has(id))
        records.set(id, {
          ...topicMap.get(id)!,
          context: !v.endpoint_ids.includes(id),
        });
    });
    r.edges.forEach((id) => factIds.add(id));
  }
  // Keep the captured query's results, but do not let route reveal or an
  // endpoint match reinsert the centre the user explicitly removed.
  if (!s.centre && s.anchor) visible.delete(s.anchor);
  if (v.scope !== "search") v.edges.forEach((e) => factIds.add(e.id));
  else
    for (const r of routes)
      if (r.nodes.length === 2) r.edges.forEach((id) => factIds.add(id));
  const groups = new Map<string, { label: string; ids: string[] }>();
  for (const id of visible) {
    const t = records.get(id);
    if (!t) continue;
    if (v.scope !== "overview" && (s.grouping === "none" || id === centre))
      continue;
    const place = recordedPlaceId(t, c),
      g =
        v.scope === "overview"
          ? {
              id: rootGroup(id, c),
              label:
                GROUP_LABELS[rootGroup(id, c).split(":").at(-1)!] || t.kind,
            }
          : s.grouping === "family"
            ? family(t, c)
            : s.grouping === "type"
              ? { id: t.kind, label: t.kind }
              : {
                  id: place || "unrecorded",
                  label: placeLabel(place, c),
                };
    if (!groups.has(g.id)) groups.set(g.id, { label: g.label, ids: [] });
    groups.get(g.id)!.ids.push(id);
  }
  const cards: SceneCard[] = [],
    representative = new Map<string, string>(),
    groupIds = [...groups.keys()].sort((a, b) =>
      v.scope === "overview"
        ? ROOT_GROUPS.indexOf(a) - ROOT_GROUPS.indexOf(b)
        : groups.get(a)!.label.localeCompare(groups.get(b)!.label),
    );
  for (const key of groupIds) {
    const g = groups.get(key)!,
      id = "display-group:" + key;
    if (s.expandedGroups.includes(id) && v.scope !== "overview") continue;
    const record: Item = {
      id,
      label: g.label,
      kind: "group",
      domain: records.get(g.ids[0])?.domain || "other",
      count: g.ids.length,
      groupKey: key,
      displayGroup: true,
      context: false,
    };
    cards.push({
      id,
      record,
      position: { x: 0, y: 0 },
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      members: g.ids,
    });
    g.ids.forEach((member) => representative.set(member, id));
  }
  for (const id of [...visible].sort((a, b) =>
    (topicMap.get(a)?.label || a).localeCompare(topicMap.get(b)?.label || b),
  )) {
    if (representative.has(id) || !records.has(id)) continue;
    const record: Item = { ...records.get(id)!, viewCentre: id === centre };
    // History retains its membership/layout; names follow the canonical database ID.
    const canonical = topicMap.get(id);
    if (canonical?.kind === "species") {
      for (const key of ["spanish_name", "english_name", "scientific_name", "name_status", "plant_images"])
        record[key] = canonical[key];
    }
    cards.push({
      id,
      record,
      position: { x: 0, y: 0 },
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      members: [id],
    });
    representative.set(id, id);
  }
  if (s.pendingDomain && s.pendingDomain !== "all") {
    const context = new Set(centre ? [centre] : []);
    for (const r of expanded) {
      if (topicMap.get(r.endpoint)?.domain === s.pendingDomain)
        r.nodes.slice(0, -1).forEach((id) => context.add(id));
    }
    for (const card of cards) {
      const matching = card.members.filter(
        (id) => topicMap.get(id)?.domain === s.pendingDomain || context.has(id),
      );
      card.outOfDomain = matching.length === 0;
      card.matchingDomainCount = matching.length;
      if (
        card.members.length === 1 &&
        context.has(card.id) &&
        topicMap.get(card.id)?.domain !== s.pendingDomain
      )
        card.record.context = true;
    }
  }
  // Every scope shares one dense layout. Reuse a complete healthy grid so camera
  // changes/reloads do not rearrange cards; changed membership repacks without gaps.
  const saved = cards.map((card) => s.positions[card.id]);
  const complete = saved.every(
    (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  const preserve = complete && (s.pendingDomain || hasCompactGridPositions(saved));
  const grid = compactGrid(cards.length, aspect, CARD_WIDTH, CARD_HEIGHT).points;
  const positions: Record<string, Point> = {};
  cards.forEach((card, i) => {
    card.position = { ...(preserve ? saved[i] : grid[i]) };
    positions[card.id] = card.position;
  });
  const links: SceneLink[] = [],
    ledger = new Set<string>(),
    aggregates = new Map<string, SceneLink>(),
    internal = new Map<string, string[]>();
  for (const eid of factIds) {
    const e = c.relationships.find((e) => e.id === eid);
    if (!e || ledger.has(eid)) continue;
    const a = representative.get(e.source),
      b = representative.get(e.target);
    if (!a || !b) continue;
    ledger.add(eid);
    if (a === b) {
      if (!internal.has(a)) internal.set(a, []);
      internal.get(a)!.push(eid);
      continue;
    }
    if (a === e.source && b === e.target)
      links.push({
        id: e.id,
        source: a,
        target: b,
        record: e,
        relationshipIds: [e.id],
      });
    else {
      const key = [a, b].sort().join("|") + ":" + (e.basis || "source");
      if (!aggregates.has(key))
        aggregates.set(key, {
          id: "summary:" + key,
          source: a,
          target: b,
          record: {
            id: "summary:" + key,
            label: "",
            kind: "summary",
            constituent_ids: [],
            basis: e.basis,
          },
          relationshipIds: [],
        });
      aggregates.get(key)!.relationshipIds.push(eid);
    }
  }
  for (const e of aggregates.values()) {
    e.record.label = e.relationshipIds.length + " recorded connections";
    e.record.constituent_ids = e.relationshipIds;
    links.push(e);
  }
  for (const r of routes) {
    if (s.expandedRoutes.includes(r.id) || r.nodes.length < 3) continue;
    const a = representative.get(r.nodes[0]),
      b = representative.get(r.endpoint);
    if (!a || !b || a === b) continue;
    links.push({
      id: r.id,
      source: a,
      target: b,
      record: {
        ...r,
        label: "via " + (r.nodes.length - 2) + " topics",
        kind: "route",
      },
      relationshipIds: [],
    });
  }
  const signature = JSON.stringify([
    cards.map((c) => [c.id, c.position]),
    links.map((e) => e.id),
  ]);
  const key = scenePresentationKey(signature);
  // Older histories use geometry-based keys. Retain a read-only alias so packing
  // their rings/scattered slots cannot lose moved offsets, closed layers or sources.
  const previousKey = complete && !preserve
    ? scenePresentationKey(JSON.stringify([
        cards.map((card, i) => [card.id, saved[i]]),
        links.map((e) => e.id),
      ]))
    : undefined;
  return {
    openedFrom: s.openedFrom,
    openingCandidates: openingCandidates(s, c),
    cards,
    links,
    internal: [...internal].map(([cardId, ids]) => ({ cardId, ids })),
    positions,
    label: contextLabel(s, c) + (s.search ? " · " + s.search : ""),
    signature,
    key,
    previousKey,
    offset: s.layerOffsets?.[key] ||
      (previousKey ? s.layerOffsets?.[previousKey] : undefined) || { x: 0, y: 0 },
  };
}
export function previousScenes(
  entries: State[],
  index: number,
  catalog: Catalog,
  aspect: number,
) {
  const result: Scene[] = [];
  if (entries[index]?.scope === "overview" || entries[index]?.layerRoot)
    return result;
  const current = entries[index],
    active = current.view
      ? buildScene(current, current.view, catalog, aspect)
      : null;
  let signature = active?.signature || "";
  const seen = new Set([signature]);
  for (let i = index - 1; i >= 0 && result.length < 2; i--) {
    const s = entries[i];
    if (!s.view) continue;
    const scene = buildScene(s, s.view, catalog, aspect);
    const root = s.scope === "overview" || s.layerRoot;
    if (seen.has(scene.signature)) {
      if (root) break;
      continue;
    }
    scene.offset = entries[index]?.layerOffsets?.[scene.key] ||
      (scene.previousKey ? entries[index]?.layerOffsets?.[scene.previousKey] : undefined) || scene.offset;
    seen.add(scene.signature);
    result.push(scene);
    signature = scene.signature;
    if (root) break;
  }
  const visible = result.filter(
    (scene) => !entries[index]?.closedLayers?.some((key) =>
      scene.key === key || scene.previousKey === key),
  );
  return active ? highlightOpeningSources(active, visible) : visible;
}

/** Stable presentation identity: moving a layer never changes its graph identity. */
export function scenePresentationKey(signature: string) {
  let first = 2166136261,
    second = 5381;
  for (const c of signature) {
    first = Math.imul(first ^ c.charCodeAt(0), 16777619);
    second = Math.imul(second, 33) ^ c.charCodeAt(0);
  }
  return (
    "graph:" + (first >>> 0).toString(16) + ":" + (second >>> 0).toString(16)
  );
}
