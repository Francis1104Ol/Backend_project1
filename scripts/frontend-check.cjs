const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const movies = require('../data/movies.json').map((movie, index) => ({ ...movie, _id: `test-${index}` }));
    let savedBody; let authFails = true; let role = 'admin'; let movieRequests = 0; let expire = false;
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request(); const url = new URL(request.url());
      let status = 200; let body;
      if (url.pathname.includes('/auth/')) {
        status = authFails ? 400 : 200;
        body = authFails ? { message: 'Incorrect email or password.' } : { token: 'test-token', data: { user: { name: 'Reviewer', role } } };
      } else {
        movieRequests++;
        if (expire) { status = 401; body = { message: 'JWT has expired.' }; }
        else if (request.headers().authorization !== 'Bearer test-token') { status = 401; body = { message: 'Sign in required.' }; }
        else if (request.method() === 'DELETE') status = 204;
        else if (['POST', 'PATCH'].includes(request.method())) { savedBody = request.postDataJSON(); body = { data: { movie: { ...savedBody, _id: 'test-new' } } }; }
        else if (url.pathname === '/api/v1/movies') {
          const results = url.searchParams.get('genres') === 'Horror' ? [] : movies;
          body = { pagination: { total: results.length ? 9 : 0, pages: results.length ? 2 : 1 }, data: { movies: results } };
        } else body = { data: { movie: movies[0] } };
      }
      await route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(body) });
    });
    await page.goto(process.env.CINEINDEX_URL || 'http://127.0.0.1:1000');
    assert.equal(await page.locator('#dashboard').isVisible(), false);
    assert.equal(movieRequests, 0);
    await page.screenshot({ path: path.join(__dirname, '../frontend-auth.png'), fullPage: true });
    async function login() {
      await page.getByLabel('Email', { exact: true }).fill('review@example.com');
      await page.getByLabel('Password', { exact: true }).fill('test-password');
      await page.locator('#authForm [type="submit"]').click();
    }
    await login(); await page.waitForFunction(() => document.querySelector('#authError').textContent.includes('Incorrect'));
    assert.equal(await page.locator('#dashboard').isVisible(), false);
    authFails = false; await login(); await page.locator('.movie-card').first().waitFor();
    assert.equal(await page.locator('#authDialog').isVisible(), false);
    assert.equal(await page.locator('#connection').count(), 0);
    assert.equal(await page.getByText('API overview').count(), 0);
    await page.waitForFunction(() => [...document.querySelectorAll('.poster')].every((image) => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: path.join(__dirname, '../frontend-desktop.png'), fullPage: true });
    await page.locator('#filters select[name="genres"]').selectOption('Horror');
    await page.getByRole('button', { name: 'Apply filters' }).click(); await page.locator('#empty').waitFor({ state: 'visible' });
    await page.locator('#emptyReset').click(); await page.locator('.movie-card').first().waitFor();
    await page.getByRole('button', { name: 'Next page' }).click();
    await page.waitForFunction(() => document.querySelector('#pageSummary').textContent === 'Page 2 of 2');
    await page.locator('[data-id]').first().click(); await page.locator('#detailsDialog').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Edit movie', exact: true }).click();
    await page.getByLabel('Price ($)', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Save movie', exact: true }).click();
    await page.locator('#editorDialog').waitFor({ state: 'hidden' }); assert.equal(savedBody.price, 0);
    await page.locator('.movie-card').first().waitFor(); await page.locator('[data-id]').first().click();
    await page.getByRole('button', { name: 'Delete movie', exact: true }).click();
    await page.getByRole('button', { name: 'Keep movie' }).click();
    await page.getByRole('button', { name: 'Delete movie', exact: true }).click(); await page.locator('#confirmDelete').click();
    await page.locator('#detailsDialog').waitFor({ state: 'hidden' });
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 390) await page.screenshot({ path: path.join(__dirname, '../frontend-mobile.png'), fullPage: true });
    }
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    assert.equal(await page.locator('#dashboard').isVisible(), false);
    assert.equal(await page.locator('.movie-card').count(), 0);
    role = 'user'; await login(); await page.locator('.movie-card').first().waitFor();
    assert.equal(await page.locator('#addMovie').isVisible(), false);
    await page.locator('[data-id]').first().click();
    assert.equal(await page.locator('#editMovie').isVisible(), false); assert.equal(await page.locator('#deleteMovie').isVisible(), false);
    await page.getByRole('button', { name: 'Close details' }).click();
    expire = true; await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.locator('#authDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#dashboard').isVisible(), false);
    assert.match(await page.locator('#authError').innerText(), /expired/);
    expire = false; await page.locator('#authSwitch').click();
    await page.getByLabel('Name', { exact: true }).fill('Reviewer'); await login();
    await page.locator('.movie-card').first().waitFor();
    await page.reload(); await page.locator('#authDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#dashboard').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('Frontend checks passed: sign-in gate, no anonymous movie requests, login errors, signup, filters, pagination, admin CRUD, role controls, sign-out, expiry, refresh, responsive layout.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
