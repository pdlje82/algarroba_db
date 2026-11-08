import * as THREE from "three";
import type { Point } from "./types.ts";
export const radians = (n: number) => (n * Math.PI) / 180;
export const VIEW_LIMIT = 60;
export const DRAG_SENSITIVITY = 0.125;
export const BACKGROUND_BRIGHTNESS = 0.35;
export function viewAngles(side: number, tilt: number) {
  return {
    side: Math.max(-VIEW_LIMIT, Math.min(VIEW_LIMIT, side)),
    tilt: Math.max(-VIEW_LIMIT, Math.min(VIEW_LIMIT, tilt)),
  };
}
export function layerPoint(
  point: Point,
  bounds: { left: number; top: number; width: number; height: number },
  camera: THREE.Camera,
  z: number,
) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(
    new THREE.Vector2(
      ((point.x - bounds.left) / bounds.width) * 2 - 1,
      (-(point.y - bounds.top) / bounds.height) * 2 + 1,
    ),
    camera,
  );
  return ray.ray.intersectPlane(
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -z),
    new THREE.Vector3(),
  );
}
