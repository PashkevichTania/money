import type { Expense, Settlement } from '@/types/expense'
import { aggregateNetBalances } from './balances'

export function summarizeDashboard(
  groups: {
    currency: string
    expenses: Expense[]
    settlements: Settlement[]
  }[],
  userId: string,
) {
  const totals = new Map<
    string,
    { currency: string; owed: number; owing: number; net: number }
  >()
  for (const group of groups) {
    const net = Math.round(
      (aggregateNetBalances(
        group.expenses,
        group.settlements,
        group.currency,
      ).get(userId) ?? 0) * 100,
    )
    const total = totals.get(group.currency) ?? {
      currency: group.currency,
      owed: 0,
      owing: 0,
      net: 0,
    }
    total.owed += Math.max(0, net)
    total.owing += Math.max(0, -net)
    total.net += net
    if (![total.owed, total.owing, total.net].every(Number.isSafeInteger))
      throw new Error('Balance exceeds the supported amount.')
    totals.set(group.currency, total)
  }
  return [...totals.values()]
    .sort((a, b) => a.currency.localeCompare(b.currency))
    .map((t) => ({
      currency: t.currency,
      owed: t.owed / 100,
      owing: t.owing / 100,
      net: t.net / 100,
    }))
}
