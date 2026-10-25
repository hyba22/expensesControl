import { Scale } from 'lucide-react'
import { AnimatedIcon } from './AnimatedIcon'

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-brand/30">
        <AnimatedIcon icon={Scale} animation="wiggle" size={19} />
      </span>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${inverted ? 'text-white' : 'text-ink dark:text-white'}`}
      >
        Expense<span className={inverted ? 'text-brand-glow' : 'text-brand dark:text-brand-glow'}>Control</span>
      </span>
    </span>
  )
}
