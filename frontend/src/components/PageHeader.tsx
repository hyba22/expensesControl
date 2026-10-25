import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-ink/55 dark:text-white/55">{subtitle}</p>
      </div>
      {action}
    </motion.div>
  )
}

export function PrimaryButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-hover"
    >
      {icon}
      {children}
    </motion.button>
  )
}
