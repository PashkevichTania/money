import { Utensils, House, Bus, ShoppingBag, Clapperboard, HeartPulse, Plane, Shapes, Receipt, type LucideIcon } from 'lucide-react'
import type { ExpenseType } from '@/types/expense'

export const EXPENSE_TYPE_DETAILS: Record<ExpenseType, { label: string; Icon: LucideIcon }> = {
  food: { label: 'Food', Icon: Utensils },
  housing: { label: 'Housing', Icon: House },
  transport: { label: 'Transport', Icon: Bus },
  shopping: { label: 'Shopping', Icon: ShoppingBag },
  entertainment: { label: 'Entertainment', Icon: Clapperboard },
  health: { label: 'Health', Icon: HeartPulse },
  travel: { label: 'Travel', Icon: Plane },
  other: { label: 'Other', Icon: Shapes },
}

export function getExpenseTypeDetails(type?: ExpenseType) {
  return (type && Object.hasOwn(EXPENSE_TYPE_DETAILS, type) && EXPENSE_TYPE_DETAILS[type]) || { label: 'No type', Icon: Receipt }
}
