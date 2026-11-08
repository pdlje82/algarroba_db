import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { type Scene, PLANE_GAP, isInteractiveRecord, sceneFrame } from "./scene";
import {
  cardMesh,
  textMesh,
  connectionTextMesh,
  disposeTree,
  hoverFrameGeometry,
} from "./sceneMeshes";
import { palettes, type Theme } from "./appearance";
import { layerPoint, viewAngles, BACKGROUND_BRIGHTNESS, DRAG_SENSITIVITY } from "./interactions";
import { controlIsOccluded, projectControlOccluders } from "./layerControls";
import type { CameraPose, Point } from "./types";
export type SceneHandle = {
  fit: () => void;
  reset: () => void;
  zoom: (factor: number) => void;
  turn: (side: number, tilt: number) => void;
  pose: () => CameraPose | undefined;
};
type Props = {
  scene: Scene;
  previous: Scene[];
  theme: Theme;
  selected: string | null;
  activeEdges: string[];
  pending: string[];
  additions: string[];
  camera?: CameraPose;
  restore: number;
  onSelect: (record: any) => void;
  onOpenGroup: (record: any) => void;
  busy: boolean;
  baseLayer: boolean;
  onCloseLayer: (key: string) => void;
  domainUpdatePending: boolean;
  onUpdateDomain: () => void;
  onClear: () => void;
  onLayerMove: (key: string, point: Point) => void;
  onPose: (pose: CameraPose) => void;
  onError: (message: string) => void;
};
const rad = (n: number) => (n * Math.PI) / 180,
  empty = { nodes: [], links: [] },
  // Closely spaced cards, labels and the translucent layer must remain distinct
  // throughout the wide zoom range, including oblique camera angles.
  rendererConfig = { logarithmicDepthBuffer: true };
