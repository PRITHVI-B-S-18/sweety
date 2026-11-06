const { SLOT_LABELS } = require('../validation/readings');

// to_char returns the DATE as plain text. Selecting the column directly makes pg build a JS Date at local midnight,
// which JSON turns into a UTC time that can land on the previous day.
const COLUMNS = `id, to_char(reading_date, 'YYYY-MM-DD') AS date, slot, value, created_at`;

// Alphabetical order would put after_breakfast before fasting. The keys come from our own constant,
// never from user input, so building the SQL is safe.
const SLOT_ORDER = `CASE slot ${Object.keys(SLOT_LABELS)
  .map((key, index) => `WHEN '${key}' THEN ${index}`)
  .join(' ')} END`;

module.exports = { COLUMNS, SLOT_ORDER };
