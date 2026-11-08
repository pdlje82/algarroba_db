import type { Catalog, State } from "./types.ts";
import type { History } from "./exploration.ts";
import { reduceExploration } from "./exploration.ts";
import { buildScene, previousScenes } from "./scene.ts";
export type LayerClose = { kind: "foreground" | "background"; state: State };
/** Close presentation without deleting any prior exploration or factual record. */
export function closeLayer(
  h: History,
  key: string,
  catalog: Catalog,
  aspect: number,
): LayerClose | null {
  const current = h.entries[h.index];
  if (!current?.view) return null;
  const active = buildScene(current, current.view, catalog, aspect),
    previous = previousScenes(h.entries, h.index, catalog, aspect);
  if (key !== active.key) {
    if (!previous.some((scene) => scene.key === key)) return null;
    return {
      kind: "background",
      state: {
        ...current,
        closedLayers: [...new Set([...(current.closedLayers || []), key])],
      },
    };
  }
  if (current.scope === "overview") return null;
  const target = previous[0];
  if (target) {
    for (let i = h.index - 1; i >= 0; i--) {
      const s = h.entries[i];
      if (!s.view) continue;
      if (buildScene(s, s.view, catalog, aspect).key === target.key) {
        if (s.scope === "overview") break;
        return {
          kind: "foreground",
          state: {
            ...structuredClone(s),
            layerOffsets: { ...s.layerOffsets, ...current.layerOffsets },
            closedLayers: [
              ...new Set([
                ...(s.closedLayers || []),
                ...(current.closedLayers || []),
                key,
              ]),
            ],
          },
        };
      }
    }
  }
  return {
    kind: "foreground",
    state: reduceExploration(current, { type: "overview" }),
  };
}
