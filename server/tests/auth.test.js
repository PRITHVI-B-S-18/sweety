const { setupTestDb, resetTables, closeDb } = require('./helpers/db');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const app = createApp();

beforeAll(setupTestDb);
beforeEach(resetTables);
afterAll(closeDb);

const user = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Abcdefg1',
};

const register = (body = user) =>
  request(app).post('/auth/register').send(body);
const login = (body) => request(app).post('/auth/login').send(body);

describe('POST /auth/register', () => {
  it('registers a new user', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('never leaks a bcrypt hash anywhere in the response', async () => {
    const res = await register();
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });

  it('stores the name trimmed and the email lower-cased', async () => {
    const res = await register({
      ...user,
      name: '  Prithvi B S ',
      email: '  Prithvi@Example.com ',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('Prithvi B S');
    expect(res.body.user.email).toBe('prithvi@example.com');
  });

  it('returns 409 for a duplicate email in a different case', async () => {
    await register();
    const res = await register({ ...user, email: 'TEST@Example.COM' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('An account with this email already exists.');
  });

  it('returns 400 for an invalid email', async () => {
    const res = await register({ ...user, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a valid email address.');
  });

  it('returns 400 with a field message for a weak password', async () => {
    const res = await register({ ...user, password: 'abcdefg1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must include an uppercase letter.');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/auth/register').send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 instead of crashing on non-string input', async () => {
    const res = await register({ ...user, email: 123 });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('logs in and returns a token plus the user', async () => {
    const res = await login({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(res.body.user.password_hash).toBeUndefined();

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.sub).toBe(String(res.body.user.id));
  });

  it('accepts the email in a different case', async () => {
    const res = await login({
      email: ' TEST@Example.com ',
      password: user.password,
    });

    expect(res.status).toBe(200);
  });

  it('returns 401 for a wrong password', async () => {
    const res = await login({ email: user.email, password: 'Wrong#Pass1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('returns the same 401 for an unknown email', async () => {
    const res = await login({
      email: 'nobody@example.com',
      password: user.password,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('returns 400 when the email or password is missing', async () => {
    const res = await login({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter your email and password.');
  });
});
