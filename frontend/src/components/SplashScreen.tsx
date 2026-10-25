import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Scale } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

// Shown while the session is restored. The free hosting plan puts the server
// to sleep, so after a few seconds we explain the wait instead of looking stuck.
export function SplashScreen() {
  const { t } = useI18n()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="grid min-h-dvh place-items-center bg-white dark:bg-ink">
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <motion.span
          className="grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-xl shadow-brand/30"
          animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Scale size={26} />
        </motion.span>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: slow ? 1 : 0 }}
          className="max-w-xs text-sm text-ink/55 dark:text-white/55"
        >
          {t.splash.waking}
        </motion.p>
      </div>
    </div>
  )
}
