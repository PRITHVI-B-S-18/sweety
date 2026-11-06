const fmt = (d) => d.toISOString().slice(0, 10);

const dailyRange = (date) => ({ from: date, to: date });

// Same year and month with day 01: plain string work, no Date needed.
const monthToDateRange = (date) => ({
  from: `${date.slice(0, 7)}-01`,
  to: date,
});

// month index -1 becomes December of the previous year, and day 0 is the last day of the previous month.
const previousMonthRange = (date) => {
  const [y, m] = date.split('-').map(Number);
  return {
    from: fmt(new Date(Date.UTC(y, m - 2, 1))),
    to: fmt(new Date(Date.UTC(y, m - 1, 0))),
  };
};

module.exports = { dailyRange, monthToDateRange, previousMonthRange };
