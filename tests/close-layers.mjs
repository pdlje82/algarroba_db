import assert from "node:assert/strict";
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
  await page.waitForTimeout(600);
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
  check(
    "base overview close button is disabled",
    await page
      .getByRole("button", { name: "Close layer", exact: true })
      .isDisabled(),
  );
  await page.getByLabel("Centre", { exact: true }).selectOption("carob");
  await idle();
  await page.getByLabel("Centre", { exact: true }).selectOption("cocoon");
  await idle();
  let before = await info();
  check(
    "each visible layer has a keyboard-accessible close button",
    (await page.locator(".layer-close-button").count()) ===
      before.previous.length + 1,
  );
  await page.screenshot({path:"output/consolidation-qa/close-layers-open.png"});
  // Node selection remains inspection-only.
  const topics = page.locator(".visible-topics");
  await topics.locator("summary").click();
  await page
    .getByRole("button", {
      name: "Inspect Cocoon planting reservoir",
      exact: true,
    })
    .click();
  check(
    "node click shows sidebar details without adding a view",
    (await info()).h.index === before.h.index &&
      (await page
        .getByRole("heading", {
          name: "Cocoon planting reservoir",
          exact: true,
        })
        .isVisible()),
  );
  let key = before.previous[0].key;
  const target = page
    .locator(".layer-close-button")
    .and(page.locator('[data-layer-key="' + key + '"]'));
  await target.click();
  await page.waitForTimeout(500);
  let after = await info();
  check(
    "background close removes only its own snapshot",
    after.previous.length === before.previous.length - 1 &&
      !after.previous.some((s) => s.key === key),
  );
  check(
    "background close preserves the active topic and camera",
    after.s.centre === "cocoon" &&
      JSON.stringify(after.s.camera) === JSON.stringify(before.s.camera),
  );
  await page.reload();
  await idle();
  check(
    "closed background remains closed after reload",
    !(await info()).previous.some((s) => s.key === key),
  );
  // Reopen a fresh exploration, then use the heading close button on its foreground.
  await page.getByLabel("Centre", { exact: true }).selectOption("drones");
  await idle();
  before = await info();
  const closedKey = before.scene.key,
    expected = before.previous[0]?.key;
  await page
    .locator(".layer-close-button")
    .and(page.locator('[data-layer-key="' + closedKey + '"]'))
    .click();
  await idle();
  after = await info();
  check(
    "foreground close restores the nearest visible prior layer",
    expected ? after.scene.key === expected : after.s.scope === "overview",
  );
  check(
    "foreground close keeps its original history entry",
    after.h.entries.length === before.h.entries.length + 1 &&
      after.h.entries[before.h.index].centre === "drones",
  );
  check(
    "closed foreground is not reintroduced as a snapshot",
    !after.previous.some((s) => s.key === closedKey),
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  check(
    "Back can restore a closed foreground exploration",
    (await info()).s.centre === "drones",
  );
  await page
    .getByRole("button", { name: "Return to overview", exact: true })
    .click();
  await idle();
  await page.getByRole("button", { name: /^Funding programmes\s*18$/ }).click();
  await idle();
  check(
    "a member layer can be closed from the toolbar",
    !(await page
      .getByRole("button", { name: "Close layer", exact: true })
      .isDisabled()),
  );
  await page.getByRole("button", { name: "Close layer", exact: true }).click();
  await idle();
  check(
    "closing a lone group returns to a single overview",
    (await info()).s.scope === "overview" &&
      (await info()).previous.length === 0,
  );
  await page.screenshot({
    path: "output/consolidation-qa/close-layer-buttons.png",
  });
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/close-layer-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/close-layer-failure.png",
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
