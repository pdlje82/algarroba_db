import * as THREE from "three";
import { palettes, type Theme } from "./appearance.ts";
import type { SceneCard } from "./scene";
function texture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** A hollow frame cannot paint over the card even at limited depth precision. */
export function hoverFrameGeometry(width: number, height: number) {
  const x = width / 2,
    y = height / 2,
    border = 6;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -x - border,
        -y - border,
        0,
        x + border,
        -y - border,
        0,
        x + border,
        y + border,
        0,
        -x - border,
        y + border,
        0,
        -x,
        -y,
        0,
        x,
        -y,
        0,
        x,
        y,
        0,
        -x,
        y,
        0,
      ],
      3,
    ),
  );
  geometry.setIndex([
    0, 1, 4, 1, 5, 4, 1, 2, 5, 2, 6, 5, 2, 3, 6, 3, 7, 6, 3, 0, 7, 0, 4, 7,
  ]);
  return geometry;
}
function lines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(line + " " + word).width > width) {
      result.push(line);
      line = word;
    } else line += (line ? " " : "") + word;
  }
  if (line) result.push(line);
  return result;
}
export function textMesh(
  text: string,
  theme: Theme,
  width = 240,
  height = 46,
  background = palettes[theme].canvas,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width * 3;
  canvas.height = height * 3;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = palettes[theme].text;
  ctx.font = "bold 42px Segoe UI";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 16, canvas.height / 2, canvas.width - 32);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture(canvas),
      side: THREE.DoubleSide,
    }),
  );
  return mesh;
}
export function cardMesh(
  card: SceneCard,
  theme: Theme,
  selected: boolean,
  pending = false,
) {
  const p = palettes[theme],
    canvas = document.createElement("canvas");
  canvas.width = 702;
  canvas.height = 372;
  const ctx = canvas.getContext("2d")!,
    r = card.record;
  ctx.fillStyle = r.viewCentre
    ? p.centre
    : (p.fills as any)[r.domain] || p.fills.other;
  ctx.fillRect(0, 0, 702, 372);
  ctx.strokeStyle = selected ? p.active : r.viewCentre ? "#c49c51" : p.border;
  ctx.lineWidth = selected ? 14 : 5;
  ctx.strokeRect(7, 7, 688, 358);
  ctx.fillStyle = p.muted;
  ctx.font = "25px Segoe UI";
  ctx.fillText(
    r.kind === "group" ? "BROWSING GROUP" : r.kind.toUpperCase(),
    24,
    44,
  );
  ctx.fillStyle = p.text;
  ctx.font = "bold 48px Segoe UI";
  const label = lines(ctx, r.label, 650);
  label
    .slice(0, 4)
    .forEach((line, i) => ctx.fillText(line, 24, 98 + i * 55, 650));
  ctx.font = "25px Segoe UI";
  ctx.fillStyle = p.muted;
  ctx.fillText(
    card.outOfDomain
      ? "Outside selected domain"
      : card.matchingDomainCount !== undefined && r.count !== undefined
        ? card.matchingDomainCount + " of " + r.count + " topics match"
        : r.count !== undefined
          ? r.count + " topics"
          : r.viewCentre
            ? "CENTRE"
            : r.context
              ? "Connecting context"
              : r.missing
                ? "No route recorded"
                : "",
    24,
    321,
    650,
  );
  if (pending) {
    ctx.fillStyle = p.active;
    ctx.fillText("To research", 24, 354);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(card.width, card.height),
    new THREE.MeshBasicMaterial({
      map: texture(canvas),
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(card.position.x, -card.position.y, 6);
  return mesh;
}
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o: any) => {
    o.geometry?.dispose();
    for (const m of Array.isArray(o.material)
      ? o.material
      : o.material
        ? [o.material]
        : []) {
      m.map?.dispose();
      m.dispose();
    }
  });
}
