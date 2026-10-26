import { api } from './api'

export type TransactionType = 'EXPENSE' | 'INCOME'

export interface Category {
  id: string
  key: string | null
  name: string | null
  type: TransactionType
  icon: string
  color: string
  _count?: { transactions: number }
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: string
  description: string
  note: string | null
  categoryId: string | null
  category: Category | null
}

export interface TransactionInput {
  type: TransactionType
  amount: number
  date: string
  description: string
  note?: string | null
  categoryId?: string | null
}

export interface TransactionFilters {
  from?: string
  to?: string
  type?: TransactionType
  categoryId?: string
  search?: string
  page?: number
}

export interface TransactionPage {
  items: Transaction[]
  total: number
  totals: { income: number; expense: number }
}

export interface Summary {
  balance: number
  income: number
  expense: number
  // Income received last month, which pays for this month (see backend).
  available: number
  remaining: number
  byCategory: { categoryId: string | null; amount: number }[]
  recent: Transaction[]
}

const json = (body: unknown) => JSON.stringify(body)

function query(filters: TransactionFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export const categoriesApi = {
  list: () => api<Category[]>('/categories'),
  create: (data: Pick<Category, 'type' | 'icon' | 'color'> & { name: string }) =>
    api<Category>('/categories', { method: 'POST', body: json(data) }),
  update: (id: string, data: Partial<Pick<Category, 'icon' | 'color'> & { name: string }>) =>
    api<Category>(`/categories/${id}`, { method: 'PATCH', body: json(data) }),
  remove: (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
}

export const transactionsApi = {
  list: (filters: TransactionFilters) => api<TransactionPage>(`/transactions?${query(filters)}`),
  summary: (month: string) => api<Summary>(`/transactions/summary?month=${month}`),
  create: (data: TransactionInput) =>
    api<Transaction & { alerts: BudgetAlert[] }>('/transactions', { method: 'POST', body: json(data) }),
  update: (id: string, data: Partial<TransactionInput>) =>
    api<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: json(data) }),
  remove: (id: string) => api<void>(`/transactions/${id}`, { method: 'DELETE' }),
}

export interface CsvMapping {
  date: number | null
  description: number | null
  amount: number | null
  debit: number | null
  credit: number | null
}

export interface ImportRow {
  date: string
  description: string
  amount: number
  type: TransactionType
  categoryId: string | null
  duplicate: boolean
}

export interface ImportPreview {
  kind: 'csv' | 'bank-statement' | 'payslip'
  ocr: boolean
  rows: ImportRow[]
  payslip?: { month: string | null; net: number | null; gross: number | null; cnss: number | null; irpp: number | null }
  csv?: { headers: string[]; mapping: CsvMapping }
}

export const importsApi = {
  preview: (file: File, mapping?: CsvMapping) => {
    const form = new FormData()
    form.append('file', file)
    if (mapping) form.append('mapping', JSON.stringify(mapping))
    return api<ImportPreview>('/imports/preview', { method: 'POST', body: form })
  },
  confirm: (source: 'CSV' | 'PDF', rows: TransactionInput[]) =>
    api<{ created: number; alerts: BudgetAlert[] }>('/imports/confirm', { method: 'POST', body: json({ source, rows }) }),
}

export interface BudgetAlert {
  categoryId: string
  percent: number
  level: 80 | 100
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  spent: number
}

export interface BudgetOverview {
  budgets: Budget[]
  // Category id -> average monthly spending over the last 3 months.
  suggestions: Record<string, number>
}

export const budgetsApi = {
  overview: (month: string) => api<BudgetOverview>(`/budgets?month=${month}`),
  set: (categoryId: string, amount: number) =>
    api<Budget>('/budgets', { method: 'PUT', body: json({ categoryId, amount }) }),
  remove: (id: string) => api<void>(`/budgets/${id}`, { method: 'DELETE' }),
}

export interface Stats {
  month: string
  monthly: { month: string; income: number; expense: number }[]
  daily: { current: number[]; previous: number[] }
  byCategory: { categoryId: string | null; amount: number }[]
  topMerchants: { name: string; amount: number; count: number }[]
}

export const statsApi = {
  forMonth: (month: string) => api<Stats>(`/stats?month=${month}`),
}

// Reads amounts the way people write them in Tunisia and elsewhere:
// "12,5", "12.500", "1 308,952", "1.308,952", "1,308.952", "1500 DT".
// Returns thousandths (millimes for TND), or null when it isn't a positive
// amount with at most `maxDecimals` decimals (3 for TND, 2 for EUR...).
export function parseAmount(text: string, maxDecimals = 3): number | null {
  let clean = text.replace(/(tnd|dt|د\.ت)/gi, '').replace(/[\s  ']/g, '')
  if (/[.,]{2}/.test(clean)) return null
  const lastSeparator = Math.max(clean.lastIndexOf(','), clean.lastIndexOf('.'))
  if (lastSeparator !== -1) {
    const decimals = clean.slice(lastSeparator + 1)
    const separator = clean[lastSeparator]
    const repeated = clean.split(separator).length > 2
    // "1.308,952" or "1,308.952": the last separator is the decimal one.
    // "1.308.952": a repeated separator only groups thousands.
    if (repeated) clean = clean.replace(/[.,]/g, '')
    else clean = `${clean.slice(0, lastSeparator).replace(/[.,]/g, '')}.${decimals}`
  }
  if (!/^\d{1,7}(\.\d{1,3})?$/.test(clean)) return null
  const [whole, decimals = ''] = clean.split('.')
  if (decimals.length > maxDecimals) return null
  const millimes = Number(whole) * 1000 + Number(decimals.padEnd(3, '0'))
  return millimes > 0 ? millimes : null
}

export function formatAmountInput(thousandths: number, decimals = 3) {
  return (thousandths / 1000).toFixed(decimals)
}

// Local calendar dates as YYYY-MM-DD.
export function toDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function monthBounds(month: string) {
  const [year, m] = month.split('-').map(Number)
  const last = new Date(year, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  return toDay(date).slice(0, 7)
}
