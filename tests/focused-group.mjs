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

const point = (d, c) =>
  project(
    new THREE.Vector3(
      c.position.x + d.scene.offset.x,
      -c.position.y + d.scene.offset.y,
      6,
    ),
    d,
  );
const primeCamera = async () => {
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await idle();
};
const packed = (d) =>
  JSON.stringify(d.scene.cards.map((c) => c.position)) ===
  JSON.stringify(
    compactGrid(d.scene.cards.length, d.rect.width / d.rect.height, 234, 124)
      .points,
  );
const expected = [
  "al-faisal-pilot",
  "canal-flooding",
  "maysara-carob-trial",
].sort();
const ids = (d) => d.scene.cards.flatMap((c) => c.members).sort();
const openKind = async (kind) => {
  const d = await info(),
    card = d.scene.cards.find(
      (c) => c.record.displayGroup && c.record.groupKey === kind,
    );
  assert.ok(card);
  const p = point(d, card);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await idle();
  await primeCamera();
  return info();
};
try {
  await page.goto(url);
  await idle();
  await page
    .getByRole("button", { name: /^Habitats & conditions\s*58$/ })
    .click();
  await idle();
  await page.getByLabel("Group by", { exact: true }).selectOption("type");
  await idle();
  await primeCamera();
  const parent = await info();
  check(
    "parent has five topic-type browsing groups",
    parent.scene.cards.length === 5 &&
      parent.scene.cards.every((c) => c.record.displayGroup),
  );
  let aspect = await openKind("aspect");
  check(
    "opening Aspect shows only its one actual member",
    ids(aspect).length === 1 &&
      aspect.scene.cards[0].record.kind === "aspect" &&
      aspect.scene.cards[0].id === "cover-types",
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  let event = await openKind("event");
  check(
    "Event opens exactly the three records represented by its parent card",
    JSON.stringify(ids(event)) === JSON.stringify(expected),
  );
  check(
    "Event contains no Aspect records or other browsing groups",
    event.scene.cards.every(
      (c) => c.record.kind === "event" && !c.record.displayGroup,
    ),
  );
  check("the Event layer is a compact complete grid", packed(event));
  check(
    "opening Event retains its grouped parent behind",
    event.previous[0].key === parent.scene.key &&
      event.s.openedFrom.cardId === "display-group:event",
  );
  check(
    "only factual connections between selected members are drawn",
    event.scene.links.every(
      (e) =>
        expected.includes(e.source) &&
        expected.includes(e.target) &&
        e.relationshipIds.every((id) =>
          catalog.relationships.some((r) => r.id === id),
        ),
    ),
  );
  check(
    "Event label matches the opened node and grouping defaults to None",
    event.scene.label === "event" &&
      event.s.grouping === "none" &&
      event.s.expandedGroups.length === 0,
  );
  await page.screenshot({
    path: "output/consolidation-qa/event-focused-layer.png",
  });
  await page.getByLabel("Group by", { exact: true }).selectOption("place");
  await idle();
  check(
    "changing grouping cannot broaden Event membership",
    JSON.stringify(ids(await info())) === JSON.stringify(expected),
  );
  await page.getByLabel("Group by", { exact: true }).selectOption("none");
  await idle();
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await idle();
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
  check(
    "domain Update filters within the focused membership",
    (await info()).scene.cards.length === 0,
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("all");
  await idle();
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
  event = await info();
  check(
    "returning to All restores only those Event members in a compact layer",
    JSON.stringify(ids(event)) === JSON.stringify(expected) && packed(event),
  );
  await page.reload();
  await idle();
  event = await info();
  check(
    "focused member IDs survive reload",
    JSON.stringify(ids(event)) === JSON.stringify(expected) &&
      event.s.groupId === "display-group:type:event",
  );
  // Reproduce the exact old cumulative Aspect -> Event state from the screenshot.
  const oldAspect = {
    ...structuredClone(parent.s),
    expandedGroups: ["display-group:aspect"],
  };
  oldAspect.positions = buildScene(
    oldAspect,
    oldAspect.view,
    catalog,
    parent.rect.width / parent.rect.height,
  ).positions;
  const oldEvent = {
    ...structuredClone(oldAspect),
    expandedGroups: ["display-group:aspect", "display-group:event"],
  };
  const mixed = buildScene(
    oldEvent,
    oldEvent.view,
    catalog,
    parent.rect.width / parent.rect.height,
  );
  oldEvent.positions = mixed.positions;
  check(
    "legacy fixture contains the reported mixed Event/Aspect/group cards",
    new Set(mixed.cards.map((c) => c.record.kind)).size === 3 &&
      mixed.cards.some((c) => c.record.kind === "aspect") &&
      mixed.cards.some((c) => c.record.kind === "group"),
  );
  const raw = { entries: [parent.s, oldAspect, oldEvent], index: 2 };
  await page.addInitScript((history) => {
    if (sessionStorage.getItem("qa:legacy-event-focus")) return;
    sessionStorage.setItem("qa:legacy-event-focus", "yes");
    localStorage.setItem(
      "kgb:exploration:v6",
      JSON.stringify({ savedAt: Date.now() + 100000, history }),
    );
  }, raw);
  await page.reload();
  await idle();
  event = await info();
  check(
    "old mixed Event sessions reopen as exact Event membership",
    JSON.stringify(ids(event)) === JSON.stringify(expected) &&
      event.scene.cards.every((c) => c.record.kind === "event"),
  );
  check(
    "legacy conversion clears accumulated expansions and packs tightly",
    event.s.expandedGroups.length === 0 &&
      event.s.grouping === "none" &&
      packed(event),
  );
  check(
    "legacy conversion stays in the same history entry",
    event.h.index === 2 && event.h.entries.length === 3,
  );
  await page.screenshot({
    path: "output/consolidation-qa/event-legacy-repaired.png",
  });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  aspect = await info();
  check(
    "Back also normalizes the older Aspect view without unrelated groups",
    aspect.scene.cards.length === 1 &&
      aspect.scene.cards[0].id === "cover-types",
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/focused-group-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/focused-group-failure.png",
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
