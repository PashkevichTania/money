import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, Handshake } from 'lucide-react'
import { useGroups } from '@/hooks/useGroups'
import { useAuthStore } from '@/stores/authStore'
import { useGroupStore } from '@/stores/groupStore'
import { Button } from '@/components/ui/button'
import { Message } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalanceOverview } from '../hooks/useBalanceOverview'
import BalanceList from '../components/BalanceList'
import SettleUpDialog from '../components/SettleUpDialog'

export default function BalancesPage() {
  const { t } = useTranslation()
  const { groups, loading } = useGroups()
  const profile = useAuthStore((s) => s.profile)
  const groupError = useGroupStore((s) => s.errors.groups)
  const overview = useBalanceOverview(groups, profile?.id ?? '')
  const [groupId, setGroupId] = useState('')
  const [direction, setDirection] = useState('all')
  const [settle, setSettle] = useState(false)
  const ready = !loading && !groupError && overview.ready && !overview.error
  const filtered = overview.balances.filter(
    (b) =>
      (!groupId || b.group.id === groupId) &&
      (direction === 'all' || (direction === 'owed' ? b.net > 0 : b.net < 0)),
  )
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          <Wallet className="size-7 text-positive" />
          {t('All balances')}
        </h1>
        <Button
          disabled={
            !ready || !overview.balances.some((b) => b.transfers.length)
          }
          onClick={() => setSettle(true)}
        >
          <Handshake />
          {t('Settle up')}
        </Button>
      </header>
      <div className="flex flex-wrap gap-3">
        <NativeSelect
          aria-label={t('Group')}
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          <option value="">{t('All groups')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t('Direction')}
          value={direction}
          onChange={(event) => setDirection(event.target.value)}
        >
          <option value="all">{t('All directions')}</option>
          <option value="owed">{t('You are owed')}</option>
          <option value="owing">{t('You owe')}</option>
        </NativeSelect>
      </div>
      {(groupError || overview.error) && (
        <Message error>{groupError || overview.error}</Message>
      )}
      {overview.error && (
        <Button variant="outline" onClick={overview.retry}>
          {t('Retry')}
        </Button>
      )}
      {ready && profile ? (
        <BalanceList
          balances={filtered}
          userId={profile.id}
          names={overview.names}
        />
      ) : (
        !groupError && !overview.error && <Skeleton className="h-48" />
      )}
      {settle && ready && profile && (
        <SettleUpDialog
          balances={overview.balances}
          userId={profile.id}
          names={overview.names}
          onClose={() => setSettle(false)}
        />
      )}
    </div>
  )
}
