import * as THREE from "three";
import type { Point } from "./types.ts";

export type ControlOccluder = {
  layerKey: string;
  z: number;
  polygon: Point[];
};

// Clip in homogeneous coordinates before projecting: a large card may cross the
// camera's near plane when zooming/turning. Behind-camera corners must not flip.
function clipToFrustum(vertices: THREE.Vector4[]) {
  for (const distance of [
    (p: THREE.Vector4) => p.w + p.x,
    (p: THREE.Vector4) => p.w - p.x,
    (p: THREE.Vector4) => p.w + p.y,
    (p: THREE.Vector4) => p.w - p.y,
    (p: THREE.Vector4) => p.w + p.z,
    (p: THREE.Vector4) => p.w - p.z,
  ]) {
    const next: THREE.Vector4[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i],
        b = vertices[(i + 1) % vertices.length];
      const da = distance(a),
        db = distance(b);
      if (da >= 0) next.push(a);
      if (da >= 0 !== db >= 0) next.push(a.clone().lerp(b, da / (da - db)));
    }
    vertices = next;
    if (!vertices.length) break;
  }
  return vertices;
}

export function projectControlOccluders(
  surfaces: THREE.Mesh<THREE.PlaneGeometry>[],
  camera: THREE.Camera,
  viewport: { width: number; height: number },
): ControlOccluder[] {
  const projection = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  return surfaces.flatMap((surface) => {
    const { width, height } = surface.geometry.parameters;
    const transform = new THREE.Matrix4().multiplyMatrices(
      projection,
      surface.matrixWorld,
    );
    const polygon = clipToFrustum(
      [
        [-width / 2, -height / 2],
        [width / 2, -height / 2],
        [width / 2, height / 2],
        [-width / 2, height / 2],
      ].map(([x, y]) => new THREE.Vector4(x, y, 0, 1).applyMatrix4(transform)),
    ).map((p) => ({
      x: ((p.x / p.w + 1) * viewport.width) / 2,
      y: ((1 - p.y / p.w) * viewport.height) / 2,
    }));
    return polygon.length < 3
      ? []
      : [
          {
            layerKey: surface.parent!.userData.layerKey,
            z: surface.getWorldPosition(new THREE.Vector3()).z,
            polygon,
          },
        ];
  });
}

export function controlIsOccluded(
  centre: Point,
  halfSize: Point,
  z: number,
  layerKey: string,
  occluders: ControlOccluder[],
) {
  return occluders.some((surface) => {
    // All layer surfaces are parallel XY planes; camera turning stays on +Z.
    if (surface.layerKey === layerKey || surface.z <= z + 0.01) return false;
    const p = surface.polygon;
    const axes = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      ...p.map((a, i) => {
        const b = p[(i + 1) % p.length];
        return { x: a.y - b.y, y: b.x - a.x };
      }),
    ];
    return axes.every((axis) => {
      const values = p.map((point) => point.x * axis.x + point.y * axis.y);
      const mid = centre.x * axis.x + centre.y * axis.y;
      const radius =
        Math.abs(axis.x) * halfSize.x + Math.abs(axis.y) * halfSize.y;
      return (
        Math.max(...values) >= mid - radius &&
        Math.min(...values) <= mid + radius
      );
    });
  });
}
