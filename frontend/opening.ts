import type { Catalog, State } from "./types.ts";
import type { Action } from "./exploration.ts";
import type { Scene } from "./scene.ts";
function groupCandidates(id: string, c: Catalog) {
  const focused = id.match(/^display-group:(type|family|place):(.*)$/);
  if (focused) return ["display-group:" + focused[2]];
  const g = c.browse_groups.find((g) => g.id === id);
  return g
    ? [g.anchor_topic_id, "display-group:" + id]
    : ["display-group:" + id];
}
function sourceCard(parent: Scene, ids: string[]) {
  for (const id of ids) {
    const exact = parent.cards.find((card) => card.id === id);
    if (exact) return exact;
  }
  for (const id of ids) {
    const representative = parent.cards.find((card) =>
      card.members.includes(id),
    );
    if (representative) return representative;
  }
}
export function openingSource(
  action: Action,
  parent: Scene,
  c: Catalog,
): State["openedFrom"] {
  const ids =
    action.type === "explore"
      ? [action.id]
      : action.type === "group"
        ? groupCandidates(action.id, c)
        : action.type === "openMembers"
          ? [action.sourceId]
          : [];
  const card = sourceCard(parent, ids);
  return card ? { layerKey: parent.key, cardId: card.id } : undefined;
}
/** Fallback for saved explorations made before explicit source references were recorded. */
export function openingCandidates(s: State, c: Catalog) {
  const group = s.expandedGroups.at(-1);
  if (group) return [group];
  if (s.scope === "group" && s.groupId) return groupCandidates(s.groupId, c);
  if (
    (s.scope === "neighbors" || s.scope === "search") &&
    (s.anchor || s.centre)
  )
    return [s.anchor || s.centre!];
  return [];
}
export function highlightOpeningSources(active: Scene, background: Scene[]) {
  const opened = new Map<string, Set<string>>(),
    visible = [active, ...background];
  for (let i = 0; i < visible.length; i++) {
    const child = visible[i],
      reference = child.openedFrom;
    const parent = reference
      ? background.find((scene) => scene.key === reference.layerKey || scene.previousKey === reference.layerKey)
      : visible[i + 1];
    if (!parent) continue;
    const card = reference
      ? parent.cards.find((card) => card.id === reference.cardId)
      : sourceCard(parent, child.openingCandidates || []);
    if (!card) continue;
    if (!opened.has(parent.key)) opened.set(parent.key, new Set());
    opened.get(parent.key)!.add(card.id);
  }
  return background.map((scene) => ({
    ...scene,
    openedCardIds: [...(opened.get(scene.key) || [])],
  }));
}
