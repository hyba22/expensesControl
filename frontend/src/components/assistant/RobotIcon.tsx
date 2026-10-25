import { motion } from 'motion/react'

// A small robot that idles: the head bobs, the antenna light pulses and the
// eyes blink. `talking` makes the mouth move while an answer streams in.
export function RobotIcon({ size = 30, talking = false }: { size?: number; talking?: boolean }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      animate={{ y: [0, -1.5, 0], rotate: [0, -4, 0, 4, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <line x1="16" y1="3.5" x2="16" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <motion.circle
        cx="16"
        cy="3"
        r="2"
        fill="#c4b5fd"
        animate={{ opacity: [1, 0.35, 1], scale: [1, 1.25, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        style={{ transformOrigin: '16px 3px' }}
      />
      <rect x="5" y="8" width="22" height="18" rx="7" fill="currentColor" />
      <rect x="2.5" y="14" width="2.5" height="6" rx="1.25" fill="currentColor" />
      <rect x="27" y="14" width="2.5" height="6" rx="1.25" fill="currentColor" />
      <rect x="8.5" y="11.5" width="15" height="10" rx="5" fill="#0b0a10" />
      {[12.5, 19.5].map((cx) => (
        <motion.ellipse
          key={cx}
          cx={cx}
          cy="15.5"
          rx="1.7"
          ry="1.9"
          fill="#a78bfa"
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
          style={{ transformOrigin: `${cx}px 15.5px` }}
        />
      ))}
      <motion.rect
        x="13.5"
        y="18.6"
        width="5"
        height="1.4"
        rx="0.7"
        fill="#a78bfa"
        animate={talking ? { scaleY: [1, 2.2, 0.8, 1.8, 1], scaleX: [1, 0.8, 1.1, 0.9, 1] } : { scaleY: 1, scaleX: 1 }}
        transition={talking ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
        style={{ transformOrigin: '16px 19.3px' }}
      />
    </motion.svg>
  )
}
