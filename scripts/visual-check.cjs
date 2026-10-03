const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(process.env.CINEINDEX_URL || 'http://127.0.0.1:1000');
    await page.locator('.movie-card').first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.poster')].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator('.rating-invalid').count(), 0);
    await page.screenshot({ path: path.join(__dirname, '../frontend-desktop.png'), fullPage: true });
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
      if (width === 390) await page.screenshot({ path: path.join(__dirname, '../frontend-mobile.png'), fullPage: true });
    }
    await page.locator('[data-id]').first().click();
    await page.locator('#detailsDialog').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    console.log('Live visual checks passed: poster loading, valid rating labels, details, desktop and 768/390/320px layout.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
