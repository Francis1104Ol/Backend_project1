const test = require('node:test');
const assert = require('node:assert/strict');
const ratingLabel = require('../public/js/ratings');
test('legacy invalid ratings are flagged without inventing a replacement score', () => {
  for (const value of [11, 0, -1, null, undefined, NaN, Infinity, '4.5']) assert.equal(ratingLabel(value), 'Needs review');
});
test('valid ratings retain the ten-point scale including its boundaries', () => {
  assert.equal(ratingLabel(1), '1 / 10');
  assert.equal(ratingLabel(4.5), '4.5 / 10');
  assert.equal(ratingLabel(10), '10 / 10');
});
