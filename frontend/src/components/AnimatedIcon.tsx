import { motion, type TargetAndTransition, type Transition } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

export type IconAnimation = 'float' | 'pulse' | 'wiggle' | 'spin' | 'pop' | 'none'

const loops: Record<IconAnimation, { animate?: TargetAndTransition; transition?: Transition }> = {
  float: {
    animate: { y: [0, -5, 0] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  pulse: {
    animate: { scale: [1, 1.12, 1], opacity: [1, 0.8, 1] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  wiggle: {
    animate: { rotate: [0, -12, 10, -6, 0] },
    transition: { duration: 1.2, repeat: Infinity, repeatDelay: 2.5 },
  },
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 8, repeat: Infinity, ease: 'linear' },
  },
  pop: {
    animate: { scale: [0.6, 1.15, 1], opacity: [0, 1, 1] },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  none: {},
}

interface Props {
  icon: LucideIcon
  animation?: IconAnimation
  size?: number
  delay?: number
  className?: string
}

// A Lucide icon that loops a small animation and jumps a little on hover.
export function AnimatedIcon({ icon: Icon, animation = 'float', size = 20, delay = 0, className }: Props) {
  const { animate, transition } = loops[animation]
  return (
    <motion.span
      className={`inline-flex ${className ?? ''}`}
      animate={animate}
      transition={{ ...transition, delay }}
      whileHover={{ scale: 1.2, rotate: -8 }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={1.8} />
    </motion.span>
  )
}
