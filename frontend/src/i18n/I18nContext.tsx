import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { decimalsOf } from '../lib/currencies'
import { en, type Dictionary } from './en'
import { fr } from './fr'

export type Lang = 'en' | 'fr'

const dictionaries: Record<Lang, Dictionary> = { en, fr }

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Dictionary
  locale: string
  // The signed-in user's currency; amounts are stored in its thousandths.
  currency: string
  decimals: number
  setCurrency: (currency: string) => void
  money: (thousandths: number, options?: { sign?: boolean }) => string
  date: (iso: string, options?: Intl.DateTimeFormatOptions) => string
}

const I18nContext = createContext<I18nState | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'en' || saved === 'fr') return saved
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [currency, setCurrency] = useState('TND')

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nState>(() => {
    const locale = lang === 'fr' ? 'fr-TN' : 'en-GB'
    const decimals = decimalsOf(currency)
    // Dinars keep the local "12,500 TND" style; other currencies use the
    // usual symbol and position for the language ("12,50 €", "€12.50").
    const format =
      currency === 'TND'
        ? (value: number) =>
            `${new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)} TND`
        : (value: number) =>
            new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
              style: 'currency',
              currency,
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }).format(value)

    return {
      lang,
      t: dictionaries[lang],
      locale,
      currency,
      decimals,
      setCurrency,
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem('lang', next)
        } catch {
          // Not remembered in private browsing; that's fine.
        }
      },
      money: (thousandths, options) => {
        const text = format(Math.abs(thousandths) / 1000)
        if (thousandths < 0) return `−${text}`
        return options?.sign && thousandths > 0 ? `+${text}` : text
      },
      // Dates are calendar days (YYYY-MM-DD), so format them in UTC to avoid
      // shifting a day in other time zones.
      date: (iso, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
        new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(iso)),
    }
  }, [lang, currency])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
