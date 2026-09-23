import QuickSettleButton from '@/features/balances/components/QuickSettleButton'
import { useTranslation } from 'react-i18next'
import type { TransferSuggestion } from './RecordSettlementDialog'
import { formatDate } from '@/utils/dates'
import { Button } from '@/components/ui/button'
import { Section, Message } from '@/components/ui/field'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import type { Expense, Settlement } from '@/types/expense'
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
  const { t } = useTranslation()
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
          : t('Unable to calculate balances.')}
      </Message>
    )
  }
  const money = (value: number) => formatMoney(value, group.baseCurrency)
  const name = (id: string) =>
    members.find((m) => m.id === id)?.displayName ||
    t('Member {{id}}', { id: id.slice(0, 6) })
  const mine = rows.find((r) => r.userId === currentUserId)?.net ?? 0
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Section
          title={t('Total expenses')}
          description={t('All time · {{currency}}', {
            currency: group.baseCurrency,
          })}
        >
          <p className="text-3xl font-semibold tabular-nums">
            {money(
              rows.reduce((sum, r) => sum + Math.round(r.paid * 100), 0) / 100,
            )}
          </p>
        </Section>
        <Section
          title={
            mine > 0
              ? t('You are owed')
              : mine < 0
                ? t('You owe')
                : t('Your balance')
          }
          description={t('Including recorded settlements')}
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
          {t(
            'No expenses yet. Add the first expense to start tracking balances.',
          )}
        </Message>
      )}
      <Section
        title={t('Member balances')}
        description={t(
          'All amounts in {{currency}}. Positive balances are money to receive.',
          { currency: group.baseCurrency },
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('Group member balances')}</caption>
            <thead>
              <tr className="border-b text-muted-foreground">
                {[
                  t('Member'),
                  t('Paid'),
                  t('Share'),
                  t('Settlements'),
                  t('Balance'),
                ].map((label, i) => (
                  <th
                    key={label}
                    scope="col"
                    className={`whitespace-nowrap px-3 py-3 font-medium ${i ? 'text-right' : 'text-left'}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b last:border-0">
                  <th scope="row" className="px-3 py-4 text-left font-medium">
                    {name(r.userId)}
                    {r.userId === currentUserId && t(' (you)')}
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
                    {r.net > 0 ? t('Gets back ') : r.net < 0 ? t('Owes ') : ''}
                    {money(Math.abs(r.net))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title={t('Suggested transfers')}
        description={t(
          'These suggestions simplify group debts. Record a payment after transferring the money.',
        )}
      >
        {onRecord && group.memberIds.length > 1 && (
          <Button onClick={() => onRecord()}>{t('Record a payment')}</Button>
        )}
        {!suggestions.length ? (
          <p className="text-sm text-muted-foreground">
            {expenses.length || settlements.length
              ? t('All settled up. Nobody owes anything.')
              : t('Suggestions will appear after expenses are added.')}
          </p>
        ) : (
          <ul className="divide-y">
            {suggestions.map((s) => (
              <li
                key={`${s.from}:${s.to}`}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <span>
                  {t('{{from}} pays {{to}}', {
                    from: name(s.from),
                    to: name(s.to),
                  })}
                </span>
                <span className="font-semibold tabular-nums">
                  {money(s.amount)}
                </span>
                {onRecord &&
                  (s.from === currentUserId || s.to === currentUserId) && (
                    <QuickSettleButton
                      groupId={group.id}
                      currency={group.baseCurrency}
                      transfer={s}
                      userId={currentUserId!}
                    />
                  )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {!!settlements.length && (
        <Section
          title={t('Recorded payments')}
          description={t(
            'Deleting an incorrect record reverses its effect on balances.',
          )}
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
                      {t('{{from}} paid {{to}}', {
                        from: name(payment.fromUserId),
                        to: name(payment.toUserId),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(payment.createdAt)} ·{' '}
                      {t('Recorded by {{name}}', {
                        name: name(payment.createdBy),
                      })}
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
                      aria-label={t('Delete payment from {{from}} to {{to}}', {
                        from: name(payment.fromUserId),
                        to: name(payment.toUserId),
                      })}
                    >
                      {t('Delete record')}
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
