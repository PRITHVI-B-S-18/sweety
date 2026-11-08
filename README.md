# Sweety – Blood Glucose Tracker

A small web app where a diabetes patient records up to 4 blood glucose readings a day and views daily, month-to-date and monthly reports.

**Stack:** Node.js + Express 5 API · PostgreSQL 16 · React 19 (Vite) · Jest + Supertest

## Features

- **Sign up and log in.** Passwords are hashed with bcrypt, sessions use JWT, and each user only ever sees their own readings.
- **Add, view, edit and delete readings.** Each reading has a date, one of four time slots (Morning (fasting), After breakfast, After lunch, After dinner) and a value in mg/dl. Every validation rule from the brief shows its exact message in the UI.
- **Reports.** Daily, month-to-date and previous-month reports show the highest, lowest and average reading (rounded to 1 decimal) and the number of readings. The daily report also lists each reading with its slot, and every report has a friendly empty state.
- **Seed script** that creates a demo user with two months of readings.
- **221 automated tests** covering validation, the API, ownership checks and report date ranges.
- **Bonus:** a monthly line chart on the reports page (Recharts), with one line per time slot for the month of the selected date.
- **Bonus:** `docker-compose.yml` starts PostgreSQL (and creates the test database) with one command.

## Screenshots

| | |
| --- | --- |
| **Readings**<br>![Readings list and add form](docs/screenshots/readings.png) | **Reports**<br>![Daily, month-to-date and last-month reports](docs/screenshots/reports.png) |
| **Validation message**<br>![Duplicate slot validation message](docs/screenshots/validation.png) | **Empty states**<br>![Reports empty states](docs/screenshots/reports-empty.png) |
| **Monthly chart**<br>![Monthly chart](docs/screenshots/chart.png) | **Log in**<br>![Log in](docs/screenshots/login.png) |
| **Register**<br>![Register](docs/screenshots/register.png) | |

## Prerequisites

- Node.js 20.19+ or 22.12+
- Docker Desktop (runs PostgreSQL), or a local PostgreSQL 14+

## Setup

```bash
# 1. Start PostgreSQL (creates the sweety and sweety_test databases)
docker compose up -d

# 2. API
cd server
cp .env.example .env
npm install
npm run migrate     # creates the tables
npm run seed        # demo user with two months of readings
npm run dev         # http://localhost:4000

# 3. Frontend (new terminal, from the project root)
cd client
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

Open http://localhost:5173 and log in with the demo account below, or register a new one.

## Demo login

| Email | Password |
| --- | --- |
| `demo@sweety.app` | `Demo@1234` |

`npm run seed` can be re-run at any time: it deletes the demo user (and its readings) and recreates it with readings for the whole previous month and the current month up to today. It refuses to run when `NODE_ENV=production`.

## Environment variables

### `server/.env`

The server exits at startup with a clear message if any required variable is missing, or if `APP_TIMEZONE` is not a valid time zone.

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `postgres://sweety:sweety@localhost:5432/sweety` | PostgreSQL connection |
| `JWT_SECRET` | yes | a long random string | Signs login tokens |
| `JWT_EXPIRES_IN` | yes | `1d` | Token lifetime |
| `APP_TIMEZONE` | yes | `Asia/Kolkata` | Decides what "today" is when rejecting future dates and building reports |
| `PORT` | no | `4000` | API port (defaults to 4000) |
| `CLIENT_ORIGIN` | no | `http://localhost:5173` | Allowed origin for CORS (defaults to the Vite dev server) |
| `TEST_DATABASE_URL` | tests only | `postgres://sweety:sweety@localhost:5432/sweety_test` | Database used by `npm test` |

### `client/.env`

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the API |

## Running tests

```bash
cd server
npm test
```

There are 221 tests in 7 files:

