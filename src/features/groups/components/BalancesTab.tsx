import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { subscribeExpenses } from '@/api/expenses'
import { subscribeSettlements } from '@/api/settlements'
import { Button } from '@/components/ui/button'
import { Section, Message } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import type { Expense, Settlement } from '@/types/expense'
import { useCurrentUser } from '@/hooks/useGroups'
import { calculateBalances, simplifyDebts } from '@/utils/balances'
import { formatMoney } from '@/utils/currency'

export function BalanceSummary({
  group,
  members,
  expenses,
  settlements,
  currentUserId,
}: {
  group: Group
  members: UserProfile[]
  expenses: Expense[]
  settlements: Settlement[]
  currentUserId?: string
}) {
  let rows, suggestions
  try {
    rows = calculateBalances(
      expenses,
      settlements,
      group.baseCurrency,
      group.memberIds,
    )
    suggestions = simplifyDebts(new Map(rows.map((r) => [r.userId, r.net])))
  } catch (error) {
    return (
      <Message error>
        {error instanceof Error
          ? error.message
          : 'Unable to calculate balances.'}
      </Message>
    )
  }
  const money = (value: number) => formatMoney(value, group.baseCurrency)
  const name = (id: string) =>
    members.find((m) => m.id === id)?.displayName || `Member ${id.slice(0, 6)}`
  const mine = rows.find((r) => r.userId === currentUserId)?.net ?? 0
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Section
          title="Total expenses"
          description={`All time · ${group.baseCurrency}`}
        >
          <p className="text-3xl font-semibold tabular-nums">
            {money(
              rows.reduce((sum, r) => sum + Math.round(r.paid * 100), 0) / 100,
            )}
          </p>
        </Section>
        <Section
          title={
            mine > 0 ? 'You are owed' : mine < 0 ? 'You owe' : 'Your balance'
          }
          description="Including recorded settlements"
        >
          <p
            className={`text-3xl font-semibold tabular-nums ${mine > 0 ? 'text-positive' : mine < 0 ? 'text-destructive' : ''}`}
          >
            {money(Math.abs(mine))}
          </p>
        </Section>
      </div>
      {!expenses.length && !settlements.length && (
        <Message>
          No expenses yet. Add the first expense to start tracking balances.
        </Message>
      )}
      <Section
        title="Member balances"
        description={`All amounts in ${group.baseCurrency}. Positive balances are money to receive.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Group member balances</caption>
            <thead>
              <tr className="border-b text-muted-foreground">
                {['Member', 'Paid', 'Share', 'Settlements', 'Balance'].map(
                  (label, i) => (
                    <th
                      key={label}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-3 font-medium ${i ? 'text-right' : 'text-left'}`}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b last:border-0">
                  <th scope="row" className="px-3 py-4 text-left font-medium">
                    {name(r.userId)}
                    {r.userId === currentUserId && ' (you)'}
                  </th>
                  {[r.paid, r.owed, r.settlementNet].map((value, i) => (
                    <td
                      key={i}
                      className="whitespace-nowrap px-3 py-4 text-right tabular-nums"
                    >
                      {money(value)}
                    </td>
                  ))}
                  <td
                    className={`whitespace-nowrap px-3 py-4 text-right tabular-nums ${r.net > 0 ? 'text-positive' : r.net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {r.net > 0 ? 'Gets back ' : r.net < 0 ? 'Owes ' : ''}
                    {money(Math.abs(r.net))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="Suggested transfers"
        description="These suggestions simplify group debts. They do not record or send payments."
      >
        {!suggestions.length ? (
          <p className="text-sm text-muted-foreground">
            {expenses.length || settlements.length
              ? 'All settled up. Nobody owes anything.'
              : 'Suggestions will appear after expenses are added.'}
          </p>
        ) : (
          <ul className="divide-y">
            {suggestions.map((s) => (
              <li
                key={`${s.from}:${s.to}`}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <strong>{name(s.from)}</strong> pays{' '}
                  <strong>{name(s.to)}</strong>
                </span>
                <span className="font-semibold tabular-nums">
                  {money(s.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

export default function BalancesTab({
  group,
  members,
}: {
  group: Group
  members: UserProfile[]
}) {
  const me = useCurrentUser()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    groupId: string
    expenses?: Expense[]
    settlements?: Settlement[]
    error?: string
  }>({ groupId: group.id })
  useEffect(() => {
    let active = true
    const unsubscribes: (() => void)[] = []
    const fail = (error: Error) => {
      if (active) setState({ groupId: group.id, error: error.message })
    }
    try {
      unsubscribes.push(
        subscribeExpenses(
          group.id,
          (expenses) => {
            if (active)
              setState((s) => ({
                ...(s.groupId === group.id ? s : {}),
                groupId: group.id,
                expenses,
              }))
          },
          fail,
        ),
      )
      unsubscribes.push(
        subscribeSettlements(
          group.id,
          (settlements) => {
            if (active)
              setState((s) => ({
                ...(s.groupId === group.id ? s : {}),
                groupId: group.id,
                settlements,
              }))
          },
          fail,
        ),
      )
    } catch (error) {
      fail(
        error instanceof Error ? error : new Error('Unable to load balances.'),
      )
    }
    return () => {
      active = false
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [group.id, attempt])
  if (state.groupId === group.id && state.error)
    return (
      <Section title="Balances unavailable">
        <Message error>{state.error}</Message>
        <Button
          variant="outline"
          onClick={() => {
            setState({ groupId: group.id })
            setAttempt((a) => a + 1)
          }}
        >
          <RefreshCw />
          Retry
        </Button>
      </Section>
    )
  if (state.groupId !== group.id || !state.expenses || !state.settlements)
    return (
      <div role="status" aria-label="Loading balances">
        <Skeleton className="h-64" />
      </div>
    )
  return (
    <BalanceSummary
      group={group}
      members={members}
      expenses={state.expenses}
      settlements={state.settlements}
      currentUserId={me?.id}
    />
  )
}
