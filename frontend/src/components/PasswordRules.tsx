import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

// Same rules as the backend validation.
const rules = [
  { key: 'length', test: (p: string) => p.length >= 8 },
  { key: 'letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { key: 'number', test: (p: string) => /\d/.test(p) },
] as const

export const isStrongPassword = (password: string) => rules.every((r) => r.test(password))

export function PasswordRules({ password }: { password: string }) {
  const { t } = useI18n()
  const passed = rules.filter((r) => r.test(password)).length
  const strength = password.length >= 12 && passed === rules.length ? 4 : passed

  return (
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
  )
}
