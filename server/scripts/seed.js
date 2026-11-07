require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { pool } = require('../src/db');
const { SLOT_LABELS, todayIn } = require('../src/validation/readings');
const {
  monthToDateRange,
  previousMonthRange,
} = require('../src/services/reportRanges');

const DEMO = { name: 'Demo', email: 'demo@sweety.app', password: 'Demo@1234' };

// A fixed list instead of Math.random(), so the demo looks the same every run
const VALUES = [95, 118, 142, 165, 110, 180, 130, 88, 205];
const SLOT_KEYS = Object.keys(SLOT_LABELS);

// Works in UTC, like reportRanges.js, so daylight saving can't skip or repeat a day
function eachDay(from, to) {
  const days = [];
  const day = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function buildReadings(today) {
  const lastMonth = previousMonthRange(today);
  const thisMonth = monthToDateRange(today);
  const days = [
    ...eachDay(lastMonth.from, lastMonth.to),
    ...eachDay(thisMonth.from, thisMonth.to),
  ];

  const readings = [];
  let valueIndex = 0;
  let dayNumber = 0;

  days.forEach((date, i) => {
    // Gaps of 2 and 3 days alternate; today is always included so the Daily card is not empty
    const picked = i % 5 === 0 || i % 5 === 2;
    if (!picked && date !== today) return;

    // Today gets 3 readings; other days 2 to 4. Consecutive slots from a
    // rotating start are always different, which the unique constraint needs.
    const count = date === today ? 3 : 2 + (dayNumber % 3);
    const start = date === today ? 0 : dayNumber % SLOT_KEYS.length;
    for (let k = 0; k < count; k++) {
      readings.push({
        date,
        slot: SLOT_KEYS[(start + k) % SLOT_KEYS.length],
        value: VALUES[valueIndex++ % VALUES.length],
      });
    }
    dayNumber++;
  });

  return readings;
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data in production.');
  }

  const today = todayIn(process.env.APP_TIMEZONE);
  const readings = buildReadings(today);
  // Hashing is slow, so do it before the transaction opens
  const passwordHash = await bcrypt.hash(DEMO.password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ON DELETE CASCADE removes the old demo readings with the user
    await client.query('DELETE FROM users WHERE email = $1', [DEMO.email]);
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [DEMO.name, DEMO.email, passwordHash]
    );
    const userId = rows[0].id;

    for (const reading of readings) {
      await client.query(
        `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)`,
        [userId, reading.date, reading.slot, reading.value]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`Demo login: ${DEMO.email} / ${DEMO.password}`);
  console.log(
    `Added ${readings.length} readings from ${readings[0].date} to ${today}.`
  );
}

seed()
  .catch((err) => {
    console.error(`Seeding failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());