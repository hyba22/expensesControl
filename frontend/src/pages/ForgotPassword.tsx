import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { auth, errorText } from '../lib/api'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { FormError } from '../components/FormError'
import { SubmitButton } from '../components/SubmitButton'

export function ForgotPassword() {
  const { t, lang } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await auth.forgotPassword(email.trim(), lang)
      setSent(true)
    } catch (err) {
      setError(errorText(err, t.errors, { 400: t.auth.errors.invalidCredentials }))
    } finally {
      setLoading(false)
    }
  }

  const back = (
    <Link
      to="/login"
      className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-brand hover:underline dark:text-brand-glow"
    >
      <ArrowLeft size={15} />
      {t.auth.backToLogin}
    </Link>
  )

  if (sent) {
    return (
      <AuthLayout title={t.auth.linkSentTitle} subtitle={t.auth.linkSentText(email.trim())}>
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30"
        >
          <MailCheck size={28} />
        </motion.span>
        {back}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
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
        <FormError message={error} />
        <SubmitButton loading={loading}>{t.auth.sendLink}</SubmitButton>
      </form>
      {back}
    </AuthLayout>
  )
}
