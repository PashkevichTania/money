import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus, Users, Handshake, Sun, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Message } from '@/components/ui/field'
import { useAuthStore } from '@/stores/authStore'
import { useGroupStore } from '@/stores/groupStore'
import { useGroups } from '@/hooks/useGroups'
import { useBalanceOverview } from '@/features/balances/hooks/useBalanceOverview'
import SettleUpDialog from '@/features/balances/components/SettleUpDialog'
import BalanceList from '@/features/balances/components/BalanceList'
import DashboardBalances from '../components/DashboardBalances'

export default function DashboardPage() {
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const { groups, loading } = useGroups()
  const groupError = useGroupStore((s) => s.errors.groups)
  const overview = useBalanceOverview(groups, profile?.id ?? '')
  const [settle, setSettle] = useState<{ groupId?: string } | null>(null)
  const ready = !loading && !groupError && overview.ready && !overview.error
  const count = overview.balances.reduce(
    (sum, b) => sum + b.transfers.length,
    0,
  )
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <Sun className="size-7 shrink-0 text-positive" />
            {profile?.displayName
              ? t('Hello, {{name}}.', {
                  name: profile.displayName.split(' ')[0],
                })
              : t('Hello!')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('Your shared money, at a glance.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link to="/groups?new=1" />}
            nativeButton={false}
          >
            <Plus />
            {t('Create a group')}
          </Button>
          <Button disabled={!ready || !count} onClick={() => setSettle({})}>
            <Handshake />
            {t('Settle up')}
          </Button>
        </div>
      </header>
      {groupError && <Message error>{groupError}</Message>}
      {overview.error && (
        <div className="space-y-2">
          <Message error>{overview.error}</Message>
          <Button variant="outline" onClick={overview.retry}>
            {t('Retry')}
          </Button>
        </div>
      )}
      {!ready && !overview.error && !groupError && (
        <Skeleton className="h-72" aria-label={t('Loading balances')} />
      )}
      {ready && profile && (
        <DashboardBalances
          balances={overview.balances}
          userId={profile.id}
          currency={profile.defaultCurrency}
          onSettleGroup={(groupId) => setSettle({ groupId })}
        />
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="size-5 text-positive" />
            {t('All balances')}
            {ready && (
              <span className="text-sm font-normal text-muted-foreground">
                {count}
              </span>
            )}
          </h2>
          <Link
            to="/balances"
            className="flex items-center gap-1 text-sm hover:underline"
          >
            {t('View all balances')}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        {ready && profile ? (
          <BalanceList
            balances={overview.balances}
            userId={profile.id}
            names={overview.names}
            limit={10}
          />
        ) : (
          <Skeleton className="h-24" />
        )}
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5 text-positive" />
            {t('Your groups')}
            <span className="text-sm font-normal text-muted-foreground">
              {loading ? '…' : groups.length}
            </span>
          </h2>
          <Link
            to="/groups"
            className="flex items-center gap-1 text-sm hover:underline"
          >
            {t('View all groups')}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('Recently updated groups')}
        </p>
        {loading ? (
          <Skeleton className="h-32" />
        ) : groups.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.slice(0, 6).map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <span className="rounded-lg bg-secondary p-3">
                  <Users className="size-4 text-positive" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{group.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('members', { count: group.memberIds.length })} ·{' '}
                    {group.baseCurrency}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t('No groups yet. Create your first group to get started.')}
          </p>
        )}
      </section>
      {settle && ready && profile && (
        <SettleUpDialog
          balances={overview.balances}
          names={overview.names}
          userId={profile.id}
          initialGroupId={settle.groupId}
          onClose={() => setSettle(null)}
        />
      )}
    </div>
  )
}
