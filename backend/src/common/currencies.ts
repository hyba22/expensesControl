// Currencies a user can pick, with how many decimals they show. Amounts are
// always stored in thousandths, so 3 decimals (TND) and 2 (EUR) both fit.
export const CURRENCIES = {
  TND: 3,
  EUR: 2,
  USD: 2,
  GBP: 2,
  CAD: 2,
  CHF: 2,
  MAD: 2,
  DZD: 2,
  SAR: 2,
  AED: 2,
} as const;

export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];

export function formatMoney(thousandths: number, currency: string) {
  const decimals = CURRENCIES[currency as Currency] ?? 3;
  return `${(thousandths / 1000).toFixed(decimals)} ${currency}`;
}
