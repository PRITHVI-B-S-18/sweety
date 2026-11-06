require('dotenv').config({ quiet: true });

const REQUIRED_ENV = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'APP_TIMEZONE',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`${key} is not set. Copy .env.example to .env.`);
    process.exit(1);
  }
}

try {
  new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE });
} catch {
  console.error(
    `APP_TIMEZONE "${process.env.APP_TIMEZONE}" is not a valid time zone.`,
  );
  process.exit(1);
}

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 4000;

createApp().listen(port, () => {
  console.log(`Sweety API listening on http://localhost:${port}`);
});
