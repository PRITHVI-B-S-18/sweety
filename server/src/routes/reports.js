const express = require('express');
const { query } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { todayIn, validateDate } = require('../validation/readings');
const {
  dailyRange,
  monthToDateRange,
  previousMonthRange,
} = require('../services/reportRanges');
const { COLUMNS, SLOT_ORDER } = require('../services/readingSql');

const router = express.Router();

router.use(requireAuth);

const RANGES = {
  daily: dailyRange,
  'month-to-date': monthToDateRange,
  monthly: previousMonthRange,
};

// pg returns COUNT (bigint) and ROUND(AVG) (numeric) as strings, so cast them
// in SQL. With no rows, MAX, MIN and AVG are NULL and the count is 0.
const SUMMARY_SQL = `
  SELECT COUNT(*)::int AS count,
         MAX(value) AS highest,
         MIN(value) AS lowest,
         ROUND(AVG(value), 1)::float8 AS average
  FROM readings
  WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`;

const READINGS_SQL = `
  SELECT ${COLUMNS} FROM readings
  WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
  ORDER BY reading_date DESC, ${SLOT_ORDER}`;

router.get('/:type', async (req, res) => {
  const { type } = req.params;
  // hasOwn, so a path like /reports/constructor is not found instead of crashing
  if (!Object.hasOwn(RANGES, type)) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  const today = todayIn(process.env.APP_TIMEZONE);
  const date = req.query.date === undefined ? today : req.query.date;
  const error = validateDate(date, today);
  if (error) return res.status(400).json({ error });

  const { from, to } = RANGES[type](date);
  const params = [req.userId, from, to];

  const summary = await query(SUMMARY_SQL, params);
  const report = { type, from, to, ...summary.rows[0] };

  if (type === 'daily') {
    const readings = await query(READINGS_SQL, params);
    report.readings = readings.rows;
  }

  return res.json(report);
});

module.exports = router;
