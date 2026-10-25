import { motion } from 'motion/react'
import { ArrowRight, LoaderCircle } from 'lucide-react'

export function SubmitButton({ loading, children }: { loading: boolean; children: string }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileTap={{ scale: 0.98 }}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-medium text-white transition hover:bg-brand disabled:cursor-wait disabled:opacity-80 dark:bg-brand dark:hover:bg-brand-hover"
    >
      {loading ? (
        <LoaderCircle size={19} className="animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </>
      )}
    </motion.button>
  )
}
