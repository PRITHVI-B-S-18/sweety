const {
  SLOT_LABELS,
  todayIn,
  isRealDate,
  validateValue,
  validateSlot,
  validateDate,
  validateReading,
  MIN_DATE,
} = require('../src/validation/readings');

// Fixed "now": 2026-11-06 in UTC and in Asia/Kolkata
const NOW = new Date('2026-11-06T10:00:00Z');
const opts = { now: NOW, timeZone: 'UTC' };
const good = { date: '2026-11-05', slot: 'after_lunch', value: 120 };

describe('SLOT_LABELS', () => {
  it('has the 4 slots with friendly labels', () => {
    expect(SLOT_LABELS).toEqual({
      fasting: 'Morning (fasting)',
      after_breakfast: 'After breakfast',
      after_lunch: 'After lunch',
      after_dinner: 'After dinner',
    });
  });
});

describe('todayIn', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayIn('UTC', NOW)).toBe('2026-11-06');
  });

  it('uses the given time zone, not the server zone', () => {
    const lateUtc = new Date('2026-11-06T20:00:00Z'); // 01:30 next day in Kolkata
    expect(todayIn('UTC', lateUtc)).toBe('2026-11-06');
    expect(todayIn('Asia/Kolkata', lateUtc)).toBe('2026-11-07');
  });
});

describe('todayIn without a time zone', () => {
  it('throws instead of silently using the server zone', () => {
    expect(() => todayIn(undefined, NOW)).toThrow('APP_TIMEZONE is not set.');
  });
});

describe('isRealDate', () => {
  it.each(['2026-11-06', '2024-02-29', '2026-12-31'])('accepts %s', (d) => {
    expect(isRealDate(d)).toBe(true);
  });

  it.each([
    '2026-02-30', // rolls over to March
    '2026-02-29', // 2026 is not a leap year
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-4-5',
    '26-11-06',
    '2026/11/06',
    'tomorrow',
  ])('rejects %s', (d) => {
    expect(isRealDate(d)).toBe(false);
  });
});

describe('validateValue', () => {
  it.each([40, 120, 600, '120', ' 120 ', '040'])('accepts %p', (v) => {
    expect(validateValue(v)).toBeNull();
  });

  it.each([undefined, null, '', '   '])('asks for a value when %p', (v) => {
    expect(validateValue(v)).toBe('Please enter a glucose value.');
  });

  it.each([
    39,
    601,
    0,
    -5,
    '39',
    '601',
    120.5,
    '120.5',
    'abc',
    true,
    false,
    '1e2',
    NaN,
    Infinity,
    [120],
    {},
  ])('rejects %p with the range message', (v) => {
    expect(validateValue(v)).toBe('Value must be between 40 and 600 mg/dl.');
  });
});

describe('validateSlot', () => {
  it.each(Object.keys(SLOT_LABELS))('accepts %s', (s) => {
    expect(validateSlot(s)).toBeNull();
  });

  it.each([
    undefined,
    null,
    '',
    'morning',
    'FASTING',
    123,
    ['fasting'],
    'toString',
    '__proto__',
  ])('rejects %p', (s) => {
    expect(validateSlot(s)).toBe('Please choose a valid time slot.');
  });
});

describe('validateDate', () => {
  const today = '2026-11-06';

  it('accepts today and past dates', () => {
    expect(validateDate('2026-11-06', today)).toBeNull();
    expect(validateDate('2026-01-01', today)).toBeNull();
  });

  it.each([undefined, null, ''])('asks for a date when %p', (d) => {
    expect(validateDate(d, today)).toBe('Please enter a date.');
  });

  it.each(['2026-02-30', 'abc', '06-11-2026', 20261106])(
    'rejects %p as invalid',
    (d) => {
      expect(validateDate(d, today)).toBe('Please enter a valid date.');
    },
  );

  it('rejects tomorrow', () => {
    expect(validateDate('2026-11-07', today)).toBe(
      'Date cannot be in the future.',
    );
  });

  it('accepts the earliest allowed date', () => {
    expect(MIN_DATE).toBe('2000-01-01');
    expect(validateDate('2000-01-01', today)).toBeNull();
  });

  it.each(['1999-12-31', '0001-01-01', '0000-01-01'])(
    'rejects %s as too old',
    (d) => {
      expect(validateDate(d, today)).toBe('Please enter a valid date.');
    },
  );
});

describe('validateReading', () => {
  it('returns cleaned values for valid input', () => {
    expect(validateReading(good, opts)).toEqual({ value: good });
  });

  it('converts a numeric string value to a number', () => {
    const { value } = validateReading({ ...good, value: '120' }, opts);
    expect(value.value).toBe(120);
  });

  it('accepts today', () => {
    expect(
      validateReading({ ...good, date: '2026-11-06' }, opts).error,
    ).toBeUndefined();
  });

  it("rejects tomorrow's date", () => {
    expect(validateReading({ ...good, date: '2026-11-07' }, opts).error).toBe(
      'Date cannot be in the future.',
    );
  });

  it('rejects 2026-02-30', () => {
    expect(validateReading({ ...good, date: '2026-02-30' }, opts).error).toBe(
      'Please enter a valid date.',
    );
  });

  it('rejects 120.5', () => {
    expect(validateReading({ ...good, value: 120.5 }, opts).error).toBe(
      'Value must be between 40 and 600 mg/dl.',
    );
  });

  it('rejects a bad slot', () => {
    expect(validateReading({ ...good, slot: 'night' }, opts).error).toBe(
      'Please choose a valid time slot.',
    );
  });

  it('rejects a missing value', () => {
    expect(
      validateReading({ date: good.date, slot: good.slot }, opts).error,
    ).toBe('Please enter a glucose value.');
  });

  it('does not crash when the body is missing', () => {
    expect(() => validateReading(undefined, opts)).not.toThrow();
    expect(validateReading(undefined, opts).error).toBe(
      'Please enter a glucose value.',
    );
  });

  it('reports the value first on an empty form', () => {
    expect(validateReading({}, opts).error).toBe(
      'Please enter a glucose value.',
    );
    expect(validateReading({ date: '', slot: '', value: '' }, opts).error).toBe(
      'Please enter a glucose value.',
    );
  });

  it('reports the value before the date and the slot', () => {
    expect(
      validateReading({ date: '2999-01-01', slot: 'night', value: 'abc' }, opts)
        .error,
    ).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('reports the date before the slot once the value is valid', () => {
    expect(
      validateReading({ date: '2999-01-01', slot: 'night', value: 120 }, opts)
        .error,
    ).toBe('Date cannot be in the future.');
  });

  it('reports the slot last', () => {
    expect(
      validateReading({ date: good.date, slot: '', value: 120 }, opts).error,
    ).toBe('Please choose a valid time slot.');
  });
});
