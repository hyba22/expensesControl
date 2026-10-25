// Months are written "YYYY-MM". Dates are calendar days stored at UTC
// midnight, so all month math is done in UTC.

export function monthRange(month: string) {
  const [year, m] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(year, m - 1, 1)),
    lt: new Date(Date.UTC(year, m, 1)),
  };
}

export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export const monthOf = (date: Date) => date.toISOString().slice(0, 7);

export function daysIn(month: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);
