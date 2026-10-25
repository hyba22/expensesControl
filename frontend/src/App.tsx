import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppLayout } from './components/AppLayout'
import { SplashScreen } from './components/SplashScreen'
import { Budgets } from './pages/Budgets'
import { Categories } from './pages/Categories'
import { Dashboard } from './pages/Dashboard'
import { Import } from './pages/Import'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Statistics } from './pages/Statistics'
import { Transactions } from './pages/Transactions'

function Protected({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <SplashScreen />
  return status === 'authenticated' ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <SplashScreen />
  return status === 'guest' ? children : <Navigate to="/app" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/app" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="categories" element={<Categories />} />
        <Route path="import" element={<Import />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
