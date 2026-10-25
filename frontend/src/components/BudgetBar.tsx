import { motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'

// Purple under 80 %, orange from 80 %, red from 100 %.
export function budgetTone(spent: number, limit: number) {
  const ratio = spent / limit
  if (ratio >= 1) return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
  if (ratio >= 0.8) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
  return { bar: 'bg-brand', text: 'text-brand dark:text-brand-glow' }
}

export function BudgetBar({ spent, limit, delay = 0 }: { spent: number; limit: number; delay?: number }) {
  const { t, money } = useI18n()
  const tone = budgetTone(spent, limit)
  const percent = Math.round((spent / limit) * 100)
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/8">
        <motion.div
          className={`h-full rounded-full ${tone.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
          transition={{ duration: 0.9, delay, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-xs">
        <span className="text-ink/55 tabular-nums dark:text-white/55">{t.budgets.of(money(spent), money(limit))}</span>
        <span className={`font-medium tabular-nums ${tone.text}`}>
          {spent > limit ? t.budgets.over(money(spent - limit)) : t.budgets.left(money(limit - spent))} · {percent}%
        </span>
      </div>
    </div>
  )
}
