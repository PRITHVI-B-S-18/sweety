const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { validateRegistration, validateLogin } = require('../validation/auth');

const router = express.Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.post('/register', async (req, res) => {
  const { error, value } = validateRegistration(req.body);
  if (error) return res.status(400).json({ error });

  const { name, email, password } = value;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash],
    );
    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { error, value } = validateLogin(req.body);
  if (error) return res.status(400).json({ error });

  const { rows } = await query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [value.email],
  );
  const user = rows[0];

  const ok = await bcrypt.compare(
    value.password,
    user ? user.password_hash : DUMMY_HASH,
  );
  if (!user || !ok) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

module.exports = router;
