import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes, PLANE_GAP, sceneFrame } from "../frontend/scene.ts";
const { chromium } = await import(
  pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href
);
const url = "http://127.0.0.1:8769";
const health = await (await fetch(url + "/api/health")).json();
assert.ok(
  health.project.replaceAll("\\", "/").endsWith("/output/consolidation-qa"),
);
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  page = await browser.newPage({
    viewport: { width: 1600, height: 1100 },
    reducedMotion: "reduce",
  }),
  checks = [],
  errors = [];
page.setDefaultTimeout(15000);
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, v = true) => {
  assert.ok(v, name);
  checks.push(name);
  console.log("PASS", name);
};
const idle = async () => {
  await page.locator(".graph-canvas canvas").waitFor();
  await page.locator(".loading").waitFor({ state: "hidden" });
  await page.waitForTimeout(600);
};
const session = async () => {
  await page.waitForTimeout(250);
  return page.evaluate(async () => {
    const local = JSON.parse(
        localStorage.getItem("kgb:exploration:v6") || "null",
      ),
      mirror = await new Promise((resolve) => {
        const r = indexedDB.open("kgb-exploration", 1);
        r.onsuccess = () => {
          const q = r.result
            .transaction("sessions")
            .objectStore("sessions")
            .get("kgb:exploration:v6");
          q.onsuccess = () => resolve(q.result);
        };
      });
    return [local, mirror]
      .filter(Boolean)
      .sort((a, b) => b.savedAt - a.savedAt)[0].history;
  });
};
const catalog = await (await fetch(url + "/api/catalog")).json();
const display = async () => {
  const h = await session(),
    s = h.entries[h.index],
    rect = await page.locator(".graph-canvas").boundingBox(),
    camera = new THREE.PerspectiveCamera(
      50,
      rect.width / rect.height,
      0.1,
      250000,
    );
  camera.position.copy(s.camera.position);
  camera.lookAt(new THREE.Vector3().copy(s.camera.target));
  camera.updateMatrixWorld();
  return {
    h,
    s,
    rect,
    camera,
    scene: buildScene(s, s.view, catalog, rect.width / rect.height),
    previous: previousScenes(
      h.entries,
      h.index,
      catalog,
      rect.width / rect.height,
    ),
  };
};
const titlePoint = (scene, z, info, fraction = 0) => {
  const frame=sceneFrame(scene,info.rect.width/info.rect.height);
  const min =
      frame.minX,
    max = frame.maxX,
    y = frame.maxY + 35,
    p = new THREE.Vector3(
      (min + max) / 2 + scene.offset.x + fraction * Math.min(700, max - min),
      y + scene.offset.y,
      z + 2,
    ).project(info.camera);
  return {
    x: info.rect.x + ((p.x + 1) * info.rect.width) / 2,
    y: info.rect.y + ((1 - p.y) * info.rect.height) / 2,
  };
};
const label = async (scene, z, info) => {
  for (const fraction of [0, -0.3, 0.3]) {
    const p = titlePoint(scene, z, info, fraction);
    if (
      p.x < info.rect.x ||
      p.x > info.rect.x + info.rect.width ||
      p.y < info.rect.y ||
      p.y > info.rect.y + info.rect.height
    )
      continue;
    await page.mouse.move(p.x, p.y);
    if (
      (await page
        .locator(".graph-canvas")
        .evaluate((el) => el.style.cursor)) === "grab"
    )
      return p;
  }
  throw Error("No exposed label found: " + scene.label);
};
const drag = async (p, dx, dy) => {
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
};
const angles = (s) => {
  const d = new THREE.Vector3().copy(s.camera.position).sub(s.camera.target),
    sphere = new THREE.Spherical().setFromVector3(d);
  return {
    x: 90 - THREE.MathUtils.radToDeg(sphere.phi),
    y: THREE.MathUtils.radToDeg(sphere.theta),
  };
};
try {
  await page.goto(url);
  await idle();
  let d = await display(),
    p = await label(d.scene, 0, d),
    before = d.s;
  await drag(p, 95, 55);
  d = await display();
  const moved = d.s.layerOffsets[d.scene.key];
  check(
    "foreground label drag moves layer in XY",
    moved && Math.abs(moved.x) > 2 && Math.abs(moved.y) > 2,
  );
  check(
    "label drag leaves camera and local card positions unchanged",
    JSON.stringify(d.s.camera) === JSON.stringify(before.camera) &&
      JSON.stringify(d.s.positions) === JSON.stringify(before.positions),
  );
  const oldTitle = titlePoint({ ...d.scene, offset: { x: 0, y: 0 } }, 0, d), newTitle = titlePoint(d.scene, 0, d);
  check("label drag responds at one eighth of the pointer displacement", Math.abs(newTitle.x - oldTitle.x - 11.875) < 1 && Math.abs(newTitle.y - oldTitle.y - 6.875) < 1);
  check("label drag does not add exploration history", d.h.index === 0);
  p = await label(d.scene, 0, d);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 60, p.y + 30, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(300);
  check(
    "Escape cancels layer movement",
    JSON.stringify((await display()).s.layerOffsets[d.scene.key]) ===
      JSON.stringify(moved),
  );
  await page.reload();
  await idle();
  d = await display();
  check(
    "layer placement survives reload",
    JSON.stringify(d.s.layerOffsets[d.scene.key]) === JSON.stringify(moved),
  );
  await page.getByLabel("Centre", { exact: true }).selectOption("carob");
  await idle();
  d = await display();
  check("previous view remains available", d.previous.length === 1);
  // Move foreground down to expose the history label before testing its own drag.
  p = await label(d.scene, 0, d);
  await drag(p, -880, 1200);
  d = await display();
  const previous = d.previous[0],
    oldOffset = { ...previous.offset };
  p = await label(previous, -PLANE_GAP, d);
  const cameraBefore = d.s.camera;
  await drag(p, 70, -35);
  d = await display();
  const previousOffset = d.s.layerOffsets[previous.key];
  check(
    "background label drag moves its own snapshot",
    Math.hypot(previousOffset.x - oldOffset.x, previousOffset.y - oldOffset.y) >
      10,
  );
  check(
    "background movement does not recenter or move the camera",
    d.s.centre === "carob" &&
      JSON.stringify(d.s.camera) === JSON.stringify(cameraBefore),
  );
  check(
    "background label movement does not change graph memberships",
    d.s.view.endpoint_ids.length === 21,
  );
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.waitForTimeout(400);
  d = await display();
  const index = d.h.index,
    rect = d.rect,
    point = { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.6 };
  const panPoint={x:rect.x+rect.width*0.12,y:rect.y+rect.height*0.84};
  const marker=new THREE.Vector3(d.scene.offset.x,d.scene.offset.y,0);
  const markerOnScreen=info=>{
    const p=marker.clone().project(info.camera);
    return {x:(p.x+1)*info.rect.width/2,y:(1-p.y)*info.rect.height/2};
  };
  const panBefore=markerOnScreen(d);
  await drag(panPoint,120,60);d=await display();
  const panAfter=markerOnScreen(d),panPixels=Math.hypot(panAfter.x-panBefore.x,panAfter.y-panBefore.y);
  console.log('PAN',JSON.stringify({panPixels,panBefore,panAfter,point:panPoint}));
  check('Plain mouse pan moves the graph gently relative to the pointer',panPixels>1&&panPixels<Math.hypot(120,60)*0.3);
  const stopped=structuredClone(d.s.camera);
  await page.waitForTimeout(600);d=await display();
  check('Camera pan stops after release without inertial drift',new THREE.Vector3().copy(stopped.position).distanceTo(new THREE.Vector3().copy(d.s.camera.position))<0.000001&&new THREE.Vector3().copy(stopped.target).distanceTo(new THREE.Vector3().copy(d.s.camera.target))<0.000001);
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await page.waitForTimeout(400);d=await display();
  const initialAngles = angles(d.s);
  await page.keyboard.down("Control");
  await drag(point, rect.width / 10, rect.height / 10);
  await page.keyboard.up("Control");
  d = await display();
  const gentleAngles = angles(d.s);
  check("Ctrl-drag rotates 2.25 degrees per tenth viewport", Math.abs(gentleAngles.x - initialAngles.x - 2.25) < 0.2 && Math.abs(gentleAngles.y - initialAngles.y + 2.25) < 0.2);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.waitForTimeout(400);
  for (const sign of [1, -1]) {
    await page.keyboard.down("Control");
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + sign * 5600, point.y + sign * 4800, {
      steps: 18,
    });
    await page.mouse.up();
    await page.keyboard.up("Control");
    await page.waitForTimeout(850);
    d = await display();
    const a = angles(d.s);
    console.log("ROTATION", JSON.stringify(a));
    check(
      "Ctrl-drag reaches both rotation bounds " + sign,
      Math.abs(Math.abs(a.x) - 60) < 0.2 && Math.abs(Math.abs(a.y) - 60) < 0.2,
    );
    check(
      "Ctrl-drag preserves the exploration " + sign,
      d.h.index === index && d.s.centre === "carob",
    );
  }
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.waitForTimeout(450);
  d = await display();
  check(
    "Reset view restores 25 degree tilt and zero sideways turn",
    Math.abs(angles(d.s).x - 25) < 0.1 && Math.abs(angles(d.s).y) < 0.1,
  );
  await page.setViewportSize({width:1100,height:900});await idle();
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await page.waitForTimeout(400);d=await display();
  const resizedBefore=markerOnScreen(d),resizedPoint={x:d.rect.x+d.rect.width*0.12,y:d.rect.y+d.rect.height*0.84};
  await drag(resizedPoint,120,60);d=await display();const resizedAfter=markerOnScreen(d);
  check('Pan sensitivity stays gentle after resizing the graph window',Math.hypot(resizedAfter.x-resizedBefore.x,resizedAfter.y-resizedBefore.y)>1&&Math.hypot(resizedAfter.x-resizedBefore.x,resizedAfter.y-resizedBefore.y)<Math.hypot(120,60)*0.3);
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "output/consolidation-qa/layer-gestures-dark.png",
  });
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/gesture-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/gesture-failure.png",
      timeout: 2000,
    })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await Promise.race([
    browser.close(),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
}
process.exit(process.exitCode || 0);
