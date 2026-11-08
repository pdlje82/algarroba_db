import * as THREE from "three";
import { palettes, type Theme } from "./appearance.ts";
import type { SceneCard } from "./scene";
import { speciesNames } from "./speciesNames.ts";
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
/** Same measured surface as the circle's collision boxes, without truncated words. */
export function connectionTextMesh(lines: string[], width: number, height: number, theme: Theme) {
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(width*3);canvas.height=Math.ceil(height*3);
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=palettes[theme].canvas;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=palettes[theme].text;ctx.font='bold 60px Segoe UI';ctx.textBaseline='middle';ctx.textAlign='center';
  lines.forEach((line,i)=>ctx.fillText(line,canvas.width/2,canvas.height/2+(i-(lines.length-1)/2)*72,canvas.width-30));
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture(canvas),side:THREE.DoubleSide}));
}
// CPU image cache is bounded by the shipped collection; GPU textures belong to each mesh.
const thumbnails = new Map<string, Promise<HTMLImageElement>>();
function thumbnail(url: string) {
  let task = thumbnails.get(url);
  if (!task) {
    task = new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Plant image unavailable"));
      im.src = url;
    });
    thumbnails.set(url, task);
    if (thumbnails.size > 64)
      thumbnails.delete(thumbnails.keys().next().value!);
  }
  return task;
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
    r.kind === "group"
      ? "BROWSING GROUP"
      : r.name_status === "source-spelling"
        ? "SPECIES · SOURCE SPELLING"
        : r.name_status === "genus-only"
          ? "SPECIES · GENUS ONLY"
          : r.kind.toUpperCase(),
    24,
    44,
  );
  ctx.fillStyle = p.text;
  const whole = r.plant_images?.find((image) => image.role === "whole");
  const imageUrl = whole?.variants.thumbnail?.url;
  const nameX = imageUrl ? 264 : 98,
    nameWidth = imageUrl ? 414 : 576,
    labelX = imageUrl ? 210 : 24;
  if (r.kind === "species") {
    speciesNames(r).forEach((name, i) => {
      const y = 88 + i * 74;
      ctx.fillStyle = p.muted;
      ctx.font = "24px Segoe UI";
      ctx.fillText(name.label, labelX, y);
      ctx.fillStyle = p.text;
      let font = 36;
      let wrapped: string[];
      do {
        ctx.font = `${i === 2 ? "italic" : "bold"} ${font}px Segoe UI`;
        wrapped = lines(ctx, name.value, nameWidth);
        if (wrapped.length <= 2) break;
        font -= 2;
      } while (font >= 22);
      wrapped
        .slice(0, 2)
        .forEach((line, j) => ctx.fillText(line, nameX, y + j * 32, nameWidth));
    });
  } else {
    ctx.font = "bold 48px Segoe UI";
    const label = lines(ctx, r.label, 650);
    label
      .slice(0, 4)
      .forEach((line, i) => ctx.fillText(line, 24, 98 + i * 55, 650));
  }
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
  if (imageUrl) {
    let disposed = false;
    const clear = () => {
      ctx.fillStyle = r.viewCentre
        ? p.centre
        : (p.fills as any)[r.domain] || p.fills.other;
      ctx.fillRect(20, 62, 182, 220);
    };
    const load = () => {
      thumbnail(imageUrl).then(
        (im) => {
          if (disposed) return;
          clear();
          const ratio = Math.min(180 / im.width, 216 / im.height),
            w = im.width * ratio,
            h = im.height * ratio;
          ctx.drawImage(im, 22 + (180 - w) / 2, 64 + (216 - h) / 2, w, h);
          (mesh.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
        },
        () => {
          if (disposed) return;
          clear();
          ctx.fillStyle = p.muted;
          ctx.font = "22px Segoe UI";
          ctx.fillText("Image unavailable", 22, 130, 178);
          ctx.fillText("Retry in Details", 22, 160, 178);
          (mesh.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
        },
      );
    };
    const retry = () => {
      thumbnails.delete(imageUrl);
      load();
    };
    load();
    window.addEventListener("plant-images-retry", retry);
    mesh.userData.disposeImage = () => {
      disposed = true;
      window.removeEventListener("plant-images-retry", retry);
    };
  }
  mesh.position.set(card.position.x, -card.position.y, 6);
  return mesh;
}
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o: any) => {
    o.userData.disposeImage?.();
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
