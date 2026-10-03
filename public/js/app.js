'use strict';
const $ = (selector) => document.querySelector(selector);
const state = { page: 1, pages: 1, selected: null, token: '', user: null, preview: false, signup: false, request: 0 };
const posters = { Inception: '/images/inception.jpg', Interstellar: '/images/interstellar.jpg', 'The Dark Knight': '/images/dark-knight.jpg' };
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const movieId = (movie) => movie._id || movie.id;
const localPosters = new Set(['inception.jpg', 'interstellar.jpg', 'dark-knight.jpg', 'dune.jpg', 'parasite.jpg', 'spiderman.jpg', 'shawshank.jpg', 'titanic.jpg', 'whiplash.jpg', 'black-panther.jpg', 'lion-king.jpg', 'forrest-gump.jpg', 'godfather.jpg', 'madmax.jpg', 'gladiator.jpg', 'joker.jpg', 'endgame.jpg']);
const poster = (movie) => /^https:\/\//.test(movie.coverImage || '') ? movie.coverImage : localPosters.has(movie.coverImage) ? `/images/${movie.coverImage}` : posters[movie.name] || '';
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500); }
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) }, signal: AbortSignal.timeout(12000) });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status}). Please try again.`);
  return payload;
}
function artwork(movie, className = 'poster') { const src = poster(movie); const fallback = `<div class="poster-fallback" ${src ? 'hidden' : ''} aria-label="Poster unavailable"><span>CINEINDEX</span><strong>${escapeHTML(movie.name)}</strong></div>`; return src ? `<img class="${className}" src="${escapeHTML(src)}" alt="${escapeHTML(movie.name)} poster" loading="lazy">${fallback}` : fallback; }
function wireImages(container) { container.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => { img.hidden = true; if (img.nextElementSibling) img.nextElementSibling.hidden = false; })); }
function card(movie) {
  const rating = ratingLabel(movie.ratings);
  return `<article class="movie-card"><div class="record-top"><div class="poster-wrap">${artwork(movie)}</div><div class="record-summary"><span class="release-label">${escapeHTML(movie.releaseYear)} RELEASE</span><h3>${escapeHTML(movie.name)}</h3><div class="metadata">${escapeHTML(movie.duration)} minutes</div><div class="genres">${escapeHTML((movie.genres || []).slice(0, 2).join(' / '))}</div><span class="rating ${rating === 'Needs review' ? 'rating-invalid' : ''}">${rating === 'Needs review' ? '' : '&#9733; '}${escapeHTML(rating)}</span></div></div><div class="movie-body"><p class="synopsis">${escapeHTML(movie.description)}</p><div class="card-bottom"><span class="price"><small>PRICE</small>$${Number(movie.price || 0).toFixed(2)}</span><button class="text-button" data-id="${escapeHTML(movieId(movie))}" aria-label="View ${escapeHTML(movie.name)} details">View record <span aria-hidden="true">&#8594;</span></button></div></div></article>`;
}
async function loadMovies() {
  const request = ++state.request; const query = new URLSearchParams();
  new FormData($('#filters')).forEach((value, key) => { if (value) query.set(key, value); });
  query.set('page', state.page); query.set('limit', $('#pageSize').value);
  $('#movies').setAttribute('aria-busy', 'true'); $('#empty').hidden = true; $('#movies').innerHTML = '<div class="skeleton"></div>'.repeat(3);
  $('#status').textContent = 'Loading movies...'; $('#prevPage').disabled = $('#nextPage').disabled = true;
  try {
    const payload = await api(`/api/v1/movies?${query}`); if (request !== state.request) return;
    state.preview = Boolean(payload.preview); state.pages = Math.max(1, payload.pagination.pages);
    $('#connection').textContent = state.preview ? 'Sample preview / Read-only seed collection' : 'Connected / Live movie catalogue';
    $('#movies').innerHTML = payload.data.movies.map(card).join(''); wireImages($('#movies')); $('#empty').hidden = payload.data.movies.length > 0;
    $('#status').textContent = `${payload.pagination.total} movie${payload.pagination.total === 1 ? '' : 's'} in this collection`;
    $('#collectionCount').textContent = payload.pagination.total;
    $('#pageSummary').textContent = `Page ${state.page} of ${state.pages}`; $('#prevPage').disabled = state.page <= 1; $('#nextPage').disabled = state.page >= state.pages;
  } catch (error) { if (request !== state.request) return; $('#movies').replaceChildren(); $('#status').textContent = `Catalogue unavailable. ${error.message}`; $('#connection').textContent = 'Disconnected / Check the server and database connection'; $('#pageSummary').textContent = 'Unable to load catalogue'; }
  finally { if (request === state.request) $('#movies').setAttribute('aria-busy', 'false'); }
}
function showDetails(movie) {
  state.selected = movie; $('#detailError').textContent = '';
  $('#details').innerHTML = `${artwork(movie, 'detail-poster')}<h2>${escapeHTML(movie.name)}</h2><p class="metadata">${escapeHTML(movie.releaseYear)} &middot; ${escapeHTML(movie.duration)} min &middot; ${escapeHTML(ratingLabel(movie.ratings))}</p><p>${escapeHTML(movie.description)}</p><dl><dt>Genres</dt><dd>${escapeHTML((movie.genres || []).join(', '))}</dd><dt>Director</dt><dd>${escapeHTML((movie.directors || []).join(', '))}</dd><dt>Cast</dt><dd>${escapeHTML((movie.actors || []).join(', '))}</dd><dt>Price</dt><dd>$${Number(movie.price || 0).toFixed(2)}</dd></dl><details><summary>API response</summary><pre>${escapeHTML(JSON.stringify(movie, null, 2))}</pre></details>`;
  wireImages($('#details')); syncPermissions(); $('#detailsDialog').showModal();
}
function canWrite() {
  if (state.preview) { toast('Sample preview is read-only. Connect MongoDB to manage movies.'); return false; }
  if (!state.token) { $('#authDialog').showModal(); return false; }
  if (state.user?.role !== 'admin') { toast('Only administrators can manage movies.'); return false; }
  return true;
}
function syncPermissions() {
  const admin = state.user?.role === 'admin';
  $('#addMovie').hidden = Boolean(state.token) && !admin;
  $('#editMovie').hidden = !admin;
  $('#deleteMovie').hidden = !admin;
}
function openEditor(movie) {
  if (!canWrite()) return;
  const form = $('#movieForm'); form.reset(); $('#formError').textContent = ''; form.elements.id.value = movie ? movieId(movie) : '';
  if (movie) for (const field of Array.from(form.elements)) { if (!field.name || field.name === 'id') continue; const value = movie[field.name]; field.value = Array.isArray(value) ? value.join(', ') : field.name === 'releaseDate' ? (value || '').slice(0, 10) : value ?? ''; }
  $('#formTitle').textContent = movie ? 'Edit movie' : 'Add movie'; $('#editorDialog').showModal();
}
document.querySelectorAll('.close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$('#filters').addEventListener('submit', (event) => { event.preventDefault(); state.page = 1; loadMovies(); });
function resetFilters() { $('#filters').reset(); state.page = 1; loadMovies(); }
$('#resetFilters').addEventListener('click', resetFilters); $('#emptyReset').addEventListener('click', resetFilters); $('#pageSize').addEventListener('change', () => { state.page = 1; loadMovies(); });
$('#prevPage').addEventListener('click', () => { if (state.page > 1) { state.page--; loadMovies(); } }); $('#nextPage').addEventListener('click', () => { if (state.page < state.pages) { state.page++; loadMovies(); } });
$('#movies').addEventListener('click', async (event) => { const button = event.target.closest('[data-id]'); if (!button) return; button.disabled = true; try { const payload = await api(`/api/v1/movies/${encodeURIComponent(button.dataset.id)}`); showDetails(payload.data.movie); } catch (error) { toast(error.message); } finally { button.disabled = false; } });
$('#addMovie').addEventListener('click', () => openEditor(null)); $('#editMovie').addEventListener('click', () => openEditor(state.selected));
$('#movieForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); button.disabled = true; $('#formError').textContent = '';
  const body = {}; new FormData(form).forEach((value, key) => { if (key === 'id') return; body[key] = ['genres', 'directors', 'actors'].includes(key) ? value.split(',').map((item) => item.trim()).filter(Boolean) : ['duration', 'ratings', 'releaseYear', 'price'].includes(key) ? Number(value) : value.trim(); });
  if (!body.releaseDate) body.releaseDate = null; const id = form.elements.id.value;
  try { const payload = await api(id ? `/api/v1/movies/${encodeURIComponent(id)}` : '/api/v1/movies', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }); $('#editorDialog').close(); $('#detailsDialog').close(); toast(id ? 'Movie updated.' : 'Movie added.'); state.selected = payload.data.movie; await loadMovies(); }
  catch (error) { $('#formError').textContent = error.message; } finally { button.disabled = false; }
});
$('#deleteMovie').addEventListener('click', () => { if (!canWrite()) return; if (state.user?.role !== 'admin') { $('#detailError').textContent = 'Only an administrator can delete movies.'; return; } $('#deleteName').textContent = state.selected.name; $('#deleteDialog').showModal(); });
$('#confirmDelete').addEventListener('click', async (event) => { event.target.disabled = true; try { await api(`/api/v1/movies/${encodeURIComponent(movieId(state.selected))}`, { method: 'DELETE' }); $('#deleteDialog').close(); $('#detailsDialog').close(); state.selected = null; state.page = 1; toast('Movie deleted.'); await loadMovies(); } catch (error) { $('#deleteDialog').close(); $('#detailError').textContent = error.message; } finally { event.target.disabled = false; } });
$('#account').addEventListener('click', () => {
  if (state.token) { state.token = ''; state.user = null; syncPermissions(); $('#account').textContent = 'Sign in'; toast('Signed out of this workspace.'); }
  else if (state.preview) toast('Sign-in is available when MongoDB is connected.');
  else $('#authDialog').showModal();
});
$('#authSwitch').addEventListener('click', () => { state.signup = !state.signup; $('#nameLabel').hidden = !state.signup; $('#authForm').elements.name.required = state.signup; $('#authTitle').textContent = state.signup ? 'Create account' : 'Sign in'; $('#authForm [type="submit"]').textContent = state.signup ? 'Create account' : 'Sign in'; $('#authSwitch').textContent = state.signup ? 'Already have an account? Sign in' : 'Create an account'; $('#authError').textContent = ''; });
$('#authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget; const button = form.querySelector('[type="submit"]');
  button.disabled = true; $('#authError').textContent = '';
  const body = Object.fromEntries(new FormData(form));
  if (state.signup) body.confirmPassword = body.password; else delete body.name;
  try {
    const payload = await api(`/api/v1/auth/${state.signup ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(body) });
    state.token = payload.token; state.user = payload.data.user; syncPermissions();
    $('#account').textContent = 'Sign out'; form.reset(); $('#authDialog').close(); toast(`Welcome, ${state.user.name}.`);
  } catch (error) { $('#authError').textContent = error.message; }
  finally { button.disabled = false; }
});
syncPermissions();
loadMovies();
