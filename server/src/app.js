const express = require('express');
const cors = require('cors');

function createApp() {
  const app = express();

  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }),
  );
  app.use(express.json());
  app.use('/auth', require('./routes/auth'));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res
      .status(status)
      .json({ error: status === 500 ? 'Something went wrong' : err.message });
  });

  return app;
}

module.exports = { createApp };
