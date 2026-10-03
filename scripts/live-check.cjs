const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('dotenv').config({ path: './config.env', quiet: true, override: true });
const mongoose = require('mongoose');
const User = require('../Models/userModel');
const Movie = require('../Models/movieModel');
const tag = crypto.randomUUID();
const email = `cineindex-check-${tag}@example.com`;
const movieName = `CineIndex check ${tag}`;
const password = crypto.randomBytes(24).toString('hex');
const base = `http://127.0.0.1:${process.env.PORT || 1000}/api/v1`;
let token;
async function request(path, method = 'GET', body) {
  console.log(`Checking ${method} ${path}`);
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Connection: 'close', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
(async () => {
  await mongoose.connect(process.env.CONN_STR);
  try {
    let response = await request('/movies');
    assert.equal(response.status, 401);
    response = await request('/auth/signup', 'POST', { name: 'Temporary check', email, password, confirmPassword: password, role: 'admin' });
    assert.equal(response.status, 201, response.data.message);
    assert.equal(response.data.data.user.role, 'user');
    response = await request('/auth/login', 'POST', { email, password });
    assert.equal(response.status, 200, response.data.message); token = response.data.token;
    response = await request('/movies?limit=1');
    assert.equal(response.status, 200);
    const movie = { ...require('../data/movies.json')[0], name: movieName, price: 0 };
    response = await request('/movies', 'POST', movie);
    assert.equal(response.status, 403, 'Regular users cannot create movies');
    await User.collection.updateOne({ email }, { $set: { role: 'admin' } });
    response = await request('/movies', 'POST', { ...movie, ratings: 11 });
    assert.equal(response.status, 400, response.data.message);
    response = await request('/movies', 'POST', movie);
    assert.equal(response.status, 201, response.data.message);
    const id = response.data.data.movie._id;
    await User.collection.updateOne({ email }, { $set: { role: 'user' } });
    response = await request(`/movies/${id}`, 'PATCH', { price: 1.25 });
    assert.equal(response.status, 403, 'Regular users cannot edit movies');
    response = await request(`/movies/${id}`, 'DELETE'); assert.equal(response.status, 403);
    await User.collection.updateOne({ email }, { $set: { role: 'admin' } });
    response = await request(`/movies/${id}`, 'PATCH', { price: 1.25 });
    assert.equal(response.status, 200, response.data.message); assert.equal(response.data.data.movie.price, 1.25);
    response = await request(`/movies/${id}`, 'DELETE'); assert.equal(response.status, 204, response.data?.message);
    response = await request(`/movies/${id}`); assert.equal(response.status, 404);
    console.log('Live checks passed: signup, login, validation, create, update, role restriction, admin delete, missing record.');
  } finally {
    await Movie.collection.deleteMany({ name: movieName });
    await User.collection.deleteMany({ email });
    console.log('Unique temporary test records removed.');
    await mongoose.disconnect();
  }
})().catch(async (error) => { console.error(error.name + ': ' + error.message, error.cause?.code || ''); await mongoose.disconnect(); process.exitCode = 1; });
