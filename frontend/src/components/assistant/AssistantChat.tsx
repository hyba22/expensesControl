import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nContext'
import { ApiError, api, apiStream, errorText } from '../../lib/api'
import { Markdown } from './Markdown'
import { RobotIcon } from './RobotIcon'

interface Message {
  role: 'user' | 'assistant'
  content: string
  error?: boolean
}

// Reads Workers AI server-sent events: lines like `data: {"response":"..."}`.
async function readAnswer(stream: ReadableStream<Uint8Array>, onText: (text: string) => void) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '').trim()
      if (!line.startsWith('data:') || !data || data === '[DONE]') continue
      try {
        const chunk = JSON.parse(data) as { response?: string }
        if (chunk.response) onText(chunk.response)
      } catch {
        // A partial line: it will be completed by the next chunk.
      }
    }
  }
}

export function AssistantChat() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const firstName = user?.name.split(' ')[0] ?? ''

  // Tell the user upfront when the server has no AI token yet.
  useEffect(() => {
    if (!open) return
    api<{ configured: boolean; remaining: number }>('/assistant/status')
      .then((s) => {
        if (!s.configured) setNotice(t.assistant.errors.AI_NOT_CONFIGURED)
        else if (s.remaining === 0) setNotice(t.assistant.errors.AI_DAILY_LIMIT)
        else setNotice(null)
      })
      .catch(() => {})
  }, [open, t])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || busy) return
    const history = [...messages.filter((m) => !m.error), { role: 'user' as const, content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    try {
      const stream = await apiStream('/assistant/chat', {
        language: lang,
        messages: history.slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })),
      })
      await readAnswer(stream, (piece) =>
        setMessages((current) => {
          const next = [...current]
          const last = next[next.length - 1]
          next[next.length - 1] = { ...last, content: last.content + piece }
          return next
        }),
      )
    } catch (err) {
      const code = err instanceof ApiError ? err.message : ''
      const message = t.assistant.errors[code] ?? errorText(err, t.errors)
      setMessages((current) => [...current.slice(0, -1), { role: 'assistant', content: message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(input)
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t.assistant.open}
            title={t.assistant.open}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 20 }}
            whileHover={{ scale: 1.08, y: -3 }}
            whileTap={{ scale: 0.92 }}
            className="group fixed bottom-24 right-4 z-40 grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-2xl shadow-brand/40 sm:bottom-6 sm:right-6"
          >
            <span className="absolute inset-0 animate-ping rounded-2xl bg-brand/40 [animation-duration:2.5s]" />
            <span className="relative">
              <RobotIcon size={36} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={t.assistant.title}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[400px] sm:rounded-3xl dark:bg-ink-2 dark:ring-1 dark:ring-white/10"
          >
            <header className="relative flex items-center gap-3 overflow-hidden bg-ink px-4 py-3.5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-brand/50 blur-3xl" />
              <span className="relative grid size-11 place-items-center rounded-xl bg-brand">
                <RobotIcon size={28} talking={busy} />
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="font-display font-semibold">{t.assistant.title}</p>
                <p className="truncate text-xs text-white/60">{t.assistant.subtitle}</p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  disabled={busy}
                  aria-label={t.assistant.clear}
                  title={t.assistant.clear}
                  className="relative grid size-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="relative grid size-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X size={19} />
              </button>
            </header>

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <Bubble role="assistant">{t.assistant.greeting(firstName)}</Bubble>

              {notice && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  {notice}
                </p>
              )}

              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {t.assistant.suggestions.map((s, i) => (
                    <motion.button
                      key={s}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      onClick={() => void ask(s)}
                      className="rounded-full border border-brand/30 px-3 py-1.5 text-left text-sm text-brand transition hover:bg-brand-soft dark:border-brand-glow/30 dark:text-brand-glow dark:hover:bg-brand/15"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              )}

              {messages.map((message, i) => (
                <Bubble key={i} role={message.role} error={message.error}>
                  {message.content ? (
                    message.role === 'assistant' ? <Markdown text={message.content} /> : message.content
                  ) : (
                    <TypingDots label={t.assistant.thinking} />
                  )}
                </Bubble>
              ))}
            </div>

            <form onSubmit={submit} className="border-t border-black/5 p-3 dark:border-white/8">
              <div className="flex items-end gap-2 rounded-2xl border border-black/10 bg-zinc-50 p-1.5 transition focus-within:border-brand dark:border-white/12 dark:bg-ink dark:focus-within:border-brand-glow">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void ask(input)
                    }
                  }}
                  rows={1}
                  maxLength={1000}
                  placeholder={t.assistant.placeholder}
                  className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-ink/40 dark:placeholder:text-white/35"
                />
                <motion.button
                  type="submit"
                  disabled={busy || !input.trim()}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t.assistant.send}
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white transition disabled:opacity-40"
                >
                  <ArrowUp size={18} />
                </motion.button>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-ink/40 dark:text-white/40">
                <ShieldCheck size={12} /> {t.assistant.disclaimer}
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}

function Bubble({ role, error, children }: { role: 'user' | 'assistant'; error?: boolean; children: React.ReactNode }) {
  const mine = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          mine
            ? 'rounded-br-md bg-brand text-white'
            : error
              ? 'rounded-bl-md border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
              : 'rounded-bl-md bg-black/[0.04] dark:bg-white/[0.07]'
        }`}
      >
        {children}
      </div>
    </motion.div>
  )
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 py-1" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-brand dark:bg-brand-glow"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}
