## CineIndex API

CineIndex API is a backend-focused portfolio project built with **Node.js**, **Express**, **MongoDB**, and **Mongoose**. It demonstrates clean REST API structure, data modeling, validation, centralized error handling, query features, JWT authentication, and a small API explorer that makes the backend behavior easy to review.

The frontend is intentionally restrained: it is an API explorer for browsing movies, filtering/sorting, paginating, inspecting details, and exercising authenticated create/update/delete flows. The backend remains the main story.

### Features

- RESTful movie CRUD endpoints
- Public read endpoints with filtering, sorting, field limiting, and pagination
- JWT signup/login and admin-only create, edit, and delete routes
- Mongoose schema validation and virtual fields
- Centralized async and global error handling
- Rate limiting, Helmet security headers, and HTTP parameter pollution protection
- Seed script for sample movie data
- Static API explorer served from Express
- Node test runner coverage for model validation and query utilities

### Tech Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens
- dotenv
- node:test

### Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp config.example.env config.env
```

Update `config.env` with your MongoDB connection string and JWT secret, then start the API:

```bash
npm run dev
```

Open the API explorer:

```text
http://localhost:1000
```

### Useful Scripts

For a design preview without MongoDB, run `npm run preview` and open
`http://127.0.0.1:3100`. This separate, read-only server uses the three seed
records and labels the collection as a sample preview. Sign-in and writes are
available on the real API started with `npm run dev`.

The catalogue includes poster artwork, genre and rating filters, sorting,
page-size controls, movie details with an expandable JSON response, account
creation and sign-in, and administrator-only creation, editing, and deletion with confirmation.
Tokens are kept in memory and cleared on refresh or workspace sign-out.
Seed poster artwork is included locally from TMDB; unavailable artwork has a fallback.
Custom movies can use an HTTPS poster URL.

Optional browser checks use Playwright: install it separately with
`npm install --no-save playwright`, run the preview, then run
`node scripts/frontend-check.cjs`. Checks use explicit test responses for writes
and do not modify a database. Desktop/mobile screenshots are ignored by Git.

```bash
npm start
npm run dev
npm run start:prod
npm run seed:import
npm run seed:delete
npm test
```

### API Endpoints

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service health check |
| GET | `/api/v1` | Public | API index |
| GET | `/api/v1/movies` | Public | List movies with filters, sorting, fields, and pagination |
| GET | `/api/v1/movies/:id` | Public | Get one movie |
| GET | `/api/v1/movies/highest-rated` | Public | Top five highest-rated movies |
| GET | `/api/v1/movies/movies-stats` | Public | Aggregated rating and pricing stats |
| GET | `/api/v1/movies/movies-by-genre/:genre` | Public | Aggregated movies by genre |
| POST | `/api/v1/movies` | Admin | Create a movie |
| PATCH | `/api/v1/movies/:id` | Admin | Update a movie |
| DELETE | `/api/v1/movies/:id` | Admin | Delete a movie |
| POST | `/api/v1/auth/signup` | Public | Create an account and receive a JWT |
| POST | `/api/v1/auth/login` | Public | Log in and receive a JWT |

### Query Examples

```text
GET /api/v1/movies?ratings[gte]=4.5&sort=-ratings&page=1&limit=6
GET /api/v1/movies?genres=Sci-Fi&fields=name,ratings,releaseYear
```

### Deployment

For Render, use the included `render.yaml` Blueprint:
[Deploy CineIndex](https://render.com/deploy?repo=https://github.com/Francis1104Ol/Backend_project1).
Sign in, connect the repository, and enter `CONN_STR` privately when prompted.
The Blueprint selects the free Node service and generates `SECRET_STR`.
In Render's service settings, find its outbound IP addresses and add those to
your Atlas network access list. Wait for a successful deployment, then check
the service URL and `/health` before adding it to the portfolio.
See [Render's Blueprint reference](https://render.com/docs/blueprint-spec).

The frontend and API run together as one Node.js service. Use Node.js 24,
`npm ci` to install, and `npm start` to run. There is no frontend build step.
Set `NODE_ENV=production`, `CONN_STR`, and a strong `SECRET_STR` in your host's
environment settings. The service accepts the host's `PORT` variable and binds
to `0.0.0.0`. Use `/health` for the health-check path.

For a host with one trusted reverse proxy, set `TRUST_PROXY_HOPS=1` so rate
limiting uses the visitor's IP. Leave it unset for a direct connection; configure
the correct hop count for your host. Allow the hosting service's outbound IPs in
MongoDB Atlas. Do not upload `config.env` or paste credentials into GitHub.

A Dockerfile is included for container hosts; build with `docker build -t cineindex .`
and pass secrets as runtime environment variables. The container defaults to port
8080 and runs as a non-root user. Container execution has not been verified locally.

Public signup always creates a regular user. To grant administrator access,
find your account in Atlas's `users` collection and change only its `role` to
`admin`, then sign in again. Only administrators can add, edit, or delete movies.
The API enforces these permissions independently of the interface.

GitHub Actions runs the unit tests on pushes and pull requests. For optional live
checks, run `node scripts/live-check.cjs` against your local configured API;
it creates uniquely named temporary records and removes them afterward.

### Repository Hygiene

`node_modules` is intentionally ignored and should not be committed. Use `npm install` to restore dependencies locally.
