import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { FormError } from '../components/FormError'
import { SubmitButton } from '../components/SubmitButton'

export function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        />
        <FormError message={error} />
        <SubmitButton loading={loading}>{t.auth.signIn}</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-ink/55 dark:text-white/55">
        {t.auth.newHere}{' '}
        <Link to="/register" className="font-medium text-brand hover:underline dark:text-brand-glow">
          {t.auth.createAccountLink}
        </Link>
      </p>
    </AuthLayout>
  )
}
