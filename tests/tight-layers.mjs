import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes, scenePresentationKey, PLANE_GAP } from "../frontend/scene.ts";
import { compactGrid, hasCompactGridPositions } from "../frontend/compactLayout.ts";
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

const ids = (d) => d.scene.cards.flatMap((c) => c.members).sort();
const point = (d, c) =>
  project(
    new THREE.Vector3(
      c.position.x + d.scene.offset.x,
      -c.position.y + d.scene.offset.y,
      6,
    ),
    d,
  );
const packed = (d) =>
  JSON.stringify(d.scene.cards.map((c) => c.position)) ===
  JSON.stringify(
    compactGrid(d.scene.cards.length, d.rect.width / d.rect.height, 234, 124)
      .points,
  );
const primeCamera = async () => {
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await idle();
};
const seed = async (history, key) => {
  await page.addInitScript(
    ({ history, key }) => {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "yes");
      localStorage.setItem(
        "kgb:exploration:v6",
        JSON.stringify({ savedAt: Date.now() + 100000, history }),
      );
    },
    { history, key },
  );
  await page.reload();
  await idle();
  return info();
};
try {
  await page.goto(url);
  await idle();
  await primeCamera();
  check("opening overview uses a tight grid", packed(await info()));
  await page.getByRole("button", { name: /^Species & companions\s*36$/ }).click();
  await idle();
  await primeCamera();
  check("complete Species membership uses a tight grid", packed(await info()));
  await page.getByLabel("Centre", { exact: true }).selectOption("carob");
  await idle();
  await primeCamera();
  const direct = await info();
  check("Explore Carob places its 22 cards in a tight grid", direct.scene.cards.length === 22 && packed(direct));
  check("the explored topic stays visibly designated without a separate centre slot", direct.scene.cards.find((c) => c.id === "carob").record.viewCentre);
  check("all visible background layers also use compact grids", direct.previous.length > 0 && direct.previous.every((s) => hasCompactGridPositions(s.cards.map((c) => c.position))));
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.screenshot({ path: "output/consolidation-qa/topic-tight-grid.png" });
  const directPositions = JSON.stringify(direct.scene.positions);
  await page.reload();
  await idle();
  check("topic grid and centre survive reload exactly", JSON.stringify((await info()).scene.positions) === directPositions && (await info()).s.centre === "carob");
  const raw = structuredClone((await info()).h), old = raw.entries[raw.index];
  old.positions = Object.fromEntries(direct.scene.cards.map((c, i) => [c.id, { x: i * 912, y: i % 3 * 731 }]));
  const oldKey = scenePresentationKey(JSON.stringify([direct.scene.cards.map((c) => [c.id, old.positions[c.id]]), direct.scene.links.map((e) => e.id)]));
  old.layerOffsets = { [oldKey]: { x: 71, y: -35 } };
  let current = await seed(raw, "qa:old-topic-layout");
  check("old topic rings/scattered positions repair into a tight grid", packed(current));
  check("topic repair preserves moved layer, camera and history", current.scene.offset.x === 71 && current.scene.offset.y === -35 && JSON.stringify(current.s.camera) === JSON.stringify(old.camera) && current.h.index === raw.index && current.h.entries.length === raw.entries.length);
  await page.getByLabel("Search stored knowledge", { exact: true }).fill("drone");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await idle();
  await primeCamera();
  current = await info();
  check("abbreviated search routes use a tight grid", current.s.view.routes.length > 0 && packed(current));
  const abbreviated = current.scene.cards.map((c) => c.id).sort();
  await page.getByRole("checkbox", { name: "Show all route steps" }).check();
  await idle();
  await primeCamera();
  current = await info();
  check("revealing route steps tightly repacks shared intermediate cards", packed(current) && current.scene.cards.length > abbreviated.length && new Set(current.scene.cards.map((c) => c.id)).size === current.scene.cards.length);
  check("route expansion keeps each constituent factual identity exactly once", (() => { const facts = [...current.scene.links.flatMap((l) => l.relationshipIds), ...current.scene.internal.flatMap((i) => i.ids)]; return facts.length === new Set(facts).size && current.s.view.routes.every((r) => r.edges.every((id) => facts.includes(id))); })());
  await page.getByRole("checkbox", { name: "Show all route steps" }).uncheck();
  await idle();
  check("hiding route steps fills the vacated slots", packed(await info()) && JSON.stringify((await info()).scene.cards.map((c) => c.id).sort()) === JSON.stringify(abbreviated));
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  check("Back restores the expanded tight grid", packed(await info()) && (await info()).s.expandedRoutes.length > 0);
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await idle();
  check("Forward restores the compact abbreviated grid", packed(await info()) && !(await info()).s.expandedRoutes.length);
  await page.getByLabel("Group by", { exact: true }).selectOption("type");
  await idle();
  await primeCamera();
  check("grouped topic search uses the same tight layout", packed(await info()));
  const previewPositions = JSON.stringify((await info()).scene.positions);
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await idle();
  check("domain preview keeps the working layout until Update", JSON.stringify((await info()).scene.positions) === previewPositions);
  await page.getByRole("button", { name: "Update layer domain", exact: true }).first().click();
  await idle();
  await primeCamera();
  check("updating the domain tightly packs the current layer", packed(await info()));
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await idle();
  await page.getByLabel("Group by", { exact: true }).selectOption("none");
  await idle();
  await primeCamera();
  check("clearing search returns to a compact direct neighbourhood", (await info()).s.scope === "neighbors" && packed(await info()));
  await page.getByLabel("Remove centre", { exact: true }).click();
  await idle();
  await primeCamera();
  current = await info();
  check("removing the explored topic fills its former slot", packed(current) && !current.scene.cards.some((c) => c.id === "carob"));
  const positions = JSON.stringify(current.scene.positions);
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1300, height: 950 });
  await page.waitForTimeout(500);
  current = await info();
  check("fullscreen and resize keep a healthy dense grid stable", JSON.stringify(current.scene.positions) === positions && hasCompactGridPositions(current.scene.cards.map((c) => c.position)));
  check("no browser JavaScript exceptions", errors.length === 0);
  writeFileSync("output/consolidation-qa/tight-layers-results.json", JSON.stringify({ checks, errors }, null, 2));
} catch (e) {
  await page.screenshot({ path: "output/consolidation-qa/tight-layers-failure.png" });
  writeFileSync("output/consolidation-qa/tight-layers-results.json", JSON.stringify({ checks, errors, failure: String(e) }, null, 2));
  console.error(e);
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 2000))]);
}
process.exit(process.exitCode || 0);
