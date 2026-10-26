// Must match the backend list (common/currencies.ts). Amounts are stored in
// thousandths whatever the currency; `decimals` is only how many we show.
export const CURRENCIES = [
  { code: 'TND', decimals: 3 },
  { code: 'EUR', decimals: 2 },
  { code: 'USD', decimals: 2 },
  { code: 'GBP', decimals: 2 },
  { code: 'CAD', decimals: 2 },
  { code: 'CHF', decimals: 2 },
  { code: 'MAD', decimals: 2 },
  { code: 'DZD', decimals: 2 },
  { code: 'SAR', decimals: 2 },
  { code: 'AED', decimals: 2 },
] as const

export type Currency = (typeof CURRENCIES)[number]['code']

export const decimalsOf = (code: string) => CURRENCIES.find((c) => c.code === code)?.decimals ?? 3

export function currencyName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

// Default for the sign-up form, based on the browser region.
export function guessCurrency(): Currency {
  const region = (navigator.language.split('-')[1] ?? '').toUpperCase()
  const byRegion: Record<string, Currency> = {
    TN: 'TND', US: 'USD', GB: 'GBP', CA: 'CAD', CH: 'CHF', MA: 'MAD', DZ: 'DZD', SA: 'SAR', AE: 'AED',
    FR: 'EUR', BE: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR', IE: 'EUR', AT: 'EUR', LU: 'EUR',
  }
  return byRegion[region] ?? 'TND'
}
