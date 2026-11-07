const SLOT_LABELS = {
  fasting: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

const VALUE_MIN = 40;
const VALUE_MAX = 600;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = '2000-01-01';

const todayIn = (timeZone, now = new Date()) => {
  if (!timeZone) throw new Error('APP_TIMEZONE is not set.');
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
};

const isBlank = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const isRealDate = (str) => {
  if (!DATE_REGEX.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(0);
  // setUTCFullYear avoids the quirk where years 0-99 are treated as 1900-1999
  date.setUTCFullYear(y, m - 1, d);
  // 2026-02-30 rolls over to March, so formatting back won't match the input
  return date.toISOString().slice(0, 10) === str;
};

const parseValue = (value) => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
};

const validateValue = (value) => {
  if (isBlank(value)) return 'Please enter a glucose value.';
  const n = parseValue(value);
  if (n === null || n < VALUE_MIN || n > VALUE_MAX) {
    return `Value must be between ${VALUE_MIN} and ${VALUE_MAX} mg/dl.`;
  }
  return null;
};

const validateSlot = (slot) => {
  // typeof check: Object.hasOwn would coerce ['fasting'] to 'fasting' and pass
  if (typeof slot !== 'string' || !Object.hasOwn(SLOT_LABELS, slot)) {
    return 'Please choose a valid time slot.';
  }
  return null;
};

const validateDate = (date, today) => {
  if (isBlank(date)) return 'Please enter a date.';
  if (typeof date !== 'string' || !isRealDate(date) || date < MIN_DATE) {
    return 'Please enter a valid date.';
  }
  // YYYY-MM-DD strings compare correctly as plain strings, so no Date objects
  if (date > today) return 'Date cannot be in the future.';
  return null;
};

const validateReading = (
  body,
  { now = new Date(), timeZone = process.env.APP_TIMEZONE } = {},
) => {
  const { date, slot, value } = body || {};
  const today = todayIn(timeZone, now);

  // One error at a time, in the order of the brief's rules: value first
  const error =
    validateValue(value) || validateDate(date, today) || validateSlot(slot);
  if (error) return { error };

  return { value: { date, slot, value: parseValue(value) } };
};

module.exports = {
  SLOT_LABELS,
  VALUE_MIN,
  VALUE_MAX,
  MIN_DATE,
  todayIn,
  isRealDate,
  validateDate,
  validateSlot,
  validateValue,
  validateReading,
};
