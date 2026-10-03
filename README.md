# CineIndex

CineIndex is a movie catalogue and management application. Browse movie records,
filter the collection, compare ratings, and inspect film details. Administrators
can add, edit, and delete movies through the interface or REST API.

The application uses Node.js, Express, MongoDB, and Mongoose. Express serves both
the responsive browser interface and the API, so they run as one application.

[Open CineIndex](https://cineindex-rb7s.onrender.com).

## Contents

- [Using CineIndex](#using-cineindex)
- [Accounts and Permissions](#accounts-and-permissions)
- [Local Setup](#local-setup)
- [Configuration](#configuration)
- [Sample Preview and Data](#sample-preview-and-data)
- [Movie Records](#movie-records)
- [API Reference](#api-reference)
- [Response Formats](#response-formats)
- [Commands and Tests](#commands-and-tests)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Using CineIndex

Sign in or create an account to view the movie catalogue. The catalogue and all
movie API routes require authentication. Each record shows its poster, title,
release year, duration, genres, rating, and price.

| Action | Workflow |
| --- | --- |
| Browse | Use the previous and next page controls; choose 6, 12, or 24 records per page. |
| Filter | Choose a genre and/or minimum rating, then select **Apply filters**. |
| Sort | Choose highest rated, newest releases, title A to Z, or ascending/descending price, then apply. |
| Reset | Use the reset button beside the filters to restore the default selection. |
| Inspect | Select **View record** to see the synopsis, cast, directors, and other details. |
| Inspect JSON | Expand **API response** inside the record dialog. |
| Register | On the sign-in screen, select **Create an account**. Enter your name, email, and password. |
| Add a movie | As an administrator, select **Add movie**, complete the form, and save. |
| Edit a movie | As an administrator, open its record, select **Edit movie**, and save your changes. |
| Delete a movie | As an administrator, open its record, select **Delete movie**, and confirm. |

Movie forms show server validation errors without closing the dialog. Failed
catalogue requests display a connection message; filters with no matches display
an empty state. Ratings use a 1-10 scale. Legacy scores outside that range display
**Needs review** rather than a fabricated replacement score.

Poster images are served locally for the included catalogue artwork. Custom
records may use an HTTPS image URL. Missing or unavailable images display a
title-based fallback. Artwork attribution is in
[public/images/ATTRIBUTION.md](public/images/ATTRIBUTION.md).

The displayed price is record metadata. The application does not provide checkout,
payment processing, or movie playback.

## Accounts and Permissions

| Role | Permissions |
| --- | --- |
| Visitor | Register or sign in; cannot access the catalogue or movie API. |
| Registered user | Browse, filter, sort, paginate, view records, and use authenticated account endpoints. |
| Administrator | All user permissions, plus movie creation, editing, deletion, and user listing. |

Public registration always creates a `user` account. Supplying an `admin` role
in a signup request does not grant administrator access. Movie write permissions
are enforced by the API independently of whether a button is visible.

### Create an Administrator

1. Register through the app or the signup API.
2. Open the relevant database in MongoDB Atlas's **Browse Collections** view.
3. Find your account by email in the `users` collection.
4. Change that account's `role` from `user` to `admin`.
5. Sign out and sign back in to refresh the interface permissions.

Only someone with authorized database access should assign administrator roles.
There is no public role-assignment endpoint.

The browser keeps its bearer token in memory. Refreshing the page returns to
the sign-in screen. Signing out clears movie records from the interface and returns
to that screen. Workspace sign-out clears
the browser's token; it does not revoke an already issued token on the server.
Protected API requests require an `Authorization: Bearer <token>` header.

## Local Setup

### Requirements

- Node.js 24.x and npm.
- A MongoDB database, either a local instance or MongoDB Atlas.
- For Atlas, a database user and network access allowing your connecting IP.

Clone and install:

```bash
git clone https://github.com/Francis1104Ol/Backend_project1.git
cd Backend_project1
npm ci
```

Create `config.env` from the supplied template. On macOS/Linux:

```bash
cp config.example.env config.env
```

On Windows PowerShell:

```powershell
Copy-Item config.example.env config.env
```

Set `CONN_STR` to your database connection string and replace `SECRET_STR` with
a strong random secret. Do not commit this file or share its contents publicly.
The `config.env` file is ignored by Git.

Start the app from the repository root:

```bash
npm run dev
```

Open **http://localhost:1000**, or the port configured in `PORT`. The server
connects to MongoDB before accepting requests. Development mode watches for
source changes and provides detailed error responses.

## Configuration

Settings can come from `config.env` or the process environment. Existing process
environment variables take precedence over the local file.

| Variable | Purpose | Default / Requirement |
| --- | --- | --- |
| `CONN_STR` | MongoDB connection URI, including the database name. | Required. |
| `SECRET_STR` | Secret used to sign and verify JWTs. | Required; use a strong random value. |
| `NODE_ENV` | Selects development logging/errors or production behaviour. | Template uses `development`; use `production` when hosting. |
| `PORT` | HTTP listening port. | `1000`; hosting platforms can supply another port. |
| `LOGIN_EXPIRES` | JWT lifetime, such as `90d`. | `90d`. |
| `COOKIES_EXPIRES` | JWT cookie lifetime in days. | `90`. |
| `TRUST_PROXY_HOPS` | Number of trusted reverse-proxy hops for client IP handling. | `0`; Render configuration uses `1`. |
| `EMAIL_HOST` | SMTP server for password-reset emails. | Required only for email-based recovery. |
| `EMAIL_PORT` | SMTP port. | Set according to the SMTP provider. |
| `EMAIL_USER` | SMTP account username. | Required for authenticated SMTP. |
| `EMAIL_PASSWORD` | SMTP account password. | Required for authenticated SMTP. |

Email recovery is an API feature; the interface does not currently include a
forgot-password form. SMTP settings are not included in the example file or Render
Blueprint. The mail helper currently uses a fixed sender identity in
`Utils/email.js`; configure an authorized sender there before enabling recovery.

## Sample Preview and Data

### Preview Without MongoDB

```bash
npm run preview
```

Open **http://127.0.0.1:3100**. This separate, read-only server uses the three
records in `data/movies.json`, supports catalogue browsing and detail views, and
labels the collection as a sample preview. It does not support authentication or
database changes. Use `npm run dev` or `npm start` for the actual application.

### Seed a Database

To insert the three sample movies into the configured database:

```bash
npm run seed:import
```

Import adds records; it does not reset the collection. Movie titles are unique,
so importing an existing sample again can produce a duplicate-title error.

`npm run seed:delete` deletes **every movie in the configured database**. Use it
only when you intend to clear that collection. Do not run it against a populated
database merely to try the interface.

## Movie Records

| Field | Type | Rules / Meaning |
| --- | --- | --- |
| `name` | String | Required, unique, trimmed; 2-100 characters. |
| `description` | String | Required synopsis. |
| `duration` | Number | Required; at least 1 minute. |
| `ratings` | Number | Between 1 and 10 when supplied; defaults to 1. |
| `totalRating` | Number | Non-negative rating count; defaults to 0. |
| `releaseYear` | Number | Required; at least 1888. |
| `releaseDate` | Date | Optional release date. |
| `genres` | String array | Genre labels; comma-separated in the interface. |
| `directors` | String array | Director names; comma-separated in the interface. |
| `actors` | String array | Cast names; comma-separated in the interface. |
| `coverImage` | String | Required image filename or HTTPS URL. |
| `price` | Number | Required; zero or greater. |
| `durationInHours` | Number | Computed response field derived from duration; not a stored filter field. |

The management form requires genres, directors, and cast entries. The schema also
declares these arrays required, but does not enforce a minimum array length.

## API Reference

Base path: `/api/v1`. Request bodies use JSON. All movie routes require a bearer
token returned by signup or login; writing also requires the admin role.

### Movies and Service Information

| Method | Endpoint | Access | Behaviour |
| --- | --- | --- | --- |
| GET | `/health` | Public | Reports that the HTTP service is running. |
| GET | `/api/v1` | Public | Returns the API index. |
| GET | `/api/v1/movies` | Signed-in user | Lists movies with query controls. |
| GET | `/api/v1/movies/:id` | Signed-in user | Retrieves one movie by MongoDB ID. |
| GET | `/api/v1/movies/highest-rated` | Signed-in user | Lists up to five movies ordered by rating. |
| GET | `/api/v1/movies/movies-stats` | Signed-in user | Groups qualifying movies by release year with rating and price statistics. |
| GET | `/api/v1/movies/movies-by-genre/:genre` | Signed-in user | Returns the count and titles for a genre. |
| POST | `/api/v1/movies` | Admin | Creates a movie; returns 201. |
| PATCH | `/api/v1/movies/:id` | Admin | Updates supplied movie fields with validation. |
| DELETE | `/api/v1/movies/:id` | Admin | Deletes a movie; returns 204 with no response body. |

Aggregation routes include only records with `releaseDate` on or before the
current date. The statistics route additionally requires `ratings >= 4.5`.

### Filtering, Sorting, and Pagination

| Parameter | Example | Behaviour |
| --- | --- | --- |
| Field equality | `genres=Sci-Fi` | Exact match on a supported movie field; genre matching is case-sensitive. |
| Comparison | `ratings[gte]=4.5` | Supports `gt`, `gte`, `lt`, and `lte`; raw MongoDB operators are rejected. |
| `sort` | `sort=-ratings,price` | Comma-separated fields; prefix with `-` for descending order. Default: newest creation first. |
| `fields` | `fields=name,ratings,releaseYear` | Selects response fields; default responses omit `__v`. |
| `page` | `page=2` | Positive whole number; defaults to 1. |
| `limit` | `limit=6` | Positive whole number; defaults to 10 and is capped at 100. |

Supported equality fields include `name`, `description`, `duration`, `ratings`,
`totalRating`, `releaseYear`, `releaseDate`, `createdAt`, `genres`, `directors`,
`actors`, `price`, `createdBy`, `coverImage`, and `_id`.

Example list request (`-g` prevents curl from treating brackets as URL globbing):

```bash
curl -g 'http://localhost:1000/api/v1/movies?ratings[gte]=4.5&sort=-ratings&page=1&limit=6' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Authentication and Account Routes

| Method | Endpoint | Access | JSON Body / Behaviour |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/signup` | Public | `name`, `email`, `password`, `confirmPassword`; password must have at least 8 characters. |
| POST | `/api/v1/auth/login` | Public | `email`, `password`; returns a JWT and user record. |
| POST | `/api/v1/auth/forgotPassword` | Public | `email`; sends a reset token if SMTP is configured. |
| PATCH | `/api/v1/auth/resetPassword/:token` | Public, valid reset token | `password`, `confirmPassword`; reset tokens expire after 10 minutes. |
| GET | `/api/v1/users` | Admin | Lists active users. |
| PATCH | `/api/v1/users/updateMe` | Signed-in user | Changes `name` and/or `email`; ignores role changes. |
| PATCH | `/api/v1/users/updatePassword` | Signed-in user | `currentPassword`, `password`, `confirmPassword`; returns a new JWT. |
| DELETE | `/api/v1/users/deleteMe` | Signed-in user | Deactivates the requesting account; returns 204. |

Example login body:

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

Example administrator movie creation (replace the placeholder with your token):

```bash
curl -X POST http://localhost:1000/api/v1/movies \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Arrival","description":"A linguist attempts to communicate with alien visitors.","duration":116,"ratings":8,"releaseYear":2016,"releaseDate":"2016-11-11","genres":["Sci-Fi","Drama"],"directors":["Denis Villeneuve"],"actors":["Amy Adams","Jeremy Renner"],"coverImage":"arrival.jpg","price":11.99}'
```

Shell examples use Bash quoting. On Windows, run them in a Bash-compatible shell,
use an API client, or adapt the quoting to PowerShell. An unknown local poster
filename uses the interface fallback; provide an HTTPS URL for custom artwork.

## Response Formats

Movie list responses include pagination totals and the current page's records:

```json
{
  "status": "success",
  "results": 1,
  "pagination": { "page": 1, "limit": 6, "total": 1, "pages": 1 },
  "data": { "movies": [{ "name": "Arrival", "ratings": 8 }] }
}
```

This abbreviated example omits other movie fields. Single-record create, read,
and update responses use `data.movie`. Authentication responses include `token`
and `data.user`.

| Status | Meaning |
| --- | --- |
| 200 | Successful read, update, or login. |
| 201 | Movie or account created. |
| 204 | Successful deletion/deactivation; no JSON body. |
| 400 | Invalid input, duplicate value, malformed ID, or invalid credentials. |
| 401 | Missing, invalid, or expired authentication token. |
| 403 | Signed-in account lacks the required role. |
| 404 | Record or route not found. |
| 429 | Request limit reached. |
| 500 | Unexpected error or a failed supporting service such as email delivery. |

Production error responses contain `status` and `message`. Development mode
also returns debugging details. API traffic is limited to 100 requests per IP
per hour. Helmet sets security headers; JSON bodies are limited to 10 KB.

## Commands and Tests

| Command | Purpose |
| --- | --- |
| `npm start` | Starts the application using the configured environment. |
| `npm run dev` | Starts in development mode with source watching. |
| `npm run start:prod` | Starts with `NODE_ENV=production`. |
| `npm run preview` | Starts the read-only sample preview on port 3100. |
| `npm run seed:import` | Inserts sample movies into the configured database. |
| `npm run seed:delete` | Deletes all movies in that database. |
| `npm test` | Runs database-independent automated tests. |

Automated tests cover movie validation, safe filter handling, pagination, and
rating labels. GitHub Actions runs them on pushes and pull requests.

Optional browser checks require Playwright and its Chromium browser:

```bash
npm install --no-save playwright
npx playwright install chromium
```

With the actual app running, run `node scripts/frontend-check.cjs`. This
checks the sign-in gate, signup/login, filters, empty states, pagination, dialogs,
sign-out, expiry, and role-dependent controls. API flows use mocked responses and
do not modify a database.

Run `node scripts/visual-check.cjs` to check the signed-out screen and desktop/mobile
layout. It defaults to `http://127.0.0.1:1000`; set `CINEINDEX_URL` to use another
address. When pointed to the read-only sample preview, it instead checks catalogue
artwork and details. The sample preview remains separate from the protected app.

For database integration checks, run `node scripts/live-check.cjs` against the
local app configured by `config.env`. It tests signup/login, validation, and
ordinary-user/admin write permissions using uniquely named temporary records,
then removes those records. It requires direct database access to temporarily
assign the test account an admin role. Use a development database for routine
integration testing. Generated screenshots are ignored by Git.

## Project Structure

```text
Controllers/       HTTP handlers for movies, authentication, users, and errors
Models/            Mongoose movie and user schemas
Routes/            API endpoints and permission middleware
Utils/             Query features, tokens, email, and error helpers
public/            HTML, CSS, browser JavaScript, and poster assets
data/              Sample movie records and import/delete script
test/              Automated unit tests
scripts/           Optional browser and live integration checks
app.js             Express middleware, static serving, and route registration
server.js          Environment loading, database connection, and server lifecycle
preview.js         Separate read-only sample server
render.yaml        Render service configuration
Dockerfile         Container definition
```

## Deployment

The interface and API deploy as a single Node.js service. Install with `npm ci`
and start with `npm start`; there is no separate frontend build step. Set
`NODE_ENV=production`, `CONN_STR`, and `SECRET_STR` in the host's environment.
The service binds to `0.0.0.0`, accepts the host's `PORT`, and exposes `/health`.

### Render

Use the included `render.yaml` with
[Deploy on Render](https://render.com/deploy?repo=https://github.com/Francis1104Ol/Backend_project1).
The Blueprint selects a free Node service, prompts privately for `CONN_STR`, and
generates `SECRET_STR`. Add the service's outbound IP addresses to Atlas network
access. See [Render's Blueprint reference](https://render.com/docs/blueprint-spec).

For other reverse-proxy hosts, set `TRUST_PROXY_HOPS` to the number of trusted hops
in the deployment. Leave it unset for direct connections. Keep credentials out of
the repository and do not upload `config.env`.

### Docker

```bash
docker build -t cineindex .
docker run --rm -p 8080:8080 --env-file config.env -e NODE_ENV=production -e PORT=8080 cineindex
```

The container uses Node.js 24, runs as a non-root user, and defaults to port 8080.
The Docker image has not been built or run as part of the local verification.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Database connection fails | Check `CONN_STR`, the database user's credentials, cluster availability, and Atlas network access for the connecting machine or hosting service. |
| Server exits before starting | Ensure both `CONN_STR` and `SECRET_STR` are present; run commands from the repository root. |
| Changes are unavailable in the preview | Port 3100 is read-only. Use the actual app and sign in as an admin. |
| Add/edit/delete is unavailable | Public signup creates regular users. Assign `admin` privately in the database and sign in again. |
| Signed out after refresh | Browser tokens are stored in memory. Sign in again. |
| Poster is missing | Check the HTTPS URL or supported local artwork filename; unavailable artwork uses a fallback. |
| Rating shows Needs review | Correct the stored rating to a value between 1 and 10. |
| Empty filter results | Reset filters, lower the minimum rating, or check the genre's exact spelling/case. |
| Seed import reports duplicates | Sample titles already exist. Inspect the collection before importing again. |
| Password-reset email fails | Configure SMTP and an authorized sender in `Utils/email.js`; this flow is not exposed in the browser interface. |
| API returns 429 | The IP's hourly request limit has been reached. Wait before retrying. |

## License

The package declares the ISC license. Movie posters remain the property of their
respective rights holders; see the artwork attribution file.
