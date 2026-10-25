import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Check, Plus, Shapes, Trash2 } from 'lucide-react'
import { useCategories } from '../data/CategoriesContext'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { CATEGORY_COLORS, CATEGORY_ICONS, categoryName } from '../lib/categoryStyle'
import { categoriesApi, type Category, type TransactionType } from '../lib/finance'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { CategoryIcon } from '../components/CategoryIcon'
import { FormError } from '../components/FormError'
import { Modal } from '../components/Modal'
import { PageHeader, PrimaryButton } from '../components/PageHeader'
import { SubmitButton } from '../components/SubmitButton'
import { TypeSwitch } from '../components/TypeSwitch'
import { useToast } from '../components/Toast'

export function Categories() {
  const { t } = useI18n()
  const { categories, reload } = useCategories()
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)

  const sections: { type: TransactionType; title: string }[] = [
    { type: 'EXPENSE', title: t.transactions.expenses },
    { type: 'INCOME', title: t.transactions.incomes },
  ]

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title={t.categories.title}
        subtitle={t.categories.subtitle}
        action={
          <PrimaryButton
            icon={<Plus size={18} />}
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            {t.categories.add}
          </PrimaryButton>
        }
      />

      {sections.map((section) => (
        <section key={section.type}>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            {section.title}
          </h2>
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
          >
            {categories
              .filter((c) => c.type === section.type)
              .map((category) => (
                <motion.button
                  key={category.id}
                  type="button"
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -3 }}
                  onClick={() => {
                    setEditing(category)
                    setOpen(true)
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left transition-colors hover:border-brand/40 dark:border-white/8 dark:bg-ink-2 dark:hover:border-brand-glow/40"
                >
                  <CategoryIcon icon={category.icon} color={category.color} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{categoryName(category, t)}</span>
                    <span className="block text-xs text-ink/50 dark:text-white/50">
                      {t.categories.used(category._count?.transactions ?? 0)}
                    </span>
                  </span>
                </motion.button>
              ))}
          </motion.div>
        </section>
      ))}

      {categories.length === 0 && (
        <div className="grid place-items-center py-10 text-brand">
          <AnimatedIcon icon={Shapes} animation="spin" size={28} />
        </div>
      )}

      <CategoryForm open={open} category={editing} onClose={() => setOpen(false)} onSaved={reload} />
    </main>
  )
}

function CategoryForm({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean
  category: Category | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const toast = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('EXPENSE')
  const [icon, setIcon] = useState('shopping-cart')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(category ? categoryName(category, t) : '')
    setType(category?.type ?? 'EXPENSE')
    setIcon(category?.icon ?? 'shopping-cart')
    setColor(category?.color ?? CATEGORY_COLORS[0])
    setError(null)
    setConfirmDelete(false)
  }, [open, category, t])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const clean = name.trim()
    if (clean.length < 1 || clean.length > 40) return setError(t.categories.errors.name)
    setError(null)
    setSaving(true)
    try {
      if (category) {
        // Built-in names stay translated unless the user actually renamed them.
        const renamed = clean !== categoryName(category, t)
        await categoriesApi.update(category.id, { icon, color, ...(renamed && { name: clean }) })
      } else {
        await categoriesApi.create({ name: clean, type, icon, color })
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError(errorText(err, t.errors, { 409: t.categories.errors.exists, 404: t.errors.notFound }))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!category) return
    if (!confirmDelete) return setConfirmDelete(true)
    try {
      await categoriesApi.remove(category.id)
      await onSaved()
      onClose()
    } catch (err) {
      toast(errorText(err, t.errors), true)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={category ? t.categories.editTitle : t.categories.newTitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="flex items-center gap-3">
          <motion.span key={icon + color} initial={{ scale: 0.6, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}>
            <CategoryIcon icon={icon} color={color} size={52} />
          </motion.span>
          <div className="flex-1">
            <label htmlFor="cat-name" className="text-sm font-medium text-ink/80 dark:text-white/80">
              {t.categories.name}
            </label>
            <input
              id="cat-name"
              maxLength={40}
              autoFocus={!category}
              placeholder={t.categories.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/12 dark:bg-ink dark:focus:border-brand-glow"
            />
          </div>
        </div>

        {!category && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink/80 dark:text-white/80">{t.categories.type}</p>
            <TypeSwitch id="category" value={type} onChange={(next) => next && setType(next)} />
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink/80 dark:text-white/80">{t.categories.icon}</legend>
          <div className="grid grid-cols-7 gap-2">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                aria-label={key}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={`grid aspect-square place-items-center rounded-xl border transition ${icon === key ? 'border-brand bg-brand-soft text-brand dark:border-brand-glow dark:bg-brand/20 dark:text-brand-glow' : 'border-black/8 text-ink/60 hover:border-black/20 dark:border-white/10 dark:text-white/60'}`}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink/80 dark:text-white/80">{t.categories.color}</legend>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className="grid size-9 place-items-center rounded-full ring-offset-2 transition hover:scale-110 dark:ring-offset-ink-2"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px var(--color-white), 0 0 0 4px ${c}` : undefined }}
              >
                {color === c && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </fieldset>

        <FormError message={error} />

        <div className="flex gap-3">
          {category && (
            <button
              type="button"
              onClick={remove}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition ${confirmDelete ? 'bg-red-600 text-white' : 'border border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400'}`}
            >
              <Trash2 size={17} />
              {confirmDelete && <span className="max-w-48 text-left text-xs leading-tight">{t.categories.deleteConfirm}</span>}
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
