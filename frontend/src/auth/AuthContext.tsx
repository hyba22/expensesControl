import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, refreshSession, usersApi, type User } from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

type Status = 'loading' | 'authenticated' | 'guest'

interface AuthState {
  user: User | null
  status: Status
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, currency: string) => Promise<void>
  updateProfile: (data: { name?: string; currency?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const { setCurrency } = useI18n()

  const signIn = useCallback(
    (next: User) => {
      setUser(next)
      setCurrency(next.currency)
      setStatus('authenticated')
    },
    [setCurrency],
  )

  // On page load, the refresh cookie (if any) restores the session.
  useEffect(() => {
    refreshSession()
      .then(signIn)
      .catch(() => setStatus('guest'))
  }, [signIn])

  const value: AuthState = {
    user,
    status,
    login: async (email, password) => signIn(await auth.login({ email, password })),
    register: async (name, email, password, currency) =>
      signIn(await auth.register({ name, email, password, currency })),
    updateProfile: async (data) => signIn(await usersApi.updateMe(data)),
    logout: async () => {
      await auth.logout().catch(() => {})
      setUser(null)
      setStatus('guest')
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
