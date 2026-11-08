import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes, PLANE_GAP } from "../frontend/scene.ts";
import { layerPoint } from "../frontend/interactions.ts";
const { chromium } = await import(
    pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href
  ),
  url = "http://127.0.0.1:8769";
assert.ok(
  (await (await fetch(url + "/api/health")).json()).project
    .replaceAll("\\", "/")
    .endsWith("/output/consolidation-qa"),
);
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  page = await browser.newPage({
    viewport: { width: 1600, height: 1100 },
    reducedMotion: "reduce",
  }),
  checks = [],
  errors = [];
page.setDefaultTimeout(12000);
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, v = true) => {
  assert.ok(v, name);
  checks.push(name);
  console.log("PASS", name);
};
const idle = async () => {
  await page.locator(".graph-canvas canvas").waitFor();
  await page.locator(".loading").waitFor({ state: "hidden" });
  await page.waitForTimeout(550);
};
const history = async () => {
  await page.waitForTimeout(180);
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
const info = async () => {
  const h = await history(),
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
const project = (point, info) => {
  const p = point.project(info.camera);
  return {
    x: info.rect.x + ((p.x + 1) * info.rect.width) / 2,
    y: info.rect.y + ((1 - p.y) * info.rect.height) / 2,
  };
};

const titlePoint = (scene, z) => {
  const minX =
    Math.min(...scene.cards.map((c) => c.position.x - c.width / 2)) - 25;
  const maxX =
    Math.max(...scene.cards.map((c) => c.position.x + c.width / 2)) + 25;
  const maxY =
    Math.max(...scene.cards.map((c) => -c.position.y + c.height / 2)) + 25;
  return new THREE.Vector3(
    (minX + maxX) / 2 + scene.offset.x,
    maxY + 35 + scene.offset.y,
    z + 2,
  );
};
const drag = async (from, to) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(450);
};
try {
  await page.goto(url);
  await idle();
  await page
    .getByRole("button", { name: /^Species & companions\s*36$/ })
    .click();
  await idle();
  let d = await info();
  let start = project(titlePoint(d.scene, 0), d);
  await drag(start, { x: start.x + 330, y: start.y + 190 });
  d = await info();
  const back = d.previous[0],
    key = back.key;
  const button = page.locator(
    '.layer-close-button[data-layer-key="' + key + '"]',
  );
  check(
    "uncovered background close button is visible",
    await button.isVisible(),
  );
  const previousKey = d.scene.key;
  const cards = d.scene.cards
    .map((c) => ({
      c,
      screen: project(
        new THREE.Vector3(
          c.position.x + d.scene.offset.x,
          -c.position.y + d.scene.offset.y,
          6,
        ),
        d,
      ),
    }))
    .filter(
      ({ screen: p }) =>
        p.x > d.rect.x + 35 &&
        p.x < d.rect.x + d.rect.width - 35 &&
        p.y > d.rect.y + 80 &&
        p.y < d.rect.y + d.rect.height - 70,
    );
  assert.ok(cards.length);
  const target = cards[0].screen;
  const buttonBox = await button.boundingBox();
  const oldWorld = layerPoint(
    {
      x: buttonBox.x + buttonBox.width / 2,
      y: buttonBox.y + buttonBox.height / 2,
    },
    {
      left: d.rect.x,
      top: d.rect.y,
      width: d.rect.width,
      height: d.rect.height,
    },
    d.camera,
    -PLANE_GAP,
  );
  const newWorld = layerPoint(
    target,
    {
      left: d.rect.x,
      top: d.rect.y,
      width: d.rect.width,
      height: d.rect.height,
    },
    d.camera,
    -PLANE_GAP,
  );
  const oldTitle = titlePoint(back, -PLANE_GAP);
  start = project(oldTitle.clone(), d);
  const destination = project(oldTitle.add(newWorld.sub(oldWorld)), d);
  await drag(start, destination);
  check(
    "background X disappears when dragged behind a foreground card",
    !(await button.isVisible()),
  );
  check(
    "occluded button is excluded from accessible button targets",
    (await page
      .getByRole("button", {
        name: "Close layer: Previous view � " + back.label,
        exact: true,
      })
      .count()) === 0,
  );
  await page.screenshot({
    path: "output/consolidation-qa/close-occlusion-hidden.png",
  });
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(300);
  let after = await info();
  check(
    "clicking the occluded X position cannot close its layer",
    after.previous.some((s) => s.key === key) &&
      after.scene.key === previousKey,
  );
  check(
    "foreground card receives the click",
    await page
      .getByRole("heading", { name: cards[0].c.record.label, exact: true })
      .isVisible(),
  );
  // Move the foreground, exposing the same background button again in real time.
  start = project(titlePoint(after.scene, 0), after);
  await drag(start, { x: start.x + 180, y: start.y + 130 });
  check(
    "background close button reappears after foreground moves clear",
    await button.isVisible(),
  );
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.waitForTimeout(300);
  check(
    "uncovered button remains available after theme change",
    await button.isVisible(),
  );
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await page.waitForTimeout(350);
  check(
    "full screen retains correctly positioned layer controls",
    (await page.locator(".layer-close-button").count()) === 2,
  );
  await page.screenshot({
    path: "output/consolidation-qa/close-occlusion-revealed.png",
  });
  await button.click();
  await page.waitForTimeout(400);
  check(
    "revealed background button closes only its own layer",
    !(await info()).previous.some((s) => s.key === key),
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/close-occlusion-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/close-occlusion-failure.png",
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
