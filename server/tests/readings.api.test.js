const { setupTestDb, resetTables, closeDb } = require('./helpers/db');
const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db');

const app = createApp();

beforeAll(setupTestDb);
beforeEach(resetTables);
afterAll(closeDb);

const PASSWORD = 'Abcdefg1';
const DATE = '2026-01-15';

const signUp = async (email) => {
  await request(app)
    .post('/auth/register')
    .send({ name: 'Test User', email, password: PASSWORD });
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password: PASSWORD });
  return { token: res.body.token, id: res.body.user.id };
};

const authed = (token) => ({ Authorization: `Bearer ${token}` });

const addReading = (token, body) =>
  request(app).post('/readings').set(authed(token)).send(body);

const reading = (overrides = {}) => ({
  date: DATE,
  slot: 'after_lunch',
  value: 120,
  ...overrides,
});

describe('authentication', () => {
  it.each([
    ['GET', '/readings'],
    ['POST', '/readings'],
    ['PUT', '/readings/1'],
    ['DELETE', '/readings/1'],
  ])('%s %s returns 401 without a token', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path).send({});
    expect(res.status).toBe(401);
  });

  it('returns 401 for a garbage token', async () => {
    const res = await request(app).get('/readings').set(authed('garbage'));
    expect(res.status).toBe(401);
  });
});