| File | Covers |
| --- | --- |
| `validation.test.js` | Registration and login validation (email, name, password rules, 72-byte limit) |
| `auth.test.js` | Register and login endpoints, duplicate emails, wrong passwords, no hash in responses |
| `reading.validation.test.js` | Reading rules: value, slot, real dates, future dates in `APP_TIMEZONE` |
| `readings.api.test.js` | Readings CRUD, the brief's messages, 4-per-day cap, ownership (404 for other users), ordering |
| `reportRanges.test.js` | Date ranges, including January → December and leap years |
| `reports.api.test.js` | Report numbers, rounding, empty states, isolation between users |
| `health.test.js` | Health check |

The API tests use the separate `sweety_test` database created by `docker compose up`, so they never touch your real data. `tests/helpers/db.js` reads `TEST_DATABASE_URL` from `.env`. The validation tests need no database.

Run one test process at a time: all tests share the `sweety_test` database and each test empties the tables, so two runs at once (for example `npm test` in two terminals, or a watcher plus a manual run) will make each other fail.

## Project structure

```
sweety/
├── docker-compose.yml          PostgreSQL 16 + test database
├── server/
│   ├── migrations/             SQL schema (tables and named constraints)
│   ├── scripts/seed.js         Demo user and readings
│   ├── src/
│   │   ├── server.js           Startup checks, then listen
│   │   ├── app.js              Express app (routes, 404, error handler)
│   │   ├── db/                 Connection pool and migration runner
│   │   ├── middleware/         requireAuth (JWT)
│   │   ├── routes/             auth, readings, reports
│   │   ├── services/           Report date ranges, shared SQL fragments
│   │   └── validation/         Input validation for auth and readings
│   └── tests/
└── client/
    └── src/
        ├── api.js              fetch wrapper (token, errors, 401 handling)
        ├── auth.jsx            Auth context and protected-route guard
        ├── pages/              Login, Register, Readings, Reports
        ├── components/         ReadingForm, ReadingsTable, ReportCard, ReadingsChart
        ├── chartData.js        Builds one chart row per day for the monthly chart
        ├── slots.js            Slot keys and labels (match the server)
        └── dates.js            Local-date helpers
```

## API

All `/readings` and `/reports` routes need the header `Authorization: Bearer <token>`. Errors are returned as `{ "error": "message" }`.

| Method and path | Body or query | Success | Errors |
| --- | --- | --- | --- |
| `POST /auth/register` | `{ name, email, password }` | 201 `{ user }` | 400 validation, 409 email already exists |
| `POST /auth/login` | `{ email, password }` | 200 `{ token, user }` | 400 missing fields, 401 wrong email or password |
| `GET /readings` | optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` | 200 array | 400 bad date or `from` after `to` |
| `POST /readings` | `{ date, slot, value }` | 201 reading | 400 validation, 409 slot already used that day |
| `PUT /readings/:id` | `{ date, slot, value }` | 200 reading | 400 validation, 404 not found, 409 slot taken |
| `DELETE /readings/:id` | none | 204 | 404 not found |
| `GET /reports/daily` | optional `?date=YYYY-MM-DD` (defaults to today) | 200 summary plus that day's readings | 400 bad or future date |
| `GET /reports/month-to-date` | optional `?date=YYYY-MM-DD` (defaults to today) | 200 summary, 1st of the month to `date` | 400 bad or future date |
| `GET /reports/monthly` | optional `?date=YYYY-MM-DD` (defaults to today) | 200 summary of the previous full calendar month | 400 bad or future date |
| `GET /health` | none | 200 `{ status: "ok" }` | – |

`slot` is one of `fasting` (Morning, fasting), `after_breakfast`, `after_lunch`, `after_dinner`. A reading looks like:

```json
{ "id": 7, "date": "2026-01-15", "slot": "after_lunch", "value": 120, "created_at": "2026-01-15T09:30:00.000Z" }
```

A report looks like this (`daily` also includes a `readings` array in the same shape as `GET /readings`). With no readings, `count` is 0 and the other three are `null`:

```json
{ "type": "monthly", "from": "2026-09-01", "to": "2026-09-30",
  "count": 2, "highest": 160, "lowest": 130, "average": 145 }
