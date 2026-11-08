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

const ids = (d) => d.scene.cards.flatMap((c) => c.members);
const backgrounds = (d) => d.previous.map((s) => s.key);
const packed = (d) =>
  JSON.stringify(d.scene.cards.map((c) => c.position)) ===
  JSON.stringify(
    compactGrid(d.scene.cards.length, d.rect.width / d.rect.height, 234, 124)
      .points,
  );
try {
  await page.goto(url);
  await idle();
  await page.getByLabel("Centre", { exact: true }).selectOption("drones");
  await idle();
  const drones = await info();
  await page
    .getByRole("button", { name: /^Species & companions\s*36$/ })
    .click();
  await idle();
  let members = await info();
  check(
    "Species opens without inheriting Drones as its centre",
    members.s.scope === "group" &&
      members.s.centre === null &&
      members.s.anchor === null &&
      !ids(members).includes("drones"),
  );
  check(
    "Species contains its complete membership only",
    ids(members).length === 36 &&
      ids(members).every((id) => members.s.view.endpoint_ids.includes(id)),
  );
  check("Species is packed with no reserved centre slot", packed(members));
  check(
    "the original Drones exploration stays in the background",
    members.previous[0].key === drones.scene.key,
  );
  await page.screenshot({
    path: "output/consolidation-qa/species-without-drones.png",
  });
  // Reopen an older v6 group carrying an unrelated centre/geometry.
  const raw = structuredClone(members.h),
    old = raw.entries[raw.index];
  old.centre = "drones";
  old.anchor = "drones";
  old.positions.drones = { x: 0, y: 0 };
  old.view.centre = "drones";
  old.view.nodes.push(catalog.topics.find((t) => t.id === "drones"));
  await page.addInitScript((history) => {
    if (sessionStorage.getItem("qa:centre-seeded")) return;
    sessionStorage.setItem("qa:centre-seeded", "yes");
    const session = { savedAt: Date.now() + 100000, history };
    localStorage.setItem("kgb:exploration:v6", JSON.stringify(session));
  }, raw);
  await page.reload();
  await idle();
  members = await info();
  check(
    "existing group sessions normalize the inherited centre and pack membership",
    members.s.scope === "group" &&
      !ids(members).includes("drones") &&
      members.s.centre === null &&
      packed(members),
  );
  await page.getByLabel("Centre", { exact: true }).selectOption("cocoon");
  await idle();
  const before = await info();
  check(
    "fixture begins with Cocoon as a visible centre",
    ids(before).includes("cocoon") && before.scene.cards.length === 23,
  );
  await page.getByLabel("Remove centre", { exact: true }).click();
  await idle();
  let removed = await info();
  check(
    "Remove centre removes the card and its attached links",
    !ids(removed).includes("cocoon") &&
      removed.scene.cards.length === 22 &&
      removed.scene.links.every(
        (e) => e.source !== "cocoon" && e.target !== "cocoon",
      ),
  );
  check(
    "remaining nodes form a compact grid without a centre hole",
    packed(removed),
  );
  check(
    "removal updates the current layer without adding history or snapshots",
    removed.h.index === before.h.index &&
      removed.h.entries.length === before.h.entries.length &&
      JSON.stringify(backgrounds(removed)) ===
        JSON.stringify(backgrounds(before)),
  );
  check(
    "removal preserves the camera and layer offset",
    JSON.stringify(removed.s.camera) === JSON.stringify(before.s.camera) &&
      JSON.stringify(removed.scene.offset) ===
        JSON.stringify(before.scene.offset),
  );
  check(
    "the captured query retains all neighbouring results",
    removed.s.anchor === "cocoon" &&
      removed.s.centre === null &&
      JSON.stringify(removed.s.view.endpoint_ids) ===
        JSON.stringify(before.s.view.endpoint_ids),
  );
  await page.screenshot({
    path: "output/consolidation-qa/centre-removed-packed.png",
  });
  await page.reload();
  await idle();
  removed = await info();
  check(
    "removed centre and packed layout survive reload",
    !ids(removed).includes("cocoon") &&
      packed(removed) &&
      removed.scene.cards.length === 22,
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await idle();
  check(
    "Back and Forward retain the edited layer",
    (await info()).s.centre === null &&
      !ids(await info()).includes("cocoon") &&
      packed(await info()),
  );
  // Even an expanded search route cannot re-add the removed origin.
  await page.getByLabel("Centre", { exact: true }).selectOption("carob");
  await idle();
  await page
    .getByLabel("Search stored knowledge", { exact: true })
    .fill("drone");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await idle();
  await page.getByRole("checkbox", { name: "Show all route steps" }).check();
  await idle();
  await page.getByLabel("Remove centre", { exact: true }).click();
  await idle();
  let search = await info();
  check(
    "search keeps its endpoints and route intermediates while omitting the removed origin",
    !ids(search).includes("carob") &&
      search.s.view.endpoint_ids.every(
        (id) => id === "carob" || ids(search).includes(id),
      ) &&
      search.s.expandedRoutes.length > 0,
  );
  await page.getByRole("checkbox", { name: "Show all route steps" }).uncheck();
  await idle();
  await page.getByRole("checkbox", { name: "Show all route steps" }).check();
  await idle();
  check(
    "route expansion cannot resurrect the removed centre",
    !ids(await info()).includes("carob"),
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/remove-centre-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/remove-centre-failure.png",
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
