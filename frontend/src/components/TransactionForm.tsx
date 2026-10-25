import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { useCategories } from '../data/CategoriesContext'
import { useBudgetAlerts } from '../data/useBudgetAlerts'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { categoryName } from '../lib/categoryStyle'
import {
  formatAmountInput,
  parseAmount,
  toDay,
  transactionsApi,
  type Transaction,
  type TransactionType,
} from '../lib/finance'
import { CategoryIcon } from './CategoryIcon'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { SubmitButton } from './SubmitButton'
import { TypeSwitch } from './TypeSwitch'
import { useToast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  transaction?: Transaction | null
}

const inputClass =
  'h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[15px] outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/12 dark:bg-ink dark:placeholder:text-white/30 dark:focus:border-brand-glow'

export function TransactionForm({ open, onClose, onSaved, transaction }: Props) {
  const { t } = useI18n()
  const toast = useToast()
  const { categories } = useCategories()
  const showAlerts = useBudgetAlerts()
  const [type, setType] = useState<TransactionType>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(toDay(new Date()))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Fill the form each time it opens.
  useEffect(() => {
    if (!open) return
    setType(transaction?.type ?? 'EXPENSE')
    setAmount(transaction ? formatAmountInput(transaction.amount) : '')
    setDescription(transaction?.description ?? '')
    setCategoryId(transaction?.categoryId ?? null)
    setDate(transaction?.date.slice(0, 10) ?? toDay(new Date()))
    setNote(transaction?.note ?? '')
    setError(null)
    setConfirmDelete(false)
  }, [open, transaction])

  const choices = categories.filter((c) => c.type === type)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const millimes = parseAmount(amount)
    if (millimes === null) return setError(t.transactions.errors.amount)
    if (!date) return setError(t.transactions.errors.date)

    // The description is optional: fall back to the category name, or to
    // "Income" / "Expense" when no category was picked either.
    const category = categories.find((c) => c.id === categoryId)
    const label =
      description.trim() ||
      (category ? categoryName(category, t) : type === 'INCOME' ? t.transactions.income : t.transactions.expense)

    setError(null)
    setSaving(true)
    const data = { type, amount: millimes, description: label, categoryId, date, note: note.trim() || null }
    try {
      if (transaction) await transactionsApi.update(transaction.id, data)
      else showAlerts((await transactionsApi.create(data)).alerts)
      toast(t.transactions.saved)
      onSaved()
      onClose()
    } catch (err) {
      setError(errorText(err, t.errors, { 404: t.errors.notFound }))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!transaction) return
    if (!confirmDelete) return setConfirmDelete(true)
    try {
      await transactionsApi.remove(transaction.id)
      toast(t.transactions.deleted)
      onSaved()
      onClose()
    } catch (err) {
      setError(errorText(err, t.errors, { 404: t.errors.notFound }))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={transaction ? t.transactions.editTitle : t.transactions.newTitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <TypeSwitch
          id="form"
          value={type}
          onChange={(next) => {
            if (!next || next === type) return
            setType(next)
            setCategoryId(null)
          }}
        />

        <div>
          <label htmlFor="tx-amount" className="text-sm font-medium text-ink/80 dark:text-white/80">
            {t.transactions.amount}
          </label>
          <input
            id="tx-amount"
            inputMode="decimal"
            autoFocus={!transaction}
            placeholder={t.transactions.amountPlaceholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} mt-1.5 h-14 font-display text-2xl font-semibold tabular-nums ${type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
          />
        </div>

        <div>
          <label htmlFor="tx-description" className="text-sm font-medium text-ink/80 dark:text-white/80">
            {t.transactions.description}{' '}
            <span className="font-normal text-ink/40 dark:text-white/40">({t.common.optional})</span>
          </label>
          <input
            id="tx-description"
            maxLength={120}
            placeholder={t.transactions.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink/80 dark:text-white/80">{t.transactions.category}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {choices.map((category) => {
              const active = category.id === categoryId
              return (
                <motion.button
                  key={category.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategoryId(active ? null : category.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-[11px] leading-tight transition ${active ? 'border-brand bg-brand-soft text-ink dark:border-brand-glow dark:bg-brand/20 dark:text-white' : 'border-black/8 text-ink/70 hover:border-black/20 dark:border-white/10 dark:text-white/70 dark:hover:border-white/25'}`}
                >
                  <CategoryIcon icon={category.icon} color={category.color} size={32} />
                  <span className="line-clamp-2">{categoryName(category, t)}</span>
                </motion.button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tx-date" className="text-sm font-medium text-ink/80 dark:text-white/80">
              {t.transactions.date}
            </label>
            <input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="tx-note" className="text-sm font-medium text-ink/80 dark:text-white/80">
              {t.transactions.note} <span className="font-normal text-ink/40 dark:text-white/40">({t.common.optional})</span>
            </label>
            <input
              id="tx-note"
              maxLength={500}
              placeholder={t.transactions.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </div>
        </div>

        <FormError message={error} />

        <div className="flex gap-3">
          {transaction && (
            <button
              type="button"
              onClick={remove}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition ${confirmDelete ? 'bg-red-600 text-white' : 'border border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400'}`}
            >
              <Trash2 size={17} />
              <span className={confirmDelete ? '' : 'sr-only sm:not-sr-only'}>
                {confirmDelete ? t.transactions.deleteConfirm : t.common.delete}
              </span>
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
