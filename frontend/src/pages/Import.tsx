import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheckBig,
  FileSpreadsheet,
  FileText,
  FileUp,
  LoaderCircle,
  ReceiptText,
  ScanText,
  TriangleAlert,
} from 'lucide-react'
import { useCategories } from '../data/CategoriesContext'
import { useBudgetAlerts } from '../data/useBudgetAlerts'
import { useI18n } from '../i18n/I18nContext'
import { ApiError, errorText } from '../lib/api'
import { categoryName } from '../lib/categoryStyle'
import { importsApi, type CsvMapping, type ImportPreview, type ImportRow } from '../lib/finance'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { FormError } from '../components/FormError'
import { PageHeader } from '../components/PageHeader'
import { SubmitButton } from '../components/SubmitButton'

type Step = 'pick' | 'reading' | 'review' | 'done'
type Row = ImportRow & { selected: boolean }

const MAX_SIZE = 5 * 1024 * 1024
const card = 'rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-ink-2'

export function Import() {
  const { t } = useI18n()
  const { reload: reloadCategories } = useCategories()
  const showAlerts = useBudgetAlerts()
  const [step, setStep] = useState<Step>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(0)

  const read = async (next: File, mapping?: CsvMapping) => {
    setError(null)
    if (next.size > MAX_SIZE) return setError(t.imports.errors.TOO_LARGE)
    setFile(next)
    setStep('reading')
    try {
      const result = await importsApi.preview(next, mapping)
      setPreview(result)
      setRows(result.rows.map((row) => ({ ...row, selected: !row.duplicate })))
      setStep('review')
    } catch (err) {
      const code = err instanceof ApiError ? err.message : ''
      setError(
        t.imports.errors[code] ?? errorText(err, t.errors, { 413: t.imports.errors.TOO_LARGE }),
      )
      // A wrong CSV mapping keeps the review open so it can be fixed.
      setStep(mapping && preview ? 'review' : 'pick')
    }
  }

  const confirm = async () => {
    if (!preview) return
    const chosen = rows.filter((r) => r.selected)
    setSaving(true)
    setError(null)
    try {
      const result = await importsApi.confirm(
        preview.kind === 'csv' ? 'CSV' : 'PDF',
        chosen.map(({ date, description, amount, type, categoryId }) => ({
          date,
          description,
          amount,
          type,
          categoryId,
        })),
      )
      setCreated(result.created)
      showAlerts(result.alerts)
      void reloadCategories()
      setStep('done')
    } catch (err) {
      setError(errorText(err, t.errors))
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep('pick')
    setFile(null)
    setPreview(null)
    setRows([])
    setError(null)
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title={t.imports.title} subtitle={t.imports.subtitle} />

      <AnimatePresence mode="wait">
        {step === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <DropZone onFile={(f) => void read(f)} />
            <FormError message={error} />
          </motion.div>
        )}

        {step === 'reading' && (
          <motion.div
            key="reading"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`${card} flex flex-col items-center px-6 py-16 text-center`}
          >
            <span className="relative grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30">
              <AnimatedIcon icon={ScanText} animation="pulse" size={28} />
              <motion.span
                className="absolute inset-x-2 h-0.5 rounded-full bg-white/80"
                animate={{ top: ['20%', '80%', '20%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </span>
            <p className="mt-5 font-medium">{t.imports.reading}</p>
            <p className="mt-1 max-w-sm text-sm text-ink/55 dark:text-white/55">{file?.name}</p>
            {file?.name.toLowerCase().endsWith('.pdf') && (
              <p className="mt-4 max-w-sm text-xs text-ink/45 dark:text-white/45">{t.imports.readingOcr}</p>
            )}
          </motion.div>
        )}

        {step === 'review' && preview && (
          <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 font-medium text-brand dark:bg-brand/20 dark:text-brand-glow">
                {preview.kind === 'csv' ? <FileSpreadsheet size={15} /> : preview.kind === 'payslip' ? <ReceiptText size={15} /> : <FileText size={15} />}
                {t.imports.detected[preview.kind]}
                {preview.ocr && ` · ${t.imports.scanned}`}
              </span>
              <span className="truncate text-ink/50 dark:text-white/50">{file?.name}</span>
            </div>

            {preview.payslip && <PayslipCard details={preview.payslip} />}
            {preview.csv && file && (
              <MappingCard
                headers={preview.csv.headers}
                mapping={preview.csv.mapping}
                onChange={(mapping) => void read(file, mapping)}
              />
            )}

            <ReviewList rows={rows} onChange={setRows} />
            <FormError message={error} />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={reset} className="h-12 rounded-xl px-4 text-sm font-medium text-ink/60 transition hover:text-ink dark:text-white/60 dark:hover:text-white">
                {t.imports.another}
              </button>
              <form
                className="sm:w-72"
                onSubmit={(e) => {
                  e.preventDefault()
                  void confirm()
                }}
              >
                <SubmitButton loading={saving}>{t.imports.confirm(rows.filter((r) => r.selected).length)}</SubmitButton>
              </form>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${card} flex flex-col items-center px-6 py-14 text-center`}
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="grid size-16 place-items-center rounded-full bg-brand text-white shadow-xl shadow-brand/30"
            >
              <CircleCheckBig size={30} />
            </motion.span>
            <h2 className="mt-5 font-display text-2xl font-semibold">{t.imports.doneTitle(created)}</h2>
            <p className="mt-2 text-ink/55 dark:text-white/55">{t.imports.doneText}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/app/transactions" className="flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-medium text-white shadow-lg shadow-brand/25 transition hover:bg-brand-hover">
                {t.imports.seeTransactions}
              </Link>
              <button type="button" onClick={reset} className="h-11 rounded-xl border border-black/10 px-5 text-sm font-medium transition hover:border-brand hover:text-brand dark:border-white/15">
                {t.imports.another}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const drop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <motion.button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      animate={{ scale: over ? 1.015 : 1 }}
      className={`flex w-full flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors ${over ? 'border-brand bg-brand-soft/60 dark:bg-brand/10' : 'border-black/12 bg-white hover:border-brand/60 dark:border-white/15 dark:bg-ink-2'}`}
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-ink text-white shadow-xl dark:bg-brand">
        <AnimatedIcon icon={FileUp} animation="float" size={28} />
      </span>
      <span className="mt-5 font-display text-xl font-semibold">{t.imports.drop}</span>
      <span className="mt-1 text-sm text-brand dark:text-brand-glow">{t.imports.browse}</span>
      <span className="mt-6 flex flex-wrap justify-center gap-2">
        {t.imports.kinds.map((kind) => (
          <span key={kind} className="rounded-full bg-black/[0.04] px-3 py-1 text-xs text-ink/60 dark:bg-white/[0.07] dark:text-white/60">
            {kind}
          </span>
        ))}
      </span>
      <span className="mt-4 text-xs text-ink/40 dark:text-white/40">{t.imports.hint}</span>
      <input
        ref={input}
        type="file"
        accept=".pdf,.csv,.txt,application/pdf,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </motion.button>
  )
}

function PayslipCard({ details }: { details: NonNullable<ImportPreview['payslip']> }) {
  const { t, money, date } = useI18n()
  const month = details.month ? date(`${details.month}-01`, { month: 'long', year: 'numeric' }) : ''
  const items = [
    { label: t.imports.gross, value: details.gross },
    { label: t.imports.cnss, value: details.cnss, minus: true },
    { label: t.imports.irpp, value: details.irpp, minus: true },
  ]
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white dark:border dark:border-white/10 dark:bg-ink-2">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand/40 blur-[80px]" />
      <p className="relative text-sm text-white/60 first-letter:uppercase">{t.imports.payslipTitle(month)}</p>
      <div className="relative mt-3 grid gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-white/50">{item.label}</p>
            <p className="font-display font-semibold tabular-nums">
              {item.value === null ? '—' : money(item.minus ? -item.value : item.value)}
            </p>
          </div>
        ))}
        <div>
          <p className="text-xs text-brand-glow">{t.imports.net}</p>
          <p className="font-display text-xl font-semibold tabular-nums">{details.net === null ? '—' : money(details.net)}</p>
        </div>
      </div>
    </div>
  )
}

function MappingCard({ headers, mapping, onChange }: { headers: string[]; mapping: CsvMapping; onChange: (m: CsvMapping) => void }) {
  const { t } = useI18n()
  const fields: (keyof CsvMapping)[] = ['date', 'description', 'debit', 'credit', 'amount']
  return (
    <div className={`${card} p-4`}>
      <p className="font-medium">{t.imports.columns}</p>
      <p className="text-sm text-ink/55 dark:text-white/55">{t.imports.columnsHint}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        {fields.map((field) => (
          <label key={field} className="text-xs text-ink/60 dark:text-white/60">
            {t.imports.column[field]}
            <select
              value={mapping[field] ?? ''}
              onChange={(e) => onChange({ ...mapping, [field]: e.target.value === '' ? null : Number(e.target.value) })}
              className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-transparent px-2 text-sm text-ink outline-none focus:border-brand dark:border-white/12 dark:bg-ink-2 dark:text-white"
            >
              <option value="">{t.imports.none}</option>
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  {header || `#${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  )
}

function ReviewList({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const { t, money, date } = useI18n()
  const { categories } = useCategories()
  const update = (index: number, patch: Partial<Row>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  const selected = rows.filter((r) => r.selected)
  const totalIn = selected.filter((r) => r.type === 'INCOME').reduce((s, r) => s + r.amount, 0)
  const totalOut = selected.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + r.amount, 0)
  const allSelected = selected.length === rows.length

  return (
    <div className={`${card} p-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-3">
        <div>
          <p className="font-medium">{t.imports.review}</p>
          <p className="text-sm text-ink/55 dark:text-white/55">{t.imports.reviewHint}</p>
        </div>
        <div className="text-right text-sm tabular-nums">
          <p className="text-emerald-600 dark:text-emerald-400">{money(totalIn, { sign: true })}</p>
          <p>{money(-totalOut)}</p>
        </div>
      </div>
      <label className="flex items-center gap-3 border-y border-black/5 px-3 py-2 text-sm text-ink/60 dark:border-white/8 dark:text-white/60">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onChange(rows.map((r) => ({ ...r, selected: !allSelected })))}
          className="size-4 accent-[var(--color-brand)]"
        />
        {t.imports.selected(selected.length, rows.length)}
      </label>
      <ul className="divide-y divide-black/5 dark:divide-white/8">
        {rows.map((row, index) => {
          const choices = categories.filter((c) => c.type === row.type)
          return (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: row.selected ? 1 : 0.5, x: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.4) }}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap"
            >
              <input
                type="checkbox"
                checked={row.selected}
                onChange={() => update(index, { selected: !row.selected })}
                aria-label={row.description}
                className="size-4 shrink-0 accent-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={() => update(index, { type: row.type === 'INCOME' ? 'EXPENSE' : 'INCOME', categoryId: null })}
                title={row.type === 'INCOME' ? t.transactions.income : t.transactions.expense}
                className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${row.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 text-ink/60 dark:bg-white/8 dark:text-white/60'}`}
              >
                {row.type === 'INCOME' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              </button>
              <div className="min-w-0 flex-1 basis-40">
                <input
                  value={row.description}
                  maxLength={120}
                  onChange={(e) => update(index, { description: e.target.value })}
                  className="w-full truncate rounded-md bg-transparent text-sm font-medium outline-none focus:bg-black/[0.03] dark:focus:bg-white/[0.05]"
                />
                <p className="flex items-center gap-1.5 text-xs text-ink/50 dark:text-white/50">
                  {date(row.date)}
                  {row.duplicate && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <TriangleAlert size={12} /> {t.imports.duplicate}
                    </span>
                  )}
                </p>
              </div>
              <select
                value={row.categoryId ?? ''}
                onChange={(e) => update(index, { categoryId: e.target.value || null })}
                aria-label={t.transactions.category}
                className="h-9 w-full rounded-lg border border-black/10 bg-transparent px-2 text-sm outline-none focus:border-brand sm:w-44 dark:border-white/12 dark:bg-ink-2"
              >
                <option value="">{t.transactions.uncategorized}</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(c, t)}
                  </option>
                ))}
              </select>
              <span className={`w-32 shrink-0 text-right font-display text-sm font-semibold tabular-nums ${row.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {money(row.type === 'INCOME' ? row.amount : -row.amount, { sign: true })}
              </span>
            </motion.li>
          )
        })}
      </ul>
      {rows.length === 0 && (
        <div className="flex justify-center py-6 text-brand">
          <LoaderCircle className="animate-spin" />
        </div>
      )}
    </div>
  )
}
