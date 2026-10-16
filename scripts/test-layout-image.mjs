import { createRequire } from "node:module";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
const require = createRequire(resolve("worker/package.json"));
const esbuild = require("esbuild");
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
const bundle = esbuild.buildSync({
  entryPoints: ["src/lib/v3/prepare-layout-image.ts"],
  bundle: true,
  format: "iife",
  globalName: "LayoutImage",
  write: false,
}).outputFiles[0].text;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  await page.setContent(
    '<main><h1>Original / JPEG</h1><div id="comparison" style="display:flex;gap:20px"></div></main>',
  );
  await page.addScriptTag({ content: bundle });
  const result = await page.evaluate(async () => {
    const { prepareLayoutImage } = LayoutImage;
    const checks = [];
    const encode = (c, type, quality) =>
      new Promise((resolve) => c.toBlob(resolve, type, quality));
    const source = document.createElement("canvas");
    source.width = 1600;
    source.height = 1000;
    const ctx = source.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1600, 1000);
    ctx.strokeStyle = "#172554";
    ctx.lineWidth = 3;
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#172554";
    for (let i = 0; i < 8; i++) {
      ctx.strokeRect(20 + i * 190, 25, 170, 900);
      ctx.fillText("Room " + (i + 1), 30 + i * 190, 70);
      for (let y = 130; y < 900; y += 85)
        ctx.fillText("A" + i + " Lux 500", 30 + i * 190, y);
    }
    const png = await encode(source, "image/png");
    const file = new File([png], "room-layout.png", { type: "image/png" });
    const jpg = await prepareLayoutImage(file);
    if (jpg !== file || jpg.size > 5_000_000)
      throw new Error("Efficient PNG should remain original");
    const decoded = await createImageBitmap(jpg);
    if (decoded.width !== source.width || decoded.height !== source.height)
      throw new Error("Small image resolution changed");
    const after = document.createElement("canvas");
    after.width = 1600;
    after.height = 1000;
    after.getContext("2d").drawImage(decoded, 0, 0);
    decoded.close();
    const a = ctx.getImageData(0, 0, 1600, 1000).data,
      b = after.getContext("2d").getImageData(0, 0, 1600, 1000).data;
    let error = 0;
    for (let i = 0; i < a.length; i++)
      if (i % 4 !== 3) error += (a[i] - b[i]) ** 2;
    const psnr =
      error === 0
        ? 100
        : 10 * Math.log10(255 ** 2 / (error / (1600 * 1000 * 3)));
    if (psnr < 35) throw new Error("Text image quality too low " + psnr);
    for (const canvas of [source, after]) {
      const image = document.createElement("img");
      image.src = canvas.toDataURL();
      image.style.width = "560px";
      document.querySelector("#comparison").append(image);
    }
    checks.push({
      name: "Efficient PNG diagram preserved byte-for-byte, dimensions and text intact",
      input: file.size,
      output: jpg.size,
      psnr,
    });
    const noisy = document.createElement("canvas");
    noisy.width = 1200;
    noisy.height = 800;
    const nctx = noisy.getContext("2d");
    const image = nctx.createImageData(1200, 800);
    let seed = 123;
    for (let i = 0; i < image.data.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        image.data[i + k] = seed >>> 24;
      }
      image.data[i + 3] = 255;
    }
    nctx.putImageData(image, 0, 0);
    for (const type of ["image/png", "image/webp", "image/jpeg"]) {
      const original = await encode(noisy, type, 1);
      const converted = await prepareLayoutImage(
        new File([original], "small." + type.split("/")[1], { type }),
      );
      if (original.size >= 5_000_000)
        throw new Error("Fixture must be below 5 MB");
      if (converted.size >= original.size || converted.size > 5_000_000)
        throw new Error("Did not compress " + type);
      checks.push({
        name: type + " compressed, including below 5 MB",
        input: original.size,
        output: converted.size,
      });
    }
    const large = document.createElement("canvas");
    large.width = 3800;
    large.height = 2500;
    const lctx = large.getContext("2d"),
      pixels = lctx.createImageData(3800, 2500);
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        pixels.data[i + k] = seed >>> 24;
      }
      pixels.data[i + 3] = 255;
    }
    lctx.putImageData(pixels, 0, 0);
    const originalLarge = await encode(large, "image/jpeg", 0.9);
    if (
      originalLarge.size <= 5_000_000 ||
      originalLarge.size > 10 * 1024 * 1024
    )
      throw new Error("Large fixture must be between 5 and 10 MB");
    const reduced = await prepareLayoutImage(
      new File([originalLarge], "large.jpg", { type: "image/jpeg" }),
    );
    if (reduced.size > 5_000_000 || reduced.type !== "image/jpeg")
      throw new Error("5 MB output cap failed");
    checks.push({
      name: "5–10 MB photo reduces to JPG at most 5 MB",
      input: originalLarge.size,
      output: reduced.size,
    });
    const efficient = new File(
      [await encode(noisy, "image/jpeg", 0.3)],
      "optimized.jpg",
      { type: "image/jpeg" },
    );
    if ((await prepareLayoutImage(efficient)) !== efficient)
      throw new Error("Optimized JPEG changed unnecessarily");
    const pdf = new File(["%PDF-1.4\noriginal bytes"], "layout.pdf", {
      type: "application/pdf",
    });
    if ((await prepareLayoutImage(pdf)) !== pdf)
      throw new Error("PDF modified");
    const transparent = document.createElement("canvas");
    transparent.width = 10;
    transparent.height = 10;
    const white = await prepareLayoutImage(
      new File([await encode(transparent, "image/png")], "transparent.png", {
        type: "image/png",
      }),
    );
    const bitmap = await createImageBitmap(white);
    const c = document.createElement("canvas");
    c.width = 10;
    c.height = 10;
    c.getContext("2d").drawImage(bitmap, 0, 0);
    const pixel = c.getContext("2d").getImageData(0, 0, 1, 1).data;
    if (
      white.type === "image/jpeg" &&
      (pixel[0] < 250 || pixel[1] < 250 || pixel[2] < 250)
    )
      throw new Error("Transparency not white");
    bitmap.close();
    let rejected = false;
    try {
      await prepareLayoutImage(
        new File(["invalid"], "broken.png", { type: "image/png" }),
      );
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("Corrupt image accepted");
    checks.push({
      name: "Optimized JPEG and PDF unchanged, transparency safe, corrupt image rejected",
    });
    return { checks, fixture: noisy.toDataURL("image/png").split(",")[1] };
  });
  writeFileSync(
    ".wrangler/p9-backup-20261016/compression-input.png",
    Buffer.from(result.fixture, "base64"),
  );
  delete result.fixture;
  await page.screenshot({
    path: "docs/v3/baseline/layout-jpeg-quality.png",
    fullPage: true,
  });
  writeFileSync(
    "docs/v3/baseline/layout-image-compression.json",
    JSON.stringify(
      { date: new Date().toISOString(), passed: true, ...result },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