```

## Notes

### Design decisions

**The "4 readings per day" rule is enforced by the database.**
`readings` has `CHECK (slot IN ('fasting', 'after_breakfast', 'after_lunch', 'after_dinner'))` and `UNIQUE (user_id, reading_date, slot)`. Each user can therefore have at most one row per slot per day, and there are only 4 slots, so a fifth reading for the same day cannot exist. This also holds when two requests arrive at the same moment, which an application-level "count the rows first" check would not guarantee.

For that reason the message "You can add only 4 readings per day." can never be triggered. When a day is full, a repeated slot returns 409 with the more specific "You already have an After lunch reading for this date.", and an unknown slot returns 400. The test "caps a day at 4 readings" covers this.

Validation reports one error at a time, in this order: value, then date, then time slot. An empty form therefore shows "Please enter a glucose value." first.

**Other rules**
- A reading's date is returned as a plain `YYYY-MM-DD` string (`to_char` in SQL), so it cannot shift to the previous day through a JavaScript `Date` and UTC.
- Report numbers are calculated in SQL (`MAX`, `MIN`, `ROUND(AVG(...), 1)`, `COUNT`) and cast so the API returns numbers, not the strings `pg` uses for `numeric` and `bigint`.
- Slots are stored as keys; the UI shows the friendly labels. Lists are ordered newest date first, then by time of day, not alphabetically.
- Emails are trimmed and lower-cased, and the database rejects mixed-case emails as a safety net.
- Passwords are hashed with bcrypt (cost 10), never trimmed or changed, and limited to 72 bytes (bcrypt ignores anything beyond that).
- JWTs are verified with the algorithm pinned to HS256. On an expired or invalid token the frontend logs the user out and returns to the login page.
- Another user's reading returns 404, the same as a missing one, so ids can't be probed.
- Every constraint is named, and the API matches on the constraint name (for example `readings_one_per_slot`) so an unrelated unique violation is never mislabelled.
- No separate index is needed on `readings`: the unique constraint already creates one starting with `(user_id, reading_date)`, which serves "this user's readings between two dates".
- The reading form uses `noValidate` and has no `min`, `max` or `required` on the value, so the browser never blocks a submit and the user always sees the brief's own messages from the server.

### Assumptions
- The brief says "MERN + PostgreSQL". This project uses PostgreSQL as the database, so MongoDB is not used.
- Glucose values are whole numbers from 40 to 600 mg/dl. Digit-only strings such as `"120"` are accepted and stored as numbers.
- Decimal values (e.g. 40.6) are rejected with the brief's message "Value must be between 40 and 600 mg/dl.", because the rule is "a whole number between 40 and 600". The form shows a "Whole number from 40 to 600" hint so this is clear in advance.
- Reading dates run from 2000-01-01 to today, where "today" is judged in `APP_TIMEZONE`.
- The date in the add-reading form defaults to "today" in the browser's time zone, while the server decides what counts as a future date using `APP_TIMEZONE`. For users in one time zone (India, in this case) they agree. Anyone in a different zone could be told "Date cannot be in the future." for a few hours around midnight.
- "Monthly" means the previous full calendar month relative to the given date (for 15 October, all of September). Averages are rounded to one decimal place in SQL, and a half rounds up (116.25 becomes 116.3).
- Password rules: at least 8 characters with an uppercase letter, a lowercase letter and a number. The letter checks are ASCII-only.
- Deleting a user deletes their readings (`ON DELETE CASCADE`).

### What I'd improve with more time
- Pagination on `GET /readings` (optional bonus task), for users with many months of readings.
- Frontend tests with React Testing Library for the reading form.
- Rate limiting on `POST /auth/login` (for example `express-rate-limit`).
- Check `JWT_SECRET` strength at startup, and add token refresh or revocation.
- Accept non-ASCII letters in the password rules.
- Give each test run its own database schema (for example one per process) so test files can run in parallel without sharing tables.

### Tools used
- I used an AI assistant (Claude) for project setup, code review, help writing the test suites and drafting this README. The database design, API, validation and frontend logic are my own, and I can walk through any part of the code.
