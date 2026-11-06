const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const readingsRoutes = require('./routes/readings');
const reportsRoutes = require('./routes/reports');

function createApp() {
  const app = express();

  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }),
  );
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use('/readings', readingsRoutes);
  app.use('/reports', reportsRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status === 500) {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
    const message =
      err.type === 'entity.parse.failed' ? 'Invalid JSON body.' : err.message;
    return res.status(status).json({ error: message });
  });

  return app;
}

module.exports = { createApp };
