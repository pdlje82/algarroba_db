import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes, PLANE_GAP } from "../frontend/scene.ts";
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
try {
  await page.goto(url);
  await idle();
  await page
    .getByRole("button", { name: /^Species & companions\s*36$/ })
    .click();
  await idle();
  let d = await info(),
    sourceId = "display-group:ecosystem:species";
  check(
    "opened group records its source layer and card",
    d.s.openedFrom?.cardId === sourceId,
  );
  check(
    "only the originating overview card is highlighted",
    d.previous[0].openedCardIds.length === 1 &&
      d.previous[0].openedCardIds[0] === sourceId,
  );
  // Move the foreground aside so the real GPU samples cannot be hidden by it.
  const scene = d.scene,
    minX = Math.min(...scene.cards.map((c) => c.position.x - c.width / 2)) - 25,
    maxX = Math.max(...scene.cards.map((c) => c.position.x + c.width / 2)) + 25,
    y = Math.max(...scene.cards.map((c) => -c.position.y + c.height / 2)) + 60,
    title = project(
      new THREE.Vector3(
        (minX + maxX) / 2 + scene.offset.x,
        y + scene.offset.y,
        2,
      ),
      d,
    );
  await page.mouse.move(title.x, title.y);
  await page.mouse.down();
  await page.mouse.move(title.x + 330, title.y + 190, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  d = await info();
  const parent = d.previous[0],
    sample = (id) => {
      const c = parent.cards.find((c) => c.id === id);
      return project(
        new THREE.Vector3(
          c.position.x + parent.offset.x,
          -c.position.y - c.height * 0.2 + parent.offset.y,
          -PLANE_GAP + 6,
        ),
        d,
      );
    };
  const samples = {
    opened: sample(sourceId),
    unrelated: sample("display-group:ecosystem:habitats"),
  };
  writeFileSync(
    "output/consolidation-qa/highlight-pixels.json",
    JSON.stringify(samples),
  );
  await page.screenshot({
    path: "output/consolidation-qa/opening-highlight-light.png",
  });
  await page.reload();
  await idle();
  d = await info();
  check(
    "opening highlight survives reload",
    d.previous[0].openedCardIds.includes(sourceId),
  );
  const list = page.locator(".visible-topics");
  await list.locator("summary").click();
  await page
    .getByRole("button", { name: "Inspect Carob tree", exact: true })
    .click();
  check(
    "inspecting another node does not change the source highlight",
    (await info()).previous[0].openedCardIds.length === 1 &&
      (await info()).previous[0].openedCardIds.includes(sourceId),
  );
  await page
    .getByRole("button", { name: "Show connected topics", exact: true })
    .click();
  await idle();
  d = await info();
  check(
    "nested opening keeps its node highlighted in its original layer",
    d.previous[0].openedCardIds.includes("carob"),
  );
  check(
    "earlier opening in the chain stays highlighted",
    d.previous[1].openedCardIds.includes(sourceId),
  );
  await page.getByRole("button", { name: "Close layer", exact: true }).click();
  await idle();
  d = await info();
  check(
    "closing the child removes its background opening highlight",
    !d.previous.some((s) => s.openedCardIds.includes("carob")),
  );
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.waitForTimeout(300);
  await page.locator(".context-strip").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/consolidation-qa/opening-highlight-dark.png",
  });
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/opening-highlight-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/opening-highlight-failure.png",
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
