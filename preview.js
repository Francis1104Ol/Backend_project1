// Read-only preview uses seed records; production uses server.js.
const express = require('express');
const path = require('path');
const app = express();
const movies = require('./data/movies.json').map((movie, index) => ({ ...movie, _id: `sample-${index + 1}` }));
app.get('/api/v1/movies', (req, res) => {
  let results = movies.filter((movie) => (!req.query.genres || movie.genres.includes(req.query.genres)) && movie.ratings >= Number(req.query['ratings[gte]'] || 0));
  const sort = String(req.query.sort || '-ratings'); const field = sort.replace(/^-/, '');
  results = [...results].sort((a, b) => (typeof a[field] === 'string' ? a[field].localeCompare(b[field]) : a[field] - b[field]) * (sort.startsWith('-') ? -1 : 1));
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 6));
  res.json({ preview: true, pagination: { page, limit, total: results.length, pages: Math.max(1, Math.ceil(results.length / limit)) }, data: { movies: results.slice((page - 1) * limit, page * limit) } });
});
app.get('/api/v1/movies/:id', (req, res) => { const movie = movies.find((item) => item._id === req.params.id); res.status(movie ? 200 : 404).json(movie ? { data: { movie } } : { message: 'Movie not found.' }); });
app.get('/api/v1', (req, res) => res.json({ preview: true, message: 'Read-only sample preview. Start server.js with MongoDB configured for the live API.' }));
app.use('/api', (req, res) => res.status(403).json({ message: 'Sample preview is read-only.' }));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 3100, '127.0.0.1', () => console.log('Movie catalogue preview: http://127.0.0.1:' + (process.env.PORT || 3100)));
