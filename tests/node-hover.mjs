import assert from "node:assert/strict";
import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import { buildScene, previousScenes, PLANE_GAP } from "../frontend/scene.ts";
const { chromium } = await import(
    pathToFileURL(process.env.KGB_PLAYWRIGHT_MODULE).href
  ),
  url = process.env.KGB_TEST_URL || "http://127.0.0.1:8769";
const qaProject=(await (await fetch(url + "/api/health")).json()).project.replaceAll("\\", "/");
assert.ok(qaProject.endsWith("/output/consolidation-qa") || qaProject.endsWith("/output/plant-images-qa"));
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

const cursor = () =>
  page.locator(".graph-canvas").evaluate((el) => el.style.cursor);
const point = (d, c, x = 0, y = 0) =>
  project(
    new THREE.Vector3(
      c.position.x + d.scene.offset.x + x,
      -c.position.y + d.scene.offset.y + y,
      6,
    ),
    d,
  );
const away = async (d) => {
  await page.mouse.move(d.rect.x + 15, d.rect.y + 15);
  await page.waitForTimeout(120);
};
const hover = async (p) => {
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(180);
};
const primeCamera = async () => {
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await idle();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await idle();
};
const samples = {};
try {
  await page.goto(url);
  await idle();
  await primeCamera();
  let d = await info();
  const group = d.scene.cards.find(
    (c) => c.record.groupKey === "ecosystem:species",
  );
  samples.group = point(d, group, -group.width / 2 - 3, group.height * 0.28);
  await away(d);
  await page.screenshot({
    path: "output/consolidation-qa/hover-group-off.png",
  });
  await hover(point(d, group));
  check(
    "clickable overview group has a pointer cursor",
    (await cursor()) === "pointer",
  );
  await page.screenshot({ path: "output/consolidation-qa/hover-group-on.png" });
  check(
    "hover alone does not select a node or add history",
    (await info()).h.index === d.h.index &&
      (await page
        .getByRole("heading", {
          name: "Start with a group or topic.",
          exact: true,
        })
        .isVisible()),
  );
  await page.mouse.click(point(d, group).x, point(d, group).y);
  await page.waitForTimeout(200);
  check(
    "clickable group still opens inspector details",
    await page
      .getByRole("heading", { name: group.record.label, exact: true })
      .isVisible(),
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await idle();
  d = await info();
  check(
    "a newly excluded selection is cleared",
    await page
      .getByRole("heading", {
        name: "Start with a group or topic.",
        exact: true,
      })
      .isVisible(),
  );
  const disabledGroup = d.scene.cards.find((c) => c.id === group.id);
  await hover(point(d, disabledGroup));
  check(
    "darkened overview group has no pointer cursor",
    (await cursor()) !== "pointer",
  );
  await page.mouse.click(point(d, disabledGroup).x, point(d, disabledGroup).y);
  await page.waitForTimeout(200);
  check(
    "darkened group cannot select or expand",
    (await page
      .getByRole("heading", {
        name: "Start with a group or topic.",
        exact: true,
      })
      .isVisible()) && (await info()).h.index === d.h.index,
  );
  await page.getByLabel("Domain", { exact: true }).selectOption("all");
  await idle();
  d = await info();
  await hover(
    point(
      d,
      d.scene.cards.find((c) => c.id === group.id),
    ),
  );
  check(
    "cancelling preview restores group hover",
    (await cursor()) === "pointer",
  );
  await page.getByLabel("Centre", { exact: true }).selectOption("cocoon");
  await idle();
  await primeCamera();
  d = await info();
  const outside = d.scene.cards.find((c) => c.record.plant_images?.length) || d.scene.cards.find((c) => c.record.domain === "ecosystem"),
    inside = d.scene.cards.find((c) => c.id === "cocoon");
  await hover(point(d, outside));
  check(
    "clickable topic highlights with a pointer cursor",
    (await cursor()) === "pointer",
  );
  await page.mouse.click(point(d, outside).x, point(d, outside).y);
  await page.waitForTimeout(200);
  check(
    "clickable topic still selects its details",
    await page
      .getByRole("heading", { name: outside.record.label, exact: true })
      .isVisible(),
  );
  if(outside.record.plant_images?.length){
    const thumbnailPoint=point(d,outside,-80,0);
    await page.mouse.click(thumbnailPoint.x,thumbnailPoint.y);await page.waitForTimeout(150);
    check("clicking plant artwork selects the same card without navigation",await page.getByRole("heading",{name:outside.record.label,exact:true}).isVisible() && (await info()).h.index===d.h.index);
  }
  await page.getByLabel("Domain", { exact: true }).selectOption("technology");
  await idle();
  d = await info();
  check(
    "excluded topic selection is cleared on domain preview",
    await page
      .getByRole("heading", {
        name: "Start with a group or topic.",
        exact: true,
      })
      .isVisible(),
  );
  const blocked = d.scene.cards.find((c) => c.id === outside.id);
  samples.disabled = point(
    d,
    blocked,
    -blocked.width / 2 - 3,
    blocked.height * 0.28,
  );
  await away(d);
  await page.screenshot({
    path: "output/consolidation-qa/hover-disabled-off.png",
  });
  await hover(point(d, blocked));
  check("darkened topic has no pointer cursor", (await cursor()) !== "pointer");
  await page.screenshot({
    path: "output/consolidation-qa/hover-disabled-on.png",
  });
  await page.mouse.click(point(d, blocked).x, point(d, blocked).y);
  await page.waitForTimeout(180);
  check(
    "darkened topic cannot select itself or anything behind it",
    await page
      .getByRole("heading", {
        name: "Start with a group or topic.",
        exact: true,
      })
      .isVisible(),
  );
  const allowed = d.scene.cards.find((c) => c.id === inside.id);
  samples.topic = point(
    d,
    allowed,
    -allowed.width / 2 - 3,
    allowed.height * 0.28,
  );
  samples.topicBody = point(
    d,
    allowed,
    allowed.width / 2 - 20,
    -allowed.height / 2 + 20,
  );
  await away(d);
  await page.screenshot({
    path: "output/consolidation-qa/hover-topic-off.png",
  });
  await hover(point(d, allowed));
  check(
    "matching topic remains hoverable during preview",
    (await cursor()) === "pointer",
  );
  await page.screenshot({ path: "output/consolidation-qa/hover-topic-on.png" });
  await page.mouse.click(point(d, allowed).x, point(d, allowed).y);
  await page.waitForTimeout(200);
  check(
    "matching topic remains selectable during preview",
    await page
      .getByRole("heading", { name: allowed.record.label, exact: true })
      .isVisible(),
  );
  const list = page.locator(".visible-topics");
  await list.locator("summary").click();
  const keyboard = list.getByRole("button", {
    name: "Inspect " + blocked.record.label,
    exact: true,
  });
  check(
    "darkened topic is also disabled in the keyboard topic list",
    await keyboard.isDisabled(),
  );
  const cssBefore = await keyboard.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await keyboard.hover();
  const cssAfter = await keyboard.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  check(
    "disabled topic list button does not gain a hover style",
    cssBefore === cssAfter,
  );
  await keyboard.evaluate((el) => el.focus());
  check(
    "disabled topic cannot receive keyboard focus",
    !(await keyboard.evaluate((el) => document.activeElement === el)),
  );
  await page.locator(".context-strip").scrollIntoViewIfNeeded();
  await page.getByLabel("Domain", { exact: true }).selectOption("all");
  await idle();
  d = await info();
  await hover(
    point(
      d,
      d.scene.cards.find((c) => c.id === outside.id),
    ),
  );
  check(
    "cancelling domain preview restores topic hover and clicking",
    (await cursor()) === "pointer",
  );
  // Theme recreation must keep hover working without leaving orphaned outlines.
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.waitForTimeout(250);
  d = await info();
  const dark = d.scene.cards.find((c) => c.id === "cocoon");
  await away(d);
  await page.screenshot({ path: "output/consolidation-qa/hover-dark-off.png" });
  samples.dark = point(d, dark, -dark.width / 2 - 3, dark.height * 0.28);
  samples.darkBody = point(d, dark, dark.width / 2 - 20, -dark.height / 2 + 20);
  await hover(point(d, dark));
  check(
    "dark theme topic hover remains available",
    (await cursor()) === "pointer",
  );
  await page.screenshot({ path: "output/consolidation-qa/hover-dark-on.png" });
  if(catalog.plant_images?.length){
    await page.getByLabel("Centre",{exact:true}).selectOption("carob");await idle();await primeCamera();d=await info();
    const illustrated=d.scene.cards.find(c=>c.id==="carob"),portrait=point(d,illustrated,-80,0),beforeIndex=d.h.index;
    await hover(portrait);await page.mouse.click(portrait.x,portrait.y);await page.waitForTimeout(200);
    check("clicking the plant thumbnail selects its card without changing history",await page.getByRole("heading",{name:"Carob tree",exact:true}).isVisible()&&(await info()).h.index===beforeIndex);
    const neighbour=d.scene.cards.find(c=>c.id==="kermes-oak"),neighbourPortrait=point(d,neighbour,-80,0);
    await page.mouse.click(neighbourPortrait.x,neighbourPortrait.y);await page.waitForTimeout(150);
    await page.getByLabel("Domain",{exact:true}).selectOption("technology");await idle();d=await info();
    const disabledPortrait=point(d,d.scene.cards.find(c=>c.id==="kermes-oak"),-80,0);
    await hover(disabledPortrait);await page.mouse.click(disabledPortrait.x,disabledPortrait.y);await page.waitForTimeout(150);
    check("darkened plant artwork cannot select a topic through its card",(await cursor())!=="pointer"&&await page.getByRole("heading",{name:"Start with a group or topic.",exact:true}).isVisible());
  }
  check("no runtime exceptions", errors.length === 0);
  writeFileSync(
    "output/consolidation-qa/node-hover-results.json",
    JSON.stringify({ checks, errors, samples }, null, 2),
  );
} catch (e) {
  console.error(e.stack);
  await page
    .screenshot({
      path: "output/consolidation-qa/node-hover-failure.png",
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
