import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { shiftMonth } from '../lib/finance'

// "← Octobre 2026 →" for a month written as YYYY-MM.
export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const { t, date } = useI18n()
  const button = 'grid size-9 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10'
  return (
    <div className="flex items-center gap-1 rounded-xl border border-black/5 bg-white p-1 dark:border-white/8 dark:bg-ink-2">
      <button type="button" aria-label={t.transactions.prevMonth} onClick={() => onChange(shiftMonth(month, -1))} className={button}>
        <ChevronLeft size={18} />
      </button>
      <span className="inline-block min-w-36 text-center font-medium first-letter:uppercase">
        {date(`${month}-01`, { month: 'long', year: 'numeric' })}
      </span>
      <button type="button" aria-label={t.transactions.nextMonth} onClick={() => onChange(shiftMonth(month, 1))} className={button}>
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
