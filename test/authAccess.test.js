const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../app');
test('all movie routes reject unauthenticated requests while health stays public', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [method, route] of [
      ['GET', '/api/v1/movies'], ['GET', '/api/v1/movies/highest-rated'],
      ['GET', '/api/v1/movies/movies-stats'], ['GET', '/api/v1/movies/movies-by-genre/Drama'],
      ['GET', '/api/v1/movies/123'], ['POST', '/api/v1/movies'],
      ['PATCH', '/api/v1/movies/123'], ['DELETE', '/api/v1/movies/123'],
    ]) {
      const response = await fetch(base + route, { method });
      assert.equal(response.status, 401, `${method} ${route}`);
    }
    assert.equal((await fetch(base + '/health')).status, 200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
