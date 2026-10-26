import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { errorText } from '../lib/api'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { FormError } from '../components/FormError'
import { SubmitButton } from '../components/SubmitButton'
import { CurrencySelect } from '../components/CurrencySelect'
import { guessCurrency } from '../lib/currencies'

// Same rules as the backend validation.
const rules = [
  { key: 'length', test: (p: string) => p.length >= 8 },
  { key: 'letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { key: 'number', test: (p: string) => /\d/.test(p) },
] as const

export function Register() {
  const { register } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState<string>(guessCurrency)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passed = rules.filter((r) => r.test(password)).length
  const strength = password.length >= 12 && passed === rules.length ? 4 : passed

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) return setError(t.auth.errors.nameRequired)
    if (passed < rules.length) return setError(t.auth.errors.passwordRules)
    setError(null)
    setLoading(true)
    try {
      await register(name, email, password, currency)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(errorText(err, t.errors, { 409: t.auth.errors.emailTaken }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label={t.auth.name}
          autoComplete="name"
          placeholder={t.auth.namePlaceholder}
          icon={<User size={18} />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        <CurrencySelect label={t.auth.currency} value={currency} onChange={setCurrency} />
        <Field
          label={t.auth.password}
          type="password"
          autoComplete="new-password"
          placeholder={t.auth.registerPasswordPlaceholder}
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint={
            <div className="space-y-2.5 pt-1">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-brand"
                      initial={false}
                      animate={{ width: strength >= level ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {rules.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li
                      key={rule.key}
                      className={`flex items-center gap-1.5 text-xs transition ${ok ? 'text-brand dark:text-brand-glow' : 'text-ink/45 dark:text-white/40'}`}
                    >
                      <motion.span animate={{ scale: ok ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.3 }}>
                        <Check size={13} strokeWidth={ok ? 3 : 2} />
                      </motion.span>
                      {t.auth.rules[rule.key]}
                    </li>
                  )
                })}
              </ul>
            </div>
          }
        />
        <FormError message={error} />
        <SubmitButton loading={loading}>{t.auth.createAccount}</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-ink/55 dark:text-white/55">
        {t.auth.haveAccount}{' '}
        <Link to="/login" className="font-medium text-brand hover:underline dark:text-brand-glow">
          {t.auth.signIn}
        </Link>
      </p>
    </AuthLayout>
  )
}
