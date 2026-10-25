import { iconFor } from '../lib/categoryStyle'

// A rounded square in the category's color, with its icon.
export function CategoryIcon({ icon, color, size = 40 }: { icon?: string; color?: string; size?: number }) {
  const Icon = iconFor(icon)
  const tint = color ?? '#64748b'
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{
        width: size,
        height: size,
        color: tint === '#18181b' ? 'var(--color-zinc-500)' : tint,
        backgroundColor: `${tint}1f`,
      }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={1.9} />
    </span>
  )
}
