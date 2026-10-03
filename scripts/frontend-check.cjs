const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3100');
    await page.locator('.movie-card').first().waitFor();
    assert.equal(await page.locator('.movie-card').count(), 3);
    await page.waitForFunction(() => [...document.querySelectorAll('.poster')].every((image) => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: path.join(__dirname, '../frontend-desktop.png'), fullPage: true });
    await page.locator('#filters select[name="genres"]').selectOption('Horror');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.locator('#empty').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Reset filters', exact: true }).last().click();
    await page.locator('.movie-card').first().waitFor();
    await page.locator('[data-id]').first().click();
    await page.locator('#detailsDialog').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Close details' }).click();
    await page.getByRole('button', { name: '+ Add movie', exact: true }).click();
    assert.match(await page.locator('#toast').innerText(), /read-only/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(__dirname, '../frontend-mobile.png'), fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    // Exercise writes against explicit test responses, never a live database.
    const movies = require('../data/movies.json').map((movie, index) => ({ ...movie, _id: `test-${index}` }));
    let savedBody;
    let authFails = true;
    let role = 'admin';
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request(); const url = new URL(request.url());
      let status = 200; let body;
      if (url.pathname.includes('/auth/')) {
        status = authFails ? 401 : 200;
        body = authFails ? { message: 'Incorrect email or password.' } : { token: 'test-token', data: { user: { name: 'Reviewer', role } } };
      } else if (request.method() === 'DELETE') { status = 204; }
      else if (['POST', 'PATCH'].includes(request.method())) { savedBody = request.postDataJSON(); body = { data: { movie: { ...savedBody, _id: 'test-new' } } }; }
      else if (url.pathname === '/api/v1/movies') { const current = Number(url.searchParams.get('page')); body = { pagination: { total: 9, pages: 2 }, data: { movies: current === 2 ? [movies[2]] : movies } }; }
      else body = { data: { movie: movies[0] } };
      await route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(body) });
    });
    await page.reload(); await page.locator('.movie-card').first().waitFor();
    await page.getByRole('button', { name: 'Next page' }).click();
    await page.waitForFunction(() => document.querySelector('#pageSummary').textContent === 'Page 2 of 2');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('review@example.com');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.locator('#authForm [type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#authError').textContent.includes('Incorrect'));
    authFails = false; await page.locator('#authForm [type="submit"]').click();
    await page.locator('#authDialog').waitFor({ state: 'hidden' });
    await page.locator('[data-id]').first().click();
    await page.getByRole('button', { name: 'Edit movie', exact: true }).click();
    await page.getByLabel('Price ($)', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Save movie', exact: true }).click();
    await page.locator('#editorDialog').waitFor({ state: 'hidden' });
    assert.equal(savedBody.price, 0);
    await page.locator('.movie-card').first().waitFor(); await page.locator('[data-id]').first().click();
    await page.getByRole('button', { name: 'Delete movie', exact: true }).click();
    await page.getByRole('button', { name: 'Keep movie' }).click();
    await page.getByRole('button', { name: 'Delete movie', exact: true }).click();
    await page.locator('#confirmDelete').click();
    await page.locator('#detailsDialog').waitFor({ state: 'hidden' });
    role = 'user';
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('review@example.com');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.locator('#authForm [type="submit"]').click();
    await page.locator('#authDialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#addMovie').isVisible(), false);
    await page.locator('.movie-card').first().waitFor(); await page.locator('[data-id]').first().click();
    assert.equal(await page.locator('#editMovie').isVisible(), false);
    assert.equal(await page.locator('#deleteMovie').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('Frontend checks passed: filters, empty state, details, preview guard, mobile overflow, pagination, auth errors, edit, zero price, delete confirmation.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
