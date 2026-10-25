import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert } from 'lucide-react'

export function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          key={message}
          role="alert"
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-3 text-sm text-red-600 dark:text-red-400"
        >
          <CircleAlert size={17} className="shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
