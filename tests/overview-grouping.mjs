import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes } from "../frontend/scene.ts";
const { chromium } = await import(
    pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href
  ),
  url = "http://127.0.0.1:8769";
for (let i = 0; i < 30; i++) {
  try {
    if ((await fetch(url + "/api/health")).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
assert.ok(
  (await (await fetch(url + "/api/health")).json()).project
    .replaceAll("\\", "/")
    .endsWith("/output/consolidation-qa"),
);
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
    reducedMotion: "reduce",
  }),
  checks = [],
  errors = [];
page.setDefaultTimeout(12000);
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, condition = true) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log("PASS", name);
};
const idle = async () => {
  await page.locator(".graph-canvas canvas").waitFor();
  await page.locator(".loading").waitFor({ state: "hidden" });
  await page.waitForTimeout(500);
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
    s = h.entries[h.index];
  return {
    h,
    s,
    scene: buildScene(s, s.view, catalog),
    previous: previousScenes(h.entries, h.index, catalog, 1.6),
  };
};
try {
  await page.goto(url);
  await idle();
  await page.getByLabel("Centre", { exact: true }).selectOption("carob");
  await idle();
  let before = await info();
  check(
    "exploration can still show its earlier overview",
    before.previous.length === 1,
  );
  await page.getByLabel("Group by", { exact: true }).selectOption("type");
  await idle();
  let grouped = await info();
  check(
    "grouping does not create another view or layer",
    grouped.h.index === before.h.index &&
      grouped.h.entries.length === before.h.entries.length &&
      grouped.previous.length === before.previous.length,
  );
  check(
    "grouping preserves the camera",
    JSON.stringify(grouped.s.camera) === JSON.stringify(before.s.camera),
  );
  const list = page.locator(".visible-topics");
  await list.locator("summary").click();
  await list
    .getByRole("button", { name: "Open group", exact: true })
    .first()
    .click();
  await idle();
  let expanded = await info();
  check(
    "opening a displayed group keeps its original layer behind",
    expanded.h.index === grouped.h.index + 1 &&
      expanded.previous[0].key === grouped.scene.key,
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("funding");
  await idle();
  await page
    .getByRole("button", { name: "Return to overview", exact: true })
    .click();
  await idle();
  let overview = await info();
  check(
    "return to overview has a single layer",
    overview.previous.length === 0 && overview.s.layerRoot,
  );
  check(
    "overview retains the one-domain selection",
    overview.s.domain === "funding" &&
      overview.scene.cards.every((c) => c.record.domain === "funding"),
  );
  check(
    "out-of-domain centre does not add another domain card",
    !overview.scene.cards.flatMap((c) => c.members).includes("carob"),
  );
  const overviewIndex = overview.h.index;
  await page.getByLabel("Group by", { exact: true }).selectOption("place");
  await idle();
  check(
    "grouping the overview keeps one layer and its history position",
    (await info()).previous.length === 0 &&
      (await info()).h.index === overviewIndex,
  );
  await page.getByRole("button", { name: /^Funding programmes\s*18$/ }).click();
  await idle();
  const members = await info();
  check(
    "opening a sidebar group keeps the domain overview behind it",
    members.h.index === overviewIndex + 1 &&
      members.previous.length === 1 &&
      members.s.domain === "funding",
  );
  await page.getByLabel("Centre", { exact: true }).selectOption("al20");
  await idle();
  const explored = await info();
  check(
    "older closed layers do not reappear after exploring again",
    explored.previous.length === 2 &&
      explored.previous[0].signature === members.scene.signature,
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  check(
    "Back restores group contents with its original overview behind",
    (await info()).previous.length === 1,
  );
  await page
    .getByRole("button", { name: "Return to overview", exact: true })
    .click();
  await idle();
  await page.reload();
  await idle();
  check(
    "single-layer overview and domain survive reload",
    (await info()).previous.length === 0 &&
      (await info()).s.domain === "funding",
  );
  await page.screenshot({
    path: "output/consolidation-qa/single-domain-overview.png",
  });
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/overview-grouping-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/overview-grouping-failure.png",
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
