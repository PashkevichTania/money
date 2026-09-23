import type { Expense, Settlement } from '@/types/expense'
import { aggregateNetBalances, simplifyDebts } from './balances'

export interface PlannedTransfer {
  from: string
  to: string
  amount: number
}

export function planSettlements(
  expenses: Expense[],
  settlements: Settlement[],
  currency: string,
  userId: string,
): PlannedTransfer[] {
  return simplifyDebts(
    aggregateNetBalances(expenses, settlements, currency),
  ).filter((transfer) => transfer.from === userId || transfer.to === userId)
}

export function convertTotals(
  totals: { currency: string; owed: number; owing: number }[],
  rates: Record<string, number>,
) {
  let owed = 0,
    owing = 0
  const missing: string[] = []
  for (const total of totals) {
    const rate = rates[total.currency]
    if (!Number.isFinite(rate) || rate <= 0) {
      if (total.owed || total.owing) missing.push(total.currency)
      continue
    }
    owed += Math.round(total.owed * rate * 100)
    owing += Math.round(total.owing * rate * 100)
  }
  if (![owed, owing, owed - owing].every(Number.isSafeInteger))
    throw new Error('Balance exceeds the supported amount.')
  return {
    owed: owed / 100,
    owing: owing / 100,
    net: (owed - owing) / 100,
    missing,
  }
}
