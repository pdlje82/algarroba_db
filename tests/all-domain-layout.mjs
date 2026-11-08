import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes, PLANE_GAP } from "../frontend/scene.ts";
import { compactGrid } from "../frontend/compactLayout.ts";
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

const packed = (d) =>
  JSON.stringify(d.scene.cards.map((c) => c.position)) ===
  JSON.stringify(
    compactGrid(d.scene.cards.length, d.rect.width / d.rect.height, 234, 124)
      .points,
  );
const choose = async (domain) => {
  await page.getByLabel("Domain", { exact: true }).selectOption(domain);
  await idle();
};
const applyHeading = async () => {
  await page.locator(".layer-update-button").click();
  await idle();
};
const applyToolbar = async () => {
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
};
try {
  await page.goto(url);
  await idle();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await idle();
  const original = await info();
  await choose("technology");
  await applyHeading();
  const tech = await info();
  check(
    "selected-domain overview is compact and shows only three technology groups",
    tech.scene.cards.length === 3 &&
      packed(tech) &&
      tech.scene.cards.every((c) => c.record.domain === "technology"),
  );
  await choose("all");
  let preview = await info();
  check(
    "All preview preserves the smaller layout until Update",
    preview.s.pendingDomain === "all" &&
      preview.scene.signature === tech.scene.signature,
  );
  await applyHeading();
  let all = await info();
  check(
    "heading Update restores all nine groups in a tight grid",
    all.s.domain === "all" && all.scene.cards.length === 9 && packed(all),
  );
  check(
    "broadening does not append a view or background layer",
    all.h.index === original.h.index &&
      all.h.entries.length === original.h.entries.length &&
      all.previous.length === 0,
  );
  check(
    "broadening preserves the camera",
    JSON.stringify(all.s.camera) === JSON.stringify(tech.s.camera),
  );
  await choose("ecosystem");
  await applyToolbar();
  await choose("all");
  await applyToolbar();
  all = await info();
  check(
    "toolbar Update also restores the full compact overview",
    all.scene.cards.length === 9 && packed(all),
  );
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "output/consolidation-qa/all-domain-tight-overview.png",
  });
  // Seed an old v6 All-domain session with the smaller view's surviving positions,
  // then persist its fallback slots to reproduce the supplied screenshot.
  const raw = structuredClone(all.h),
    old = raw.entries[raw.index];
  old.positions = tech.scene.positions;
  const scattered = buildScene(
    old,
    old.view,
    catalog,
    all.rect.width / all.rect.height,
  );
  old.positions = scattered.positions;
  old.layerOffsets = {
    ...old.layerOffsets,
    [scattered.key]: { x: 190, y: 110 },
  };
  check(
    "saved-session fixture reproduces the scattered fallback layout",
    !packed({ ...all, scene: scattered }),
  );
  await page.addInitScript((history) => {
    if (sessionStorage.getItem("qa:scattered-overview")) return;
    sessionStorage.setItem("qa:scattered-overview", "yes");
    localStorage.setItem(
      "kgb:exploration:v6",
      JSON.stringify({ savedAt: Date.now() + 100000, history }),
    );
  }, raw);
  await page.reload();
  await idle();
  const repaired = await info();
  check(
    "reopening an older scattered overview rebuilds the compact grid",
    repaired.scene.cards.length === 9 && packed(repaired),
  );
  check(
    "repair preserves the moved layer offset",
    repaired.scene.offset.x === 190 && repaired.scene.offset.y === 110,
  );
  check(
    "repair preserves the camera",
    JSON.stringify(repaired.s.camera) === JSON.stringify(old.camera),
  );
  check(
    "repair remains in the same history entry",
    repaired.h.index === all.h.index &&
      repaired.h.entries.length === all.h.entries.length &&
      repaired.previous.length === 0,
  );
  await page.screenshot({
    path: "output/consolidation-qa/all-domain-repaired-overview.png",
  });
  await page.reload();
  await idle();
  const restored = await info();
  check(
    "the repaired grid and layer offset survive another reload",
    packed(restored) &&
      restored.scene.offset.x === 190 &&
      restored.scene.offset.y === 110,
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/all-domain-layout-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/all-domain-layout-failure.png",
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
