import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoaderCircle, Lock, Mail, MonitorPlay } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { FormError } from '../components/FormError'
import { SubmitButton } from '../components/SubmitButton'

export function Login() {
  const { login, startDemo } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)

  const openDemo = async () => {
    setError(null)
    setOpening(true)
    try {
      await startDemo()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(errorText(err, t.errors))
      setOpening(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app', { replace: true })
    } catch (err) {
      const invalid = t.auth.errors.invalidCredentials
      setError(errorText(err, t.errors, { 400: invalid, 401: invalid }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label={t.auth.email}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label={t.auth.password}
          type="password"
          autoComplete="current-password"
          placeholder={t.auth.loginPasswordPlaceholder}
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint={
            <Link
              to="/forgot-password"
              className="float-right text-xs font-medium text-brand hover:underline dark:text-brand-glow"
            >
              {t.auth.forgotLink}
            </Link>
          }
        />
        <FormError message={error} />
        <SubmitButton loading={loading}>{t.auth.signIn}</SubmitButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-ink/35 dark:text-white/35">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        {t.demo.or}
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>
      <button
        type="button"
        onClick={() => void openDemo()}
        disabled={opening}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-brand font-medium text-brand transition hover:bg-brand hover:text-white disabled:opacity-60 dark:border-brand-glow dark:text-brand-glow dark:hover:bg-brand dark:hover:text-white"
      >
        {opening ? <LoaderCircle size={18} className="animate-spin" /> : <MonitorPlay size={18} />}
        {t.demo.button}
      </button>
      <p className="mt-2 text-center text-xs text-ink/50 dark:text-white/50">{t.demo.hint}</p>
      <p className="mt-8 text-center text-sm text-ink/55 dark:text-white/55">
        {t.auth.newHere}{' '}
        <Link to="/register" className="font-medium text-brand hover:underline dark:text-brand-glow">
          {t.auth.createAccountLink}
        </Link>
      </p>
    </AuthLayout>
  )
}
