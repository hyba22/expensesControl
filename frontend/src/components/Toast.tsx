import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'

type Tone = 'success' | 'warning' | 'danger'

interface ToastItem {
  id: number
  text: string
  tone: Tone
}

// `true` as the second argument is kept as a shortcut for an error.
type Show = (text: string, tone?: Tone | boolean) => void

const ToastContext = createContext<Show>(() => {})

const icons = {
  success: <CircleCheck size={17} className="shrink-0 text-brand-glow dark:text-brand" />,
  warning: <TriangleAlert size={17} className="shrink-0 text-amber-400 dark:text-amber-600" />,
  danger: <CircleAlert size={17} className="shrink-0 text-red-400 dark:text-red-500" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback<Show>((text, tone = 'success') => {
    const id = Date.now() + Math.random()
    const resolved: Tone = tone === true ? 'danger' : tone === false ? 'success' : tone
    setItems((list) => [...list, { id, text, tone: resolved }])
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), resolved === 'success' ? 3200 : 6000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              role="status"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="flex max-w-md items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl dark:bg-white dark:text-ink"
            >
              {icons[item.tone]}
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
