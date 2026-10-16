import assert from "node:assert/strict";

// Hold both the save receipt and destination request to inspect every phase.
export async function checkSubmitFlow(
  page,
  { front, api, button, screenshot },
) {
  let releaseSave,
    releaseNavigation,
    posts = 0;
  const saveGate = new Promise((resolve) => {
    releaseSave = resolve;
  });
  const navigationGate = new Promise((resolve) => {
    releaseNavigation = resolve;
  });
  const savePattern = api + "/api/submissions**";
  const destinationPattern = front + "/result?**";
  const saveHandler = async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    const response = await route.fetch();
    await saveGate;
    await route.fulfill({ response });
  };
  const destinationHandler = async (route) => {
    await navigationGate;
    await route.continue();
  };
  await page.route(savePattern, saveHandler);
  await page.route(destinationPattern, destinationHandler);
  await page.evaluate(() => {
    window.__submitFirstStepFlash = false;
    window.__submitObserver = new MutationObserver(() => {
      if (document.body.textContent.includes("ขั้นตอนที่ 1 จาก"))
        window.__submitFirstStepFlash = true;
    });
    window.__submitObserver.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  try {
    await page.getByRole("button", { name: button, exact: true }).click();
    await page
      .locator(
        '[data-submit-loading="saving"], [data-submit-loading="uploading"]',
      )
      .waitFor();
    await page.keyboard.press("Tab");
    assert(
      await page
        .locator("[data-submit-loading]")
        .evaluate((el) => el === document.activeElement),
    );
    await page.keyboard.press("Enter");
    assert.equal(await page.getByText(/ขั้นตอนที่ 1 จาก/).count(), 0);
    releaseSave();
    await page.locator('[data-submit-loading="redirecting"]').waitFor();
    assert.equal(posts, 1);
    assert.equal(await page.getByText("กำลังโหลด", { exact: true }).count(), 1);
    assert.equal(await page.getByText(/ขั้นตอนที่ 1 จาก/).count(), 0);
    assert.equal(
      await page.evaluate(() => window.__submitFirstStepFlash),
      false,
    );
    if (screenshot) await page.screenshot({ path: screenshot });
  } finally {
    await page
      .evaluate(() => window.__submitObserver?.disconnect())
      .catch(() => {});
    releaseSave();
    releaseNavigation();
    await page.unroute(savePattern, saveHandler);
    await page.unroute(destinationPattern, destinationHandler);
  }
}