export const SceneView = forwardRef<SceneHandle, Props>(
  function SceneView(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      graph = useRef<ForceGraphMethods<any, any> | undefined>(undefined),
      root = useRef<THREE.Group | null>(null),
      pick = useRef<THREE.Object3D[]>([]),
      hovered = useRef<THREE.Object3D | null>(null),
      hoverPointer = useRef<Point | null>(null),
      nodeClick = useRef<{
        id: string;
        layerKey: string;
        repeated: boolean;
      } | null>(null),
      live = useRef(props),
      rotationDrag = useRef<{
        pointerId: number;
        screen: Point;
        position: THREE.Vector3;
        target: THREE.Vector3;
        radius: number;
        side: number;
        tilt: number;
        controlsEnabled: boolean;
      } | null>(null),
      layerLabels = useRef<THREE.Object3D[]>([]),
      opaqueSurfaces = useRef<THREE.Mesh<THREE.PlaneGeometry>[]>([]),
      closeButtons = useRef(new Map<string, HTMLButtonElement>()),
      updateButton = useRef<HTMLButtonElement | null>(null),
      layerDrag = useRef<{
        pointerId: number;
        key: string;
        layer: THREE.Group;
        start: THREE.Vector3;
        offset: Point;
        screen: Point;
        moved: boolean;
        controlsEnabled: boolean;
      } | null>(null);
    live.current = props;
    const [size, setSize] = useState({ width: 900, height: 650 }),
      [ready, setReady] = useState(false);
    const cameraTimer = useRef<any>(null),
      initial = useRef(true),
      pointer = useRef<{ x: number; y: number; modifier: boolean } | null>(
        null,
      );
    const get = () => {
      const g = graph.current;
      if (!g) return null;
      return {
        g,
        camera: g.camera() as THREE.PerspectiveCamera,
        controls: g.controls() as any,
      };
    };
    const pose = (): CameraPose | undefined => {
      const v = get();
      return v
        ? {
            position: {
              x: v.camera.position.x,
              y: v.camera.position.y,
              z: v.camera.position.z,
            },
            target: {
              x: v.controls.target.x,
              y: v.controls.target.y,
              z: v.controls.target.z,
            },
          }
        : undefined;
    };
    const duration = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;
    const move = (position: THREE.Vector3, target: THREE.Vector3) => {
      const v = get();
      if (v) v.g.cameraPosition(position, target, duration());
    };
    const fit = (reset = false) => {
      const v = get();
      if (!v) return;
      const cards = live.current.scene.cards;
      if (!cards.length) return;
      const box = new THREE.Box3();
      const frame=sceneFrame(live.current.scene,size.width/size.height),offset=live.current.scene.offset;
      box.expandByPoint(new THREE.Vector3(frame.minX+offset.x,frame.minY+offset.y,0));
      box.expandByPoint(new THREE.Vector3(frame.maxX+offset.x,frame.maxY+offset.y,0));
      const target = box.getCenter(new THREE.Vector3()),
        dimensions = box.getSize(new THREE.Vector3()),
        dir = reset
          ? new THREE.Vector3(0, Math.sin(rad(25)), Math.cos(rad(25)))
          : v.camera.position.clone().sub(v.controls.target).normalize();
      const distance = Math.max(
        700,
        (Math.max(dimensions.y + 220, (dimensions.x + 150) / v.camera.aspect) /
          (2 * Math.tan(rad(v.camera.fov) / 2))) *
          1.25,
      );
      move(target.clone().addScaledVector(dir, distance), target);
    };
    const zoom = (factor: number) => {
      const v = get();
      if (v) {
        const d = v.camera.position.clone().sub(v.controls.target);
        d.setLength(Math.max(250, Math.min(100000, d.length() * factor)));
        move(v.controls.target.clone().add(d), v.controls.target.clone());
      }
    };
    const turn = (side: number, tilt: number) => {
      const v = get();
      if (v) {
        const s = new THREE.Spherical().setFromVector3(
          v.camera.position.clone().sub(v.controls.target),
        );
        const angles = viewAngles(
          THREE.MathUtils.radToDeg(s.theta) + side,
          90 - THREE.MathUtils.radToDeg(s.phi) + tilt,
        );
        s.theta = rad(angles.side);
        s.phi = rad(90 - angles.tilt);
        move(
          v.controls.target
            .clone()
            .add(new THREE.Vector3().setFromSpherical(s)),
          v.controls.target.clone(),
        );
      }
    };
    useImperativeHandle(ref, () => ({
      fit: () => fit(),
      reset: () => fit(true),
      zoom,
      turn,
      pose,
    }));
    useEffect(() => {
      const el = host.current!;
      const observer = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        setSize({ width: Math.max(1, r.width), height: Math.max(1, r.height) });
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);
    useEffect(() => {
      let timer = setTimeout(() => setReady(true), 30);
      return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
      if(!ready)return;
      // Trackball caches canvas dimensions at construction, before the graph has
      // its final size. Refresh after layout so pointer deltas use the real canvas.
      const frame=requestAnimationFrame(()=>get()?.controls.handleResize());
      return ()=>cancelAnimationFrame(frame);
    },[ready,size.width,size.height]);
    useEffect(() => {
      if (!ready) return;
      const v = get();
      if (!v) return;
      v.camera.up.set(0, 1, 0);
      v.camera.far = 250000;
      v.camera.updateProjectionMatrix();
      Object.assign(v.controls, {
        staticMoving: true,
        enablePan: true,
        panSpeed: DRAG_SENSITIVITY,
        enableRotate: true,
        minPolarAngle: rad(30),
        maxPolarAngle: rad(150),
        minAzimuthAngle: rad(-60),
        maxAzimuthAngle: rad(60),
        minDistance: 250,
        maxDistance: 100000,
      });
      v.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      v.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      const changed = () => {
        clearTimeout(cameraTimer.current);
        cameraTimer.current = setTimeout(() => {
          if (layerDrag.current || rotationDrag.current) return;
          const p = pose();
          if (p) live.current.onPose(p);
        }, 100);
      };
      v.controls.addEventListener("change", changed);
      return () => {
        v.controls.removeEventListener("change", changed);
        clearTimeout(cameraTimer.current);
      };
    }, [ready]);
    useEffect(() => {
      if (!ready) return;
      const v = get();
      if (!v) return;
      const group = new THREE.Group(),
        selectable: THREE.Object3D[] = [],
        labels: THREE.Object3D[] = [],
        surfaces: THREE.Mesh<THREE.PlaneGeometry>[] = [];
      const p = palettes[props.theme];
      const render = (scene: Scene, z: number, historical: boolean) => {
        const layer = new THREE.Group();
        layer.position.set(scene.offset.x, scene.offset.y, z);
        layer.userData.layerKey = scene.key;
        group.add(layer);
        for (const c of scene.cards) {
          const opened = historical && !!scene.openedCardIds?.includes(c.id);
          const mesh = cardMesh(
            c,
            props.theme,
            opened ||
              (!historical &&
                !c.outOfDomain &&
                (props.selected === c.id || props.additions.includes(c.id))),
            !historical && props.pending.includes(c.id),
          );
          if ((historical && !opened) || (!historical && c.outOfDomain))
            (mesh.material as THREE.MeshBasicMaterial).color.multiplyScalar(
              BACKGROUND_BRIGHTNESS,
            );
          if (!historical) {
            mesh.userData.record = c.record;
            mesh.userData.interactive = isInteractiveRecord(scene, c.id);
            if (mesh.userData.interactive) {
              const outline = new THREE.Mesh(
                hoverFrameGeometry(c.width, c.height),
                new THREE.MeshBasicMaterial({
                  color: p.active,
                  side: THREE.DoubleSide,
                }),
              );
              outline.position.z = -0.2;
              outline.visible = false;
              mesh.add(outline);
              mesh.userData.hoverOutline = outline;
            }
            selectable.push(mesh);
          }
          layer.add(mesh);
          surfaces.push(mesh);
        }
        const cards = new Map(scene.cards.map((c) => [c.id, c]));
        for (const e of scene.links) {
          const a = cards.get(e.source),
            b = cards.get(e.target);
          if (!a || !b) continue;
          const dx = b.position.x - a.position.x,
            dy = -b.position.y + a.position.y;
          if (Math.abs(dx) + Math.abs(dy) < 0.01) continue;
          const port = (c: typeof a, sign: number) => {
            const t = Math.min(
              c!.width / 2 / Math.max(0.0001, Math.abs(dx)),
              c!.height / 2 / Math.max(0.0001, Math.abs(dy)),
            );
            return new THREE.Vector3(
              c!.position.x + sign * dx * t,
              -c!.position.y + sign * dy * t,
              1,
            );
          };
          const start = port(a, 1),
            end = port(b, -1),
            active =
              !historical &&
              (props.selected === e.id ||
                e.relationshipIds.some((id) => props.activeEdges.includes(id))),
            color = new THREE.Color(active ? p.active : p.edge);
          const dimmed = historical || !!a.outOfDomain || !!b.outOfDomain;
          if (dimmed) color.multiplyScalar(BACKGROUND_BRIGHTNESS);
          const material = new LineMaterial({
            color,
            linewidth: active ? 3 : 1.5,
            dashed: e.record.kind === "route" || e.record.basis === "curated",
            dashSize: e.record.basis === "curated" ? 2 : 9,
            gapSize: 5,
            depthTest: true,
            depthWrite: true,
          });
          material.resolution.set(size.width, size.height);
          const geometry = new LineGeometry();
          geometry.setPositions([...start.toArray(), ...end.toArray()]);
          const line = new Line2(geometry, material);
          line.computeLineDistances();
          layer.add(line);
          if (!historical) {
            line.userData.record = e.record;
            line.userData.interactive = isInteractiveRecord(scene, e.id);
            selectable.push(line);
            if (e.centreSpoke || active || e.record.kind === "route") {
              const placement=e.labelPlacement;
              const label = placement ? connectionTextMesh(placement.lines,placement.width,placement.height,props.theme) : textMesh(
                e.record.label,
                props.theme,
                Math.min(
                  310,
                  Math.max(140, (e.record.label?.length || 15) * 7),
                ),
                32,
              );
              label.position.copy(start.clone().lerp(end, 0.5));
              if(placement)label.position.set(placement.position.x,-placement.position.y,3);
              label.position.z = 3;
              if(placement?.anchor){
                const leader=new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(placement.anchor.x,-placement.anchor.y,2),
                  new THREE.Vector3(placement.position.x,-placement.position.y,2),
                ]),new THREE.LineBasicMaterial({color}));
                layer.add(leader);
              }
              label.userData.record = e.record;
              label.userData.interactive = line.userData.interactive;
              if (dimmed)
                label.material.color.multiplyScalar(BACKGROUND_BRIGHTNESS);
              layer.add(label);
              surfaces.push(label);
              selectable.push(label);
            }
          }
          if (e.relationshipIds.length === 1 || e.record.directed) {
            const direction = end.clone().sub(start).normalize(),
              arrow = new THREE.Mesh(
                new THREE.ConeGeometry(4, 12, 6),
                new THREE.MeshBasicMaterial({ color }),
              );
            arrow.position.copy(end.clone().addScaledVector(direction, -7));
            arrow.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              direction,
            );
            layer.add(arrow);
          }
        }
        if (scene.cards.length) {
          const {minX,maxX,minY,maxY}=sceneFrame(scene,size.width/size.height);
          if (!historical) {
            // The full layer surface softens previous views through the gaps.
            // Keep it behind foreground content without masking the depth buffer.
            const background = new THREE.Mesh(
              new THREE.PlaneGeometry(maxX - minX, maxY - minY),
              new THREE.MeshBasicMaterial({
                color: p.canvas,
                transparent: true,
                opacity: 0.7,
                depthWrite: false,
                side: THREE.DoubleSide,
                forceSinglePass: true,
              }),
            );
            background.position.set((minX + maxX) / 2, (minY + maxY) / 2, -1);
            background.renderOrder = -1;
            layer.add(background);
          }
          const geo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(minX, minY, 0),
              new THREE.Vector3(maxX, minY, 0),
              new THREE.Vector3(maxX, maxY, 0),
              new THREE.Vector3(minX, maxY, 0),
            ]),
            border = new THREE.LineLoop(
              geo,
              new THREE.LineBasicMaterial({
                color: historical
                  ? new THREE.Color(p.border).multiplyScalar(
                      BACKGROUND_BRIGHTNESS,
                    )
                  : p.border,
              }),
            );
          layer.add(border);
          const title = textMesh(
            (historical ? "Previous view · " : "") + scene.label,
            props.theme,
            Math.min(700, maxX - minX),
            44,
            historical ? p.canvas : p.layerLabel,
          );
          title.position.set((minX + maxX) / 2, maxY + 35, 2);
          if (historical)
            (title.material as THREE.MeshBasicMaterial).color.multiplyScalar(
              BACKGROUND_BRIGHTNESS,
            );
          title.userData.layerKey = scene.key;
          title.userData.layer = layer;
          labels.push(title);
          layer.add(title);
          surfaces.push(title);
        }
        if (!historical) {
          // Composite the backplate before foreground content in the same queue.
          // Screen-space thick lines can extend behind its plane at steep angles;
          // a late transparent pass would otherwise paint across those fragments.
          // All foreground material opacities stay at 1 (fully opaque).
          layer.traverse((object) => {
            const material = (object as THREE.Mesh).material;
            for (const m of Array.isArray(material) ? material : material ? [material] : []) {
              m.transparent = true;
              m.forceSinglePass = true;
            }
          });
        }
      };
      props.previous
        .slice()
        .reverse()
        .forEach((scene, i) =>
          render(scene, -(props.previous.length - i) * PLANE_GAP, true),
        );
      render(props.scene, 0, false);
      if (root.current) {
        v.g.scene().remove(root.current);
        disposeTree(root.current);
      }
      v.g.scene().add(group);
      root.current = group;
      pick.current = selectable;
      layerLabels.current = labels;
      opaqueSurfaces.current = surfaces;
      return () => {
        setHovered(null);
        if (layerDrag.current?.layer.parent === group) finishLayerDrag(false);
        v.g.scene().remove(group);
        disposeTree(group);
        if (root.current === group) root.current = null;
        if (opaqueSurfaces.current === surfaces) opaqueSurfaces.current = [];
      };
    }, [
      ready,
      props.scene,
      props.previous,
      props.theme,
      props.selected,
      props.activeEdges.join("|"),
      props.pending.join("|"),
      props.additions.join("|"),
      size.width,
      size.height,
    ]);
    useEffect(() => {
      if (!ready) return;
      const v = get();
      if (!v) return;
      if (props.camera) {
        const p = props.camera;
        v.g.cameraPosition(p.position, p.target, 0);
      } else {
        fit(initial.current);
      }
      initial.current = false;
    }, [ready, props.restore]);
    // HTML controls need explicit depth occlusion as they render above WebGL.
    useEffect(() => {
      if (!ready) return;
      let frame = 0;
      const positionButtons = () => {
        const v = get();
        if (v) {
          v.camera.updateMatrixWorld();
          root.current?.updateMatrixWorld(true);
          const occluders = projectControlOccluders(
            opaqueSurfaces.current,
            v.camera,
            size,
          );
          const labels = layerLabels.current
            .slice()
            .sort(
              (a, b) =>
                b.getWorldPosition(new THREE.Vector3()).z -
                a.getWorldPosition(new THREE.Vector3()).z,
            );
          for (const label of labels) {
            const key = label.userData.layerKey,
              button = closeButtons.current.get(key);
            if (!button) continue;
            label.updateWorldMatrix(true, false);
            const width = (label as THREE.Mesh<THREE.PlaneGeometry>).geometry
              .parameters.width;
            const world = label.localToWorld(
              new THREE.Vector3(width / 2 + 18, 0, 0),
            );
            const point = world.clone().project(v.camera);
            const x = ((point.x + 1) * size.width) / 2,
              y = ((1 - point.y) * size.height) / 2;
            const placeControl = (
              control: HTMLButtonElement,
              x: number,
              y: number,
            ) => {
              control.style.left = x + "px";
              control.style.top = y + "px";
              const halfSize = {
                x: control.offsetWidth / 2,
                y: control.offsetHeight / 2,
              };
              const visible =
                point.z >= -1 &&
                point.z <= 1 &&
                x >= halfSize.x &&
                x <= size.width - halfSize.x &&
                y >= halfSize.y &&
                y <= size.height - halfSize.y &&
                !controlIsOccluded({ x, y }, halfSize, world.z, key, occluders);
              control.style.visibility = visible ? "visible" : "hidden";
              if (visible)
                occluders.push({
                  layerKey: key,
                  z: world.z,
                  polygon: [
                    { x: x - halfSize.x, y: y - halfSize.y },
                    { x: x + halfSize.x, y: y - halfSize.y },
                    { x: x + halfSize.x, y: y + halfSize.y },
                    { x: x - halfSize.x, y: y + halfSize.y },
                  ],
                });
            };
            placeControl(button, x, y);
            if (key === live.current.scene.key && updateButton.current)
              placeControl(
                updateButton.current,
                x +
                  button.offsetWidth / 2 +
                  6 +
                  updateButton.current.offsetWidth / 2,
                y,
              );
          }
          refreshHover();
        }
        frame = requestAnimationFrame(positionButtons);
      };
      frame = requestAnimationFrame(positionButtons);
      return () => cancelAnimationFrame(frame);
    }, [ready, size.width, size.height]);
    const hitAt = (x: number, y: number) => {
      const v = get(),
        rect = host.current?.getBoundingClientRect();
      if (!v || !rect) return null;
      v.g.scene().updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((x - rect.left) / rect.width) * 2 - 1,
          (-(y - rect.top) / rect.height) * 2 + 1,
        ),
        v.camera,
      );
      return (
        ray.intersectObjects(
          [...new Set([...opaqueSurfaces.current, ...pick.current])],
          false,
        )[0]?.object || null
      );
    };
    const labelAt = (x: number, y: number) => {
      const hit = hitAt(x, y);
      return hit?.userData.layerKey ? hit : null;
    };
    const setHovered = (next: THREE.Object3D | null) => {
      if (hovered.current === next) return;
      if (hovered.current?.userData.hoverOutline)
        hovered.current.userData.hoverOutline.visible = false;
      if (next?.userData.hoverOutline)
        next.userData.hoverOutline.visible = true;
      hovered.current = next;
    };
    const refreshHover = () => {
      if (layerDrag.current || rotationDrag.current) return;
      const point = hoverPointer.current;
      if (!point || pointer.current || live.current.busy) {
        setHovered(null);
        return;
      }
      const hit = hitAt(point.x, point.y);
      setHovered(
        hit?.userData.interactive && hit.userData.hoverOutline ? hit : null,
      );
      if (host.current)
        host.current.style.cursor = hit?.userData.layerKey
          ? "grab"
          : hit?.userData.interactive
            ? "pointer"
            : "";
    };
    const finishRotation = (commit: boolean) => {
      const d = rotationDrag.current;
      if (!d) return;
      rotationDrag.current = null;
      pointer.current = null;
      const v = get();
      if (v) {
        if (!commit) {
          v.camera.position.copy(d.position);
          v.controls.target.copy(d.target);
          v.camera.lookAt(d.target);
        }
        v.controls.enabled = d.controlsEnabled;
        v.controls.update();
      }
      if (host.current?.hasPointerCapture(d.pointerId))
        host.current.releasePointerCapture(d.pointerId);
      if (host.current) host.current.style.cursor = "";
      const p = pose();
      if (p) live.current.onPose(p);
    };
    const finishLayerDrag = (commit: boolean) => {
      const d = layerDrag.current;
      if (!d) return;
      layerDrag.current = null;
      pointer.current = null;
      const next = { x: d.layer.position.x, y: d.layer.position.y };
      if (!commit)
        d.layer.position.set(d.offset.x, d.offset.y, d.layer.position.z);
      const v = get();
      if (v) v.controls.enabled = d.controlsEnabled;
      if (host.current?.hasPointerCapture(d.pointerId))
        host.current.releasePointerCapture(d.pointerId);
      if (host.current) host.current.style.cursor = "";
      if (commit && d.moved) live.current.onLayerMove(d.key, next);
    };
    useEffect(() => {
      const cancel = (e: KeyboardEvent) => {
        if (e.key === "Escape" && (layerDrag.current || rotationDrag.current)) {
          e.preventDefault();
          finishLayerDrag(false);
          finishRotation(false);
        }
      };
      window.addEventListener("keydown", cancel);
      return () => {
        window.removeEventListener("keydown", cancel);
        finishLayerDrag(false);
        finishRotation(false);
      };
    }, []);
    const startLayerDrag = (e: React.PointerEvent) => {
      if ((e.target as Element).closest("button")) {
        nodeClick.current = null;
        return;
      }
      setHovered(null);
      if (e.button !== 0) return;
      if (e.ctrlKey || e.shiftKey || e.metaKey) {
        nodeClick.current = null;
        const v = get();
        if (!v) return;
        e.stopPropagation();
        e.preventDefault();
        pointer.current = null;
        const relative = v.camera.position.clone().sub(v.controls.target),
          spherical = new THREE.Spherical().setFromVector3(relative);
        rotationDrag.current = {
          pointerId: e.pointerId,
          screen: { x: e.clientX, y: e.clientY },
          position: v.camera.position.clone(),
          target: v.controls.target.clone(),
          radius: relative.length(),
          side: THREE.MathUtils.radToDeg(spherical.theta),
          tilt: 90 - THREE.MathUtils.radToDeg(spherical.phi),
          controlsEnabled: v.controls.enabled,
        };
        v.controls.enabled = false;
        host.current!.setPointerCapture(e.pointerId);
        host.current!.style.cursor = "grabbing";
        return;
      }
      const label = labelAt(e.clientX, e.clientY),
        v = get(),
        rect = host.current?.getBoundingClientRect();
      if (!label || !v || !rect) return;
      nodeClick.current = null;
      const layer = label.userData.layer as THREE.Group,
        start = layerPoint(
          { x: e.clientX, y: e.clientY },
          rect,
          v.camera,
          layer.position.z,
        );
      if (!start) return;
      e.stopPropagation();
      e.preventDefault();
      pointer.current = null;
      layerDrag.current = {
        pointerId: e.pointerId,
        key: label.userData.layerKey,
        layer,
        start,
        offset: { x: layer.position.x, y: layer.position.y },
        screen: { x: e.clientX, y: e.clientY },
        moved: false,
        controlsEnabled: v.controls.enabled,
      };
      v.controls.enabled = false;
      host.current!.setPointerCapture(e.pointerId);
      host.current!.style.cursor = "grabbing";
    };
    const moveLayerDrag = (e: React.PointerEvent) => {
      if (
        !layerDrag.current &&
        !rotationDrag.current &&
        (e.target as Element).closest("button")
      ) {
        hoverPointer.current = null;
        setHovered(null);
        if (host.current) host.current.style.cursor = "";
        return;
      }
      hoverPointer.current = { x: e.clientX, y: e.clientY };
      const rotation = rotationDrag.current;
      if (rotation) {
        if (rotation.pointerId !== e.pointerId) return;
        e.stopPropagation();
        e.preventDefault();
        const v = get(),
          rect = host.current?.getBoundingClientRect();
        if (!v || !rect) return;
        const angles = viewAngles(
            rotation.side -
              ((e.clientX - rotation.screen.x) * 180 * DRAG_SENSITIVITY) / rect.width,
            rotation.tilt +
              ((e.clientY - rotation.screen.y) * 180 * DRAG_SENSITIVITY) / rect.height,
          ),
          relative = new THREE.Vector3().setFromSpherical(
            new THREE.Spherical(
              rotation.radius,
              rad(90 - angles.tilt),
              rad(angles.side),
            ),
          );
        v.camera.position.copy(rotation.target).add(relative);
        v.controls.target.copy(rotation.target);
        v.camera.lookAt(rotation.target);
        v.camera.updateMatrixWorld();
        return;
      }
      const d = layerDrag.current;
      if (!d) {
        if (!e.buttons) refreshHover();
        return;
      }
      if (e.pointerId !== d.pointerId) return;
      e.stopPropagation();
      e.preventDefault();
      if (
        !d.moved &&
        Math.hypot(e.clientX - d.screen.x, e.clientY - d.screen.y) < 4
      )
        return;
      const v = get(),
        rect = host.current?.getBoundingClientRect();
      if (!v || !rect) return;
      const current = layerPoint(
        { x: e.clientX, y: e.clientY },
        rect,
        v.camera,
        d.layer.position.z,
      );
      if (!current) return;
      d.moved = true;
      d.layer.position.set(
        d.offset.x + (current.x - d.start.x) * DRAG_SENSITIVITY,
        d.offset.y + (current.y - d.start.y) * DRAG_SENSITIVITY,
        d.layer.position.z,
      );
      d.layer.updateMatrixWorld(true);
    };
    const onPointerUp = (e: React.PointerEvent) => {
      const from = pointer.current;
      pointer.current = null;
      if (
        !from ||
        from.modifier ||
        Math.hypot(from.x - e.clientX, from.y - e.clientY) > 4
      ) {
        nodeClick.current = null;
        return;
      }
      if (live.current.busy) return;
      const hit = hitAt(e.clientX, e.clientY);
      if (hit?.userData.interactive) {
        const id = hit.userData.record.id,
          layerKey = live.current.scene.key;
        nodeClick.current = {
          id,
          layerKey,
          repeated:
            nodeClick.current?.id === id &&
            nodeClick.current?.layerKey === layerKey,
        };
        live.current.onSelect(hit.userData.record);
      } else {
        nodeClick.current = null;
        if (!hit) live.current.onClear();
      }
    };
    return (
      <div
        ref={host}
        className="graph-canvas"
        aria-label="Layered 3D knowledge graph"
        onPointerDownCapture={startLayerDrag}
        onPointerMoveCapture={moveLayerDrag}
        onDoubleClick={(e) => {
          if (
            (e.target as Element).closest("button") ||
            live.current.busy ||
            e.ctrlKey ||
            e.shiftKey ||
            e.metaKey ||
            e.altKey
          )
            return;
          const hit = hitAt(e.clientX, e.clientY),
            click = nodeClick.current;
          if (
            !hit?.userData.interactive ||
            !hit.userData.record.displayGroup ||
            !click?.repeated ||
            click.id !== hit.userData.record.id ||
            click.layerKey !== live.current.scene.key
          )
            return;
          e.preventDefault();
          e.stopPropagation();
          nodeClick.current = null;
          live.current.onOpenGroup(hit.userData.record);
        }}
        onPointerLeave={() => {
          hoverPointer.current = null;
          setHovered(null);
          if (!layerDrag.current && !rotationDrag.current && host.current)
            host.current.style.cursor = "";
        }}
        onPointerUpCapture={(e) => {
          if (layerDrag.current || rotationDrag.current) {
            e.stopPropagation();
            finishLayerDrag(true);
            finishRotation(true);
          }
        }}
        onPointerCancel={() => {
          nodeClick.current = null;
          finishLayerDrag(false);
          finishRotation(false);
        }}
        onLostPointerCapture={() => {
          finishLayerDrag(false);
          finishRotation(false);
        }}
        onPointerDown={(e) => {
          if (e.button === 0)
            pointer.current = {
              x: e.clientX,
              y: e.clientY,
              modifier: e.ctrlKey || e.shiftKey,
            };
        }}
        onPointerUp={onPointerUp}
      >
        <ForceGraph3D
          ref={graph}
          rendererConfig={rendererConfig}
          controlType="trackball"
          width={size.width}
          height={size.height}
          graphData={empty}
          backgroundColor={palettes[props.theme].canvas}
          showNavInfo={false}
          enableNodeDrag={false}
          cooldownTicks={0}
        />
        {[
          { scene: props.scene, historical: false },
          ...props.previous.map((scene) => ({ scene, historical: true })),
        ].map(({ scene, historical }, index) => (
          <React.Fragment key={scene.key}>
            <button
              ref={(element) => {
                if (element) closeButtons.current.set(scene.key, element);
                else closeButtons.current.delete(scene.key);
              }}
              className="layer-close-button"
              data-layer-key={scene.key}
              style={{ visibility: "hidden", zIndex: 5 - index }}
              aria-label={
                "Close layer: " +
                (historical ? "Previous view · " : "") +
                scene.label
              }
              title={
                !historical && props.baseLayer
                  ? "Overview is the base layer"
                  : "Close layer"
              }
              disabled={props.busy || (!historical && props.baseLayer)}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                live.current.onCloseLayer(scene.key);
              }}
            >
              ×
            </button>
            {!historical && props.domainUpdatePending && (
              <button
                ref={updateButton}
                className="layer-update-button"
                style={{ visibility: "hidden", zIndex: 5 }}
                aria-label="Update layer domain"
                title="Remove topics outside the selected domain"
                disabled={props.busy}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  live.current.onUpdateDomain();
                }}
              >
                Update
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  },
);
export class GraphBoundary extends React.Component<
  { children: React.ReactNode; onError: (s: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError("Graphics initialization failed: " + error.message);
  }
  render() {
    return this.state.failed ? (
      <div className="notice">
        The graph could not start. Use Visible topics and the inspector, or{" "}
        <button onClick={() => this.setState({ failed: false })}>
          Retry graphics
        </button>
        .
      </div>
    ) : (
      this.props.children
    );
  }
}
