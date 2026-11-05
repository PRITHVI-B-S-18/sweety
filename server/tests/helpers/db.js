process.env.NODE_ENV = 'test';
require('dotenv').config();

const { pool } = require('../../src/db');
const { migrate } = require('../../src/db/migrate');

async function setupTestDb() {
  await migrate({ quiet: true });
}

async function resetTables() {
  const { rows } = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
  `);
  if (rows.length === 0) return;
  const names = rows.map((r) => `"${r.tablename}"`).join(', ');
  await pool.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
}

async function closeDb() {
  await pool.end();
}

module.exports = { setupTestDb, resetTables, closeDb };
