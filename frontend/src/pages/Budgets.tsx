import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { LoaderCircle, Plus, Sparkles, Target, Trash2 } from 'lucide-react'
import { useCategories } from '../data/CategoriesContext'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { categoryName } from '../lib/categoryStyle'
import { budgetsApi, formatAmountInput, parseAmount, toDay, type Budget, type BudgetOverview } from '../lib/finance'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { BudgetBar } from '../components/BudgetBar'
import { CategoryIcon } from '../components/CategoryIcon'
import { FormError } from '../components/FormError'
import { Modal } from '../components/Modal'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { PageHeader, PrimaryButton } from '../components/PageHeader'
import { SubmitButton } from '../components/SubmitButton'
import { useToast } from '../components/Toast'

export function Budgets() {
  const { t } = useI18n()
  const { byId } = useCategories()
  const [month, setMonth] = useState(() => toDay(new Date()).slice(0, 7))
  const [data, setData] = useState<BudgetOverview | null>(null)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => setData(await budgetsApi.overview(month)), [month])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title={t.budgets.title}
        subtitle={t.budgets.subtitle}
        action={
          <div className="flex flex-wrap gap-3">
            <MonthSwitcher month={month} onChange={setMonth} />
            <PrimaryButton
              icon={<Plus size={18} />}
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              {t.budgets.add}
            </PrimaryButton>
          </div>
        }
      />

      {!data ? (
        <div className="grid place-items-center py-20 text-brand">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : data.budgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center rounded-2xl border border-dashed border-black/10 px-6 py-14 text-center dark:border-white/12"
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30">
            <AnimatedIcon icon={Target} animation="pulse" size={28} />
          </span>
          <h2 className="mt-5 font-display text-xl font-semibold">{t.budgets.emptyTitle}</h2>
          <p className="mt-2 max-w-sm text-ink/55 dark:text-white/55">{t.budgets.emptyText}</p>
        </motion.div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="grid gap-3 sm:grid-cols-2"
        >
          {[...data.budgets]
            .sort((a, b) => b.spent / b.amount - a.spent / a.amount)
            .map((budget, i) => {
              const category = byId(budget.categoryId)
              return (
                <motion.li key={budget.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(budget)
                      setOpen(true)
                    }}
                    className="w-full rounded-2xl border border-black/5 bg-white p-4 text-left transition-colors hover:border-brand/40 dark:border-white/8 dark:bg-ink-2 dark:hover:border-brand-glow/40"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <CategoryIcon icon={category?.icon} color={category?.color} size={36} />
                      <span className="font-medium">{category ? categoryName(category, t) : '—'}</span>
                    </div>
                    <BudgetBar spent={budget.spent} limit={budget.amount} delay={0.1 + i * 0.05} />
                  </button>
                </motion.li>
              )
            })}
        </motion.ul>
      )}

      <BudgetForm
        open={open}
        budget={editing}
        overview={data}
        onClose={() => setOpen(false)}
        onSaved={load}
      />
    </main>
  )
}

function BudgetForm({
  open,
  budget,
  overview,
  onClose,
  onSaved,
}: {
  open: boolean
  budget: Budget | null
  overview: BudgetOverview | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t, money } = useI18n()
  const toast = useToast()
  const { categories } = useCategories()
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategoryId(budget?.categoryId ?? '')
    setAmount(budget ? formatAmountInput(budget.amount) : '')
    setError(null)
  }, [open, budget])

  // Categories that don't have a budget yet (plus the one being edited).
  const taken = new Set(overview?.budgets.map((b) => b.categoryId))
  const choices = categories.filter((c) => c.type === 'EXPENSE' && (!taken.has(c.id) || c.id === budget?.categoryId))
  const suggestion = categoryId ? overview?.suggestions[categoryId] : undefined

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!categoryId) return setError(t.budgets.errors.category)
    const millimes = parseAmount(amount)
    if (millimes === null || millimes < 1000) return setError(t.budgets.errors.limit)
    setSaving(true)
    setError(null)
    try {
      await budgetsApi.set(categoryId, millimes)
      toast(t.budgets.saved)
      await onSaved()
      onClose()
    } catch (err) {
      setError(errorText(err, t.errors))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!budget) return
    await budgetsApi.remove(budget.id)
    await onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={budget ? t.budgets.editTitle : t.budgets.add}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <fieldset disabled={!!budget}>
          <legend className="text-sm font-medium text-ink/80 dark:text-white/80">{t.budgets.category}</legend>
          <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {choices.map((c) => {
              const active = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-[11px] leading-tight transition ${active ? 'border-brand bg-brand-soft dark:border-brand-glow dark:bg-brand/20' : 'border-black/8 text-ink/70 hover:border-black/20 dark:border-white/10 dark:text-white/70'}`}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size={30} />
                  <span className="line-clamp-2">{categoryName(c, t)}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="budget-amount" className="text-sm font-medium text-ink/80 dark:text-white/80">
            {t.budgets.limit}
          </label>
          <input
            id="budget-amount"
            inputMode="decimal"
            placeholder="300"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 h-14 w-full rounded-xl border border-black/10 bg-white px-3.5 font-display text-2xl font-semibold tabular-nums outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/12 dark:bg-ink dark:focus:border-brand-glow"
          />
          {!!suggestion && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink/60 dark:text-white/60">
              <Sparkles size={15} className="text-brand dark:text-brand-glow" />
              {t.budgets.suggestion(money(suggestion))}
              <button type="button" onClick={() => setAmount(formatAmountInput(suggestion))} className="font-medium text-brand hover:underline dark:text-brand-glow">
                {t.budgets.useSuggestion}
              </button>
            </motion.p>
          )}
        </div>

        <FormError message={error} />

        <div className="flex gap-3">
          {budget && (
            <button
              type="button"
              onClick={remove}
              aria-label={t.budgets.remove}
              className="grid h-12 w-12 place-items-center rounded-xl border border-red-500/30 text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 size={17} />
            </button>
          )}
          <div className="flex-1">
            <SubmitButton loading={saving}>{t.common.save}</SubmitButton>
          </div>
        </div>
      </form>
    </Modal>
  )
}
