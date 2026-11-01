import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { Settings } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

export function SettingsButton() {
  const { t } = useI18n()
  return (
    <NavLink
      to="/app/settings"
      aria-label={t.settings.open}
      title={t.settings.open}
      className={({ isActive }) =>
        `grid size-10 place-items-center rounded-xl border transition-colors ${isActive ? 'border-brand bg-brand text-white' : 'border-black/10 text-ink hover:border-brand hover:text-brand dark:border-white/15 dark:text-white dark:hover:border-brand-glow dark:hover:text-brand-glow'}`
      }
    >
      <motion.span whileHover={{ rotate: 90 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
        <Settings size={18} />
      </motion.span>
    </NavLink>
  )
}
