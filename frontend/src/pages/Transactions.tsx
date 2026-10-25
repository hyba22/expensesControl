import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, LoaderCircle, Plus, ReceiptText, Search } from 'lucide-react'
import { useCategories } from '../data/CategoriesContext'
import { useI18n } from '../i18n/I18nContext'
import { categoryName } from '../lib/categoryStyle'
import {
  monthBounds,
  shiftMonth,
  toDay,
  transactionsApi,
  type Transaction,
  type TransactionPage,
  type Summary,
  type TransactionType,
} from '../lib/finance'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { PageHeader, PrimaryButton } from '../components/PageHeader'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionRow } from '../components/TransactionRow'
import { TypeSwitch } from '../components/TypeSwitch'

export function Transactions() {
  const { t, money, date } = useI18n()
  const { categories } = useCategories()
  const [month, setMonth] = useState(() => toDay(new Date()).slice(0, 7))
  const [type, setType] = useState<TransactionType | undefined>()
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [data, setData] = useState<TransactionPage | null>(null)
  const [overview, setOverview] = useState<Summary | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true)
      try {
        const result = await transactionsApi.list({
          ...monthBounds(month),
          type,
          categoryId: categoryId || undefined,
          search: debounced,
          page: nextPage,
        })
        setData((previous) =>
          nextPage > 1 && previous ? { ...result, items: [...previous.items, ...result.items] } : result,
        )
        setPage(nextPage)
        if (nextPage === 1) setOverview(await transactionsApi.summary(month))
      } finally {
        setLoading(false)
      }
    },
    [month, type, categoryId, debounced],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  // Group the list by day, newest first.
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const item of data?.items ?? []) {
      const day = item.date.slice(0, 10)
      map.set(day, [...(map.get(day) ?? []), item])
    }
    return [...map.entries()]
  }, [data])

  const today = toDay(new Date())
  const yesterday = toDay(new Date(Date.now() - 86_400_000))
  const dayLabel = (day: string) =>
    day === today ? t.transactions.today : day === yesterday ? t.transactions.yesterday : date(day, { weekday: 'long', day: 'numeric', month: 'long' })

  const filtered = categories.filter((c) => !type || c.type === type)
  // Salaries arrive at the end of the month and pay for the next one, so the
  // money in for this month is what was received last month.
  const income = overview?.available ?? 0
  const spent = overview?.expense ?? 0
  const net = income - spent
  const lastMonth = date(`${shiftMonth(month, -1)}-01`, { month: 'long' })

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title={t.transactions.title}
        subtitle={t.transactions.subtitle}
        action={
          <PrimaryButton
            icon={<Plus size={18} />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            {t.transactions.add}
          </PrimaryButton>
        }
      />

      <section className="space-y-3 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/8 dark:bg-ink-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t.transactions.prevMonth}
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="grid size-9 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="inline-block min-w-36 text-center font-medium first-letter:uppercase">
              {date(`${month}-01`, { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              aria-label={t.transactions.nextMonth}
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="grid size-9 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="min-w-60 flex-1">
            <TypeSwitch
              id="filter"
              allowAll
              value={type}
              onChange={(next) => {
                setType(next)
                setCategoryId('')
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-48 flex-1">
            <Search size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-ink/40 dark:text-white/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.transactions.search}
              className="h-10 w-full rounded-xl border border-black/10 bg-transparent pl-10 pr-3 text-sm outline-none transition focus:border-brand dark:border-white/12 dark:focus:border-brand-glow"
            />
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label={t.transactions.category}
            className="h-10 min-w-48 flex-1 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none transition focus:border-brand sm:flex-none dark:border-white/12 dark:bg-ink-2 dark:focus:border-brand-glow"
          >
            <option value="">{t.transactions.allCategories}</option>
            {filtered.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c, t)}
              </option>
            ))}
            <option value="none">{t.transactions.uncategorized}</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { label: t.transactions.totalIn, value: income, className: 'text-emerald-600 dark:text-emerald-400', hint: t.transactions.receivedIn(lastMonth) },
          { label: t.transactions.totalOut, value: -spent, className: '' },
          { label: t.transactions.net, value: net, className: net >= 0 ? 'text-brand dark:text-brand-glow' : 'text-red-600 dark:text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-black/5 bg-white p-3 sm:p-4 dark:border-white/8 dark:bg-ink-2">
            <p className="text-xs text-ink/55 sm:text-sm dark:text-white/55">{stat.label}</p>
            <p className={`mt-1 truncate font-display text-sm font-semibold tabular-nums sm:text-lg ${stat.className}`}>
              {money(stat.value, { sign: true })}
            </p>
            {'hint' in stat && <p className="truncate text-[11px] text-ink/45 sm:text-xs dark:text-white/45">{stat.hint}</p>}
          </div>
        ))}
      </section>

      <section className="space-y-5">
        {loading && !data ? (
          <div className="grid place-items-center py-16 text-brand">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center rounded-2xl border border-dashed border-black/10 px-6 py-14 text-center dark:border-white/12"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand dark:bg-brand/20 dark:text-brand-glow">
              <AnimatedIcon icon={ReceiptText} animation="wiggle" size={26} />
            </span>
            <h2 className="mt-4 font-medium">{t.transactions.emptyTitle}</h2>
            <p className="mt-1 text-sm text-ink/55 dark:text-white/55">{t.transactions.emptyText}</p>
          </motion.div>
        ) : (
          groups.map(([day, items]) => (
            <div key={day}>
              <h2 className="mb-1 px-2 text-sm font-medium text-ink/50 first-letter:uppercase dark:text-white/50">{dayLabel(day)}</h2>
              <ul className="rounded-2xl border border-black/5 bg-white p-1.5 dark:border-white/8 dark:bg-ink-2">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <TransactionRow
                      key={item.id}
                      transaction={item}
                      onClick={() => {
                        setEditing(item)
                        setFormOpen(true)
                      }}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))
        )}

        {data && data.items.length < data.total && (
          <button
            type="button"
            onClick={() => load(page + 1)}
            disabled={loading}
            className="mx-auto flex h-10 items-center gap-2 rounded-xl border border-black/10 px-5 text-sm font-medium transition hover:border-brand hover:text-brand dark:border-white/15"
          >
            {loading && <LoaderCircle size={16} className="animate-spin" />}
            {t.transactions.loadMore}
          </button>
        )}
      </section>

      <TransactionForm
        open={formOpen}
        transaction={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load(1)}
      />
    </main>
  )
}
