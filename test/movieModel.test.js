const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const Movie = require('../Models/movieModel');

const validMovie = {
  name: 'Arrival',
  description: 'A linguist works with the military to communicate with alien visitors.',
  duration: 116,
  ratings: 4.6,
  totalRating: 900,
  releaseYear: 2016,
  releaseDate: '2016-11-11',
  genres: ['Sci-Fi', 'Drama'],
  directors: ['Denis Villeneuve'],
  coverImage: 'arrival.jpg',
  actors: ['Amy Adams', 'Jeremy Renner'],
  price: 11.99,
};

test('movie model accepts a complete valid movie', async () => {
  const movie = new Movie(validMovie);

  await assert.doesNotReject(() => movie.validate());
  assert.equal(movie.durationInHours, 1.93);
});

test('movie model rejects ratings outside the supported range', async () => {
  const movie = new Movie({ ...validMovie, ratings: 11 });

  await assert.rejects(() => movie.validate(), /Ratings \(11\) should be between 1 and 10/);
});

test('movie model requires key portfolio API fields', async () => {
  const movie = new Movie({ name: 'Up' });

  await assert.rejects(async () => {
    await movie.validate();
  }, (error) => {
    assert.match(error.message, /Description is Required/);
    assert.match(error.message, /Duration is required/);
    assert.match(error.message, /Release Year is required/);
    return true;
  });
});

test.after(async () => {
  await mongoose.disconnect();
});
