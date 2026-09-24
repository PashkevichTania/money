import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Message, Section } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupBalances } from '@/features/groups/hooks/useGroupBalances';
import { useCurrentUser } from '@/hooks/useGroups';
import type { Group } from '@/types/group';
import type { UserProfile } from '@/types/user';
import { formatMoney } from '@/utils/currency';

import { BalanceSummary } from './BalanceSummary';
import RecordSettlementDialog from './RecordSettlementDialog';

export default function BalancesTab({
  group,
  members,
}: {
  group: Group;
  members: UserProfile[];
}) {
  const { t } = useTranslation();
  const me = useCurrentUser();
  const {
    closeRecord,
    confirmDelete,
    data,
    deleteError,
    deleting,
    openRecord,
    record,
    retry,
    saveSettlement,
    selectSettlementToDelete,
    settlementToDelete,
  } = useGroupBalances(group.id);

  if (data.groupId === group.id && data.error) {
    return (
      <Section title={t('Balances unavailable')}>
        <Message error>{data.error}</Message>
        <Button variant="outline" onClick={retry}>
          <RefreshCw />
          {t('Retry')}
        </Button>
      </Section>
    );
  }

  if (data.groupId !== group.id || !data.expenses || !data.settlements) {
    return (
      <div role="status" aria-label={t('Loading balances')}>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <>
      <BalanceSummary
        group={group}
        members={members}
        expenses={data.expenses}
        settlements={data.settlements}
        currentUserId={me?.id}
        onRecord={me ? openRecord : undefined}
        onDelete={selectSettlementToDelete}
      />
      {record && me && (
        <RecordSettlementDialog
          group={group}
          members={members}
          currentUserId={me.id}
          suggestion={record.suggestion}
          onClose={closeRecord}
          onSave={saveSettlement}
        />
      )}
      {settlementToDelete && (
        <Modal
          open
          onClose={() => selectSettlementToDelete(null)}
          title={t('Delete payment record?')}
          description={t(
            'Remove this {{amount}} payment record and restore the corresponding debt? This does not reverse the actual transfer.',
            {
              amount: formatMoney(
                settlementToDelete.amount,
                group.baseCurrency
              ),
            }
          )}
          busy={deleting}
        >
          {deleteError && <Message error>{deleteError}</Message>}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => selectSettlementToDelete(null)}
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? t('Deleting...') : t('Delete record')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
