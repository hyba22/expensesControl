import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, type Dictionary } from './en'
import { fr } from './fr'

export type Lang = 'en' | 'fr'

const dictionaries: Record<Lang, Dictionary> = { en, fr }

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Dictionary
  // Number and date formatting follow the language, in Tunisian dinars.
  money: (millimes: number, options?: { sign?: boolean }) => string
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

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nState>(() => {
    const locale = lang === 'fr' ? 'fr-TN' : 'en-GB'
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    return {
      lang,
      t: dictionaries[lang],
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem('lang', next)
        } catch {
          // Not remembered in private browsing; that's fine.
        }
      },
      money: (millimes, options) => {
        const text = `${number.format(Math.abs(millimes) / 1000)} TND`
        if (millimes < 0) return `−${text}`
        return options?.sign && millimes > 0 ? `+${text}` : text
      },
      // Dates are calendar days (YYYY-MM-DD), so format them in UTC to avoid
      // shifting a day in other time zones.
      date: (iso, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
        new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(iso)),
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
