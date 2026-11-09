import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const { chromium } = await import(
  pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href
);
const url = process.env.KGB_PLANT_TEST_URL || "http://127.0.0.1:8771";
const catalog = await (await fetch(url + "/api/catalog")).json();
assert.equal(catalog.plant_images.length, 46);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1050 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const checks = [],
  errors = [],
  requests = [];
const check = (name, condition = true) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log("PASS", name);
};
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().includes("/api/plant-images/")) requests.push(r.url());
});
await page.addInitScript(() => {
  window.__plantDraws = [];
  window.__plantText = [];
  const draw = CanvasRenderingContext2D.prototype.drawImage,
    text = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.drawImage = function (im, ...args) {
    if (
      this.canvas.width === 702 &&
      this.canvas.height === 372 &&
      im.src?.includes("/plant-images/")
    )
      window.__plantDraws.push({ url: im.src, args });
    return draw.call(this, im, ...args);
  };
  CanvasRenderingContext2D.prototype.fillText = function (
    value,
    x,
    y,
    maxWidth,
  ) {
    if (this.canvas.width === 702 && x === 264)
      window.__plantText.push({
        value,
        x,
        y,
        width: Math.min(this.measureText(value).width, maxWidth),
        font: this.font,
      });
    return text.call(this, value, x, y, maxWidth);
  };
});
const ready = async () => {
  await page.locator(".graph-canvas canvas").waitFor();
  await page.locator(".loading").waitFor({ state: "hidden" });
};
const inspect = async (topic) => {
  await page.getByLabel("Centre", { exact: true }).selectOption(topic.id);
  await ready();
  const list = page.locator(".visible-topics");
  if (!(await list.evaluate((el) => el.open)))
    await list.locator("summary").click();
  await page
    .getByRole("button", { name: "Inspect " + topic.label, exact: true })
    .click();
};
try {
  await page.goto(url);
  await ready();
  check(
    "the initial overview does not request original-resolution images",
    !requests.some((x) => x.includes("/original")),
  );
  for (const topic of catalog.topics.filter((t) => t.plant_images?.length)) {
    await inspect(topic);
    await page
      .getByRole("button", { name: "View plant images", exact: true })
      .click();
    const modal = page.getByRole("dialog", {
      name: "Plant images: " + topic.label,
      exact: true,
    });
    await modal.waitFor();
    await modal.locator("img").evaluateAll(async (images) => {
      await Promise.all(images.map((im) => im.decode()));
    });
    check(
      topic.id + " shows both correct decoded views",
      (await modal.locator("img").count()) === 2 &&
        (await modal.innerText()).includes(topic.scientific_name),
    );
    await page.keyboard.press("Escape");
    await modal.waitFor({ state: "hidden" });
  }
  check("all 23 plants use whole/detail pairs", checks.length === 24);
  check(
    "graph thumbnails are painted into compact card canvases",
    await page.evaluate(
      () =>
        window.__plantDraws.length > 20 &&
        window.__plantDraws.every(
          (x) =>
            x.url.includes("/thumbnail") &&
            x.args[2] <= 180 &&
            x.args[3] <= 216,
        ),
    ),
  );
  check(
    "three names fit beside portraits within card bounds",
    await page.evaluate(
      () =>
        window.__plantText.length > 30 &&
        window.__plantText.every((x) => x.x + x.width <= 678 && x.y <= 268),
    ),
  );
  const carob = catalog.topics.find((x) => x.id === "carob");
  await inspect(carob);
  await page
    .getByRole("button", { name: "View plant images", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Plant images: " + carob.label,
    exact: true,
  });
  await modal
    .getByRole("button", { name: "Original size", exact: true })
    .first()
    .click();
  await modal
    .locator("img")
    .first()
    .evaluate((im) => im.decode());
  check(
    "Original size requests the actual PNG independently",
    (await modal
      .locator("img")
      .first()
      .evaluate((im) => im.naturalWidth === 1254)) &&
      (await modal
        .getByRole("button", { name: "Original size", exact: true })
        .count()) === 1,
  );
  await modal.getByRole("button", { name: "Fit view", exact: true }).click();
  await modal
    .getByRole("button", { name: "Close images", exact: true })
    .click();
  check(
    "closing the viewer restores keyboard focus",
    await page
      .getByRole("button", { name: "View plant images", exact: true })
      .evaluate((el) => el === document.activeElement),
  );
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
    await page
      .getByRole("button", { name: "View plant images", exact: true })
      .click();
    await page.screenshot({
      path: "output/plant-images-qa/viewer-" + theme + ".png",
    });
    await page.keyboard.press("Escape");
  }
  await page.screenshot({ path: "output/plant-images-qa/graph-dark.png" });
  await page.setViewportSize({ width: 430, height: 900 });
  await page
    .getByRole("button", { name: "View plant images", exact: true })
    .click();
  check(
    "the narrow viewer stacks images without horizontal overflow",
    await modal.evaluate((el) => {
      const figures = el.querySelectorAll("figure");
      return (
        figures[1].getBoundingClientRect().top >
          figures[0].getBoundingClientRect().top &&
        el.scrollWidth <= el.clientWidth + 1
      );
    }),
  );
  await page.screenshot({ path: "output/plant-images-qa/viewer-narrow.png" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.route("**/api/plant-images/carob-detail/preview*", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page
    .getByRole("button", { name: "View plant images", exact: true })
    .click();
  await modal.getByRole("alert").waitFor();
  check(
    "one failed image leaves the other view and graph usable",
    (await modal.getByRole("alert").count()) === 1 &&
      (await modal.locator("img").count()) === 1 &&
      (await page.locator(".graph-canvas canvas").count()) === 1,
  );
  await page.unroute("**/api/plant-images/carob-detail/preview*");
  await modal.getByRole("button", { name: "Retry image", exact: true }).click();
  await modal.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((im) => im.decode()));
  });
  check(
    "Retry image recovers the failed view",
    (await modal.getByRole("alert").count()) === 0,
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await ready();
  await inspect(carob);
  check(
    "saved exploration restores current image associations",
    (await page.locator(".plant-images img").count()) === 1,
  );
  const salsola = catalog.topics.find((x) => x.id === "salsola-webbii");
  await inspect(salsola);
  await page.locator(".inspector .refs button").first().click();
  await page.waitForFunction(
    () =>
      document.querySelector(".pdf-scroll")?.getAttribute("aria-busy") ===
      "false",
  );
  check(
    "new PDF citations open their exact registered row",
    (await page.getByLabel("PDF page", { exact: true }).inputValue()) === "66",
  );
  await page.getByRole("button", { name: "Close source", exact: true }).click();
  const retama = catalog.topics.find((x) => x.id === "retama-sphaerocarpa");
  await inspect(retama);
  await page.locator(".inspector .refs button").first().click();
  check(
    "web evidence is readable offline with an explicit external link",
    (await page
      .getByRole("link", { name: "Open botanical website ↗" })
      .count()) === 1 &&
      (await page.locator(".source-document").innerText()).includes(
        "Retrieved",
      ),
  );
  await page.getByRole("button", { name: "Close source", exact: true }).click();
  await page.getByRole("button", { name: /^Source library/ }).click();
  const poster = catalog.sources.find((s) => s.kind === "image");
  const library = page.getByRole("dialog", {
    name: "Source library",
    exact: true,
  });
  const posterArticle = library
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: poster.id, exact: true }),
    });
  await posterArticle
    .getByRole("button", { name: /^Open source ·/ })
    .click();
  await page.locator(".source-document img").evaluate((im) => im.decode());
  check(
    "the illustrative poster opens in its image source viewer",
    (await page.locator(".source-document img").count()) === 1 &&
      (await page.locator(".source-document").innerText()).includes(
        "unverified",
      ),
  );
  await page.getByRole("button", { name: "Close source", exact: true }).click();
  await library.locator(".close").click();
  const failureContext = await browser.newContext({
    viewport: { width: 1600, height: 1050 },
    reducedMotion: "reduce",
  });
  const failurePage = await failureContext.newPage();
  failurePage.setDefaultTimeout(15000);
  await failurePage.addInitScript(() => {
    window.__thumbnailFailures = 0;
    window.__thumbnailDraws = 0;
    const text = CanvasRenderingContext2D.prototype.fillText,
      draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.fillText = function (value, ...args) {
      if (value === "Image unavailable") window.__thumbnailFailures++;
      return text.call(this, value, ...args);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...args) {
      if (im.src?.includes("/carob-whole/thumbnail")) window.__thumbnailDraws++;
      return draw.call(this, im, ...args);
    };
  });
  await failurePage.route("**/api/plant-images/carob-whole/thumbnail*", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await failurePage.goto(url);
  await failurePage.locator(".loading").waitFor({ state: "hidden" });
  await failurePage.getByLabel("Centre", { exact: true }).selectOption("carob");
  await failurePage.locator(".loading").waitFor({ state: "hidden" });
  await failurePage.locator(".visible-topics summary").click();
  await failurePage
    .getByRole("button", { name: "Inspect Carob tree", exact: true })
    .click();
  await failurePage.waitForFunction(() => window.__thumbnailFailures > 0);
  await failurePage.locator(".plant-images").getByRole("alert").waitFor();
  check(
    "a missing thumbnail is explicit on the graph and in the inspector",
    await failurePage.evaluate(() => window.__thumbnailFailures > 0),
  );
  await failurePage.unroute("**/api/plant-images/carob-whole/thumbnail*");
  await failurePage
    .getByRole("button", { name: "Retry plant images", exact: true })
    .click();
  await failurePage.waitForFunction(() => window.__thumbnailDraws > 0);
  await failurePage.locator(".plant-images img").evaluate((im) => im.decode());
  check(
    "Retry plant images restores both canvas artwork and inspector preview",
    (await failurePage.locator(".plant-images").getByRole("alert").count()) ===
      0,
  );
  await failureContext.close();
  check("no browser JavaScript exceptions", errors.length === 0);
  writeFileSync(
    "output/plant-images-qa/browser-results.json",
    JSON.stringify({ checks, errors, requests: requests.length }, null, 2),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  await page
    .screenshot({ path: "output/plant-images-qa/failure.png" })
    .catch(() => {});
  writeFileSync(
    "output/plant-images-qa/browser-results.json",
    JSON.stringify({ checks, errors, failure: String(error) }, null, 2),
  );
} finally {
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}
process.exit(process.exitCode || 0);
