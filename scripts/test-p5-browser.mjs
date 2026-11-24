import { checkSubmitFlow } from "./submit-flow-check.mjs";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir, homedir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  XLSX = createRequire(resolve("package.json"))("xlsx"),
  esbuild = require("esbuild"),
  { Miniflare, Log, LogLevel } = require("miniflare"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p5-e2e-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3024",
  api = "http://127.0.0.1:3025";
esbuild.buildSync({
  entryPoints: ["worker/src/index.ts"],
  bundle: true,
  platform: "browser",
  external: ["node:*"],
  format: "esm",
  outfile: script,
  logLevel: "silent",
});
const mf = new Miniflare({
  host: "127.0.0.1",
  port: 3025,
  modulesRoot: temp,
  modules: [
    { type: "ESModule", path: script, contents: readFileSync(script, "utf8") },
  ],
  compatibilityDate: "2024-09-23",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: ["DB"],
  r2Buckets: ["FILES"],
  bindings: { FRONTEND_URL: front, ENVIRONMENT: "test" },
  log: new Log(LogLevel.ERROR),
});
const db = await mf.getD1Database("DB");
const split = spawnSync(
  "python3",
  [
    "-c",
    `import sqlite3,json
from pathlib import Path
paths=sorted(Path('worker/src/db/migrations').glob('*.sql'));paths.insert(1,Path('worker/src/db/seed.sql'));scripts=[]
for p in paths:
 statements=[];buf=''
 for line in p.read_text().splitlines(True):
  buf+=line
  if sqlite3.complete_statement(buf):statements.append(buf);buf=''
 scripts.append(statements)
print(json.dumps(scripts))`,
  ],
  { encoding: "utf8" },
);
if (split.status) throw new Error(split.stderr);
for (const statements of JSON.parse(split.stdout))
  await db.batch(statements.map((sql) => db.prepare(sql)));
await mf.ready;
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
if (!pp) throw new Error("Playwright missing");
const { chromium } = createRequire(pp)("playwright");
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--turbopack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3024",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-p5",
      NEXT_PUBLIC_API_BASE_URL: api + "/api",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
next.stdout.on("data", (d) => (logs += d));
next.stderr.on("data", (d) => (logs += d));
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
  page = await context.newPage(),
  pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
let passed = 0;
const checks = [];
async function check(name, fn) {
  await fn();
  passed++;
  checks.push(name);
  console.log("PASS " + passed + ": " + name);
}
async function wait(fn) {
  for (let i = 0; i < 160; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("condition timeout");
}
const field = (name) => page.locator(`[name="${name}"]`);
const input = (i, k) => field(`units.${i}.${k}`);
const key = () => crypto.randomUUID();
async function call(path, body, method = "POST") {
  const r = await fetch(api + "/api" + path, {
    method,
    headers: {
      Origin: front,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, json: await r.json() };
}
const get = async (code) =>
  (await call("/results/" + code, undefined, "GET")).json.data;
const guidanceChecks = [];
const approvedGuidance = readFileSync("docs/v3/REQUIREMENTS_V3.md", "utf8")
  .split("\n")
  .filter((line) => line.startsWith("> ควรตรวจสอบ"))
  .map((line) => line.slice(2));
assert.equal(approvedGuidance.length, 3);
async function checkGuidance(category, revision) {
  const statusCard = page.locator("[data-environment-status]");
  assert.equal(await statusCard.count(), 1);
  assert.equal(
    await statusCard.evaluate((el) => getComputedStyle(el).textAlign),
    "left",
  );
  const icon = await statusCard.locator("svg").boundingBox();
  assert(icon && icon.width === 22 && icon.height === 22);
  if (revision) {
    const kind = revision.observations[0].unit.kind;
    const key =
      kind === "light_spot"
        ? "lux"
        : kind === "light_area"
          ? "average"
          : kind === "noise"
            ? "level"
            : "wbgt_average";
    const values = revision.observations.map((o) => o.result.values[key]);
    const expected = values.reduce((sum, n) => sum + n, 0) / values.length;
    const unit = kind.startsWith("light")
      ? "Lux"
      : kind === "noise"
        ? "dBA"
        : "°C";
    assert.equal(
      await statusCard.locator("[data-measurement-summary]").innerText(),
      `${Number(expected.toFixed(3))} ${unit}`,
    );
    assert.equal(
      await page.getByRole("link", { name: /ตรวจซ้ำเฉพาะ/ }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .count(),
      revision.is_pass ? 0 : 1,
    );
    assert.equal(
      await statusCard.getAttribute("data-pass"),
      String(revision.is_pass),
    );
    assert.equal(
      await statusCard.locator("h3").innerText(),
      revision.is_pass
        ? "ผ่านเกณฑ์มาตรฐานความปลอดภัย"
        : "ไม่ผ่านเกณฑ์มาตรฐานความปลอดภัย",
    );
  }
  assert.equal(
    await page.getByRole("button", { name: "ดูเอกสารในหน้านี้" }).count(),
    0,
  );
  assert.equal(await page.locator("iframe").count(), 0);
  const openDocument = page.getByRole("link", { name: "เปิดเอกสารมาตรฐาน" });
  const downloadDocument = page.getByRole("link", { name: "ดาวน์โหลด PDF" });
  assert.equal(await openDocument.getAttribute("target"), "_blank");
  assert.equal(
    await openDocument.getAttribute("href"),
    await downloadDocument.getAttribute("href"),
  );
  assert.notEqual(await downloadDocument.getAttribute("download"), null);
  const section = page.getByRole("region", {
    name: "เอกสารมาตรฐาน",
    exact: true,
  });
  const text = await section.locator("[data-environment-guidance]").innerText();
  const title = {
    light: "มาตรฐานความเข้มของแสงสว่าง",
    noise: "มาตรฐานระดับเสียง",
    heat: "มาตรฐานความร้อน",
  }[category];
  assert.deepEqual(await section.locator("h3").allTextContents(), [
    "คำแนะนำ",
    title,
  ]);
  assert.equal(await section.locator(":scope > p").count(), 1);
  assert(
    text.endsWith(
      approvedGuidance[["light", "noise", "heat"].indexOf(category)],
    ),
  );
  const box = await section
    .locator("[data-environment-guidance]")
    .evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      box: el.getBoundingClientRect().toJSON(),
      outer: el.parentElement.getBoundingClientRect().toJSON(),
    }));
  assert(!["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"].includes(box.bg));
  assert(
    box.box.left >= box.outer.left &&
      box.box.right <= box.outer.right &&
      box.box.top >= box.outer.top &&
      box.box.bottom <= box.outer.bottom,
  );
  if (revision) {
    const failed = revision.observations.filter(
      (o) => !o.result.is_pass,
    ).length;
    const area = revision.observations[0].unit.kind === "light_area";
    if (category === "light" && !revision.is_pass) {
      assert(
        text.startsWith(
          `พบ${area ? "พื้นที่" : "จุด"}ตรวจวัดที่ไม่ผ่านเกณฑ์มาตรฐานจำนวน ${failed} ${area ? "พื้นที่" : "จุด"} ควรเพิ่มหลอดไฟหรือจัดแสงสว่างในพื้นที่ดังกล่าว `,
        ),
      );
    } else {
      const prefix =
        category === "light"
          ? `ระดับแสงสว่างทุก${area ? "พื้นที่" : "จุด"}ตรวจวัดผ่านเกณฑ์มาตรฐาน`
          : category === "noise"
            ? revision.is_pass
              ? "ระดับเสียงภาพรวมผ่านเกณฑ์มาตรฐาน"
              : "ระดับเสียงภาพรวมเกินมาตรฐานที่กำหนด"
            : revision.is_pass
              ? "ระดับความร้อนทุกจุดตรวจวัดอยู่ในเกณฑ์ปลอดภัย"
              : "ระดับความร้อนเกินมาตรฐาน";
      assert(text.startsWith(prefix));
    }
    guidanceChecks.push({ category, pass: revision.is_pass, failed, area });
  }
}
const inspection = {
  inspector_name: "ผู้ทดสอบ P5",
  position: "ผู้ตรวจ",
  inspection_location: "พื้นที่ P5",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T08:00",
  end_at: "2026-10-12T11:00",
  equipment: "P5 Meter",
  serial_number: "SN-P5",
  calibration_date: "2026-10-01",
  responsible_department: "แผนกทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบ P5",
};
async function metadata(category, technique = "spot", withLayout = true) {
  for (const [k, v] of Object.entries(inspection))
    await field("inspectionData." + k).fill(v);
  if (category === "light")
    await field("inspectionData.measurement_technique").selectOption(technique);
  if (withLayout) {
    await field("layout").setInputFiles(
      resolve("public/standards/lighting-std-2561.pdf"),
    );
    await page.getByText("เปิดดู PDF", { exact: true }).waitFor();
  }
  await page.getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ }).click();
  await field("units.0.location_desc").waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "คำแนะนำ", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "เปิดเอกสารมาตรฐาน", exact: true })
      .count(),
    0,
  );
}
async function dates(day = "13") {
  for (const [k, v] of Object.entries({
    inspection_date: `2026-10-${day}`,
    start_at: `2026-10-${day}T08:00`,
    end_at: `2026-10-${day}T11:00`,
  }))
    await field("inspectionData." + k).fill(v);
}
let submitFlowChecked = false;
async function submit() {
  const response = page.waitForResponse(
    (r) =>
      r.url().startsWith(api + "/api/submissions") &&
      r.request().method() === "POST",
  );
  if (!submitFlowChecked) {
    await checkSubmitFlow(page, {
      front,
      api,
      button: "ยืนยันบันทึกผล",
      screenshot: "docs/v3/baseline/submit-flow-environment.png",
    });
    submitFlowChecked = true;
  } else {
    await page
      .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
      .click();
  }
  const r = await response,
    j = await r.json();
  assert(j.success, JSON.stringify(j));
  await page.waitForURL(/\/result\?/);
  await page.locator("[data-environment-summary]").waitFor();
  assert.equal(await page.locator("[data-layout-attachment]").count(), 1);
  assert.equal(await field("layout").count(), 1);
  assert.equal(
    await page.getByText(/ยังไม่แนบแผนผัง|ยังไม่ได้แนบแผนผัง/).count(),
    0,
  );
  const result = await get(j.data.submission_code);
  await checkGuidance(result.assessment_category, result.revision);
  return j.data;
}
async function review() {
  await page.getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ }).click();
  await page.locator("[data-environment-summary]").waitFor();
  await checkGuidance(new URL(page.url()).searchParams.get("category"));
}
async function spot(i, lux) {
  await input(i, "location_desc").fill("จุด " + i);
  assert.equal(
    await input(i, "standard_code")
      .locator('option[value="spot-office"]')
      .innerText(),
    "400–500 Lux (งานสำนักงาน/ออกแบบเขียนแบบด้วยคอมพิวเตอร์/ชิ้นงานตั้งแต่ 125 ไมโครเมตร)",
  );
  assert.equal(await input(i, "standard_target_lux").count(), 0);
  await input(i, "standard_code").selectOption("spot-office");
  await input(i, "lux").fill(String(lux));
}
async function retest(code, values, day) {
  await page.goto(front + "/result?submissionId=" + code);
  await page.getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true }).click();
  await field("inspectionData.serial_number").waitFor();
  for (const key of [
    "inspector_name",
    "position",
    "inspection_location",
    "equipment",
    "serial_number",
    "calibration_date",
    "responsible_department",
    "location_responsible_name",
  ])
    assert(await field("inspectionData." + key).isEnabled());
  assert.equal(await field("inspectionData.inspection_date").inputValue(), "");
  await dates(day);
  await field("inspectionData.inspector_name").fill("ผู้ตรวจรอบ " + day);
  await field("inspectionData.position").fill("ผู้ช่วยตรวจ " + day);
  await field("inspectionData.inspection_location").fill("พื้นที่รอบ " + day);
  await field("inspectionData.equipment").fill("เครื่องรอบ " + day);
  await field("inspectionData.serial_number").fill("SN-ROUND-" + day);
  await page.getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ }).click();
  for (const [i, v] of Object.entries(values)) {
    assert.equal(await input(i, "lux").inputValue(), "");
    await input(i, "lux").fill(String(v));
  }
  await review();
  return submit();
}
async function downloadHistory() {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "ดาวน์โหลดประวัติทุกรอบ Excel", exact: true })
    .click();
  const download = await pending;
  const bytes = readFileSync(await download.path());
  return {
    bytes,
    wb: XLSX.read(bytes, { type: "buffer" }),
    name: download.suggestedFilename(),
  };
}
const workbookRows = (wb, name) =>
  XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
