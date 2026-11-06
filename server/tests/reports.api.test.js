const { setupTestDb, resetTables, closeDb } = require('./helpers/db');
const request = require('supertest');
const { createApp } = require('../src/app');
const { todayIn } = require('../src/validation/readings');

const app = createApp();

beforeAll(setupTestDb);
beforeEach(resetTables);
afterAll(closeDb);

const signUp = async (email) => {
  await request(app)
    .post('/auth/register')
    .send({ name: 'Test User', email, password: 'Abcdefg1' });
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password: 'Abcdefg1' });
  return res.body.token;
};

const authed = (token) => ({ Authorization: `Bearer ${token}` });

const seed = async (token, rows) => {
  for (const [date, slot, value] of rows) {
    const res = await request(app)
      .post('/readings')
      .set(authed(token))
      .send({ date, slot, value });
    expect(res.status).toBe(201);
  }
};

const report = (token, type, date) =>
  request(app)
    .get(`/reports/${type}`)
    .set(authed(token))
    .query(date === undefined ? {} : { date });

const SEPTEMBER_OCTOBER = [
  ['2026-10-15', 'fasting', 100],
  ['2026-10-15', 'after_breakfast', 140],
  ['2026-10-15', 'after_lunch', 120],
  ['2026-10-15', 'after_dinner', 110],
  ['2026-10-10', 'fasting', 90],
  ['2026-10-01', 'fasting', 50],
  ['2026-10-16', 'fasting', 300],
  ['2026-09-30', 'fasting', 130],
  ['2026-09-01', 'after_dinner', 160],
  ['2026-08-31', 'fasting', 500],
];

describe('authentication and routing', () => {
  it.each(['daily', 'month-to-date', 'monthly'])(
    'GET /reports/%s returns 401 without a token',
    async (type) => {
      const res = await request(app).get(`/reports/${type}`);
      expect(res.status).toBe(401);
    },
  );

  it.each(['weekly', 'constructor', '__proto__', 'toString'])(
    'returns 404 for the unknown report type %s',
    async (type) => {
      const token = await signUp('a@example.com');
      const res = await report(token, type, '2026-10-15');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Report not found.');
    },
  );
});

describe('date validation', () => {
  it.each([
    ['an impossible date', '2026-02-30', 'Please enter a valid date.'],
    ['text', 'abc', 'Please enter a valid date.'],
    ['a future date', '2999-01-01', 'Date cannot be in the future.'],
    ['an empty date', '', 'Please enter a date.'],
    ['a date before 2000', '1999-12-31', 'Please enter a valid date.'],
  ])('returns 400 for %s', async (_label, date, message) => {
    const token = await signUp('a@example.com');
    const res = await report(token, 'daily', date);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it('returns 400 for a repeated date parameter instead of crashing', async () => {
    const token = await signUp('a@example.com');
    const res = await request(app)
      .get('/reports/daily?date=2026-01-01&date=2026-01-02')
      .set(authed(token));

    expect(res.status).toBe(400);
  });
});

describe('GET /reports/daily', () => {
  it('summarises the day and lists its readings in time-of-day order', async () => {
    const token = await signUp('a@example.com');
    await seed(token, SEPTEMBER_OCTOBER);

    const res = await report(token, 'daily', '2026-10-15');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: 'daily',
      from: '2026-10-15',
      to: '2026-10-15',
      count: 4,
      highest: 140,
      lowest: 100,
      average: 117.5,
    });
    expect(res.body.readings.map((r) => r.slot)).toEqual([
      'fasting',
      'after_breakfast',
      'after_lunch',
      'after_dinner',
    ]);
    expect(res.body.readings[0]).toEqual({
      id: expect.any(Number),
      date: '2026-10-15',
      slot: 'fasting',
      value: 100,
      created_at: expect.any(String),
    });
  });

  it('returns numbers, not strings', async () => {
    const token = await signUp('a@example.com');
    await seed(token, SEPTEMBER_OCTOBER);

    const { body } = await report(token, 'daily', '2026-10-15');

    expect(typeof body.count).toBe('number');
    expect(typeof body.highest).toBe('number');
    expect(typeof body.lowest).toBe('number');
    expect(typeof body.average).toBe('number');
  });

  it('returns the empty state for a day with no readings', async () => {
    const token = await signUp('a@example.com');
    const res = await report(token, 'daily', '2026-10-20');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      type: 'daily',
      from: '2026-10-20',
      to: '2026-10-20',
      count: 0,
      highest: null,
      lowest: null,
      average: null,
      readings: [],
    });
  });

  it('defaults to today when no date is given', async () => {
    const token = await signUp('a@example.com');
    const today = todayIn(process.env.APP_TIMEZONE);
    await seed(token, [[today, 'fasting', 105]]);

    const res = await report(token, 'daily');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      from: today,
      to: today,
      count: 1,
      highest: 105,
    });
  });
});

