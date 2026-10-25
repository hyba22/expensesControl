import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartPie, LoaderCircle } from 'lucide-react'
import { useCategories } from '../data/CategoriesContext'
import { useI18n } from '../i18n/I18nContext'
import { categoryName } from '../lib/categoryStyle'
import { statsApi, toDay, type Stats } from '../lib/finance'
import { useIsDark } from '../lib/useIsDark'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { CategoryIcon } from '../components/CategoryIcon'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { PageHeader } from '../components/PageHeader'

const BRAND = '#7c3aed'
const BRAND_GLOW = '#a78bfa'
const card = 'rounded-2xl border border-black/5 bg-white p-5 dark:border-white/8 dark:bg-ink-2'

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className={`${card} ${className}`}
    >
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="text-sm text-ink/55 dark:text-white/55">{hint}</p>}
      <div className="mt-4">{children}</div>
    </motion.section>
  )
}

export function Statistics() {
  const { t, money, date } = useI18n()
  const { byId } = useCategories()
  const dark = useIsDark()
  const [month, setMonth] = useState(() => toDay(new Date()).slice(0, 7))
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let active = true
    statsApi.forMonth(month).then((result) => active && setStats(result))
    return () => {
      active = false
    }
  }, [month])

  const axis = dark ? 'rgba(255,255,255,0.45)' : 'rgba(11,10,16,0.45)'
  const grid = dark ? 'rgba(255,255,255,0.07)' : 'rgba(11,10,16,0.06)'
  const short = (millimes: number) =>
    new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(millimes / 1000)
  const tooltipStyle = {
    contentStyle: {
      background: dark ? '#15131d' : '#ffffff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    },
    labelStyle: { color: axis },
    itemStyle: { color: dark ? '#fff' : '#0b0a10' },
  }

  const slices = (stats?.byCategory ?? []).map((row) => {
    const category = byId(row.categoryId)
    const color = !category || category.color === '#18181b' ? (dark ? '#52525b' : '#a1a1aa') : category.color
    return { ...row, category, color, name: category ? categoryName(category, t) : t.transactions.uncategorized }
  })
  const total = slices.reduce((s, r) => s + r.amount, 0)

  const monthly = (stats?.monthly ?? []).map((m) => ({
    ...m,
    label: date(`${m.month}-01`, { month: 'short' }),
  }))
  const pace = (stats?.daily.current ?? []).map((value, i) => {
    const today = toDay(new Date())
    const isFuture = `${month}-${String(i + 1).padStart(2, '0')}` > today
    return { day: i + 1, current: isFuture ? null : value, previous: stats?.daily.previous[i] ?? null }
  })
  const topMerchant = stats?.topMerchants[0]?.amount ?? 1

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title={t.stats.title} subtitle={t.stats.subtitle} action={<MonthSwitcher month={month} onChange={setMonth} />} />

      {!stats ? (
        <div className="grid place-items-center py-20 text-brand">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : (
        <motion.div
          key={month}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-4 lg:grid-cols-2"
        >
          <Card title={t.stats.byCategory}>
            {slices.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
                <div className="relative size-52 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={slices} dataKey="amount" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={2} stroke="none" animationDuration={900}>
                        {slices.map((s) => (
                          <Cell key={s.categoryId ?? 'none'} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(value) => money(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-xs text-ink/50 dark:text-white/50">{t.stats.total}</p>
                      <p className="font-display text-lg font-semibold tabular-nums">{money(total)}</p>
                    </div>
                  </div>
                </div>
                <ul className="w-full min-w-0 space-y-2.5">
                  {slices.slice(0, 6).map((s) => (
                    <li key={s.categoryId ?? 'none'} className="flex items-center gap-2.5 text-sm">
                      <CategoryIcon icon={s.category?.icon} color={s.category?.color} size={28} />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="shrink-0 text-ink/50 tabular-nums dark:text-white/50">{Math.round((s.amount / total) * 100)}%</span>
                      <span className="shrink-0 text-right font-medium tabular-nums">{money(s.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title={t.stats.pace} hint={t.stats.paceHint}>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={pace} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pace" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={short} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    {...tooltipStyle}
                    labelFormatter={(day) => `${t.stats.day} ${day}`}
                    formatter={(value, name) => [money(Number(value)), name === 'current' ? t.stats.thisMonth : t.stats.lastMonth]}
                  />
                  <Line type="monotone" dataKey="previous" stroke={axis} strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="current" stroke={BRAND} strokeWidth={2.5} fill="url(#pace)" connectNulls={false} animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-ink/60 dark:text-white/60">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" /> {t.stats.thisMonth}</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-current" /> {t.stats.lastMonth}</span>
            </div>
          </Card>

          <Card title={t.stats.monthly} hint={t.stats.monthlyHint}>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barGap={4}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={short} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    {...tooltipStyle}
                    cursor={{ fill: grid }}
                    formatter={(value, name) => [money(Number(value)), name === 'income' ? t.stats.income : t.stats.expense]}
                  />
                  <Bar dataKey="income" fill={BRAND_GLOW} radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={900} />
                  <Bar dataKey="expense" fill={dark ? '#e4e4e7' : '#0b0a10'} radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-ink/60 dark:text-white/60">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-glow" /> {t.stats.income}</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink dark:bg-zinc-200" /> {t.stats.expense}</span>
            </div>
          </Card>

          <Card title={t.stats.merchants}>
            {stats.topMerchants.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-4">
                {stats.topMerchants.map((m, i) => (
                  <li key={m.name}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold text-white dark:bg-white/10">{i + 1}</span>
                        <span className="truncate font-medium">{m.name}</span>
                        <span className="shrink-0 text-xs text-ink/45 dark:text-white/45">{t.stats.times(m.count)}</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{money(m.amount)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/8">
                      <motion.div
                        className="h-full rounded-full bg-brand"
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.amount / topMerchant) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>
      )}
    </main>
  )
}

function Empty() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center py-8 text-center text-sm text-ink/55 dark:text-white/55">
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand dark:bg-brand/20 dark:text-brand-glow">
        <AnimatedIcon icon={ChartPie} animation="spin" size={22} />
      </span>
      {t.stats.empty}
    </div>
  )
}

