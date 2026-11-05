require('dotenv').config();
const { pool } = require('../src/db');

async function seed() {
  console.log('Nothing to seed yet.');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
