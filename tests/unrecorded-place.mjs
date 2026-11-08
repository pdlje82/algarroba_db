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
  await page
    .getByRole("button", { name: /^Habitats & conditions\s*58$/ })
    .click();
  await idle();
  await page.getByLabel("Group by", { exact: true }).selectOption("place");
  await idle();
  await primeCamera();
  const parent = await info(),
    unrecorded = parent.scene.cards.find(
      (c) => c.id === "display-group:unrecorded",
    );
  assert.ok(unrecorded);
  const expected = unrecorded.members.slice().sort(),
    assigned = parent.scene.cards
      .filter((c) => c.id !== unrecorded.id)
      .flatMap((c) => c.members);
  check(
    "parent assigns exactly 37 unrecorded members and 21 recorded-place members",
    expected.length === 37 &&
      assigned.length === 21 &&
      expected.every((id) => !assigned.includes(id)),
  );
  const place = parent.scene.cards.find(
    (c) => c.id === "display-group:al-faisal",
  );
  let p = point(parent, place);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await idle();
  await primeCamera();
  let located = await info();
  check(
    "the assigned Al Faisal group still opens only its three members",
    JSON.stringify(ids(located)) ===
      JSON.stringify(["al-faisal", "al-faisal-pilot", "canal-flooding"]),
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  p = point(await info(), unrecorded);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await idle();
  await primeCamera();
  let focused = await info();
  check(
    "Place not recorded opens exactly the members represented by its parent card",
    JSON.stringify(ids(focused)) === JSON.stringify(expected),
  );
  check(
    "no record assigned to another place appears in the foreground",
    ids(focused).every((id) => !assigned.includes(id)),
  );
  check(
    "every displayed record has no explicit place annotation and is not a place node",
    focused.scene.cards.every(
      (c) => c.record.kind !== "place" && !c.record.place_ids?.length,
    ),
  );
  check("the focused layer is a complete tight grid", packed(focused));
  check(
    "the parent stays behind and source selection remains traceable",
    focused.previous[0].key === parent.scene.key &&
      focused.s.openedFrom.cardId === unrecorded.id,
  );
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.waitForTimeout(220);
  await page.screenshot({
    path: "output/consolidation-qa/unrecorded-place-tight.png",
  });
  const positions = JSON.stringify(focused.scene.positions);
  await page.reload();
  await idle();
  focused = await info();
  check(
    "an already compact saved layout survives reload exactly",
    JSON.stringify(focused.scene.positions) === positions,
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await idle();
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
  const empty = await info();
  check(
    "filtering to an empty domain preserves the validated member universe",
    empty.scene.cards.length === 0 &&
      JSON.stringify(empty.s.groupMembers) === JSON.stringify(expected),
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("all");
  await idle();
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
  focused = await info();
  check(
    "returning to All restores 37 unrecorded members without assigned-place leakage",
    JSON.stringify(ids(focused)) === JSON.stringify(expected) &&
      packed(focused),
  );
  // Old cumulative expansion with Al Faisal already expanded reproduces the screenshot.
  const previous = {
    ...structuredClone(parent.s),
    expandedGroups: ["display-group:al-faisal"],
  };
  previous.positions = buildScene(
    previous,
    previous.view,
    catalog,
    parent.rect.width / parent.rect.height,
  ).positions;
  const legacy = {
    ...structuredClone(previous),
    expandedGroups: ["display-group:al-faisal", "display-group:unrecorded"],
  };
  legacy.positions = buildScene(
    legacy,
    legacy.view,
    catalog,
    parent.rect.width / parent.rect.height,
  ).positions;
  check(
    "legacy fixture reproduces recorded-place topics in the mixed unrecorded layer",
    buildScene(legacy, legacy.view, catalog).cards.some(
      (c) => c.id === "al-faisal-pilot",
    ),
  );
  let repaired = await seed(
    { entries: [parent.s, previous, legacy], index: 2 },
    "qa:legacy-unrecorded-place",
  );
  check(
    "old cumulative sessions reopen with only truly unrecorded members",
    JSON.stringify(ids(repaired)) === JSON.stringify(expected) &&
      packed(repaired),
  );
  // A formerly focused but incorrectly captured member list must also be revalidated.
  const malformed = {
    ...structuredClone(focused.s),
    groupMembers: parent.s.view.endpoint_ids.slice(),
    view: {
      ...parent.s.view,
      group_id: "display-group:place:unrecorded",
      group_member_ids: parent.s.view.endpoint_ids.slice(),
    },
    positions: legacy.positions,
  };
  const scattered = buildScene(
    malformed,
    malformed.view,
    catalog,
    parent.rect.width / parent.rect.height,
  );
  malformed.positions = scattered.positions;
  malformed.layerOffsets = {
    ...malformed.layerOffsets,
    [scattered.key]: { x: 71, y: -35 },
  };
  repaired = await seed(
    { entries: [parent.s, malformed], index: 1 },
    "qa:invalid-unrecorded-focus",
  );
  check(
    "previously captured assigned-place IDs are removed by server validation",
    JSON.stringify(ids(repaired)) === JSON.stringify(expected) &&
      JSON.stringify(repaired.s.groupMembers) === JSON.stringify(expected),
  );
  check(
    "scattered focused positions are repaired into a tight grid",
    packed(repaired),
  );
  check(
    "repair preserves camera, layer movement and history",
    JSON.stringify(repaired.s.camera) === JSON.stringify(malformed.camera) &&
      repaired.scene.offset.x === 71 &&
      repaired.scene.offset.y === -35 &&
      repaired.h.index === 1 &&
      repaired.h.entries.length === 2,
  );
  await page.screenshot({
    path: "output/consolidation-qa/unrecorded-place-repaired.png",
  });
  const fixed = JSON.stringify(repaired.scene.positions);
  await page.reload();
  await idle();
  repaired = await info();
  check(
    "validated membership and compact positions persist on the next reload",
    JSON.stringify(ids(repaired)) === JSON.stringify(expected) &&
      JSON.stringify(repaired.scene.positions) === fixed,
  );
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/unrecorded-place-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/unrecorded-place-failure.png",
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