const excelDate = (timestamp) =>
  25569 +
  (Date.parse(timestamp) +
    (/^\d{4}-\d{2}-\d{2}$/.test(timestamp) ? 0 : 7 * 3600000)) /
    86400000;
let light, noise, heat, area;
try {
  await wait(async () => {
    try {
      return (await fetch(front)).ok;
    } catch {
      return false;
    }
  });
  await check(
    "required metadata errors focus first field; light technique before standards; optional local layout with upload after review",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=light");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      await page.getByRole("alert").first().waitFor();
      await field("inspectionData.inspector_name").fill("ทดสอบล้างข้อผิดพลาด");
      assert.equal(
        await field("inspectionData.inspector_name").getAttribute(
          "aria-invalid",
        ),
        "false",
      );
      assert.equal(
        await field("inspectionData.position").getAttribute("aria-invalid"),
        "true",
      );

      assert(
        await field("inspectionData.inspector_name").evaluate(
          (e) => e === document.activeElement,
        ),
      );
      assert.equal(
        await page.locator('[name="units.0.standard_code"]').count(),
        0,
      );
      await metadata("light");
      assert(await input(0, "standard_code").isVisible());
    },
  );
  await check(
    "Spot first inspection writes metadata/IDs/standards and server failure result",
    async () => {
      await spot(0, 400);
      await page
        .getByRole("button", { name: "เพิ่มจุดตรวจ", exact: true })
        .click();
      await spot(1, 300);
      await page
        .getByRole("button", { name: "เพิ่มจุดตรวจ", exact: true })
        .click();
      await spot(2, 300);
      await review();
      light = await submit();
      const s = await get(light.submission_code);
      assert.equal(s.result.is_pass, false);
      assert.equal(s.inspectionData.serial_number, "SN-P5");
      assert.equal(s.units.length, 3);
      assert.equal(s.revision.revision_no, 1);
    },
  );
  const r1 = await get(light.submission_code);
  const completedUrl = page.url();
  assert.equal(new URL(completedUrl).searchParams.get("saved"), "1");
  await page.getByRole("button", { name: "เสร็จสิ้น", exact: true }).click();
  await page.waitForURL(front + "/assessment/environment");
  await page
    .getByRole("heading", { name: "ประเมินสภาพแวดล้อมในการทำงาน", exact: true })
    .waitFor();
  await page.goto(completedUrl);
  await page.locator("[data-environment-summary]").waitFor();
  await page.locator("details summary").click();
  const initialHistory = await downloadHistory();
  await check(
    "three real rounds preserve inspectors, dates, values and complete snapshots in history Excel without overwriting old rounds",
    async () => {
      const r2 = await retest(light.submission_code, { 1: 450, 2: 300 }, "13");
      assert.equal(r2.revision_no, 2);
      const s2 = await get(light.submission_code);
      assert.equal(
        new URL(page.url()).searchParams.get("returnTo"),
        `/result?submissionId=${light.submission_code}`,
      );
      assert.equal(s2.inspectionData.inspector_name, "ผู้ตรวจรอบ 13");
      assert.equal(s2.inspectionData.serial_number, "SN-ROUND-13");
      assert.equal(s2.inspectionData.position, "ผู้ช่วยตรวจ 13");
      assert.equal(s2.inspectionData.inspection_location, "พื้นที่รอบ 13");
      assert.equal(s2.inspectionData.equipment, "เครื่องรอบ 13");
      assert.equal(s2.revision.observations[0].observation_kind, "carried");
      assert.equal(
        s2.revision.observations[0].measured_at,
        r1.revision.observations[0].measured_at,
      );
      assert.equal(
        s2.revision.observations[0].carried_from_revision_id,
        r1.revision.revision_id,
      );
      const r3 = await retest(light.submission_code, { 2: 400 }, "14");
      assert.equal(r3.revision_no, 3);
      const s3 = await get(light.submission_code);
      assert.equal(s3.result.is_pass, true);
      assert.equal(s3.inspectionData.inspector_name, "ผู้ตรวจรอบ 14");
      assert.equal(s3.inspectionData.serial_number, "SN-ROUND-14");
      const firstRound = await get(
        light.submission_code + "?revision=" + r1.revision.revision_id,
      );
      const secondRound = await get(
        light.submission_code + "?revision=" + s2.revision.revision_id,
      );
      assert.deepEqual(firstRound.revision, r1.revision);
      assert.equal(firstRound.inspectionData.inspector_name, "ผู้ทดสอบ P5");
      assert.equal(secondRound.inspectionData.inspector_name, "ผู้ตรวจรอบ 13");
      await page.locator("details summary").click();
      await page.getByText("ผู้ตรวจ: ผู้ตรวจรอบ 14", { exact: true }).waitFor();
      assert(
        await page
          .getByText("ผู้ตรวจ: ผู้ตรวจรอบ 13", { exact: true })
          .isVisible(),
      );
      assert(
        await page
          .getByText("ผู้ตรวจ: ผู้ทดสอบ P5", { exact: true })
          .isVisible(),
      );
      await page.screenshot({
        path: "docs/v3/baseline/retest-inspectors-history.png",
        fullPage: true,
      });
      const history = await downloadHistory();
      assert.equal(
        history.name,
        `safecheck-${light.submission_code}-history.xlsx`,
      );
      const overview = workbookRows(history.wb, "ภาพรวมทั้งหมด");
      const points = workbookRows(history.wb, "สิ่งแวดล้อม-แสงสว่าง");
      assert.equal(overview.length, 3);
      assert.equal(points.length, 9);
      for (const [index, saved] of [r1, s2, s3].entries()) {
        const round = index + 1;
        const rows = points.filter((row) => row["ครั้งที่บันทึก"] === round);
        assert.equal(rows.length, 3);
        assert.equal(overview[index]["ครั้งที่บันทึก"], round);
        assert.equal(
          overview[index]["ผู้ตรวจ / ผู้ประเมิน"],
          saved.inspectionData.inspector_name,
        );
        for (const row of [overview[index], ...rows]) {
          for (const [column, timestamp] of [
            ["วันที่และเวลา", saved.inspectionData.start_at],
            ["วันสร้างรายการ", saved.created_at],
            ["วันเวลาบันทึก", saved.revision.created_at],
          ])
            assert(Math.abs(row[column] - excelDate(timestamp)) < 1e-8, column);
        }
        for (const [pointIndex, row] of rows.entries()) {
          for (const [column, field] of [
            ["ผู้ตรวจวัด", "inspector_name"],
            ["ตำแหน่งผู้ตรวจ", "position"],
            ["สถานที่ตรวจวัด", "inspection_location"],
            ["อุปกรณ์ที่ใช้", "equipment"],
            ["หมายเลขเครื่อง", "serial_number"],
            ["แผนกที่รับผิดชอบ", "responsible_department"],
            ["ผู้รับผิดชอบอาคารหรือสถานที่", "location_responsible_name"],
          ])
            assert.equal(row[column], saved.inspectionData[field], column);
          for (const [column, field] of [
            ["วันที่ตรวจวัด", "inspection_date"],
            ["เริ่มตรวจวัด", "start_at"],
            ["สิ้นสุดตรวจวัด", "end_at"],
            ["วันที่สอบเทียบ", "calibration_date"],
          ])
            assert(
              Math.abs(row[column] - excelDate(saved.inspectionData[field])) <
                1e-8,
              column,
            );
          const observation = saved.revision.observations[pointIndex];
          assert.equal(row["ค่าความสว่างจุดตรวจ (Lux)"], observation.unit.lux);
          assert.equal(row["หมายเหตุ"], observation.unit.remark ?? "");
          assert.equal(
            row["ผลการประเมินจุดนี้"],
            observation.result.is_pass ? "ผ่าน" : "ไม่ผ่าน",
          );
          assert(
            Math.abs(
              row["วันเวลาวัดจริง"] - excelDate(observation.measured_at),
            ) < 1e-8,
          );
          assert.equal(
            row["ที่มาค่าตรวจ"],
            observation.observation_kind === "carried"
              ? "คงค่าจากรอบก่อน"
              : "วัดในรอบนี้",
          );
        }
        // The full saved snapshot also preserves fields outside the visible form columns.
        const snapshot = workbookRows(history.wb, "Snapshot ที่บันทึก")
          .filter((row) => row["รุ่น"] === round)
          .sort((a, b) => a["ส่วน JSON ตามลำดับ"] - b["ส่วน JSON ตามลำดับ"])
          .map((row) => row["JSON (ต่อส่วนตามลำดับ)"])
          .join("");
        const source = JSON.parse(snapshot);
        assert.deepEqual(source.inspectionData, saved.inspectionData);
        assert.deepEqual(source.revision, saved.revision);
      }
      // Only the latest/history badge can change on the exported original round.
      for (const name of ["ภาพรวมทั้งหมด", "สิ่งแวดล้อม-แสงสว่าง"]) {
        const normalize = (row) => ({ ...row, สถานะผล: "ย้อนหลัง" });
        assert.deepEqual(
          workbookRows(history.wb, name)
            .filter((row) => row["ครั้งที่บันทึก"] === 1)
            .map(normalize),
          workbookRows(initialHistory.wb, name).map(normalize),
        );
      }
      writeFileSync(
        "docs/v3/baseline/retest-history-three-inspectors.xlsx",
        history.bytes,
      );
      assert.equal(
        s3.revision.observations[1].carried_from_revision_id,
        s2.revision.revision_id,
      );
      assert.deepEqual(
        s3.units.map((u) => u.point_id),
        r1.units.map((u) => u.point_id),
      );
      assert.equal(s3.layout.file_id, r1.layout.file_id);
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      const old = (
        await call(
          `/results/${light.submission_code}?revision=${r1.revision.revision_id}`,
          undefined,
          "GET",
        )
      ).json.data;
      assert.deepEqual(old.revision, r1.revision);
      assert.equal(old.is_latest, false);
      await page.goto(
        front +
          `/result?submissionId=${light.submission_code}&revision=${r1.revision.revision_id}`,
      );
      await page.locator("[data-environment-summary]").waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      assert(
        await page.getByRole("link", { name: "เปิดรอบล่าสุด" }).isVisible(),
      );
    },
  );
  await check(
    "Spot surrounding controls, zero measurement, draft refresh and stable IDs work at threshold boundary",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=light");
      await metadata("light");
      await input(0, "location_desc").fill("จุดงานละเอียด");
      await input(0, "standard_code").selectOption("spot-very-high-detail");
      assert.equal(await input(0, "standard_target_lux").count(), 0);
      await input(0, "lux").fill("0");
      await input(0, "surrounding_near_lux").fill("299");
      await input(0, "surrounding_outer_lux").fill("200");
      assert(
        (await page.locator("[data-unit-preview]").innerText()).startsWith(
          "ไม่ผ่าน",
        ),
      );
      await input(0, "lux").fill("1200");
      assert(
        (await page.locator("[data-unit-preview]").innerText()).startsWith(
          "ไม่ผ่าน",
        ),
      );
      await input(0, "surrounding_near_lux").fill("300");
      await review();
      await page
        .locator("form")
        .getByRole("button", { name: "ย้อนกลับ", exact: true })
        .click();
      const pointId = await page
        .locator("[data-point-id]")
        .getAttribute("data-point-id");
      await page.reload();
      await input(0, "lux").waitFor();
      assert.equal(await input(0, "surrounding_near_lux").inputValue(), "300");
      assert.equal(
        await page.locator("[data-point-id]").getAttribute("data-point-id"),
        pointId,
      );
      await review();
      await field("layout").setInputFiles({
        name: "review-layout.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync("public/standards/lighting-std-2561.pdf"),
      });
      await page.getByText("review-layout.pdf", { exact: true }).waitFor();
      const saved = await submit(),
        source = await get(saved.submission_code);
      assert.equal(source.layout.file_name, "review-layout.pdf");
      assert(source.result.is_pass);
      assert.equal(source.units[0].point_id, pointId);
      assert.equal(source.result.results[0].standard.thresholds.near, 300);
    },
  );
  await check(
    "Area direct average passes but minimum fails; no subpoints; mobile PDFs match source with viewer/download fallback",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=light");
      await metadata("light", "area", false);
      await input(0, "location_desc").fill("พื้นที่สำนักงาน");
      assert.equal(
        await input(0, "standard_code")
          .locator('option[value="area-office"]')
          .innerText(),
        "เฉลี่ย ≥ 300 Lux / ต่ำสุด ≥ 150 Lux (สำนักงาน/ฝึกอบรม/บรรยาย/สืบค้นเอกสาร/ถ่ายเอกสาร/คอมพิวเตอร์/ประชุม/ประชาสัมพันธ์/ออกแบบเขียนแบบ)",
      );
      assert.equal(
        await input(0, "standard_code")
          .locator('option[value="area-emergency"]')
          .innerText(),
        "เฉลี่ย ≥ 10 Lux (ทางสัญจรฉุกเฉิน)",
      );
      await input(0, "standard_code").selectOption("area-office");
      assert.equal(
        await page
          .getByRole("button", { name: "เพิ่มจุดย่อย", exact: true })
          .count(),
        0,
      );
      await input(0, "average_lux").fill("300");
      await input(0, "minimum_lux").fill("149");
      for (const pdf of [
        "lighting-std-2561.pdf",
        "sound-standard-2560.pdf",
        "heat-standard-2559.pdf",
      ]) {
        const r = await fetch(front + "/standards/" + pdf);
        assert.equal(r.status, 200);
        assert.deepEqual(
          Buffer.from(await r.arrayBuffer()),
          readFileSync("public/standards/" + pdf),
        );
      }
      assert.equal(
        await page.getByRole("button", { name: "ดูเอกสารในหน้านี้" }).count(),
        0,
      );
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(
        await page.getByRole("link", { name: "ดาวน์โหลด PDF" }).count(),
        0,
      );
      await review();
      assert(
        await page
          .getByRole("heading", { name: "คำแนะนำ", exact: true })
          .isVisible(),
      );
      assert(
        await page
          .getByRole("link", { name: "ดาวน์โหลด PDF", exact: true })
          .isVisible(),
      );
      await page
        .getByRole("button", { name: "เลือกไฟล์แผนผัง", exact: true })
        .waitFor();
      await page.screenshot({
        path: "docs/v3/baseline/review-layout-unified.png",
        fullPage: true,
      });
      area = await submit();
      const s = await get(area.submission_code);
      assert.equal(s.result.results[0].values.average, 300);
      assert.equal(s.result.results[0].values.minimum, 149);
      assert.equal(s.result.is_pass, false);
      assert.equal(s.units[0].samples, undefined);
      assert.equal(s.units[0].average_lux, 300);
      assert.equal(
        await page
          .getByRole("heading", { name: "จุดย่อยในพื้นที่ตรวจแสง" })
          .count(),
        0,
      );
      await page.screenshot({
        path: "docs/v3/baseline/p5-area-mobile.png",
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    },
  );
  await check(
    "Area retest locks standard and requires direct average/minimum",
    async () => {
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .click();
      await field("inspectionData.start_at").waitFor();
      await page
        .getByRole("button", { name: "เลือกไฟล์แผนผัง", exact: true })
        .waitFor();
      await field("layout").setInputFiles({
        name: "ผังรอบใหม่.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync("public/standards/lighting-std-2561.pdf"),
      });
      await page.getByText("เปิดดู PDF", { exact: true }).waitFor();
      await dates("13");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      assert(await input(0, "standard_code").isDisabled());
      assert.equal(
        await page
          .getByRole("button", { name: "เพิ่มจุดย่อย", exact: true })
          .count(),
        0,
      );
      await input(0, "average_lux").fill("300");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      assert.equal(await page.locator("[data-environment-summary]").count(), 0);
      await input(0, "minimum_lux").fill("150");
      await review();
      const saved = await submit();
      const withPlan = await get(saved.submission_code);
      assert(withPlan.revision.layout_file_id);
      assert.equal(withPlan.has_layout, 1);
      assert.equal(
        (await get(area.submission_code + "?revision=" + area.revision_id))
          .revision.layout_file_id,
        null,
      );
    },
  );
  await check(
    "noise exposure minutes selects true threshold, observed bounds and authoritative result",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=noise");
      await metadata("noise");
      await input(0, "location_desc").fill("จุดเสียง");

      for (const [k, v] of Object.entries({
        min_dBA: 80,
        max_dBA: 90,
        exposure_duration_minutes: 360,
        exposure_level_dBA: 86,
      }))
        await input(0, k).fill(String(v));
      await review();
      noise = await submit();
      const s = await get(noise.submission_code);
      assert.equal(s.result.is_pass, true);
      assert.equal(s.result.results[0].standard.thresholds.limit, 86);
      assert(!("twa_8hr" in s.units[0]));
    },
  );
  await check(
    "classic noise fields use the required exposure duration; failed network retains draft/key and retry succeeds",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=noise");
      await metadata("noise");
      await input(0, "location_desc").fill("จุด TWA");

      for (const [k, v] of Object.entries({
        min_dBA: 80,
        max_dBA: 90,
        exposure_level_dBA: 85.1,
        exposure_duration_minutes: 480,
      }))
        await input(0, k).fill(String(v));
      assert.equal(await input(0, "evaluation_basis").count(), 0);
      await review();
      const before = await page.evaluate(() =>
        Object.entries(localStorage).find(
          ([k]) =>
            k.includes("environment-form-v3-p5") &&
            k.includes("noise") &&
            k.includes("create"),
        ),
      );
      let aborted = 0;
      await page.route(api + "/api/submissions", (r) => {
        aborted++;
        return r.abort();
      });
      await page
        .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" })
        .waitFor();
      assert.equal(aborted, 1);
      await wait(
        async () =>
          await page
            .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
            .isEnabled(),
      );
      assert(page.url().includes("/environment-form"));
      const after = await page.evaluate(
        (k) => localStorage.getItem(k),
        before[0],
      );
      assert.equal(
        JSON.parse(after).requestKey,
        JSON.parse(before[1]).requestKey,
      );
      await page.unroute(api + "/api/submissions");
      const saved = await submit();
      const s = await get(saved.submission_code);
      assert.equal(s.result.is_pass, false);
      assert.equal(s.result.results[0].standard.thresholds.limit, 85);
    },
  );
  await check(
    "heat 14:59–15:59 saves outside the inspection window for create/retest and preserves carried values",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=heat");
      await metadata("heat");
      for (let i = 0; i < 2; i++) {
        if (i)
          await page
            .getByRole("button", { name: "เพิ่มจุดตรวจ", exact: true })
            .click();
        await input(i, "location_desc").fill("จุดร้อน " + i);
        for (const [k, v] of Object.entries({
          wbgt_type: "in",
          workload: "moderate",
        }))
          await input(i, k).selectOption(v);
        await input(i, "start_at").fill("14:59");
        await input(i, "end_at").fill("15:59");
        await input(i, "wbgt_average").fill(i ? "33" : "32");
      }
      assert.equal(await input(0, "intervals.0.wb").count(), 0);
      await review();
      heat = await submit();
      const old = await get(heat.submission_code);
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .click();
      await dates("13");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      assert(await input(0, "start_at").isDisabled());
      assert.equal(await input(0, "start_at").inputValue(), "14:59");
      await input(1, "start_at").fill("14:59");
      await input(1, "end_at").fill("15:59");
      await input(1, "wbgt_average").fill("30");
      await review();
      await submit();
      const s = await get(heat.submission_code);
      assert(s.result.is_pass);
      assert.equal(
        s.revision.observations[0].measured_at,
        old.revision.observations[0].measured_at,
      );
      assert.equal(s.revision.observations[0].observation_kind, "carried");
    },
  );
  await check(
    "heat correction preserves historical timestamps and accepts point times independent of inspection",
    async () => {
      const old = await get(heat.submission_code);
      await page.goto(front + "/result?submissionId=" + heat.submission_code);
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      // Passed reports hide this action under D26; use the explicit edit URL to test correction provenance.
      await page.goto(
        front +
          "/assessment/environment-form?category=heat&edit=" +
          heat.submission_code +
          "&base=" +
          old.revision.revision_id,
      );
      await field("inspectionData.serial_number").fill("SN-HEAT-CORRECT");
      assert.equal(await field("reason").count(), 0);
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      await input(0, "location_desc").fill("ชื่อพื้นที่ที่แก้ไขพร้อมเหตุผล");
      await review();
      await submit();
      const current = await get(heat.submission_code);
      assert.equal(current.inspectionData.serial_number, "SN-HEAT-CORRECT");
      assert.equal(
        current.units[0].location_desc,
        "ชื่อพื้นที่ที่แก้ไขพร้อมเหตุผล",
      );
      for (let i = 0; i < 2; i++) {
        assert.equal(
          current.revision.observations[i].measured_at,
          old.revision.observations[i].measured_at,
        );
        assert.equal(
          current.revision.observations[i].observation_kind,
          i === 0 ? "measured" : "carried",
        );
      }
      assert.equal(current.revision.kind, "correction");
      const historical = (
        await call(
          `/results/${heat.submission_code}?revision=${old.revision.revision_id}`,
          undefined,
          "GET",
        )
      ).json.data;
      assert.deepEqual(historical.revision, old.revision);
      const badUnits = structuredClone(current.units);
      badUnits[0].start_at = "2026-10-12T16:00:00+07:00";
      badUnits[0].end_at = "2026-10-12T17:00:00+07:00";
      const response = await call(
        `/submissions/${heat.submission_code}/corrections`,
        {
          schema_version: 3,
          idempotency_key: key(),
          expected_data_version: current.data_version,
          base_revision_id: current.revision.revision_id,
          reason: "ทดสอบค่าใหม่อยู่นอกเวลา",
          payload: {
            schema_version: 3,
            idempotency_key: key(),
            assessment_type: "environment",
            assessment_group: "environment",
            assessment_category: "heat",
            inspectionData: current.inspectionData,
            layout: current.layout
              ? { file_id: current.layout.file_id }
              : undefined,
            units: badUnits,
          },
        },
      );
      assert.equal(response.status, 201, JSON.stringify(response.json));
      const changed = await get(heat.submission_code);
      assert.equal(changed.data_version, current.data_version + 1);
      assert.equal(
        Date.parse(changed.units[0].start_at),
        Date.parse("2026-10-12T16:00:00+07:00"),
      );
      assert.deepEqual(
        (
          await get(
            heat.submission_code + "?revision=" + current.revision.revision_id,
          )
        ).revision,
        current.revision,
      );
    },
  );
  await check(
    "classic heat restores all original fields; raw values, meter value, standard and average persist without a forced 120 minute period",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=heat");
      await metadata("heat");
      await input(0, "location_desc").fill("พื้นที่แดด");
      await input(0, "wbgt_type").selectOption("out");
      await input(0, "workload").selectOption("heavy");
      assert.equal(await input(0, "input_mode").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "เพิ่มช่วงวัด", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page.getByText(/ใช้ช่วงสองชั่วโมงที่มี WBGT สูงสุด/).count(),
        0,
      );
      await input(0, "start_at").fill("08:00");
      await input(0, "end_at").fill("08:45");
      await input(0, "db_temp").fill("35");
      await input(0, "wb_temp").fill("28");
      await input(0, "gt_temp").fill("40");
      assert.equal(await input(0, "wbgt_average").inputValue(), "31.1");
      await input(0, "wbgt_in").fill("31.2");
      assert.equal(await input(0, "wbgt_average").inputValue(), "31.2");
      await input(0, "wbgt_average").fill("31.3");
      assert.equal(await input(0, "standard_value").inputValue(), "30");
      await review();
      const saved = await submit(),
        source = await get(saved.submission_code);
      assert.equal(source.units[0].db_temp, 35);
      assert.equal(source.units[0].wb_temp, 28);
      assert.equal(source.units[0].gt_temp, 40);
      assert.equal(source.units[0].wbgt_in, 31.2);
      assert.equal(source.units[0].wbgt_average, 31.3);
      assert.equal(source.units[0].standard_value, 30);
      assert.equal(source.result.results[0].values.wbgt_average, 31.3);
      assert.equal(source.result.is_pass, false);
      assert.equal(
        Date.parse(source.units[0].end_at) -
          Date.parse(source.units[0].start_at),
        45 * 60000,
      );
      await page.goto(
        front +
          "/assessment/environment-form?category=heat&edit=" +
          source.submission_code +
          "&base=" +
          source.revision.revision_id,
      );
      await field("inspectionData.serial_number").waitFor();
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(await input(0, "db_temp").inputValue(), "35");
      assert.equal(await input(0, "wbgt_in").inputValue(), "31.2");
      assert.equal(await input(0, "wbgt_average").inputValue(), "31.3");
      await page.screenshot({
        path: "docs/v3/baseline/restored-heat-form.png",
        fullPage: true,
      });
    },
  );
  await check(
    "real concurrent retest rejects stale base; draft survives and reload opens new base",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=light");
      await metadata("light");
      await spot(0, 300);
      await review();
      const created = await submit(),
        old = await get(created.submission_code);
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .click();
      await dates("13");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      await input(0, "lux").fill("400");
      await review();
      const other = await call(
        "/submissions/" + created.submission_code + "/retests",
        {
          schema_version: 3,
          idempotency_key: key(),
          base_revision_id: old.revision.revision_id,
          inspection_date: "2026-10-13",
          start_at: "2026-10-13T08:00:00+07:00",
          end_at: "2026-10-13T11:00:00+07:00",
          updates: [
            { point_id: old.units[0].point_id, kind: "light_spot", lux: 350 },
          ],
        },
      );
      assert.equal(other.status, 201);
      await page
        .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
        .click();
      await page.getByRole("button", { name: "โหลดรอบล่าสุด" }).waitFor();
      const stored = await page.evaluate(
        (b) => Object.entries(localStorage).find(([k]) => k.includes(b)),
        old.revision.revision_id,
      );
      assert(stored);
      assert.equal(
        JSON.parse(stored[1]).data.environmentV3.units[0].lux,
        "400",
      );
      await page.reload();
      await page.getByRole("button", { name: "โหลดรอบล่าสุด" }).waitFor();
      await page.getByRole("button", { name: "โหลดรอบล่าสุด" }).click();
      await wait(
        async () =>
          (await field("inspectionData.start_at").count()) > 0 &&
          (await field("inspectionData.start_at").inputValue()) === "",
      );
      assert(page.url().includes(other.json.data.revision_id));
    },
  );
  await check(
    "correction needs no reason input, preserves history and cannot change standards",
    async () => {
      await page.goto(front + "/result?submissionId=" + noise.submission_code);
      const old = await get(noise.submission_code);
      if (old.revision.is_pass) {
        assert.equal(
          await page
            .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
            .count(),
          0,
        );
        await page.goto(
          front +
            "/assessment/environment-form?category=noise&edit=" +
            noise.submission_code +
            "&base=" +
            old.revision.revision_id,
        );
      } else {
        await page.goto(
          front +
            "/assessment/environment-form?category=noise&edit=" +
            noise.submission_code +
            "&base=" +
            old.revision.revision_id,
        );
      }
      await field("inspectionData.serial_number").fill("SN-CORRECT");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      assert.equal(await field("reason").count(), 0);
      assert.equal(await input(0, "evaluation_basis").count(), 0);
      assert(await input(0, "exposure_duration_minutes").isDisabled());
      await review();
      await submit();
      const s = await get(noise.submission_code);
      assert.equal(s.inspectionData.serial_number, "SN-CORRECT");
      const historical = (
        await call(
          `/results/${noise.submission_code}?revision=${old.revision.revision_id}`,
          undefined,
          "GET",
        )
      ).json.data;
      assert.equal(historical.inspectionData.serial_number, "SN-P5");
      const audit = (
        await call(
          `/submissions/${noise.submission_code}/audit`,
          undefined,
          "GET",
        )
      ).json;
      assert.equal(audit.data[0].reason, "ประเมินวัดซ้ำ");
    },
  );
  await check(
    "attach layout directly on result; lost receipt retry creates one revision and preserves old measurements",
    async () => {
      const source = await get(noise.submission_code);
      const created = await call("/submissions", {
        schema_version: 3,
        idempotency_key: key(),
        assessment_type: "environment",
        assessment_group: "environment",
        assessment_category: "noise",
        inspectionData: source.revision.inspectionData,
        units: source.revision.observations.map((o) => o.unit),
      });
      assert.equal(created.json.success, true);
      const code = created.json.data.submission_code,
        before = await get(code);
      await page.goto(front + "/result?submissionId=" + code);
      await page
        .getByRole("button", { name: "เลือกไฟล์แผนผัง", exact: true })
        .waitFor();
      await field("layout").setInputFiles(
        resolve("public/standards/lighting-std-2561.pdf"),
      );
      await page
        .getByRole("button", { name: "บันทึกผัง", exact: true })
        .waitFor();
      const pattern = api + "/api/submissions/" + code + "/corrections";
      let failedReceipt = false;
      await page.route(pattern, async (route) => {
        if (!failedReceipt) {
          failedReceipt = true;
          await route.fetch();
          await route.abort();
        } else await route.continue();
      });
      await page
        .getByRole("button", { name: "บันทึกผัง", exact: true })
        .click();
      await page.locator("[data-result-layout-editor] [role=alert]").waitFor();
      assert(await page.getByText("เปิดดู PDF", { exact: true }).isVisible());
      await page
        .getByRole("button", { name: "บันทึกผัง", exact: true })
        .click();
      await page
        .getByRole("link", { name: "ดาวน์โหลดผัง", exact: true })
        .waitFor();
      await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
      assert.equal(
        await page
          .getByRole("button", { name: "บันทึกผัง", exact: true })
          .count(),
        0,
      );
      const after = await get(code);
      assert.equal(after.data_version, before.data_version + 1);
      assert(after.revision.layout_file_id);
      assert.equal(after.has_layout, 1);
      assert.deepEqual(
        after.revision.observations.map((o) => o.unit),
        before.revision.observations.map((o) => o.unit),
      );
      const old = await get(code + "?revision=" + before.revision.revision_id);
      assert.equal(old.revision.layout_file_id, null);
      assert.equal(after.layout.file_name, "lighting-std-2561.pdf");
      assert.equal(after.layout.mime_type, "application/pdf");
      assert(after.layout.byte_size > 0);
      const editor = page.locator("[data-result-layout-editor]");
      assert(
        await editor
          .getByText("lighting-std-2561.pdf", { exact: true })
          .isVisible(),
      );
      assert(
        await editor
          .getByRole("button", { name: "เปลี่ยนไฟล์", exact: true })
          .isVisible(),
      );
      await editor.getByRole("button", { name: "ลบ", exact: true }).click();
      assert(
        await editor
          .getByRole("button", { name: "บันทึกผัง", exact: true })
          .isVisible(),
      );
      assert.equal(
        (await get(code)).revision.layout_file_id,
        after.revision.layout_file_id,
      );
      await editor.getByRole("button", { name: "ยกเลิก", exact: true }).click();
      assert(
        await editor
          .getByText("lighting-std-2561.pdf", { exact: true })
          .isVisible(),
      );
      assert.equal(
        await editor
          .getByRole("button", { name: "บันทึกผัง", exact: true })
          .count(),
        0,
      );
      await field("layout").setInputFiles({
        name: "replacement.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync("public/standards/lighting-std-2561.pdf"),
      });
      assert.equal(
        (await get(code)).revision.layout_file_id,
        after.revision.layout_file_id,
      );
      await editor
        .getByRole("button", { name: "บันทึกผัง", exact: true })
        .click();
      await page
        .getByRole("link", { name: "ดาวน์โหลดผัง", exact: true })
        .waitFor();
      await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
      const replaced = await get(code);
      assert.notEqual(
        replaced.revision.layout_file_id,
        after.revision.layout_file_id,
      );
      assert.equal(replaced.layout.file_name, "replacement.pdf");
      assert.equal(
        (await get(code + "?revision=" + after.revision.revision_id)).layout
          .file_name,
        "lighting-std-2561.pdf",
      );
      await page.screenshot({
        path: "docs/v3/baseline/inline-layout-saved.png",
        fullPage: true,
      });
      await page.goto(
        front +
          "/result?submissionId=" +
          code +
          "&revision=" +
          before.revision.revision_id,
      );
      await page.locator("[data-environment-summary]").waitFor();
      assert.equal(
        await page.locator("[data-result-layout-editor]").count(),
        0,
      );
      await page.goto(front + "/result?submissionId=" + code);
      await page
        .locator("[data-result-layout-editor]")
        .getByText("replacement.pdf", { exact: true })
        .waitFor();
      await page
        .locator("[data-result-layout-editor]")
        .getByRole("button", { name: "ลบ", exact: true })
        .click();
      await page
        .getByRole("button", { name: "บันทึกผัง", exact: true })
        .click();
      await page
        .getByRole("button", { name: "บันทึกผัง", exact: true })
        .waitFor({ state: "hidden" });
      await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
      const removed = await get(code);
      assert.equal(removed.revision.layout_file_id, null);
      assert.equal(removed.has_layout, 0);
      assert.equal(removed.data_version, replaced.data_version + 1);
      assert.equal(
        (await get(code + "?revision=" + replaced.revision.revision_id))
          .revision.layout_file_id,
        replaced.revision.layout_file_id,
      );
      const oldFile = await fetch(
        api + "/api/files/" + replaced.revision.layout_file_id,
      );
      assert.equal(oldFile.status, 200);
      await page.unroute(pattern);
    },
  );
  await check(
    "legacy record is excluded from current UI while original source remains unchanged",
    async () => {
      const code = "SUB-20260902-2002",
        old = await get(code);
      assert.equal(old.schema_version, 1);
      await page.goto(front + "/result?submissionId=" + code);
      await page
        .getByText("ไม่พบรายการประเมินในข้อมูลปัจจุบัน", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "เติมข้อมูลประกอบสำหรับการตรวจซ้ำ" })
          .count(),
        0,
      );
      assert.equal(await page.locator("[data-environment-summary]").count(), 0);
      assert.deepEqual(await get(code), old);
    },
  );
  await check(
    "incomplete retest metadata and forged topology/standards are rejected without extra revisions",
    async () => {
      const s = await get(noise.submission_code);
      const req = {
        schema_version: 3,
        idempotency_key: key(),
        base_revision_id: s.revision.revision_id,
        inspection_date: "2026-10-13",
        start_at: "2026-10-13T08:00:00+07:00",
        end_at: "2026-10-13T11:00:00+07:00",
        updates: [
          {
            point_id: s.units[0].point_id,
            kind: "noise",
            min_dBA: 78,
            max_dBA: 94,
            twa_8hr: 80,
          },
        ],
      };
      const bad = await call("/submissions/" + s.submission_code + "/retests", {
        ...req,
        inspectionData: { equipment: "fake" },
      });
      assert.equal(bad.status, 400);
      const changed = await call(
        "/submissions/" + s.submission_code + "/retests",
        {
          ...req,
          idempotency_key: key(),
          updates: [
            {
              ...req.updates[0],
              evaluation_basis: "exposure-duration",
              exposure_duration_minutes: 1,
            },
          ],
        },
      );
      assert.equal(changed.status, 400);
      assert.equal(
        (await get(s.submission_code)).revision.revision_id,
        s.revision.revision_id,
      );
    },
  );
  await check(
    "corrupt local environment draft recovers to safe blank form without page crash",
    async () => {
      await page.goto(front + "/assessment/environment-form?category=light");
      await field("inspectionData.inspector_name").waitFor();
      await page.evaluate(() => {
        const found = Object.keys(localStorage).find(
          (k) =>
            k.includes("environment-form-v3-p5") &&
            k.includes("light") &&
            k.includes("create"),
        );
        const stored = JSON.parse(localStorage.getItem(found));
        stored.data.environmentV3 = { inspection: {}, units: null, reason: "" };
        localStorage.setItem(found, JSON.stringify(stored));
      });
      await page.reload();
      await field("inspectionData.inspector_name").waitFor();
      assert.equal(
        await field("inspectionData.inspector_name").inputValue(),
        "",
      );
      assert(
        (await page.getByRole("status").innerText()).includes(
          "ร่างเดิมไม่ตรงรูปแบบ",
        ),
      );
    },
  );
  assert.deepEqual(pageErrors, []);
  assert.equal(
    (await db.prepare("PRAGMA foreign_key_check").all()).results.length,
    0,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(front + "/result?submissionId=" + heat.submission_code);
  await page.locator("[data-environment-summary]").waitFor();
  await page.screenshot({
    path: "docs/v3/baseline/p5-heat-desktop.png",
    fullPage: true,
  });
  writeFileSync(
    "docs/v3/baseline/environment-guidance-checks.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks: guidanceChecks,
        passed: true,
        remote: false,
        deployed: false,
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    "docs/v3/baseline/p5-browser-tests.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        passed,
        checks,
        page_errors: pageErrors,
        runtime:
          "Chromium + real local workerd/D1/R2; one aborted create for retry",
        foreign_key_violations: 0,
        remote: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("P5 browser integration PASS " + passed);
} catch (error) {
  console.error(logs.slice(-2500));
  throw error;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
