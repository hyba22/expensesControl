import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { categoriesApi, type Category } from '../lib/finance'
import { sortCategories } from '../lib/categoryStyle'
import { useI18n } from '../i18n/I18nContext'

interface CategoriesState {
  categories: Category[]
  loading: boolean
  reload: () => Promise<void>
  byId: (id: string | null | undefined) => Category | undefined
}

const CategoriesContext = createContext<CategoriesState | null>(null)

// Loads the categories once for all pages of the signed-in app.
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [raw, setRaw] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setRaw(await categoriesApi.list())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo<CategoriesState>(() => {
    const categories = sortCategories(raw, t)
    const map = new Map(categories.map((c) => [c.id, c]))
    return { categories, loading, reload, byId: (id) => (id ? map.get(id) : undefined) }
  }, [raw, loading, reload, t])

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories() {
  const context = useContext(CategoriesContext)
  if (!context) throw new Error('useCategories must be used inside CategoriesProvider')
  return context
}
