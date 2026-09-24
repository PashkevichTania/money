import { Handshake } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { deleteSettlement } from '@/api/settlements';
import { Button } from '@/components/ui/button';
import { Message } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import type { Settlement } from '@/types/expense';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/dates';

export default function SettlementRow({
  settlement,
  userId,
  name,
}: {
  settlement: Settlement;
  userId?: string;
  name: (id: string) => string;
}) {
  const { t } = useTranslation();
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const person = (id: string) => (id === userId ? t('You') : name(id));
  return (
    <article className="flex gap-3 bg-positive/5 p-4 sm:gap-4 sm:p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-positive/10 text-positive">
        <Handshake className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-positive">
              {t('Settlement')}
            </span>
            <h3 className="mt-1 break-words font-semibold">
              {t('{{from}} paid {{to}}', {
                from: person(settlement.fromUserId),
                to: person(settlement.toUserId),
              })}
            </h3>
          </div>
          <strong className="tabular-nums">
            {formatMoney(settlement.amount, settlement.currency)}
          </strong>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatDate(settlement.createdAt)} ·{' '}
          {t('Recorded by {{name}}', { name: name(settlement.createdBy) })}
        </p>
        {settlement.note && (
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {settlement.note}
          </p>
        )}
        {settlement.createdBy === userId && (
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => {
              setError('');
              setRemove(true);
            }}
          >
            {t('Delete record')}
          </Button>
        )}
      </div>
      <Modal
        open={remove}
        onClose={() => setRemove(false)}
        busy={busy}
        title={t('Delete payment record?')}
        description={t(
          'Remove this {{amount}} payment record and restore the corresponding debt? This does not reverse the actual transfer.',
          { amount: formatMoney(settlement.amount, settlement.currency) }
        )}
      >
        {error && <Message error>{error}</Message>}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setRemove(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await deleteSettlement(settlement.groupId, settlement.id);
                setRemove(false);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'Unable to delete payment.'
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {t(busy ? 'Deleting...' : 'Delete record')}
          </Button>
        </div>
      </Modal>
    </article>
  );
}
