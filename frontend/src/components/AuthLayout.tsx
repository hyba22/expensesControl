import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { BrainCircuit, ChartPie, FileText, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { Dictionary } from '../i18n/en'
import { AnimatedIcon } from './AnimatedIcon'
import { LanguageToggle } from './LanguageToggle'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const floating: { icon: LucideIcon; label: keyof Dictionary['auth']['floating']; className: string; delay: number }[] = [
  { icon: Wallet, label: 'expenses', className: 'left-[8%] top-[22%]', delay: 0 },
  { icon: ChartPie, label: 'charts', className: 'right-[10%] top-[30%]', delay: 0.6 },
  { icon: FileText, label: 'imports', className: 'left-[14%] top-[58%]', delay: 1.2 },
  { icon: BrainCircuit, label: 'ai', className: 'right-[8%] top-[64%]', delay: 1.8 },
]

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t } = useI18n()
  const [before, word, after] = t.auth.tagline(t.auth.taglineWord)

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-brand/40 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 size-[26rem] rounded-full bg-brand-glow/25 blur-[120px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative">
          <Logo inverted />
        </div>

        {floating.map(({ icon, label, className, delay }) => (
          <motion.div
            key={label}
            className={`absolute flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -10, 0] }}
            transition={{
              opacity: { delay: delay * 0.4, duration: 0.6 },
              y: { delay, duration: 5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
              <AnimatedIcon icon={icon} animation="pulse" size={16} delay={delay} />
            </span>
            <span className="text-sm text-white/85">{t.auth.floating[label]}</span>
          </motion.div>
        ))}

        <div className="relative mt-auto max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl font-semibold leading-tight tracking-tight"
          >
            {before}
            <span className="text-brand-glow">{word}</span>
            {after}
          </motion.h2>
          <p className="mt-4 text-white/60">{t.auth.pitch}</p>
          <p className="mt-8 flex items-center gap-2 text-sm text-white/50">
            <ShieldCheck size={16} className="text-brand-glow" />
            {t.auth.securityNote}
          </p>
        </div>
      </aside>

      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Logo />
          </span>
          <div className="flex gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="m-auto w-full max-w-sm py-10"
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-ink/55 dark:text-white/55">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>
    </div>
  )
}
