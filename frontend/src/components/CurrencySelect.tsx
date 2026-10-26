import { useId } from 'react'
import { ChevronDown, Coins } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { CURRENCIES, currencyName } from '../lib/currencies'

export function CurrencySelect({ label, value, onChange }: { label: string; value: string; onChange: (code: string) => void }) {
  const { lang } = useI18n()
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink/80 dark:text-white/80">
        {label}
      </label>
      <div className="group relative">
        <Coins
          size={18}
          className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-ink/40 transition group-focus-within:text-brand dark:text-white/40 dark:group-focus-within:text-brand-glow"
        />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-black/10 bg-white pl-11 pr-10 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/12 dark:bg-ink-2 dark:text-white dark:focus:border-brand-glow"
        >
          {CURRENCIES.map(({ code }) => {
            const name = currencyName(code, lang)
            return (
              <option key={code} value={code}>
                {code} · {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            )
          })}
        </select>
        <ChevronDown size={17} className="pointer-events-none absolute inset-y-0 right-3.5 my-auto text-ink/40 dark:text-white/40" />
      </div>
    </div>
  )
}
