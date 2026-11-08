import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const { chromium } = await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url = "http://127.0.0.1:8769";
assert.ok((await (await fetch(url + "/api/health")).json()).project.replaceAll("\\", "/").endsWith("/output/consolidation-qa"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, reducedMotion: "reduce" });
const checks = [], errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok = true) => { assert.ok(ok, name); checks.push(name); console.log("PASS", name); };
const idle = async () => { await page.locator(".graph-canvas canvas").waitFor(); await page.locator(".loading").waitFor({ state: "hidden" }); await page.waitForTimeout(500); };
await page.addInitScript(() => {
  const original = CanvasRenderingContext2D.prototype.fillText;
  window.__cardText = new Map();
  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    if (this.canvas.width === 702 && this.canvas.height === 372) {
      if (!window.__cardText.has(this.canvas)) window.__cardText.set(this.canvas, []);
      window.__cardText.get(this.canvas).push({ text, x, y, maxWidth, width: this.measureText(text).width, font: this.font });
    }
    return original.apply(this, arguments);
  };
});
const inspect = async (label) => {
  const list = page.locator(".visible-topics");
  if (!(await list.evaluate((el) => el.open))) await list.locator("summary").click();
  await page.getByRole("button", { name: "Inspect " + label, exact: true }).click();
};
try {
  const catalog = await (await fetch(url + "/api/catalog")).json();
  const species = catalog.topics.filter((t) => t.kind === "species");
  check("all 34 original species IDs have persisted name metadata", species.length === 34 && species.every((t) => "spanish_name" in t && "english_name" in t && t.scientific_name));
  check("32 species records have all three names; two unresolved source spellings stay explicit", species.filter((t) => t.spanish_name && t.english_name).length === 32 && species.filter((t) => !t.spanish_name || !t.english_name).every((t) => ["chamaespartium-source", "whitania-frutescens-source"].includes(t.id)));
  await page.goto(url); await idle();
  await page.getByRole("button", { name: /^Species & companions\s*36$/ }).click(); await idle();
  const canvases = await page.evaluate(() => [...window.__cardText.values()]);
  const speciesCanvases = canvases.filter((calls) => calls.some((c) => c.text.startsWith("SPECIES")));
  const rows = (calls) => [88, 162, 236].map((y) => calls.filter((c) => c.x === 98 && c.y >= y && c.y <= y + 32).map((c) => c.text).join(" "));
  check("the actual graph canvas draws Spanish, English and scientific names for every species", species.every((t) => speciesCanvases.some((calls) => JSON.stringify(rows(calls)) === JSON.stringify([t.spanish_name || "Sin confirmar", t.english_name || "Not verified", t.scientific_name]))));
  check("all rendered name lines fit within their card rows and available width", speciesCanvases.every((calls) => calls.filter((c) => c.x === 98).every((c) => c.width <= 577 && c.y <= 268 && parseInt(c.font.match(/(\d+)px/)[1]) >= 22)));
  check("source-spelling and genus-only cards carry explicit visible status", speciesCanvases.some((c) => c.some((t) => t.text === "SPECIES · SOURCE SPELLING")) && speciesCanvases.some((c) => c.some((t) => t.text === "SPECIES · GENUS ONLY")));
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.screenshot({ path: "output/consolidation-qa/species-names-grid.png" });
  await inspect("Carob tree");
  const panel = page.locator(".species-name-details");
  check("the inspector exposes all three names and the unchanged database identity", (await panel.innerText()).includes("Algarrobo") && (await panel.innerText()).includes("Carob tree") && (await panel.innerText()).includes("Ceratonia siliqua") && (await panel.innerText()).includes("Database ID: carob"));
  await panel.locator("summary").click();
  check("naming provenance is accessible as a direct source link", await panel.locator('a[href="https://gd.eppo.int/taxon/CEQSI"]').isVisible());
  await page.getByLabel("Centre", { exact: true }).selectOption("carob"); await idle();
  for (let i = 0; i < 2; i++) { await page.getByRole("button", { name: "Zoom in", exact: true }).click(); await page.waitForTimeout(150); }
  await page.getByRole("button", { name: "Turn left", exact: true }).click(); await page.waitForTimeout(200);
  await page.screenshot({ path: "output/consolidation-qa/species-names-exploration.png" });
  check("topic exploration also renders the three names", (await page.locator(".species-names").allTextContents()).some((text) => text.includes("Algarrobo") && text.includes("Carob tree") && text.includes("Ceratonia siliqua")));
  for (const [term, id] of [["Cantueso", "lavandula-stoechas"], ["French lavender", "lavandula-stoechas"], ["Ceratonia siliqua", "carob"]]) {
    await page.getByLabel("Search stored knowledge", { exact: true }).fill(term);
    const response = page.waitForResponse((r) => r.url().includes("/api/explore?") && r.request().method() === "GET");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const result = await (await response).json(); await idle();
    check("search by " + term + " resolves the existing species ID", result.endpoint_ids.includes(id));
  }
  await page.reload(); await idle();
  check("saved exploration reopens with the stored multilingual names", (await page.locator(".species-names").allTextContents()).some((text) => text.includes("Algarrobo") && text.includes("Ceratonia siliqua")));
  await page.getByRole("button", { name: /^Species & companions\s*36$/ }).click(); await idle();
  await inspect("Whitania frutescens (source spelling)");
  check("unresolved names show explicit missing values with their original source identity", (await panel.innerText()).includes("Sin confirmar") && (await panel.innerText()).includes("Not verified") && (await panel.innerText()).includes("Whitania frutescens") && (await panel.innerText()).includes("whitania-frutescens-source"));
  check("no browser JavaScript exceptions", errors.length === 0);
  writeFileSync("output/consolidation-qa/species-names-results.json", JSON.stringify({ checks, errors }, null, 2));
} catch (e) {
  console.error(e); process.exitCode = 1;
  await page.screenshot({ path: "output/consolidation-qa/species-names-failure.png" }).catch(() => {});
  writeFileSync("output/consolidation-qa/species-names-results.json", JSON.stringify({ checks, errors, failure: String(e) }, null, 2));
} finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 2000))]); }
process.exit(process.exitCode || 0);
