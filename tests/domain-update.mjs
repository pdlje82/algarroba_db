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

let explorationRequests = 0;
page.on("request", (r) => {
  if (r.url().includes("/api/explore?")) explorationRequests++;
});
const choose = async (domain) => {
  await page.getByLabel("Domain", { exact: true }).selectOption(domain);
  await idle();
};
const update = () => page.locator(".layer-update-button");
const backgroundKeys = (d) => d.previous.map((s) => s.key);
const count = (d) => d.scene.cards.length;
try {
  await page.goto(url);
  await idle();
  await page.getByLabel("Centre", { exact: true }).selectOption("carob");
  await idle();
  await page.getByLabel("Centre", { exact: true }).selectOption("cocoon");
  await idle();
  // Force a camera change before sampling the persisted pose: consecutive fits
  // can have identical framing and therefore produce no controls change event.
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await idle();
  const before = await info(),
    requests = explorationRequests;
  check(
    "fixture has a mixed-domain foreground and two previous layers",
    new Set(before.scene.cards.map((c) => c.record.domain)).size > 1 &&
      before.previous.length === 2,
  );
  const sample = (card, data) =>
    project(
      new THREE.Vector3(
        card.position.x + card.width / 2 - 20 + data.scene.offset.x,
        -card.position.y - card.height / 2 + 20 + data.scene.offset.y,
        6,
      ),
      data,
    );
  const chosen = Object.fromEntries(
    [
      ["outside", "ecosystem"],
      ["inside", "technology"],
    ].map(([kind, domain]) => [
      kind,
      before.scene.cards.find((c) => {
        if (c.record.domain !== domain) return false;
        const p = sample(c, before);
        return (
          p.x > before.rect.x + 12 &&
          p.x < before.rect.x + before.rect.width - 12 &&
          p.y > before.rect.y + 12 &&
          p.y < before.rect.y + before.rect.height - 12
        );
      }),
    ]),
  );
  assert.ok(chosen.outside && chosen.inside);
  const pixels = {
    before: Object.fromEntries(
      Object.entries(chosen).map(([kind, c]) => [kind, sample(c, before)]),
    ),
  };
  await page.screenshot({ path: "output/consolidation-qa/domain-before.png" });
  await choose("technology");
  let staged = await info();
  check(
    "domain change stages a preview without requesting a replacement graph",
    explorationRequests === requests &&
      staged.s.domain === "all" &&
      staged.s.pendingDomain === "technology",
  );
  check(
    "preview retains every node and its exact layout",
    staged.scene.signature === before.scene.signature &&
      JSON.stringify(staged.scene.positions) ===
        JSON.stringify(before.scene.positions),
  );
  check(
    "preview does not append history or another background layer",
    staged.h.index === before.h.index &&
      staged.h.entries.length === before.h.entries.length &&
      JSON.stringify(backgroundKeys(staged)) ===
        JSON.stringify(backgroundKeys(before)),
  );
  check(
    "only out-of-domain cards are marked for removal",
    staged.scene.cards.some((c) => c.outOfDomain) &&
      staged.scene.cards.every(
        (c) =>
          !!c.outOfDomain ===
          (c.record.domain !== "technology" && !c.record.viewCentre),
      ),
  );
  check(
    "layer Update is visible beside the foreground X",
    await update().isVisible(),
  );
  const ub = await update().boundingBox(),
    xb = await page
      .locator('.layer-close-button[data-layer-key="' + staged.scene.key + '"]')
      .boundingBox();
  check(
    "Update and X have adjacent click targets",
    Math.abs(ub.y - xb.y) < 1 &&
      ub.x >= xb.x + xb.width + 5 &&
      ub.x < xb.x + xb.width + 8,
  );
  pixels.preview = Object.fromEntries(
    Object.entries(chosen).map(([kind, c]) => [kind, sample(c, staged)]),
  );
  writeFileSync(
    "output/consolidation-qa/domain-preview-pixels.json",
    JSON.stringify(pixels),
  );
  await page.screenshot({ path: "output/consolidation-qa/domain-preview.png" });
  await choose("all");
  staged = await info();
  check(
    "choosing the applied domain cancels dimming without removing nodes",
    !staged.s.pendingDomain &&
      count(staged) === count(before) &&
      staged.scene.cards.every((c) => !c.outOfDomain) &&
      (await update().count()) === 0,
  );
  await choose("technology");
  await page.reload();
  await idle();
  staged = await info();
  check(
    "reload preserves the pending choice and the unpruned graph",
    staged.s.pendingDomain === "technology" &&
      staged.s.domain === "all" &&
      staged.scene.signature === before.scene.signature &&
      (await update().isVisible()),
  );
  // A failed Update preserves the last working foreground and its pending choice.
  await page.route(
    "**/api/explore?**",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "QA domain update failure" }),
      }),
    { times: 1 },
  );
  await update().click();
  await page.getByRole("alert").waitFor();
  staged = await info();
  check(
    "failed Update preserves the preview, history and graph",
    staged.s.pendingDomain === "technology" &&
      staged.s.domain === "all" &&
      staged.scene.signature === before.scene.signature &&
      staged.h.index === before.h.index,
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await idle();
  let applied = await info();
  check(
    "Update removes the darkened nodes from the same history entry",
    applied.s.domain === "technology" &&
      !applied.s.pendingDomain &&
      count(applied) < count(before) &&
      applied.h.index === before.h.index &&
      applied.h.entries.length === before.h.entries.length,
  );
  check(
    "applied layer contains matching nodes and retains its original background",
    applied.scene.cards.every(
      (c) => c.record.domain === "technology" || c.record.context,
    ) &&
      JSON.stringify(backgroundKeys(applied)) ===
        JSON.stringify(backgroundKeys(before)),
  );
  check(
    "Update repacks surviving nodes while preserving layer movement, camera and source",
    applied.scene.cards.some(
      (c) =>
        JSON.stringify(c.position) !==
        JSON.stringify(before.scene.positions[c.id]),
    ) &&
      JSON.stringify(applied.s.camera) === JSON.stringify(before.s.camera) &&
      JSON.stringify(applied.scene.offset) ===
        JSON.stringify(before.scene.offset) &&
      JSON.stringify(applied.s.openedFrom) ===
        JSON.stringify(before.s.openedFrom),
  );
  check(
    "tight neighbour layout keeps the centre in its reserved slot",
    applied.scene.positions.cocoon.x === 0 &&
      applied.scene.positions.cocoon.y === 0,
  );
  const footprint = (cards) =>
    (Math.max(...cards.map((c) => c.position.x + c.width / 2)) -
      Math.min(...cards.map((c) => c.position.x - c.width / 2))) *
    (Math.max(...cards.map((c) => c.position.y + c.height / 2)) -
      Math.min(...cards.map((c) => c.position.y - c.height / 2)));
  const survivors = before.scene.cards.filter((c) =>
    applied.scene.cards.some((remaining) => remaining.id === c.id),
  );
  check(
    "remaining nodes occupy a smaller footprint after Update",
    footprint(applied.scene.cards) < footprint(survivors),
  );
  check("Update disappears after application", (await update().count()) === 0);
  await page.screenshot({ path: "output/consolidation-qa/domain-applied.png" });
  const packedPositions = JSON.stringify(applied.scene.positions);
  await page.reload();
  await idle();
  applied = await info();
  check(
    "the compact Update layout survives reload",
    JSON.stringify(applied.scene.positions) === packedPositions,
  );

  await choose("all");
  staged = await info();
  check(
    "broadening to All is staged without silently adding nodes",
    staged.s.pendingDomain === "all" &&
      count(staged) === count(applied) &&
      staged.scene.cards.every((c) => !c.outOfDomain),
  );
  await update().click();
  await idle();
  applied = await info();
  check(
    "Update can restore all domains in place",
    applied.s.domain === "all" &&
      count(applied) === count(before) &&
      applied.h.index === before.h.index &&
      JSON.stringify(backgroundKeys(applied)) ===
        JSON.stringify(backgroundKeys(before)),
  );
  // A later domain choice cancels an in-flight pruning request and rejects its response.
  await choose("technology");
  await page.route("**/api/explore?**", async (route) => {
    await new Promise((r) => setTimeout(r, 650));
    await route.continue().catch(() => {});
  });
  await update().click();
  await page.waitForTimeout(80);
  await choose("funding");
  await page.waitForTimeout(800);
  await page.unroute("**/api/explore?**");
  staged = await info();
  check(
    "a superseded Update cannot replace the graph or newer domain preview",
    staged.s.domain === "all" &&
      staged.s.pendingDomain === "funding" &&
      count(staged) === count(before) &&
      staged.h.index === before.h.index,
  );
  await choose("ecosystem");
  staged = await info();
  check(
    "out-of-domain centre remains undimmed connecting context",
    !staged.scene.cards.find((c) => c.id === "cocoon").outOfDomain &&
      staged.scene.cards.find((c) => c.id === "cocoon").record.context,
  );
  await update().click();
  await idle();
  applied = await info();
  check(
    "Update retains the centre as explicit context while removing other out-of-domain nodes",
    applied.scene.cards.some((c) => c.id === "cocoon" && c.record.context) &&
      applied.scene.cards.every(
        (c) => c.record.domain === "ecosystem" || c.id === "cocoon",
      ),
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await idle();
  check(
    "Back and Forward restore the updated domain and graph without extra layers",
    (await info()).s.domain === "ecosystem" &&
      count(await info()) === count(applied),
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/domain-update-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/domain-update-failure.png",
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
