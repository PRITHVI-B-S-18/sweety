const express = require('express');
const { query } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const {
  SLOT_LABELS,
  isRealDate,
  validateReading,
} = require('../validation/readings');

const router = express.Router();

router.use(requireAuth);

const MAX_ID = 2147483647;

// to_char returns the DATE as plain text.
const COLUMNS = `id, to_char(reading_date, 'YYYY-MM-DD') AS date, slot, value, created_at`;

// Alphabetical order would put after_breakfast before fasting.
const SLOT_ORDER = `CASE slot ${Object.keys(SLOT_LABELS)
  .map((key, index) => `WHEN '${key}' THEN ${index}`)
  .join(' ')} END`;

const duplicateMessage = (slot) => {
  const label = SLOT_LABELS[slot];
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
};

const isSlotConflict = (err) =>
  err.code === '23505' && err.constraint === 'readings_one_per_slot';

// A token can outlive its user: the foreign key then rejects the insert.
const isMissingUser = (err) => err.code === '23503';

// Postgres throws on ids beyond INT range, which would otherwise become a 500.
const parseId = (raw) =>
  /^[1-9]\d*$/.test(raw) && Number(raw) <= MAX_ID ? Number(raw) : null;

const notFound = (res) => res.status(404).json({ error: 'Reading not found.' });

const accountGone = (res) =>
  res.status(401).json({ error: 'Invalid or expired token.' });

router.get('/', async (req, res) => {
  const { from, to } = req.query;

  for (const [label, value] of [
    ['from', from],
    ['to', to],
  ]) {
    if (
      value !== undefined &&
      (typeof value !== 'string' || !isRealDate(value))
    ) {
      return res
        .status(400)
        .json({ error: `Please enter a valid ${label} date.` });
    }
  }
  if (from !== undefined && to !== undefined && from > to) {
    return res
      .status(400)
      .json({ error: 'The from date cannot be after the to date.' });
  }

  const conditions = ['user_id = $1'];
  const params = [req.userId];
  if (from !== undefined) {
    params.push(from);
    conditions.push(`reading_date >= $${params.length}`);
  }
  if (to !== undefined) {
    params.push(to);
    conditions.push(`reading_date <= $${params.length}`);
  }

  const { rows } = await query(
    `SELECT ${COLUMNS} FROM readings
     WHERE ${conditions.join(' AND ')}
     ORDER BY reading_date DESC, ${SLOT_ORDER}`,
    params,
  );
  return res.json(rows);
});

router.post('/', async (req, res) => {
  const { error, value } = validateReading(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const { rows } = await query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [req.userId, value.date, value.slot, value.value],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (isSlotConflict(err)) {
      return res.status(409).json({ error: duplicateMessage(value.slot) });
    }
    if (isMissingUser(err)) return accountGone(res);
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);

  const { error, value } = validateReading(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const { rows } = await query(
      `UPDATE readings
       SET reading_date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING ${COLUMNS}`,
      [value.date, value.slot, value.value, id, req.userId],
    );
    if (rows.length === 0) return notFound(res);
    return res.json(rows[0]);
  } catch (err) {
    if (isSlotConflict(err)) {
      return res.status(409).json({ error: duplicateMessage(value.slot) });
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);

  const { rowCount } = await query(
    'DELETE FROM readings WHERE id = $1 AND user_id = $2',
    [id, req.userId],
  );
  if (rowCount === 0) return notFound(res);
  return res.status(204).end();
});

module.exports = router;
