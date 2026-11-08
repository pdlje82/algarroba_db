import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href);
const url = "http://127.0.0.1:8769";
assert.ok((await (await fetch(url + "/api/health")).json()).project.replaceAll("\\", "/").endsWith("/output/consolidation-qa"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const checks = [], errors = [];
const check = (name, ok = true) => { assert.ok(ok, name); checks.push(name); console.log("PASS", name); };
const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.on("pageerror", (e) => errors.push(e.message));
let chunkRequests = 0;
await page.route("**/assets/PdfPanel-*.js", (route) => {
  chunkRequests++;
  return route.fulfill({ status: 404, contentType: "text/plain", body: "Missing previous build asset" });
});
const ready = async () => {
  await page.locator(".graph-canvas canvas").waitFor();
  await page.locator(".loading").waitFor({ state: "hidden" });
};
const painted = async (pageNumber) => {
  await page.waitForFunction((n) => {
    const el = document.querySelector(".pdf-scroll"), canvas = el?.querySelector("canvas");
    return el?.getAttribute("aria-busy") === "false" && Number(el.dataset.renderedPage) === n && canvas.width > 100 && canvas.height > 100;
  }, pageNumber);
};
const selectCarob = async () => {
  await page.getByLabel("Centre", { exact: true }).selectOption("carob"); await ready();
  await page.locator(".visible-topics summary").click();
  await page.getByRole("button", { name: "Inspect Carob tree", exact: true }).click();
};
const openCitation = () => page.locator(".inspector .refs button").first().click();
const close = () => page.getByRole("button", { name: "Close source", exact: true }).click();
try {
  check("the shipped app has no deferred PDF-viewer chunk", !readdirSync("dist/assets").some((name) => /^PdfPanel-/.test(name)) && !readFileSync("frontend/main.tsx", "utf8").includes('lazy(() => import("./PdfPanel"))'));
  await page.goto(url); await ready(); await selectCarob();
  const reference = await page.locator(".inspector .refs button").first().innerText();
  const requestedPage = Number(reference.match(/p(\d+)/)[1]);
  await openCitation(); await painted(requestedPage);
  check("the first source click renders the exact citation despite unavailable old chunk URLs", chunkRequests === 0 && await page.locator(".masthead").isVisible());
  check("the PDF canvas contains actual nonblank source pixels", await page.locator(".source-panel canvas").evaluate((canvas) => {
    const ctx = canvas.getContext("2d"), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 0; i < data.length; i += 40) if (data[i + 3] && Math.min(data[i], data[i + 1], data[i + 2]) < 220) ink++;
    return ink > 20;
  }));
  await page.getByLabel("PDF page", { exact: true }).fill(String(requestedPage + 1));
  await painted(requestedPage + 1);
  await page.getByRole("button", { name: "Rotate ↻", exact: true }).click(); await painted(requestedPage + 1);
  await page.getByRole("button", { name: "Zoom source in", exact: true }).click(); await painted(requestedPage + 1);
  check("page changes, rotation and source zoom finish without rendering errors", await page.getByRole("alert").count() === 0);
  await page.screenshot({ path: "output/consolidation-qa/source-viewer-working.png" });
  await close();
  await page.route("**/api/sources/FOREST-002/file", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Simulated source unavailable" }) }));
  await openCitation();
  await page.getByRole("alert").waitFor();
  check("a failed PDF request stays inside a closable source panel", (await page.getByRole("alert").innerText()).includes("Simulated source unavailable") && await page.locator(".graph-canvas canvas").count() === 1);
  await page.unroute("**/api/sources/FOREST-002/file");
  await page.getByRole("button", { name: "Retry source", exact: true }).click(); await painted(requestedPage);
  check("Retry source recovers without refreshing the graph", await page.getByRole("alert").count() === 0 && await page.locator(".masthead").isVisible());
  await close();
  const delayed = async (route) => { await new Promise((r) => setTimeout(r, 500)); await route.continue().catch(() => {}); };
  await page.route("**/api/sources/FOREST-002/file", delayed);
  for (let i = 0; i < 3; i++) { await openCitation(); await close(); }
  await page.unroute("**/api/sources/FOREST-002/file", delayed);
  await openCitation(); await painted(requestedPage);
  check("rapid open/close and abandoned loads cannot blank or overwrite the next source", await page.locator("#root").evaluate((el) => el.childElementCount > 0) && await page.getByRole("alert").count() === 0);
  // Exercise rapid repaint cancellation against the same canvas.
  await page.getByLabel("PDF page", { exact: true }).fill("14");
  await page.getByRole("button", { name: "Rotate ↻", exact: true }).click();
  await page.getByRole("button", { name: "Zoom source out", exact: true }).click();
  await page.getByLabel("PDF page", { exact: true }).fill("15"); await painted(15);
  check("superseded page paints cancel before reusing the canvas", await page.getByRole("alert").count() === 0);
  await close();
  await page.getByRole("button", { name: /^Source library/ }).click();
  const catalog = await (await fetch(url + "/api/catalog")).json();
  for (const source of catalog.sources.filter(s => (s.kind || "pdf") === "pdf")) {
    const article = page.getByRole("dialog", { name: "Source library", exact: true }).locator("article").filter({ has: page.getByRole("heading", { name: source.id, exact: true }) });
    await article.getByRole("button", { name: "Open source", exact: true }).click();
    await painted(source.initial_pdf_page_ranges[0][0]); await close();
    check(source.id + " opens its registered edition and closes back to the app");
  }
  // Force a rendering exception, distinct from an ordinary network failure.
  const broken = await context.newPage(); broken.setDefaultTimeout(20000);
  await broken.route("**/api/catalog", async (route) => {
    const data = await (await route.fetch()).json();
    data.sources.find((s) => s.id === "FOREST-002").dates = {};
    await route.fulfill({ json: data });
  });
  await broken.goto(url); await broken.locator(".graph-canvas canvas").waitFor(); await broken.locator(".loading").waitFor({ state: "hidden" });
  await broken.getByLabel("Centre", { exact: true }).selectOption("carob"); await broken.locator(".loading").waitFor({ state: "hidden" });
  await broken.locator(".visible-topics summary").click();
  await broken.getByRole("button", { name: "Inspect Carob tree", exact: true }).click();
  await broken.locator(".inspector .refs button").first().click();
  await broken.getByRole("alert").waitFor();
  check("an unexpected viewer render exception cannot unmount the application", (await broken.getByRole("alert").innerText()).includes("Your graph is still available") && await broken.locator(".graph-canvas canvas").count() === 1);
  await broken.getByRole("button", { name: "Close source", exact: true }).click();
  check("Close source recovers the working graph after a viewer exception", await broken.locator(".masthead").isVisible() && await broken.getByLabel("Centre", { exact: true }).inputValue() === "carob");
  await broken.close();
  check("normal source operations produce no browser JavaScript exceptions", errors.length === 0);
  writeFileSync("output/consolidation-qa/source-viewer-results.json", JSON.stringify({ checks, errors, chunkRequests }, null, 2));
} catch (e) {
  console.error(e); process.exitCode = 1;
  await page.screenshot({ path: "output/consolidation-qa/source-viewer-failure.png", timeout: 3000 }).catch(() => {});
  writeFileSync("output/consolidation-qa/source-viewer-results.json", JSON.stringify({ checks, errors, chunkRequests, failure: String(e) }, null, 2));
} finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 2000))]); }
process.exit(process.exitCode || 0);
