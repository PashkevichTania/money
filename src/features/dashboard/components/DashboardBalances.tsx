import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { subscribeExpenses } from '@/api/expenses'
import { subscribeSettlements } from '@/api/settlements'
import type { Group } from '@/types/group'
import type { Expense, Settlement } from '@/types/expense'
import { summarizeDashboard } from '@/utils/dashboard'
import { formatMoney } from '@/utils/currency'
import { Section, Message } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

type Ledger = { expenses?: Expense[]; settlements?: Settlement[] }
export default function DashboardBalances({
  groups,
  userId,
}: {
  groups: Group[]
  userId: string
}) {
  const { t } = useTranslation()
  const key = JSON.stringify(groups.map((g) => [g.id, g.baseCurrency]).sort())
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<{
    key: string
    userId: string
    ledgers: Record<string, Ledger>
    error?: string
  }>({ key, userId, ledgers: {} })
  useEffect(() => {
    let active = true
    const unsubscribes: (() => void)[] = []
    const update = (id: string, patch: Ledger) => {
      if (active)
        setState((s) => {
          const ledgers = s.key === key && s.userId === userId ? s.ledgers : {}
          return {
            key,
            userId,
            error: s.key === key && s.userId === userId ? s.error : undefined,
            ledgers: { ...ledgers, [id]: { ...ledgers[id], ...patch } },
          }
        })
    }
    const fail = (error: Error) => {
      if (active) setState({ key, userId, ledgers: {}, error: error.message })
    }
    try {
      for (const [id] of JSON.parse(key) as [string, string][]) {
        unsubscribes.push(
          subscribeExpenses(id, (expenses) => update(id, { expenses }), fail),
        )
        unsubscribes.push(
          subscribeSettlements(
            id,
            (settlements) => update(id, { settlements }),
            fail,
          ),
        )
      }
    } catch (error) {
      fail(
        error instanceof Error ? error : new Error('Unable to load balances.'),
      )
    }
    return () => {
      active = false
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [key, userId, retry])
  let error =
    state.key === key && state.userId === userId ? state.error : undefined
  const ready =
    groups.length === 0 ||
    (state.key === key &&
      state.userId === userId &&
      groups.every(
        (g) =>
          state.ledgers[g.id]?.expenses && state.ledgers[g.id]?.settlements,
      ))
  let totals: ReturnType<typeof summarizeDashboard> = []
  if (ready && !error) {
    try {
      totals = summarizeDashboard(
        groups.map((g) => ({
          currency: g.baseCurrency,
          expenses: state.ledgers[g.id].expenses!,
          settlements: state.ledgers[g.id].settlements!,
        })),
        userId,
      )
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to calculate balances.'
    }
  }
  return (
    <Section
      title={t('Your balances')}
      description={t(
        'All your groups, separated by currency. Includes recorded settlements.',
      )}
    >
      {error ? (
        <>
          <Message error>{error}</Message>
          <Button
            variant="outline"
            onClick={() => {
              setState({ key, userId, ledgers: {} })
              setRetry((value) => value + 1)
            }}
          >
            {t('Retry')}
          </Button>
        </>
      ) : !ready ? (
        <Skeleton className="h-28" aria-label={t('Loading balances')} />
      ) : !totals.length ? (
        <p className="text-sm text-muted-foreground">
          {t('Your balances will appear when you join or create a group.')}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {totals.map((total) => (
            <div key={total.currency} className="rounded-md border p-4">
              <h3 className="font-semibold">{total.currency}</h3>
              <dl className="mt-3 space-y-2 text-sm tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt>{t('You are owed')}</dt>
                  <dd className="text-positive">
                    {formatMoney(total.owed, total.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{t('You owe')}</dt>
                  <dd className="text-destructive">
                    {formatMoney(total.owing, total.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2 font-medium">
                  <dt>{t('Net balance')}</dt>
                  <dd>{formatMoney(total.net, total.currency)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
