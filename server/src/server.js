require('dotenv').config();
const { createApp } = require('./app');

const port = Number(process.env.PORT) || 4000;

createApp().listen(port, () => {
  console.log(`Sweety API listening on http://localhost:${port}`);
});
