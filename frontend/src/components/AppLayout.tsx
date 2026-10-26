import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChartPie, FileUp, LayoutDashboard, LogOut, ReceiptText, Shapes, Target, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { CategoriesProvider } from '../data/CategoriesContext'
import { useI18n } from '../i18n/I18nContext'
import { LanguageToggle } from './LanguageToggle'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { SettingsButton } from './SettingsButton'
import { ToastProvider } from './Toast'
import { AssistantChat } from './assistant/AssistantChat'

const links: { to: string; label: 'dashboard' | 'transactions' | 'stats' | 'budgets' | 'categories' | 'import'; icon: LucideIcon }[] = [
  { to: '/app', label: 'dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'transactions', icon: ReceiptText },
  { to: '/app/statistics', label: 'stats', icon: ChartPie },
  { to: '/app/budgets', label: 'budgets', icon: Target },
  { to: '/app/categories', label: 'categories', icon: Shapes },
  { to: '/app/import', label: 'import', icon: FileUp },
]

export function AppLayout() {
  const { logout } = useAuth()
  const { t } = useI18n()
  const [leaving, setLeaving] = useState(false)

  return (
    <ToastProvider>
      <CategoriesProvider>
        <div className="min-h-dvh bg-zinc-50 pb-24 sm:pb-0 dark:bg-ink">
          <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-lg dark:border-white/8 dark:bg-ink/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 2xl:max-w-screen-2xl">
              <Logo compact />
              <nav className="hidden items-center gap-1 rounded-2xl bg-black/[0.04] p-1 sm:flex dark:bg-white/[0.06]">
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end
                    aria-label={t.nav[label]}
                    title={t.nav[label]}
                    className={({ isActive }) =>
                      `relative flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition 2xl:px-3.5 ${isActive ? 'text-white' : 'text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-pill"
                            className="absolute inset-0 rounded-xl bg-ink dark:bg-brand"
                            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                          />
                        )}
                        <Icon size={16} className="relative" />
                        <span className="relative hidden 2xl:inline">{t.nav[label]}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
                <SettingsButton />
                <button
                  type="button"
                  onClick={() => {
                    setLeaving(true)
                    void logout()
                  }}
                  disabled={leaving}
                  aria-label={t.nav.signOut}
                  title={t.nav.signOut}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-white transition hover:bg-brand dark:bg-white dark:text-ink dark:hover:bg-brand dark:hover:text-white"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </header>

          <Outlet />
          <AssistantChat />

          <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 rounded-2xl border border-black/5 bg-white/90 p-1.5 shadow-xl backdrop-blur-lg sm:hidden dark:border-white/10 dark:bg-ink-2/90">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${isActive ? 'text-white' : 'text-ink/55 dark:text-white/55'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="mobile-nav-pill"
                        className="absolute inset-0 rounded-xl bg-brand"
                        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                      />
                    )}
                    <Icon size={19} className="relative" />
                    <span className="sr-only">{t.nav[label]}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </CategoriesProvider>
    </ToastProvider>
  )
}
