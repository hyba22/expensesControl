import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Info, Settings } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { CurrencySelect } from './CurrencySelect'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { SubmitButton } from './SubmitButton'
import { useToast } from './Toast'

export function SettingsButton() {
  const { t } = useI18n()
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [currency, setCurrency] = useState(user?.currency ?? 'TND')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const show = () => {
    setCurrency(user?.currency ?? 'TND')
    setError(null)
    setOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ currency })
      toast(t.settings.saved)
      setOpen(false)
    } catch (err) {
      setError(errorText(err, t.errors))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={show}
        aria-label={t.settings.open}
        title={t.settings.open}
        whileHover={{ rotate: 90 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="grid size-10 place-items-center rounded-xl border border-black/10 text-ink transition-colors hover:border-brand hover:text-brand dark:border-white/15 dark:text-white dark:hover:border-brand-glow dark:hover:text-brand-glow"
      >
        <Settings size={18} />
      </motion.button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.settings.title}>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <CurrencySelect label={t.settings.currency} value={currency} onChange={setCurrency} />
          <p className="flex gap-2 rounded-xl bg-brand-soft/60 px-3 py-2.5 text-sm text-ink/70 dark:bg-brand/10 dark:text-white/70">
            <Info size={17} className="mt-0.5 shrink-0 text-brand dark:text-brand-glow" />
            {t.settings.currencyHint}
          </p>
          <FormError message={error} />
          <SubmitButton loading={saving}>{t.common.save}</SubmitButton>
        </form>
      </Modal>
    </>
  )
}
