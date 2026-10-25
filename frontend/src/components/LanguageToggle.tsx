import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '../i18n/I18nContext'

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      aria-label={t.nav.language}
      title={t.nav.language}
      className="grid h-10 w-12 place-items-center overflow-hidden rounded-xl border border-black/10 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand dark:border-white/15 dark:text-white dark:hover:border-brand-glow dark:hover:text-brand-glow"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lang}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {lang.toUpperCase()}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
