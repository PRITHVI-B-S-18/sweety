# Sweety – Blood Glucose Tracker

A small web app where a diabetes patient records up to 4 blood glucose readings a day and views daily, month-to-date and monthly reports.

**Stack:** Node.js + Express API · PostgreSQL · React (Vite)

## Prerequisites

- Node.js 20+
- Docker Desktop (runs PostgreSQL), or a local PostgreSQL 14+

## Setup

```bash
# 1. Start PostgreSQL (creates the sweety and sweety_test databases)
docker compose up -d

# 2. API
cd server
cp .env.example .env
npm install
npm run migrate
npm run dev         # http://localhost:4000

# 3. Frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

### Environment variables (`server/.env`)

The server exits at startup with a clear message if any required variable is missing, or if `APP_TIMEZONE` is not a valid time zone.

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `postgres://user:pass@localhost:5432/sweety` | PostgreSQL connection |
| `JWT_SECRET` | yes | a long random string | Signs login tokens |
| `JWT_EXPIRES_IN` | yes | `1d` | Token lifetime |
| `APP_TIMEZONE` | yes | `Asia/Kolkata` | Decides what "today" is when rejecting future dates |
| `PORT` | no | `4000` | API port (defaults to 4000) |
| `TEST_DATABASE_URL` | tests only | `postgres://user:pass@localhost:5432/sweety_test` | Database used by `npm test` |

## Running tests

```bash
cd server
npm test
```

The API tests use the separate `sweety_test` database created by `docker compose up`, so they never touch your real data. `tests/helpers/db.js` reads `TEST_DATABASE_URL` from `.env`. The validation tests need no database.

Run one test process at a time: all tests share the `sweety_test` database and each test empties the tables, so two runs at once (for example `npm test` in two terminals, or a watcher plus a manual run) will make each other fail.

## API

All `/readings` routes need the header `Authorization: Bearer <token>`. Errors are returned as `{ "error": "message" }`.

| Method and path | Body or query | Success | Errors |
| --- | --- | --- | --- |
| `POST /auth/register` | `{ name, email, password }` | 201 `{ user }` | 400 validation, 409 email already exists |
| `POST /auth/login` | `{ email, password }` | 200 `{ token, user }` | 400 missing fields, 401 wrong email or password |
| `GET /readings` | optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` | 200 array | 400 bad date or `from` after `to` |
| `POST /readings` | `{ date, slot, value }` | 201 reading | 400 validation, 409 slot already used that day |
| `PUT /readings/:id` | `{ date, slot, value }` | 200 reading | 400 validation, 404 not found, 409 slot taken |
| `DELETE /readings/:id` | none | 204 | 404 not found |

`slot` is one of `fasting` (Morning, fasting), `after_breakfast`, `after_lunch`, `after_dinner`. A reading looks like:

```json
{ "id": 7, "date": "2026-01-15", "slot": "after_lunch", "value": 120, "created_at": "2026-01-15T09:30:00.000Z" }
```

## Notes

### Design decisions

**The "4 readings per day" rule is enforced by the database.**
`readings` has `CHECK (slot IN ('fasting', 'after_breakfast', 'after_lunch', 'after_dinner'))` and `UNIQUE (user_id, reading_date, slot)`. Each user can therefore have at most one row per slot per day, and there are only 4 slots, so a fifth reading for the same day cannot exist. This also holds when two requests arrive at the same moment, which an application-level "count the rows first" check would not guarantee.

For that reason the message "You can add only 4 readings per day." can never be triggered.
When a day is full, a repeated slot returns 409 with the more specific
"You already have an After lunch reading for this date.", and an unknown slot returns 400.
The test "caps a day at 4 readings" covers this.

**Other rules**
- A reading's date is returned as a plain `YYYY-MM-DD` string (`to_char` in SQL), so it cannot shift to the previous day through a JavaScript `Date` and UTC.
- Slots are stored as keys; the UI shows the friendly labels. Lists are ordered newest date first, then by time of day, not alphabetically.
- Emails are trimmed and lower-cased, and the database rejects mixed-case emails as a safety net.
- Passwords are hashed with bcrypt (cost 10), never trimmed or changed, and limited to 72 bytes (bcrypt ignores anything beyond that).
- JWTs are verified with the algorithm pinned to HS256.
- Another user's reading returns 404, the same as a missing one, so ids can't be probed.
- Every constraint is named, and the API matches on the constraint name (for example `readings_one_per_slot`) so an unrelated unique violation is never mislabelled.
- No separate index is needed on `readings`: the unique constraint already creates one starting with `(user_id, reading_date)`, which serves "this user's readings between two dates".

### Assumptions
- Glucose values are whole numbers from 40 to 600 mg/dl. Digit-only strings such as `"120"` are accepted and stored as numbers.
- Reading dates run from 2000-01-01 to today, where "today" is judged in `APP_TIMEZONE`.
- Password rules: at least 8 characters with an uppercase letter, a lowercase letter and a number. The letter checks are ASCII-only.
- Deleting a user deletes their readings (`ON DELETE CASCADE`).

### What I'd improve with more time
- Rate limiting on `POST /auth/login` (for example `express-rate-limit`).
- Check `JWT_SECRET` strength at startup, and add token refresh or revocation.
- Accept non-ASCII letters in the password rules.
- Give each test run its own database schema (for example one per process) so test files can run in parallel without sharing tables.