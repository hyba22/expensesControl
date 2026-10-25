import { motion } from 'motion/react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { TransactionType } from '../lib/finance'

interface Props {
  value: TransactionType | undefined
  onChange: (value: TransactionType | undefined) => void
  allowAll?: boolean
  id: string
}

// Segmented control: Expense / Income (and optionally All).
export function TypeSwitch({ value, onChange, allowAll = false, id }: Props) {
  const { t } = useI18n()
  const options: { value: TransactionType | undefined; label: string; icon?: typeof ArrowUpRight }[] = [
    ...(allowAll ? [{ value: undefined, label: t.common.all }] : []),
    { value: 'EXPENSE', label: allowAll ? t.transactions.expenses : t.transactions.expense, icon: ArrowUpRight },
    { value: 'INCOME', label: allowAll ? t.transactions.incomes : t.transactions.income, icon: ArrowDownLeft },
  ]

  return (
    <div className="flex rounded-xl bg-black/[0.05] p-1 dark:bg-white/[0.07]" role="radiogroup">
      {options.map((option) => {
        const active = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${active ? 'text-white' : 'text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white'}`}
          >
            {active && (
              <motion.span
                layoutId={`type-switch-${id}`}
                className="absolute inset-0 rounded-lg bg-ink dark:bg-brand"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            )}
            {Icon && <Icon size={15} className="relative" />}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
