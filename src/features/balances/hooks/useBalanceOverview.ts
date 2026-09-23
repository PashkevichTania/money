import { useEffect, useState } from 'react'
import { subscribeExpenses } from '@/api/expenses'
import { subscribeSettlements } from '@/api/settlements'
import { getUsersByIds } from '@/api/users'
import type { Expense, Settlement } from '@/types/expense'
import type { Group } from '@/types/group'
import { aggregateNetBalances } from '@/utils/balances'
import { planSettlements } from '@/utils/settlementPlan'

type Ledger = { expenses?: Expense[]; settlements?: Settlement[] }
export function useBalanceOverview(groups: Group[], userId: string) {
  const key = JSON.stringify(
    groups.map((g) => [g.id, g.baseCurrency, g.memberIds]).sort(),
  )
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    key: string
    ledgers: Record<string, Ledger>
    error?: string
  }>({ key: '', ledgers: {} })
  const [people, setPeople] = useState<{
    key: string
    names: Record<string, string>
  }>({ key: '', names: {} })
  useEffect(() => {
    let active = true
    const stops: (() => void)[] = []
    const fail = (error: Error) => {
      if (active) setState({ key, ledgers: {}, error: error.message })
    }
    const update = (id: string, patch: Ledger) => {
      if (active)
        setState((old) => ({
          key,
          error: old.key === key ? old.error : undefined,
          ledgers: {
            ...(old.key === key ? old.ledgers : {}),
            [id]: { ...(old.key === key ? old.ledgers[id] : {}), ...patch },
          },
        }))
    }
    const entries = JSON.parse(key) as [string, string, string[]][]
    try {
      for (const [id] of entries) {
        stops.push(
          subscribeExpenses(id, (expenses) => update(id, { expenses }), fail),
        )
        stops.push(
          subscribeSettlements(
            id,
            (settlements) => update(id, { settlements }),
            fail,
          ),
        )
      }
      void getUsersByIds([...new Set(entries.flatMap((g) => g[2]))])
        .then((users) => {
          if (active)
            setPeople({
              key,
              names: Object.fromEntries(
                users.map((u) => [u.id, u.displayName]),
              ),
            })
        })
        .catch(() => {
          /* A member identifier remains available if profile loading fails. */
        })
    } catch (cause) {
      fail(
        cause instanceof Error ? cause : new Error('Unable to load balances.'),
      )
    }
    return () => {
      active = false
      stops.forEach((stop) => stop())
    }
  }, [key, attempt])
  let error = state.key === key ? state.error : undefined
  const ready =
    !groups.length ||
    (state.key === key &&
      groups.every(
        (g) =>
          state.ledgers[g.id]?.expenses && state.ledgers[g.id]?.settlements,
      ))
  let balances: {
    group: Group
    net: number
    transfers: ReturnType<typeof planSettlements>
  }[] = []
  if (ready && !error) {
    try {
      balances = groups.map((group) => {
        const { expenses = [], settlements = [] } =
          state.ledgers[group.id] ?? {}
        return {
          group,
          net:
            aggregateNetBalances(expenses, settlements, group.baseCurrency).get(
              userId,
            ) ?? 0,
          transfers: planSettlements(
            expenses,
            settlements,
            group.baseCurrency,
            userId,
          ),
        }
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to calculate balances.'
    }
  }
  return {
    ready,
    error,
    balances,
    ledgers: state.ledgers,
    names: people.key === key ? people.names : {},
    retry: () => {
      setState({ key: '', ledgers: {} })
      setAttempt((n) => n + 1)
    },
  }
}
export type GroupBalance = ReturnType<
  typeof useBalanceOverview
>['balances'][number]
