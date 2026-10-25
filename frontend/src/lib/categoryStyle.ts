import {
  Baby,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Coins,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Users,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Dictionary } from '../i18n/en'
import type { Category } from './finance'

// Must match the backend's allowed icon names (category-style.ts).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  utensils: UtensilsCrossed,
  bus: Bus,
  fuel: Fuel,
  house: House,
  zap: Zap,
  wifi: Wifi,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  gamepad: Gamepad2,
  'graduation-cap': GraduationCap,
  users: Users,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  gift: Gift,
  laptop: Laptop,
  coins: Coins,
  car: Car,
  plane: Plane,
  coffee: Coffee,
  dumbbell: Dumbbell,
  'paw-print': PawPrint,
  baby: Baby,
  shirt: Shirt,
  smartphone: Smartphone,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  receipt: Receipt,
}

export const CATEGORY_COLORS = [
  '#7c3aed',
  '#a855f7',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#3b82f6',
  '#64748b',
  '#18181b',
]

const DEFAULT_ORDER = [
  'groceries',
  'restaurants',
  'transport',
  'fuel',
  'rent',
  'bills',
  'phone_internet',
  'health',
  'shopping',
  'leisure',
  'education',
  'family',
  'other_expense',
  'salary',
  'bonus',
  'freelance',
  'other_income',
]

export const iconFor = (name: string | undefined) => (name && CATEGORY_ICONS[name]) || Tag

export function categoryName(category: Pick<Category, 'key' | 'name'>, t: Dictionary) {
  return category.name ?? (category.key && t.categories.defaults[category.key]) ?? '—'
}

// Expenses before income. Within each: built-in categories in a sensible
// order, then the user's own alphabetically, and the "other" one last.
export function sortCategories(list: Category[], t: Dictionary) {
  const rank = (c: Category) => {
    if (!c.key) return 50
    if (c.key.startsWith('other_')) return 100
    return DEFAULT_ORDER.indexOf(c.key)
  }
  return [...list].sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      rank(a) - rank(b) ||
      categoryName(a, t).localeCompare(categoryName(b, t)),
  )
}
