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

const point = (d, c, z = 6) =>
  project(
    new THREE.Vector3(
      c.position.x + d.scene.offset.x,
      -c.position.y + d.scene.offset.y,
      z,
    ),
    d,
  );
const primeCamera = async () => {
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await idle();
};
let groupsRequested = 0;
page.on("request", (r) => {
  if (r.url().includes("/api/explore?scope=group")) groupsRequested++;
});
try {
  await page.goto(url);
  await idle();
  await primeCamera();
  const before = await info();
  let root = before.scene.cards.find(
    (c) => c.record.groupKey === "ecosystem:species",
  );
  let p = point(before, root);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(200);
  check(
    "single click inspects the group without opening a view",
    (await info()).h.index === before.h.index &&
      (await page
        .getByRole("heading", { name: root.record.label, exact: true })
        .isVisible()),
  );
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await idle();
  await primeCamera();
  let opened = await info();
  check(
    "double click opens Species membership",
    opened.s.scope === "group" &&
      opened.s.groupId === "ecosystem:species" &&
      opened.scene.cards.length === 36,
  );
  check(
    "double click opens exactly once",
    opened.h.index === before.h.index + 1 && groupsRequested === 1,
  );
  check(
    "double click preserves the original layer behind",
    opened.previous[0].key === before.scene.key &&
      opened.s.openedFrom?.cardId === root.id,
  );
  opened = await info();
  const topic = opened.scene.cards.find((c) => c.id === "carob");
  p = point(opened, topic);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await page.waitForTimeout(200);
  check(
    "ordinary topic double click remains inspection without inventing a group",
    (await info()).h.index === opened.h.index &&
      (await page
        .getByRole("heading", { name: topic.record.label, exact: true })
        .isVisible()),
  );
  await page.getByLabel("Group by", { exact: true }).selectOption("type");
  await idle();
  await primeCamera();
  const grouped = await info();
  const card = grouped.scene.cards.find((c) => c.record.displayGroup);
  assert.ok(card);
  p = point(grouped, card);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await idle();
  await primeCamera();
  const expanded = await info();
  check(
    "double click uses Open group for grouped cards",
    JSON.stringify(expanded.s.groupMembers) === JSON.stringify(card.members) &&
      expanded.h.index === grouped.h.index + 1,
  );
  check(
    "group expansion retains its original presentation behind",
    expanded.previous[0].key === grouped.scene.key,
  );
  await page.screenshot({
    path: "output/consolidation-qa/double-click-expanded-group.png",
  });
  await page
    .getByRole("button", { name: "Return to overview", exact: true })
    .click();
  await idle();
  await primeCamera();
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await idle();
  const staged = await info();
  root = staged.scene.cards.find(
    (c) => c.record.groupKey === "ecosystem:species",
  );
  p = point(staged, root);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await page.waitForTimeout(180);
  check(
    "double click cannot open domain-darkened group nodes",
    (await info()).h.index === staged.h.index &&
      (await info()).s.scope === "overview",
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("all");
  await idle();
  const all = await info();
  root = all.scene.cards.find((c) => c.id === root.id);
  p = point(all, root);
  await page.keyboard.down("Control");
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await page.keyboard.up("Control");
  await page.waitForTimeout(150);
  check(
    "Ctrl double click does not trigger group opening",
    (await info()).h.index === all.h.index,
  );
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await idle();
  await primeCamera();
  check(
    "group double click works again after cancelling the domain preview",
    (await info()).s.groupId === "ecosystem:species",
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/double-click-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/double-click-failure.png",
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
