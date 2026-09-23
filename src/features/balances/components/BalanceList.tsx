import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatMoney } from '@/utils/currency'
import type { GroupBalance } from '../hooks/useBalanceOverview'
import QuickSettleButton from './QuickSettleButton'

export default function BalanceList({
  balances,
  userId,
  names,
  limit,
}: {
  balances: GroupBalance[]
  userId: string
  names: Record<string, string>
  limit?: number
}) {
  const { t } = useTranslation()
  const entries = balances.flatMap((b) =>
    b.transfers.map((transfer) => ({ group: b.group, transfer })),
  )
  if (!entries.length)
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('All settled up. Nobody owes anything.')}
      </p>
    )
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.slice(0, limit ?? entries.length).map(({ group, transfer }) => {
        const incoming = transfer.to === userId
        const person = incoming ? transfer.from : transfer.to
        const Icon = incoming ? ArrowDownLeft : ArrowUpRight
        return (
          <article
            key={`${group.id}:${transfer.from}:${transfer.to}`}
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
          >
            <span
              className={`rounded-lg p-2 ${incoming ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/groups/${group.id}`}
                className="block truncate font-medium hover:underline"
              >
                {group.name}
              </Link>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {t(incoming ? '{{name}} owes you' : 'You owe {{name}}', {
                  name:
                    names[person] ||
                    t('Member {{id}}', { id: person.slice(0, 6) }),
                })}
              </p>
            </div>
            <strong
              className={`tabular-nums ${incoming ? 'text-positive' : 'text-destructive'}`}
            >
              {formatMoney(transfer.amount, group.baseCurrency)}
            </strong>
            <QuickSettleButton
              groupId={group.id}
              currency={group.baseCurrency}
              transfer={transfer}
              userId={userId}
            />
          </article>
        )
      })}
    </div>
  )
}
