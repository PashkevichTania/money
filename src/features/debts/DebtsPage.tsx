import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Message } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useBalanceOverview } from '@/features/balances/hooks/useBalanceOverview';
import { useOverviewRates } from '@/features/balances/hooks/useOverviewRates';
import { useGroups } from '@/hooks/useGroups';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { buildDirectDebts } from '@/utils/directDebts';

import DebtGraphView from './DebtGraphView';

export default function DebtsPage() {
  const { t } = useTranslation();
  const { groups, loading } = useGroups();
  const profile = useAuthStore((state) => state.profile);
  const groupError = useGroupStore((state) => state.errors.groups);
  const overview = useBalanceOverview(groups, profile?.id ?? '');
  const ready = !loading && !groupError && overview.ready && !overview.error;
  const graph = buildDirectDebts(
    ready
      ? groups.map((group) => ({
          group,
          expenses: overview.ledgers[group.id]?.expenses ?? [],
          settlements: overview.ledgers[group.id]?.settlements ?? [],
        }))
      : []
  );
  const fx = useOverviewRates(
    graph.edges.flatMap((edge) => edge.parts.map((part) => part.currency)),
    profile?.defaultCurrency ?? 'EUR'
  );
  if (groupError || overview.error)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{t('Debt graph')}</h1>
        <Message error>{groupError || overview.error}</Message>
        {overview.error && (
          <Button variant="outline" onClick={overview.retry}>
            {t('Retry')}
          </Button>
        )}
      </div>
    );
  if (!ready || !profile)
    return (
      <div aria-label={t('Loading...')} className="space-y-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-[580px]" />
      </div>
    );
  return (
    <DebtGraphView
      graph={graph}
      userId={profile.id}
      names={overview.names}
      currency={profile.defaultCurrency}
      rates={fx.rates}
      dates={fx.dates}
      ratesReady={fx.ready}
      retryRates={fx.retry}
    />
  );
}
