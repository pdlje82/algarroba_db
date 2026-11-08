import type { Point } from "./types.ts";

export const CARD_GAP = 24;
export const CARD_WIDTH = 234,
  CARD_HEIGHT = 124;
/** Accept complete centred grids only; partial/fallback slots must be repacked. */
export function hasCompactGridPositions(
  points: (Point | undefined)[],
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
) {
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return false;
  if (!points.length) return true;
  const rows: Point[][] = [];
  for (const p of (points as Point[])
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = rows.at(-1);
    if (last && Math.abs(last[0].y - p.y) < 0.01) last.push(p);
    else rows.push([p]);
  }
  const columns = Math.max(...rows.map((r) => r.length));
  if (rows.length !== Math.ceil(points.length / columns)) return false;
  return rows.every((row, i) => {
    const count = Math.min(columns, points.length - i * columns);
    return (
      row.length === count &&
      row.every(
        (p, j) =>
          Math.abs(p.x - (j - (count - 1) / 2) * (width + CARD_GAP)) < 0.01 &&
          Math.abs(p.y - (i - (rows.length - 1) / 2) * (height + CARD_GAP)) <
            0.01,
      )
    );
  });
}
const WIDTH = 214,
  HEIGHT = 118;
export function compactGrid(
  count: number,
  aspect: number,
  width = WIDTH,
  height = HEIGHT,
) {
  const target = Math.max(0.5, Math.min(3.5, aspect));
  let best = { columns: 1, rows: Math.max(1, count), score: Infinity };
  for (let columns = 1; columns <= Math.max(1, count); columns++) {
    const rows = Math.ceil(Math.max(1, count) / columns),
      w = columns * width + (columns - 1) * CARD_GAP + 64,
      h = rows * height + (rows - 1) * CARD_GAP + 132,
      shape = w / h / target,
      score = w * h * Math.sqrt(Math.max(shape, 1 / shape));
    if (score < best.score) best = { columns, rows, score };
  }
  return {
    columns: best.columns,
    rows: best.rows,
    points: Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / best.columns),
        members = Math.min(best.columns, count - row * best.columns);
      return {
        x: ((i % best.columns) - (members - 1) / 2) * (width + CARD_GAP),
        y: (row - (best.rows - 1) / 2) * (height + CARD_GAP),
      };
    }),
  };
}
