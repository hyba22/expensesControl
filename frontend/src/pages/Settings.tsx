import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Info, KeyRound, Lock, Mail, TriangleAlert, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { ApiError, auth, errorText } from '../lib/api'
import { CurrencySelect } from '../components/CurrencySelect'
import { Field } from '../components/Field'
import { FormError } from '../components/FormError'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { PasswordRules, isStrongPassword } from '../components/PasswordRules'
import { SubmitButton } from '../components/SubmitButton'
import { useToast } from '../components/Toast'

function Section({ title, icon, children, danger = false }: { title: string; icon: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
      className={`rounded-2xl border bg-white p-5 sm:p-6 dark:bg-ink-2 ${danger ? 'border-red-500/30' : 'border-black/5 dark:border-white/8'}`}
    >
      <h2 className={`mb-5 flex items-center gap-2.5 font-display text-lg font-semibold ${danger ? 'text-red-600 dark:text-red-400' : ''}`}>
        <span
          className={`grid size-8 place-items-center rounded-lg ${danger ? 'bg-red-500/10' : 'bg-brand-soft text-brand dark:bg-brand/20 dark:text-brand-glow'}`}
        >
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

const wrongPassword = (err: unknown) => err instanceof ApiError && err.message === 'WRONG_PASSWORD'

export function Settings() {
  const { t } = useI18n()

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="space-y-5"
      >
        <Section title={t.settings.profile} icon={<User size={17} />}>
          <ProfileForm />
        </Section>
        <Section title={t.settings.security} icon={<KeyRound size={17} />}>
          <PasswordForm />
        </Section>
        <Section title={t.settings.danger} icon={<TriangleAlert size={17} />} danger>
          <DeleteAccount />
        </Section>
      </motion.div>
    </main>
  )
}

function ProfileForm() {
  const { t } = useI18n()
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [currency, setCurrency] = useState(user?.currency ?? 'TND')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) return setError(t.auth.errors.nameRequired)
    setError(null)
    setSaving(true)
    try {
      await updateProfile({ name: name.trim(), currency })
      toast(t.settings.saved)
    } catch (err) {
      setError(errorText(err, t.errors))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label={t.settings.name} icon={<User size={18} />} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <Field label={t.settings.email} icon={<Mail size={18} />} value={user?.email ?? ''} disabled readOnly />
      <CurrencySelect label={t.settings.currency} value={currency} onChange={setCurrency} />
      <p className="flex gap-2 rounded-xl bg-brand-soft/60 px-3 py-2.5 text-sm text-ink/70 dark:bg-brand/10 dark:text-white/70">
        <Info size={17} className="mt-0.5 shrink-0 text-brand dark:text-brand-glow" />
        {t.settings.currencyHint}
      </p>
      <FormError message={error} />
      <SubmitButton loading={saving}>{t.common.save}</SubmitButton>
    </form>
  )
}

function PasswordForm() {
  const { t } = useI18n()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isStrongPassword(next)) return setError(t.auth.errors.passwordRules)
    setError(null)
    setSaving(true)
    try {
      await auth.changePassword(current, next)
      setCurrent('')
      setNext('')
      toast(t.settings.passwordChanged)
    } catch (err) {
      setError(wrongPassword(err) ? t.settings.wrongPassword : errorText(err, t.errors))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field
        label={t.settings.currentPassword}
        type="password"
        autoComplete="current-password"
        icon={<Lock size={18} />}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <Field
        label={t.settings.newPassword}
        type="password"
        autoComplete="new-password"
        icon={<KeyRound size={18} />}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        hint={<PasswordRules password={next} />}
      />
      <FormError message={error} />
      <SubmitButton loading={saving}>{t.settings.changePassword}</SubmitButton>
    </form>
  )
}

function DeleteAccount() {
  const { t } = useI18n()
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirm = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setDeleting(true)
    try {
      await deleteAccount(password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(wrongPassword(err) ? t.settings.wrongPassword : errorText(err, t.errors))
      setDeleting(false)
    }
  }

  return (
    <>
      <p className="font-medium">{t.settings.deleteTitle}</p>
      <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{t.settings.deleteText}</p>
      <button
        type="button"
        onClick={() => {
          setPassword('')
          setError(null)
          setOpen(true)
        }}
        className="mt-4 h-11 rounded-xl border border-red-500/40 px-4 text-sm font-medium text-red-600 transition hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:text-white"
      >
        {t.settings.deleteButton}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.settings.deleteTitle}>
        <form onSubmit={confirm} className="space-y-5" noValidate>
          <p className="flex gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            {t.settings.deleteConfirm}
          </p>
          <Field
            label={t.auth.password}
            type="password"
            autoComplete="current-password"
            icon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <FormError message={error} />
          <button
            type="submit"
            disabled={deleting || !password}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {t.settings.deleteFinal}
          </button>
        </form>
      </Modal>
    </>
  )
}
