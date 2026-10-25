import { motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'
import { categoryName } from '../lib/categoryStyle'
import type { Transaction } from '../lib/finance'
import { CategoryIcon } from './CategoryIcon'

export function TransactionRow({ transaction, onClick }: { transaction: Transaction; onClick: () => void }) {
  const { t, money } = useI18n()
  const { category } = transaction
  const income = transaction.type === 'INCOME'

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        <CategoryIcon icon={category?.icon} color={category?.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{transaction.description}</span>
          <span className="block truncate text-sm text-ink/50 dark:text-white/50">
            {category ? categoryName(category, t) : t.transactions.uncategorized}
            {transaction.note && ` · ${transaction.note}`}
          </span>
        </span>
        <span
          className={`shrink-0 font-display font-semibold tabular-nums ${income ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
        >
          {money(income ? transaction.amount : -transaction.amount, { sign: true })}
        </span>
      </button>
    </motion.li>
  )
}
