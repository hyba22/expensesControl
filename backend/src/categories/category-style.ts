import { TransactionType } from '../generated/prisma/enums.js';

// Icon names (from the Lucide set) and colors the frontend knows how to draw.
// Keeping a fixed list means users can't store arbitrary strings here.
export const CATEGORY_ICONS = [
  'shopping-cart',
  'utensils',
  'bus',
  'fuel',
  'house',
  'zap',
  'wifi',
  'heart-pulse',
  'shopping-bag',
  'gamepad',
  'graduation-cap',
  'users',
  'ellipsis',
  'briefcase',
  'gift',
  'laptop',
  'coins',
  'car',
  'plane',
  'coffee',
  'dumbbell',
  'paw-print',
  'baby',
  'shirt',
  'smartphone',
  'piggy-bank',
  'landmark',
  'receipt',
] as const;

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
] as const;

export const DEFAULT_CATEGORIES: {
  key: string;
  type: TransactionType;
  icon: (typeof CATEGORY_ICONS)[number];
  color: (typeof CATEGORY_COLORS)[number];
}[] = [
  { key: 'groceries', type: 'EXPENSE', icon: 'shopping-cart', color: '#22c55e' },
  { key: 'restaurants', type: 'EXPENSE', icon: 'utensils', color: '#f97316' },
  { key: 'transport', type: 'EXPENSE', icon: 'bus', color: '#0ea5e9' },
  { key: 'fuel', type: 'EXPENSE', icon: 'fuel', color: '#64748b' },
  { key: 'rent', type: 'EXPENSE', icon: 'house', color: '#7c3aed' },
  { key: 'bills', type: 'EXPENSE', icon: 'zap', color: '#eab308' },
  { key: 'phone_internet', type: 'EXPENSE', icon: 'wifi', color: '#3b82f6' },
  { key: 'health', type: 'EXPENSE', icon: 'heart-pulse', color: '#ef4444' },
  { key: 'shopping', type: 'EXPENSE', icon: 'shopping-bag', color: '#ec4899' },
  { key: 'leisure', type: 'EXPENSE', icon: 'gamepad', color: '#a855f7' },
  { key: 'education', type: 'EXPENSE', icon: 'graduation-cap', color: '#14b8a6' },
  { key: 'family', type: 'EXPENSE', icon: 'users', color: '#f97316' },
  { key: 'other_expense', type: 'EXPENSE', icon: 'ellipsis', color: '#18181b' },
  { key: 'salary', type: 'INCOME', icon: 'briefcase', color: '#7c3aed' },
  { key: 'bonus', type: 'INCOME', icon: 'gift', color: '#ec4899' },
  { key: 'freelance', type: 'INCOME', icon: 'laptop', color: '#0ea5e9' },
  { key: 'other_income', type: 'INCOME', icon: 'coins', color: '#22c55e' },
];