describe('POST /readings', () => {
  it('creates a reading and returns the date as a plain string', async () => {
    const { token } = await signUp('a@example.com');
    const res = await addReading(token, reading());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      date: '2026-01-15',
      slot: 'after_lunch',
      value: 120,
      created_at: expect.any(String),
    });
    expect(res.body.user_id).toBeUndefined();
  });

  it('accepts a numeric string and stores it as a number', async () => {
    const { token } = await signUp('a@example.com');
    const res = await addReading(token, reading({ value: '120' }));

    expect(res.status).toBe(201);
    expect(res.body.value).toBe(120);
  });

  it.each([
    [
      'a decimal value',
      { value: 120.5 },
      'Value must be between 40 and 600 mg/dl.',
    ],
    [
      'a value below 40',
      { value: 39 },
      'Value must be between 40 and 600 mg/dl.',
    ],
    [
      'a value above 600',
      { value: 601 },
      'Value must be between 40 and 600 mg/dl.',
    ],
    ['a missing value', { value: undefined }, 'Please enter a glucose value.'],
    ['an unknown slot', { slot: 'night' }, 'Please choose a valid time slot.'],
    [
      'an impossible date',
      { date: '2026-02-30' },
      'Please enter a valid date.',
    ],
    ['a future date', { date: '2999-01-01' }, 'Date cannot be in the future.'],
  ])('returns 400 for %s', async (_label, overrides, message) => {
    const { token } = await signUp('a@example.com');
    const res = await addReading(token, reading(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it('returns 409 for a second reading in the same slot and date', async () => {
    const { token } = await signUp('a@example.com');
    await addReading(token, reading());
    const res = await addReading(token, reading({ value: 150 }));

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'You already have an After lunch reading for this date.',
    );
  });

  it('uses "a" instead of "an" for the fasting label', async () => {
    const { token } = await signUp('a@example.com');
    await addReading(token, reading({ slot: 'fasting' }));
    const res = await addReading(token, reading({ slot: 'fasting' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'You already have a Morning (fasting) reading for this date.',
    );
  });

  it('allows the same slot on another date and another slot on the same date', async () => {
    const { token } = await signUp('a@example.com');
    await addReading(token, reading());

    const otherDate = await addReading(token, reading({ date: '2026-01-14' }));
    const otherSlot = await addReading(token, reading({ slot: 'fasting' }));

    expect(otherDate.status).toBe(201);
    expect(otherSlot.status).toBe(201);
  });

  it('allows two users to log the same slot on the same date', async () => {
    const a = await signUp('a@example.com');
    const b = await signUp('b@example.com');

    expect((await addReading(a.token, reading())).status).toBe(201);
    expect((await addReading(b.token, reading())).status).toBe(201);
  });

  it('caps a day at 4 readings', async () => {
    const { token } = await signUp('a@example.com');
    const slots = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner'];

    for (const slot of slots) {
      expect((await addReading(token, reading({ slot }))).status).toBe(201);
    }
    for (const slot of slots) {
      expect((await addReading(token, reading({ slot }))).status).toBe(409);
    }
    expect((await addReading(token, reading({ slot: 'night' }))).status).toBe(
      400,
    );

    const list = await request(app)
      .get('/readings')
      .set(authed(token))
      .query({ from: DATE, to: DATE });
    expect(list.body).toHaveLength(4);
  });

  it('returns 401 when the token belongs to a deleted user', async () => {
    const { token, id } = await signUp('a@example.com');
    await query('DELETE FROM users WHERE id = $1', [id]);

    const res = await addReading(token, reading());
    expect(res.status).toBe(401);
  });
});

describe('GET /readings', () => {
  it("returns only the signed-in user's readings", async () => {
    const a = await signUp('a@example.com');
    const b = await signUp('b@example.com');
    await addReading(a.token, reading({ value: 100 }));
    await addReading(b.token, reading({ value: 200 }));

    const res = await request(app).get('/readings').set(authed(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].value).toBe(100);
  });

  it('returns an empty array when there are no readings', async () => {
    const { token } = await signUp('a@example.com');
    const res = await request(app).get('/readings').set(authed(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('orders by newest date first, then by time of day (not alphabetically)', async () => {
    const { token } = await signUp('a@example.com');
    for (const slot of [
      'after_dinner',
      'fasting',
      'after_lunch',
      'after_breakfast',
    ]) {
      await addReading(token, reading({ slot }));
    }
    await addReading(
      token,
      reading({ date: '2026-01-16', slot: 'after_dinner' }),
    );

    const res = await request(app).get('/readings').set(authed(token));

    expect(res.body.map((r) => `${r.date} ${r.slot}`)).toEqual([
      '2026-01-16 after_dinner',
      '2026-01-15 fasting',
      '2026-01-15 after_breakfast',
      '2026-01-15 after_lunch',
      '2026-01-15 after_dinner',
    ]);
  });

  it('filters by from and to, inclusive', async () => {
    const { token } = await signUp('a@example.com');
    for (const date of [
      '2026-01-10',
      '2026-01-11',
      '2026-01-12',
      '2026-01-13',
    ]) {
      await addReading(token, reading({ date }));
    }

    const res = await request(app)
      .get('/readings')
      .set(authed(token))
      .query({ from: '2026-01-11', to: '2026-01-12' });

    expect(res.body.map((r) => r.date)).toEqual(['2026-01-12', '2026-01-11']);
  });

  it('supports from alone and to alone', async () => {
    const { token } = await signUp('a@example.com');
    for (const date of ['2026-01-10', '2026-01-11', '2026-01-12']) {
      await addReading(token, reading({ date }));
    }

    const fromOnly = await request(app)
      .get('/readings')
      .set(authed(token))
      .query({ from: '2026-01-11' });
    const toOnly = await request(app)
      .get('/readings')
      .set(authed(token))
      .query({ to: '2026-01-10' });

    expect(fromOnly.body).toHaveLength(2);
    expect(toOnly.body).toHaveLength(1);
  });

  it.each([
    [
      'an invalid from',
      { from: '2026-02-30' },
      'Please enter a valid from date.',
    ],
    ['an invalid to', { to: 'abc' }, 'Please enter a valid to date.'],
    ['an empty from', { from: '' }, 'Please enter a valid from date.'],
    [
      'from after to',
      { from: '2026-01-12', to: '2026-01-10' },
      'The from date cannot be after the to date.',
    ],
  ])('returns 400 for %s', async (_label, params, message) => {
    const { token } = await signUp('a@example.com');
    const res = await request(app)
      .get('/readings')
      .set(authed(token))
      .query(params);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it('returns 400 for a repeated from parameter instead of crashing', async () => {
    const { token } = await signUp('a@example.com');
    const res = await request(app)
      .get('/readings?from=2026-01-01&from=2026-01-02')
      .set(authed(token));

    expect(res.status).toBe(400);
  });
});

describe('PUT /readings/:id', () => {
  it('updates a reading', async () => {
    const { token } = await signUp('a@example.com');
    const created = await addReading(token, reading());

    const res = await request(app)
      .put(`/readings/${created.body.id}`)
      .set(authed(token))
      .send(reading({ date: '2026-01-14', slot: 'fasting', value: 95 }));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      date: '2026-01-14',
      slot: 'fasting',
      value: 95,
    });
  });

  it('lets a reading keep its own slot and date when only the value changes', async () => {
    const { token } = await signUp('a@example.com');
    const created = await addReading(token, reading());

    const res = await request(app)
      .put(`/readings/${created.body.id}`)
      .set(authed(token))
      .send(reading({ value: 130 }));

    expect(res.status).toBe(200);
    expect(res.body.value).toBe(130);
  });

  it("returns 404 for another user's reading and leaves it unchanged", async () => {
    const a = await signUp('a@example.com');
    const b = await signUp('b@example.com');
    const created = await addReading(a.token, reading());

    const res = await request(app)
      .put(`/readings/${created.body.id}`)
      .set(authed(b.token))
      .send(reading({ value: 300 }));

    expect(res.status).toBe(404);
    const list = await request(app).get('/readings').set(authed(a.token));
    expect(list.body[0].value).toBe(120);
  });

  it.each(['999999', 'abc', '0', '-1', '1.5', '99999999999999'])(
    'returns 404 for the id %s',
    async (id) => {
      const { token } = await signUp('a@example.com');
      const res = await request(app)
        .put(`/readings/${id}`)
        .set(authed(token))
        .send(reading());

      expect(res.status).toBe(404);
    },
  );

  it('returns 400 for an invalid body', async () => {
    const { token } = await signUp('a@example.com');
    const created = await addReading(token, reading());

    const res = await request(app)
      .put(`/readings/${created.body.id}`)
      .set(authed(token))
      .send(reading({ value: 120.5 }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('returns 409 when moving onto a slot that is already taken', async () => {
    const { token } = await signUp('a@example.com');
    await addReading(token, reading({ slot: 'fasting' }));
    const second = await addReading(token, reading({ slot: 'after_lunch' }));

    const res = await request(app)
      .put(`/readings/${second.body.id}`)
      .set(authed(token))
      .send(reading({ slot: 'fasting' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'You already have a Morning (fasting) reading for this date.',
    );
  });
});

describe('DELETE /readings/:id', () => {
  it('deletes a reading with 204 and it disappears from the list', async () => {
    const { token } = await signUp('a@example.com');
    const created = await addReading(token, reading());

    const res = await request(app)
      .delete(`/readings/${created.body.id}`)
      .set(authed(token));

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const list = await request(app).get('/readings').set(authed(token));
    expect(list.body).toEqual([]);
  });

  it('returns 404 when deleting twice', async () => {
    const { token } = await signUp('a@example.com');
    const created = await addReading(token, reading());
    await request(app)
      .delete(`/readings/${created.body.id}`)
      .set(authed(token));

    const res = await request(app)
      .delete(`/readings/${created.body.id}`)
      .set(authed(token));

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's reading and keeps it", async () => {
    const a = await signUp('a@example.com');
    const b = await signUp('b@example.com');
    const created = await addReading(a.token, reading());

    const res = await request(app)
      .delete(`/readings/${created.body.id}`)
      .set(authed(b.token));

    expect(res.status).toBe(404);
    const list = await request(app).get('/readings').set(authed(a.token));
    expect(list.body).toHaveLength(1);
  });

  it.each(['abc', '0', '-1', '99999999999999'])(
    'returns 404 for the id %s',
    async (id) => {
      const { token } = await signUp('a@example.com');
      const res = await request(app)
        .delete(`/readings/${id}`)
        .set(authed(token));

      expect(res.status).toBe(404);
    },
  );
});

describe('deleting a user', () => {
  it('removes their readings (ON DELETE CASCADE)', async () => {
    const { token, id } = await signUp('a@example.com');
    await addReading(token, reading());
    await addReading(token, reading({ slot: 'fasting' }));

    await query('DELETE FROM users WHERE id = $1', [id]);

    const { rows } = await query(
      'SELECT count(*)::int AS n FROM readings WHERE user_id = $1',
      [id],
    );
    expect(rows[0].n).toBe(0);
  });
});
