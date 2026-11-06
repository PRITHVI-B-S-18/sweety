const {
  dailyRange,
  monthToDateRange,
  previousMonthRange,
} = require('../src/services/reportRanges');

describe('dailyRange', () => {
  it.each(['2026-10-15', '2026-01-15', '2024-02-29'])('is just %s', (date) => {
    expect(dailyRange(date)).toEqual({ from: date, to: date });
  });
});

describe('monthToDateRange', () => {
  it.each([
    ['2026-10-15', '2026-10-01'],
    ['2026-01-15', '2026-01-01'],
    ['2026-12-31', '2026-12-01'],
    ['2024-02-29', '2024-02-01'],
  ])('%s starts on the 1st', (date, from) => {
    expect(monthToDateRange(date)).toEqual({ from, to: date });
  });

  it('is a single day on the 1st of the month', () => {
    expect(monthToDateRange('2026-11-01')).toEqual({
      from: '2026-11-01',
      to: '2026-11-01',
    });
  });
});

describe('previousMonthRange', () => {
  it.each([
    ['2026-10-15', '2026-09-01', '2026-09-30'],
    ['2026-01-15', '2025-12-01', '2025-12-31'],
    ['2026-05-31', '2026-04-01', '2026-04-30'],
    ['2026-12-31', '2026-11-01', '2026-11-30'],
    ['2026-03-10', '2026-02-01', '2026-02-28'],
    ['2024-03-10', '2024-02-01', '2024-02-29'],
    ['2026-03-31', '2026-02-01', '2026-02-28'],
    ['2026-11-01', '2026-10-01', '2026-10-31'],
  ])('for %s returns %s to %s', (date, from, to) => {
    expect(previousMonthRange(date)).toEqual({ from, to });
  });
});
