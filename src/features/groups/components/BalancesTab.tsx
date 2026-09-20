import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { subscribeExpenses } from '@/api/expenses'
import {
  subscribeSettlements,
  createSettlement,
  deleteSettlement,
} from '@/api/settlements'
import RecordSettlementDialog, {
  type TransferSuggestion,
} from './RecordSettlementDialog'
import { Modal } from '@/components/ui/modal'
import { useNotify } from '@/hooks/useNotify'
import { formatDate } from '@/utils/dates'
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
  onRecord,
  onDelete,
}: {
  group: Group
  members: UserProfile[]
  expenses: Expense[]
  settlements: Settlement[]
  currentUserId?: string
  onRecord?: (suggestion?: TransferSuggestion) => void
  onDelete?: (settlement: Settlement) => void
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
        description="These suggestions simplify group debts. Record a payment after transferring the money."
      >
        {onRecord && group.memberIds.length > 1 && (
          <Button onClick={() => onRecord()}>Record a payment</Button>
        )}
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
                {onRecord &&
                  (s.from === currentUserId || s.to === currentUserId) && (
                    <Button
                      variant="outline"
                      onClick={() => onRecord(s)}
                      aria-label={`Record payment from ${name(s.from)} to ${name(s.to)}`}
                    >
                      Record payment
                    </Button>
                  )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {!!settlements.length && (
        <Section
          title="Recorded payments"
          description="Deleting an incorrect record reverses its effect on balances."
        >
          <ul className="divide-y">
            {[...settlements]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="break-words">
                      <strong>{name(payment.fromUserId)}</strong> paid{' '}
                      <strong>{name(payment.toUserId)}</strong>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(payment.createdAt)} · Recorded by{' '}
                      {name(payment.createdBy)}
                    </p>
                    {payment.note && (
                      <p className="mt-1 break-words text-muted-foreground">
                        {payment.note}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {money(payment.amount)}
                  </span>
                  {onDelete && payment.createdBy === currentUserId && (
                    <Button
                      variant="ghost"
                      onClick={() => onDelete(payment)}
                      aria-label={`Delete payment from ${name(payment.fromUserId)} to ${name(payment.toUserId)}`}
                    >
                      Delete record
                    </Button>
                  )}
                </li>
              ))}
          </ul>
        </Section>
      )}
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
  const { enqueueSnackbar } = useNotify()
  const [record, setRecord] = useState<{
    suggestion?: TransferSuggestion
  } | null>(null)
  const [toDelete, setToDelete] = useState<Settlement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
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
    <>
      <BalanceSummary
        group={group}
        members={members}
        expenses={state.expenses}
        settlements={state.settlements}
        currentUserId={me?.id}
        onRecord={me ? (suggestion) => setRecord({ suggestion }) : undefined}
        onDelete={(payment) => {
          setDeleteError('')
          setToDelete(payment)
        }}
      />
      {record && me && (
        <RecordSettlementDialog
          group={group}
          members={members}
          currentUserId={me.id}
          suggestion={record.suggestion}
          onClose={() => setRecord(null)}
          onSave={async (id, input) => {
            await createSettlement(id, input)
            enqueueSnackbar('Payment recorded', { variant: 'success' })
          }}
        />
      )}
      {toDelete && (
        <Modal
          open
          onClose={() => setToDelete(null)}
          title="Delete payment record?"
          description={`Remove this ${formatMoney(toDelete.amount, group.baseCurrency)} payment record and restore the corresponding debt? This does not reverse the actual transfer.`}
          busy={deleting}
        >
          {deleteError && <Message error>{deleteError}</Message>}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (deleting) return
                setDeleting(true)
                setDeleteError('')
                try {
                  await deleteSettlement(group.id, toDelete.id)
                  setToDelete(null)
                  enqueueSnackbar('Payment record deleted', {
                    variant: 'success',
                  })
                } catch (error) {
                  setDeleteError(
                    error instanceof Error
                      ? error.message
                      : 'Unable to delete payment.',
                  )
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete record'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
