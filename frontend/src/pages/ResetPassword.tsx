import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Lock, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { ApiError, auth, errorText } from '../lib/api'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { FormError } from '../components/FormError'
import { PasswordRules, isStrongPassword } from '../components/PasswordRules'
import { SubmitButton } from '../components/SubmitButton'

export function ResetPassword() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(token ? null : t.auth.errors.invalidLink)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isStrongPassword(password)) return setError(t.auth.errors.passwordRules)
    setError(null)
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      const invalid = err instanceof ApiError && err.message === 'INVALID_RESET_LINK'
      setError(invalid ? t.auth.errors.invalidLink : errorText(err, t.errors))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title={t.auth.resetDoneTitle} subtitle={t.auth.resetDoneText}>
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30"
        >
          <ShieldCheck size={28} />
        </motion.span>
        <Link
          to="/login"
          className="mt-8 flex h-12 items-center justify-center rounded-xl bg-ink font-medium text-white transition hover:bg-brand dark:bg-brand dark:hover:bg-brand-hover"
        >
          {t.auth.signIn}
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label={t.auth.newPassword}
          type="password"
          autoComplete="new-password"
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint={<PasswordRules password={password} />}
        />
        <FormError message={error} />
        <SubmitButton loading={loading}>{t.auth.resetButton}</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm">
        <Link to="/forgot-password" className="font-medium text-brand hover:underline dark:text-brand-glow">
          {t.auth.forgotLink}
        </Link>
      </p>
    </AuthLayout>
  )
}
