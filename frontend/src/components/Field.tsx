import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
  hint?: ReactNode
}

export function Field({ label, icon, hint, type = 'text', ...input }: Props) {
  const { t } = useI18n()
  const id = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink/80 dark:text-white/80">
        {label}
      </label>
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink/40 transition group-focus-within:text-brand dark:text-white/40 dark:group-focus-within:text-brand-glow">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={`h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[15px] text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/12 dark:bg-ink-2 dark:text-white dark:placeholder:text-white/30 dark:focus:border-brand-glow ${icon ? 'pl-11' : ''} ${isPassword ? 'pr-11' : ''}`}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
            className="absolute inset-y-0 right-2 my-auto grid size-8 place-items-center rounded-lg text-ink/45 transition hover:bg-brand-soft hover:text-brand dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {hint}
    </div>
  )
}
