require('dotenv').config();
const { Pool } = require('pg');

const connectionString =
  process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Database URL is not set. Copy .env.example to .env and fill it in.');
}

const pool = new Pool({ connectionString });

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