describe('GET /reports/month-to-date', () => {
  it('covers the 1st of the month up to the given date', async () => {
    const token = await signUp('a@example.com');
    await seed(token, SEPTEMBER_OCTOBER);

    const res = await report(token, 'month-to-date', '2026-10-15');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      type: 'month-to-date',
      from: '2026-10-01',
      to: '2026-10-15',
      count: 6,
      highest: 140,
      lowest: 50,
      average: 101.7,
    });
  });

  it('has no readings list', async () => {
    const token = await signUp('a@example.com');
    const res = await report(token, 'month-to-date', '2026-10-15');

    expect(res.body.readings).toBeUndefined();
  });

  it('includes readings on the 1st and on the given day, excludes later ones', async () => {
    const token = await signUp('a@example.com');
    await seed(token, SEPTEMBER_OCTOBER);

    const onFirst = await report(token, 'month-to-date', '2026-10-01');
    expect(onFirst.body).toMatchObject({
      count: 1,
      highest: 50,
      lowest: 50,
      average: 50,
    });
  });
});

describe('GET /reports/monthly', () => {
  it('summarises the whole previous month', async () => {
    const token = await signUp('a@example.com');
    await seed(token, SEPTEMBER_OCTOBER);

    const res = await report(token, 'monthly', '2026-10-15');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      type: 'monthly',
      from: '2026-09-01',
      to: '2026-09-30',
      count: 2,
      highest: 160,
      lowest: 130,
      average: 145,
    });
  });

  it('rolls back across the year boundary in January', async () => {
    const token = await signUp('a@example.com');
    await seed(token, [
      ['2025-12-31', 'fasting', 200],
      ['2025-11-30', 'fasting', 80],
    ]);

    const res = await report(token, 'monthly', '2026-01-15');

    expect(res.body).toMatchObject({
      from: '2025-12-01',
      to: '2025-12-31',
      count: 1,
      highest: 200,
    });
  });

  it('returns the empty state when the previous month has no readings', async () => {
    const token = await signUp('a@example.com');
    const res = await report(token, 'monthly', '2026-10-15');

    expect(res.body).toMatchObject({
      count: 0,
      highest: null,
      lowest: null,
      average: null,
    });
  });
});

describe('rounding and isolation', () => {
  it('rounds the average to one decimal place', async () => {
    const token = await signUp('a@example.com');
    await seed(token, [
      ['2026-10-15', 'fasting', 100],
      ['2026-10-15', 'after_lunch', 101],
      ['2026-10-15', 'after_dinner', 101],
    ]);

    const { body } = await report(token, 'daily', '2026-10-15');

    expect(body.average).toBe(100.7);
  });

  it('rounds a half up: an average of 116.25 becomes 116.3', async () => {
    const token = await signUp('a@example.com');
    await seed(token, [
      ['2026-10-15', 'fasting', 100],
      ['2026-10-15', 'after_breakfast', 95],
      ['2026-10-15', 'after_lunch', 120],
      ['2026-10-15', 'after_dinner', 150],
    ]);

    const daily = await report(token, 'daily', '2026-10-15');
    const monthToDate = await report(token, 'month-to-date', '2026-10-15');

    expect(daily.body.average).toBe(116.3);
    expect(monthToDate.body.average).toBe(116.3);
  });

  it("never includes another user's readings", async () => {
    const a = await signUp('a@example.com');
    const b = await signUp('b@example.com');
    await seed(a, [['2026-10-15', 'fasting', 100]]);
    await seed(b, [['2026-10-15', 'fasting', 400]]);

    const res = await report(a, 'daily', '2026-10-15');

    expect(res.body).toMatchObject({
      count: 1,
      highest: 100,
      lowest: 100,
      average: 100,
    });
    expect(res.body.readings).toHaveLength(1);
  });
});
