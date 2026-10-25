import { useCallback } from 'react'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/I18nContext'
import { categoryName } from '../lib/categoryStyle'
import type { BudgetAlert } from '../lib/finance'
import { useCategories } from './CategoriesContext'

// Shows the budget alerts the server returns after new expenses are saved.
export function useBudgetAlerts() {
  const toast = useToast()
  const { t } = useI18n()
  const { byId } = useCategories()

  return useCallback(
    (alerts: BudgetAlert[] | undefined) => {
      for (const alert of alerts ?? []) {
        const category = byId(alert.categoryId)
        const name = category ? categoryName(category, t) : ''
        if (alert.level === 100) toast(t.alerts.over(name, alert.percent), 'danger')
        else toast(t.alerts.warning(name, alert.percent), 'warning')
      }
    },
    [toast, t, byId],
  )
}
