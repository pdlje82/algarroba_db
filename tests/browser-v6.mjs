import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(
  process.env.KGB_PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href
    : "playwright"
);
const url = process.env.KGB_QA_URL || "http://127.0.0.1:8769";
if (!url.endsWith(":8769"))
  throw Error(
    "Run browser writes only against the isolated QA server on port 8769.",
  );
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(12000);
const saveLabel = "v6 browser verification " + Date.now(),
  legacyLabel = "legacy v5 browser check " + Date.now();
const check = (name, condition = true) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log("PASS", name);
};
const idle = async () => {
  await page.waitForSelector(".graph-canvas canvas");
  await page.locator(".loading").waitFor({ state: "hidden" });
  await page.waitForTimeout(750);
};
const state = async () => {
  await page.waitForTimeout(180);
  return page.evaluate(async () => {
    const local = JSON.parse(
      localStorage.getItem("kgb:exploration:v6") || "null",
    );
    const mirror = await new Promise((resolve) => {
      const r = indexedDB.open("kgb-exploration", 1);
      r.onsuccess = () => {
        const q = r.result
          .transaction("sessions")
          .objectStore("sessions")
          .get("kgb:exploration:v6");
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => resolve(null);
      };
      r.onerror = () => resolve(null);
    });
    const value = [local, mirror]
      .filter(Boolean)
      .sort((a, b) => b.savedAt - a.savedAt)[0];
    const h = value.history;
    return {
      state: h.entries[h.index],
      index: h.index,
      length: h.entries.length,
    };
  });
};
const selectTopic = async (label) => {
  const list = page.locator(".visible-topics");
  if (!(await list.evaluate((el) => el.open)))
    await list.locator("summary").click();
  await page
    .getByRole("button", { name: "Inspect " + label, exact: true })
    .click();
};
const shot = async (name) => {
  await page.locator(".context-strip").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "output/consolidation-qa/" + name + ".png" });
};
mkdirSync("output/consolidation-qa", { recursive: true });
try {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      if ((await fetch(url + "/api/health")).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const health = await (await fetch(url + "/api/health")).json();
  if (
    !health.project.replaceAll("\\", "/").endsWith("/output/consolidation-qa")
  )
    throw Error(
      "Browser writes require the isolated QA helper, not a production database.",
    );
  await page.goto(url);
  await idle();
  check(
    "overview has nine foreground groups",
    (await page.locator(".graph-footer").innerText()).startsWith(
      "9 foreground",
    ),
  );
  // A real WebGL card click selects without opening or adding history.
  await page.mouse.click(447, 482);
  await page.waitForTimeout(180);
  check(
    "canvas card click only selects",
    (await page.locator(".inspector h2").innerText()).includes("Species"),
  );
  check("selection does not add history", (await state()).index === 0);
  await page
    .getByRole("button", { name: /^Species & companions\s*\d+$/ })
    .click();
  await idle();
  check(
    "opening a group replaces the foreground",
    (await state()).state.scope === "group",
  );
  const before = await state();
  await selectTopic("Carob tree");
  check(
    "topic inspection does not navigate",
    (await state()).index === before.index,
  );
  await page
    .getByRole("button", { name: "Show connected topics", exact: true })
    .click();
  await idle();
  let s = await state();
  check(
    "Explore sets Carob and its direct scope",
    s.state.centre === "carob" && s.state.scope === "neighbors",
  );
  const directCount = s.state.view.endpoint_ids.length;
  const directReference = await (await fetch(url + '/api/explore?scope=neighbors&centre=carob')).json();
  check("direct neighbours remain a complete scope", directCount === directReference.endpoint_ids.length);
  await page.getByLabel("Zoom out", { exact: true }).click();
  await page.waitForTimeout(600);
  check(
    "zoom never closes content",
    (await state()).state.view.endpoint_ids.length === directCount &&
      (await state()).index === s.index,
  );
  await page
    .getByLabel("Search stored knowledge", { exact: true })
    .fill("drone");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await idle();
  s = await state();
  check(
    "Carob + Drone retains the anchor and routes",
    s.state.centre === "carob" && s.state.view.routes.length > 0,
  );
  const routes = page.locator(".route-controls details");
  await routes.locator("summary").click();
  await routes.getByRole("button").first().click();
  const index = (await state()).index;
  check(
    "route selection does not expand",
    !(await state()).state.expandedRoutes.length,
  );
  await page.getByRole("button", { name: "Show steps", exact: true }).click();
  await idle();
  check(
    "Show steps expands one route",
    (await state()).state.expandedRoutes.length === 1,
  );
  check(
    "selected route stays available after expansion",
    await page
      .getByRole("button", { name: "Hide steps", exact: true })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Hide steps", exact: true }).click();
  await idle();
  await page.getByRole("checkbox", { name: "Show all route steps" }).check();
  await idle();
  s = await state();
  check(
    "all-route control uses the common expansion set",
    s.state.expandedRoutes.length === s.state.view.routes.length,
  );
  await shot("routes");
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
  s = await state();
  check(
    "domain filters endpoints without broad supporting branches",
    s.state.view.endpoint_ids.every(
      (id) =>
        s.state.view.nodes.find((t) => t.id === id).domain === "technology",
    ),
  );
  await page.getByLabel("Group by", { exact: true }).selectOption("place");
  await idle();
  check(
    "grouping keeps the same centre",
    (await state()).state.centre === "carob",
  );
  await page.getByRole("button", { name: "Evidence", exact: true }).click();
  check(
    "evidence is available outside the graph",
    await page
      .getByRole("heading", { name: "Evidence", exact: true })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Dates", exact: true }).click();
  check(
    "date meanings remain available",
    (await page.locator(".inspector").innerText()).includes("Source dates"),
  );
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await idle();
  check(
    "clearing search returns direct connections",
    (await state()).state.scope === "neighbors",
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("all");
  await page
    .getByRole("button", { name: "Update layer domain", exact: true })
    .first()
    .click();
  await idle();
  await page.getByLabel("Group by", { exact: true }).selectOption("none");
  await idle();
  await page.getByLabel("Centre", { exact: true }).selectOption("cocoon");
  await idle();
  await selectTopic("Cocoon planting reservoir");
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await idle();
  s = await state();
  check(
    "Cocoon Members opens exactly its nine organized topics",
    s.state.view.endpoint_ids.length === 9 && s.state.scope === "group",
  );
  await page.getByLabel("Centre", { exact: true }).selectOption("cocoon");
  await idle();
  check(
    "Cocoon Connections includes wider factual context",
    (await state()).state.view.endpoint_ids.length === 22 &&
      !!(await state()).state.positions.cocoon,
  );
  await selectTopic("Cocoon planting reservoir");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await idle();
  check(
    "comparison uses a table",
    await page.locator(".comparison-scroll table").isVisible(),
  );
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await selectTopic("Cocoon planting reservoir");
  await page.locator(".inspector .refs button").first().click();
  await page.waitForSelector(".source-panel canvas");
  await page.waitForFunction(
    () =>
      Number(document.querySelector(".pdf-scroll")?.dataset.renderedPage) > 0,
  );
  check(
    "PDF opens an exact rendered page",
    Number(await page.getByLabel("PDF page", { exact: true }).inputValue()) > 0,
  );
  await page.getByRole("button", { name: "Rotate ↻" }).click();
  await page.getByLabel("Close source").click();
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Save exploration" })
    .getByLabel("Name")
    .fill(saveLabel);
  await page
    .getByRole("button", { name: "Save exploration", exact: true })
    .click();
  await page.waitForSelector(".modal-shade", { state: "hidden" });
  check("saved exploration writes only the QA database");
  await page.getByLabel("Remove centre").click();
  await idle();
  s = await state();
  check(
    "remove-centre removes its card and preserves the neighbouring results",
    s.state.centre === null &&
      s.state.view.endpoint_ids.length === 22 &&
      !s.state.positions.cocoon,
  );
  await page.reload();
  await idle();
  check(
    "centre removal and repacked neighbours survive reload",
    (await state()).state.centre === null &&
      (await state()).state.view.endpoint_ids.length === 22 &&
      !(await state()).state.positions.cocoon,
  );
  await page
    .getByRole("button", { name: "Saved explorations", exact: true })
    .click();
  await page.getByRole("button", { name: saveLabel, exact: true }).click();
  await idle();
  check(
    "saved exploration restores centre and comparison",
    (await state()).state.centre === "cocoon" &&
      (await state()).state.compare.includes("cocoon"),
  );
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview prompt", exact: true })
    .click();
  await page.waitForSelector('textarea[aria-label="Editable Codex prompt"]');
  const prompt = await page.getByLabel("Editable Codex prompt").inputValue();
  check(
    "research preview captures scope, grouping, and wider-discovery instructions",
    prompt.includes("Scope:") &&
      prompt.includes("Grouping:") &&
      prompt.includes("ALL useful supported discoveries"),
  );
  await page
    .getByLabel("Editable Codex prompt")
    .fill(prompt + "\nExact browser test edit.");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.waitForSelector(".research-modal", { state: "hidden" });
  check("edited research task saved in isolation");
  const good = (await state()).state;
  await page.route("**/api/explore*", async (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get("search") === "simulate-failure")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulated offline request" }),
      });
    else if (u.searchParams.get("search") === "slow-request") {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue().catch(() => {});
    } else await route.continue();
  });
  await page
    .getByLabel("Search stored knowledge", { exact: true })
    .fill("simulate-failure");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForSelector("[role=alert]");
  check(
    "failed query retains last working scope",
    (await state()).state.centre === good.centre &&
      (await state()).state.search === good.search,
  );
  await page
    .getByLabel("Search stored knowledge", { exact: true })
    .fill("slow-request");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByLabel("Search stored knowledge", { exact: true })
    .fill("drone");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await idle();
  await page.waitForTimeout(1000);
  check(
    "late superseded response cannot replace the latest query",
    (await state()).state.search === "drone",
  );
  const head = await state();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await idle();
  check(
    "Back and Forward restore the complete query",
    (await state()).state.search === head.state.search,
  );
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.getByLabel("Turn right").click();
  await page.getByLabel("Tilt up").click();
  await page.waitForTimeout(500);
  await shot("dark-angled");
  check(
    "theme and angle controls preserve scope",
    (await state()).state.search === "drone",
  );
  await page.setViewportSize({ width: 800, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.waitForTimeout(300);
  await shot("portrait");
  check(
    "resizing and reduced motion preserve scope",
    (await state()).state.search === "drone",
  );
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await page.waitForTimeout(250);
  check(
    "fullscreen retains docked inspector",
    await page.locator(".inspector").isVisible(),
  );
  await page.keyboard.press("Escape");
  const legacyRaw = {
    layoutVersion: 5,
    centre: "carob",
    search: "drone",
    perspective: "sources",
    detail: "full",
    overview: false,
    expandedRoutes: ["route:drones"],
    positions: { carob: { x: 10, y: 20 } },
  };
  const legacy = await page.request.post(url + "/api/explorations", {
    data: {
      label: legacyLabel,
      state: legacyRaw,
      history: [legacyRaw],
    },
  });
  const legacyPayload = await legacy.json();
  await page
    .getByRole("button", { name: "Saved explorations", exact: true })
    .click();
  await page.getByRole("button", { name: legacyLabel, exact: true }).click();
  await idle();
  check(
    "legacy saved exploration reopens its centre and evidence panel",
    (await state()).state.centre === "carob" &&
      (await page
        .getByRole("heading", { name: "Evidence", exact: true })
        .isVisible()),
  );
  const unchanged = await (
    await page.request.get(url + "/api/explorations/" + legacyPayload.id)
  ).json();
  check(
    "opening a legacy exploration does not rewrite its database payload",
    JSON.stringify(unchanged.state) === JSON.stringify(legacyRaw),
  );
  check("no browser JavaScript exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/browser-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (error) {
  console.error(error.stack);
  console.error(
    await state()
      .then((v) =>
        JSON.stringify({
          centre: v.state.centre,
          search: v.state.search,
          routes: v.state.view?.routes?.length,
          index: v.index,
        }),
      )
      .catch(() => "No state"),
  );
  await page
    .screenshot({ path: "output/consolidation-qa/failure.png", timeout: 2000 })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}
process.exit(process.exitCode || 0);
