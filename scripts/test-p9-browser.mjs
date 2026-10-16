import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const mode = process.argv[2] ?? "staging";
assert.ok(["staging", "production"].includes(mode));
const front =
  mode === "staging"
    ? "https://p9.save-check.pages.dev"
    : "https://save-check.pages.dev";
const productionApi = "https://save-check-api.ameenahroya.workers.dev/api";
const api =
  mode === "staging"
    ? "https://save-check-api-p9.ameenahroya.workers.dev/api"
    : productionApi;
let pp = process.env.PLAYWRIGHT_MODULE_PATH;
for (const dir of readdirSync(join(homedir(), ".npm/_npx"))) {
  const p = join(
    homedir(),
    ".npm/_npx",
    dir,
    "node_modules/playwright/package.json",
  );
  if (!pp && existsSync(p)) pp = p;
}
const { chromium } = createRequire(pp)("playwright");
const XLSX = createRequire(resolve("package.json"))("xlsx");
const browser = await chromium.launch({ headless: true });
const checks = [];
const errors = [];
const networkErrors = [];
let activePage;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  if (mode === "staging")
    await context.route(productionApi + "/**", async (route) => {
      const headers = { ...route.request().headers(), origin: front };
      delete headers.host;
      const response = await route.fetch({
        url: route.request().url().replace(productionApi, api),
        headers,
      });
      await route.fulfill({ response });
    });
  const page = await context.newPage();
  activePage = page;
  page.on("response", async (response) => {
    if (
      mode === "staging" &&
      response.request().method() === "POST" &&
      response.url().startsWith(productionApi)
    ) {
      try {
        if (response.status() >= 400)
          networkErrors.push({
            path: new URL(response.url()).pathname,
            status: response.status(),
            body: await response.text(),
          });
      } catch {}
    }
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const get = async (code) => {
    const r = await fetch(api + "/results/" + code);
    assert.equal(r.status, 200);
    return (await r.json()).data;
  };
  const screenshot = async (name) =>
    page.screenshot({
      path: "docs/v3/baseline/p9-" + mode + "-" + name + ".png",
      fullPage: true,
    });
  await page.goto(front);
  await page
    .getByRole("link", { name: /ประเมินสภาพแวดล้อม/ })
    .first()
    .waitFor();
  for (const path of [
    "/assessment/environment",
    "/assessment/health-risk",
    "/assessment/environment-form?category=light",
    "/assessment/environment-form?category=noise",
    "/assessment/environment-form?category=heat",
    "/assessment/health-risk-form?category=light",
    "/assessment/health-risk-form?category=noise",
    "/assessment/health-risk-form?category=heat",
    "/assessment/satisfaction?group=environment",
    "/assessment/satisfaction?group=health",
  ]) {
    await page.goto(front + path);
    await page.locator("main").first().waitFor();
    await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
    assert.equal(
      await page
        .getByRole("alert")
        .filter({ hasText: /โหลด.*ไม่สำเร็จ|เกิดข้อผิดพลาด|ไม่พบหัวข้อ/ })
        .count(),
      0,
      path,
    );
  }
  checks.push(
    "Built static pages load all eight form entry routes and both groups",
  );
  await page.goto(front + "/dashboard");
  await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
  await page.locator("[data-dashboard-list]").waitFor({state:"attached"});
  await screenshot("dashboard");
  checks.push("Dashboard loads with the production API URL");
  if (mode === "staging") {
    const fixture = JSON.parse(
      readFileSync(".wrangler/p9-backup-20261016/staging-results.json", "utf8"),
    );
    for (const record of fixture.records) {
      await page.goto(front + "/result?submissionId=" + record.submission_code);
      await page.locator(".summary-view").first().waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "เสร็จสิ้น", exact: true })
          .count(),
        0,
      );
    }
    checks.push("All nine saved form variants render from real Cloudflare D1");
    const code = fixture.records[0].submission_code;
    await page.goto(front + "/result?submissionId=" + code);
    await page.locator("[data-result-layout-editor]").waitFor();
    const before = await get(code);
    await page
      .locator("input[name=layout]")
      .setInputFiles(
        resolve(".wrangler/p9-backup-20261016/compression-input.png"),
      );
    await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "บันทึกผัง", exact: true }).click();
    await page
      .getByRole("button", { name: "บันทึกผัง", exact: true })
      .waitFor({ state: "hidden" });
    await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
    const image = await get(code);
    assert.equal(image.data_version, before.data_version + 1);
    assert.equal(image.layout.mime_type, "image/jpeg");
    assert.ok(image.layout.byte_size < 5_000_000);
    assert.ok(image.layout.file_name.endsWith(".jpg"));
    await page.waitForFunction(
      (id) =>
        document
          .querySelector("[data-result-layout-editor] img")
          ?.getAttribute("src")
          ?.includes(id),
      image.layout.file_id,
    );
    await page
      .locator("[data-result-layout-editor] img")
      .first()
      .evaluate(async (img) => {
        await img.decode();
        if (img.naturalWidth === 0) throw new Error("Image failed to load");
      });
    assert.equal(
      (await get(code + "?revision=" + before.revision.revision_id)).revision
        .layout_file_id,
      before.revision.layout_file_id,
    );
    const downloaded = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "ดาวน์โหลด Excel", exact: true })
      .click();
    const download = await downloaded;
    const wb = XLSX.read(readFileSync(await download.path()), {
      type: "buffer",
    });
    const target =
      productionApi + "/files/" + encodeURIComponent(image.layout.file_id);
    assert.ok(
      wb.SheetNames.some((name) =>
        Object.values(wb.Sheets[name]).some(
          (cell) =>
            cell?.v === image.layout.file_name && cell?.l?.Target === target,
        ),
      ),
      "Downloaded XLSX hyperlink is missing",
    );
    const linked = await fetch(target.replace(productionApi, api));
    assert.equal(linked.status, 200);
    assert.equal(
      createHash("sha256")
        .update(new Uint8Array(await linked.arrayBuffer()))
        .digest("hex"),
      linked.headers.get("ETag").replaceAll('"', ""),
    );
    await screenshot("image-and-excel");
    checks.push(
      "Image selected in real UI compresses to JPG, saves to D1, previews, and opens through downloaded Excel hyperlink",
    );
    await page
      .locator("input[name=layout]")
      .setInputFiles(resolve("public/standards/lighting-std-2561.pdf"));
    await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "บันทึกผัง", exact: true }).click();
    await page
      .getByRole("button", { name: "บันทึกผัง", exact: true })
      .waitFor({ state: "hidden" });
    await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
    const pdf = await get(code);
    assert.equal(pdf.layout.mime_type, "application/pdf");
    const raw = await fetch(api + "/files/" + pdf.layout.file_id);
    assert.deepEqual(
      Buffer.from(await raw.arrayBuffer()),
      readFileSync("public/standards/lighting-std-2561.pdf"),
    );
    assert.equal(
      (await get(code + "?revision=" + image.revision.revision_id)).layout
        .file_id,
      image.layout.file_id,
    );
    await page
      .locator("[data-result-layout-editor]")
      .getByRole("button", { name: "ลบ", exact: true })
      .click();
    await page.getByRole("button", { name: "บันทึกผัง", exact: true }).click();
    await page
      .getByRole("button", { name: "บันทึกผัง", exact: true })
      .waitFor({ state: "hidden" });
    await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
    assert.equal((await get(code)).revision.layout_file_id, null);
    assert.equal(
      (await fetch(api + "/files/" + image.layout.file_id)).status,
      200,
    );
    assert.equal(
      (await fetch(api + "/files/" + pdf.layout.file_id)).status,
      200,
    );
    checks.push(
      "PDF bytes remain original; replace/remove keep historical image and PDF files usable",
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(front + "/dashboard");
  await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
  await page.locator("[data-dashboard-list]").waitFor({state:"attached"});
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await screenshot("mobile");
  assert.deepEqual(errors, []);
  checks.push("Mobile layout and no browser runtime errors");
  writeFileSync(
    "docs/v3/baseline/p9-" + mode + "-browser.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        mode,
        front,
        passed: true,
        checks,
        page_errors: errors,
      },
      null,
      2,
    ),
  );
  console.log("P9 " + mode + " browser PASS " + checks.length);
  checks.forEach((c) => console.log("PASS " + c));
} catch (error) {
  if (mode === "staging")
    console.log(
      JSON.stringify({
        networkErrors,
        alerts: await activePage?.getByRole("alert").allTextContents(),
      }),
    );
  throw error;
} finally {
  await browser.close();
}
