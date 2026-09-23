export const EXPENSE_TYPES = ['food', 'housing', 'transport', 'shopping', 'entertainment', 'health', 'travel', 'other'] as const
export type ExpenseType = (typeof EXPENSE_TYPES)[number]

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares'

export interface PayerContribution {
  userId: string
  amount: number
}

export interface ParticipantShare {
  userId: string
  value: number
}

export interface RateSnapshot {
  date: string
  rate: number
  source: string
}

export interface Expense {
  id: string
  groupId: string
  title: string
  description?: string
  type?: ExpenseType
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  groupCurrency: string
  rateSnapshot?: RateSnapshot
  paidBy: PayerContribution[]
  participants: ParticipantShare[]
  splitType: SplitType
  expenseDate: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  isSettlement?: boolean
}

export interface Settlement {
  id: string
  groupId: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  note?: string
  createdBy: string
  createdAt: string
}
