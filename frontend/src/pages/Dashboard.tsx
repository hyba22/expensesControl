import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  PiggyBank,
  Plus,
  ReceiptText,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useCategories } from '../data/CategoriesContext'
import { useI18n } from '../i18n/I18nContext'
import type { Dictionary } from '../i18n/en'
import { categoryName } from '../lib/categoryStyle'
import { budgetsApi, toDay, transactionsApi, type Budget, type Summary, type Transaction } from '../lib/finance'
import { BudgetBar } from '../components/BudgetBar'
import { AnimatedIcon, type IconAnimation } from '../components/AnimatedIcon'
import { CategoryIcon } from '../components/CategoryIcon'
import { PrimaryButton } from '../components/PageHeader'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionRow } from '../components/TransactionRow'

const upcoming: { key: keyof Dictionary['dashboard']['upcoming']; icon: LucideIcon; animation: IconAnimation }[] = [
  { key: 'salary', icon: PiggyBank, animation: 'wiggle' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
const card = 'rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-ink-2'

export function Dashboard() {
  const { user } = useAuth()
  const { t, money } = useI18n()
  const { byId, reload: reloadCategories } = useCategories()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [budgets, setBudgets] = useState<Budget[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const firstName = user?.name.split(' ')[0] ?? ''

  const month = toDay(new Date()).slice(0, 7)

  const load = useCallback(async () => {
    const [nextSummary, overview] = await Promise.all([transactionsApi.summary(month), budgetsApi.overview(month)])
    setSummary(nextSummary)
    setBudgets(overview.budgets)
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  const openForm = (transaction: Transaction | null) => {
    setEditing(transaction)
    setFormOpen(true)
  }

  const stats: { label: string; value: number; icon: LucideIcon; hint?: string; danger?: boolean }[] = [
    { label: t.dashboard.balance, value: summary?.balance ?? 0, icon: Wallet, danger: (summary?.balance ?? 0) < 0 },
    { label: t.dashboard.spent, value: summary?.expense ?? 0, icon: ArrowUpRight },
  ]
  const watched = [...(budgets ?? [])].sort((a, b) => b.spent / b.amount - a.spent / a.amount).slice(0, 3)
  const topSpend = summary?.byCategory[0]?.amount ?? 1
  const empty = summary !== null && summary.recent.length === 0

  return (
    <motion.main
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white sm:p-10 dark:border dark:border-white/10 dark:bg-ink-2"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-brand/50 blur-[100px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              <AnimatedIcon icon={Sparkles} animation="pulse" size={14} className="text-brand-glow" />
              {t.dashboard.badge}
            </span>
            <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.dashboard.greeting(firstName)}
            </h1>
            <p className="mt-3 text-white/60">{t.dashboard.intro}</p>
          </div>
          <PrimaryButton icon={<Plus size={18} />} onClick={() => openForm(null)}>
            {t.transactions.add}
          </PrimaryButton>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2">
        {stats.map(({ label, value, icon, hint, danger }, i) => (
          <motion.div key={label} variants={item} className={`${card} p-5`}>
            <div className="flex items-center justify-between text-sm text-ink/55 dark:text-white/55">
              {label}
              <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-brand/20 dark:text-brand-glow">
                <AnimatedIcon icon={icon} animation={i === 0 ? 'float' : 'pulse'} size={17} />
              </span>
            </div>
            <p
              className={`mt-3 font-display text-2xl font-semibold tabular-nums ${danger ? 'text-red-600 dark:text-red-400' : i === 0 ? 'text-brand dark:text-brand-glow' : ''}`}
            >
              {money(value)}
            </p>
            {hint && <p className="mt-1 text-xs text-ink/45 dark:text-white/45">{hint}</p>}
          </motion.div>
        ))}
      </section>

      {empty ? (
        <motion.section
          variants={item}
          className={`${card} flex flex-col items-center px-6 py-12 text-center`}
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30">
            <AnimatedIcon icon={ReceiptText} animation="wiggle" size={28} />
          </span>
          <h2 className="mt-5 font-display text-xl font-semibold">{t.dashboard.emptyTitle}</h2>
          <p className="mt-2 max-w-sm text-ink/55 dark:text-white/55">{t.dashboard.emptyText}</p>
          <div className="mt-6">
            <PrimaryButton icon={<Plus size={18} />} onClick={() => openForm(null)}>
              {t.transactions.add}
            </PrimaryButton>
          </div>
        </motion.section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-5">
          <motion.div variants={item} className={`${card} p-5 lg:col-span-2`}>
            <h2 className="font-display text-lg font-semibold">{t.dashboard.byCategory}</h2>
            {summary && summary.byCategory.length === 0 ? (
              <p className="mt-6 text-sm text-ink/55 dark:text-white/55">{t.dashboard.noSpending}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {summary?.byCategory.slice(0, 6).map((row, i) => {
                  const category = byId(row.categoryId)
                  const color = category?.color ?? '#64748b'
                  return (
                    <li key={row.categoryId ?? 'none'} className="flex items-center gap-3">
                      <CategoryIcon icon={category?.icon} color={color} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate">
                            {category ? categoryName(category, t) : t.transactions.uncategorized}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">{money(row.amount)}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/8">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: color === '#18181b' ? 'var(--color-brand)' : color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(4, (row.amount / topSpend) * 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>

          <motion.div variants={item} className={`${card} p-3 lg:col-span-3`}>
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <h2 className="font-display text-lg font-semibold">{t.dashboard.recent}</h2>
              <Link
                to="/app/transactions"
                className="group flex items-center gap-1 text-sm font-medium text-brand dark:text-brand-glow"
              >
                {t.dashboard.seeAll}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <ul>
              {summary?.recent.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} onClick={() => openForm(tx)} />
              ))}
            </ul>
          </motion.div>
        </section>
      )}

      <motion.section variants={item} className={`${card} p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{t.dashboard.budgetsTitle}</h2>
          <Link to="/app/budgets" className="group flex items-center gap-1 text-sm font-medium text-brand dark:text-brand-glow">
            {watched.length ? t.dashboard.seeAll : t.dashboard.setBudgets}
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        {budgets && watched.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink/55 dark:text-white/55">
            <AnimatedIcon icon={Target} animation="pulse" size={16} className="text-brand dark:text-brand-glow" />
            {t.dashboard.noBudgets}
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 md:grid-cols-3">
            {watched.map((budget, i) => {
              const category = byId(budget.categoryId)
              return (
                <li key={budget.id}>
                  <div className="mb-2 flex items-center gap-2.5 text-sm font-medium">
                    <CategoryIcon icon={category?.icon} color={category?.color} size={30} />
                    {category ? categoryName(category, t) : '—'}
                  </div>
                  <BudgetBar spent={budget.spent} limit={budget.amount} delay={0.2 + i * 0.08} />
                </li>
              )
            })}
          </ul>
        )}
      </motion.section>

      <section>
        <motion.h2 variants={item} className="font-display text-lg font-semibold">
          {t.dashboard.comingNext}
        </motion.h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map(({ key, icon, animation }, i) => {
            const [title, text] = t.dashboard.upcoming[key]
            return (
              <motion.article
                key={key}
                variants={item}
                whileHover={{ y: -4 }}
                className={`${card} group p-4 transition-colors hover:border-brand/40 dark:hover:border-brand-glow/40`}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-ink text-white transition-colors group-hover:bg-brand dark:bg-white/10">
                  <AnimatedIcon icon={icon} animation={animation} size={19} delay={i * 0.3} />
                </span>
                <h3 className="mt-3 text-sm font-medium">{title}</h3>
                <p className="mt-1 text-xs text-ink/55 dark:text-white/55">{text}</p>
              </motion.article>
            )
          })}
        </div>
      </section>

      <TransactionForm
        open={formOpen}
        transaction={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          void load()
          void reloadCategories()
        }}
      />
    </motion.main>
  )
}
