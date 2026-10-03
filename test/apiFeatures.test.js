const assert = require('node:assert/strict');
const test = require('node:test');
const ApiFeatures = require('../Utils/ApiFeatures');

function createQuery() {
  return {
    conditions: null,
    sortValue: null,
    selectValue: null,
    skipValue: null,
    limitValue: null,
    find(conditions) {
      this.conditions = conditions;
      return this;
    },
    sort(value) {
      this.sortValue = value;
      return this;
    },
    select(value) {
      this.selectValue = value;
      return this;
    },
    skip(value) {
      this.skipValue = value;
      return this;
    },
    limit(value) {
      this.limitValue = value;
      return this;
    },
  };
}

test('ApiFeatures converts comparison operators and removes reserved query controls', () => {
  const query = createQuery();

  new ApiFeatures(query, {
    ratings: { gte: '4.5' },
    page: '2',
    limit: '5',
    sort: '-ratings',
    fields: 'name,ratings',
  }).filter();

  assert.deepEqual(query.conditions, { ratings: { $gte: '4.5' } });
});

test('ApiFeatures applies sorting, field limiting, and bounded pagination', () => {
  const query = createQuery();
  const features = new ApiFeatures(query, {
    sort: '-ratings,price',
    fields: 'name,ratings',
    page: '3',
    limit: '200',
  })
    .sort()
    .limitFields()
    .paginate();

  assert.equal(query.sortValue, '-ratings price');
  assert.equal(query.selectValue, 'name ratings');
  assert.equal(query.skipValue, 200);
  assert.equal(query.limitValue, 100);
  assert.deepEqual(features.pagination, { page: 3, limit: 100, skip: 200 });
});

test('filters reject injected operators and leave literal comparison words unchanged', () => {
  assert.throws(() => new ApiFeatures(createQuery(), { ratings: { $ne: '0' } }).filter(), /comparison filters/);
  assert.throws(() => new ApiFeatures(createQuery(), { $where: 'true' }).filter(), /Unsupported filter/);
  const query = createQuery();
  new ApiFeatures(query, { name: 'gte' }).filter();
  assert.deepEqual(query.conditions, { name: 'gte' });
});

test('pagination rejects fractions, infinities, and negative values', () => {
  for (const page of ['1.5', 'Infinity', '-1']) assert.throws(() => new ApiFeatures(createQuery(), { page }).paginate(), /positive whole numbers/);
});
