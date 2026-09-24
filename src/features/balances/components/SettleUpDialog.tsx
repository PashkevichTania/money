import { ArrowRight, Check, Handshake } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { saveSettlementJobs, type SettlementJob } from '@/api/settlementJobs';
import { Button } from '@/components/ui/button';
import { Message } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/dates';

import type { GroupBalance } from '../hooks/useBalanceOverview';

export default function SettleUpDialog({
  balances,
  userId,
  names,
  initialGroupId,
  onClose,
}: {
  balances: GroupBalance[];
  userId: string;
  names: Record<string, string>;
  initialGroupId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>(
    initialGroupId ? [initialGroupId] : []
  );
  const [jobs, setJobs] = useState<SettlementJob[] | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const name = (id: string) =>
    id === userId
      ? t('You')
      : names[id] || t('Member {{id}}', { id: id.slice(0, 6) });
  const preview =
    jobs ??
    balances
      .filter((b) => selected.includes(b.group.id))
      .flatMap((b) =>
        b.transfers.map((transfer) => ({
          ...transfer,
          groupId: b.group.id,
          currency: b.group.baseCurrency,
          id: `${b.group.id}:${transfer.from}:${transfer.to}`,
        }))
      );
  const totals = new Map<string, { sent: number; received: number }>();
  for (const job of preview) {
    const total = totals.get(job.currency) ?? { sent: 0, received: 0 };
    if (job.from === userId) total.sent += Math.round(job.amount * 100);
    else total.received += Math.round(job.amount * 100);
    totals.set(job.currency, total);
  }
  const complete = !!jobs?.length && saved.length === jobs.length;
  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title={t('Settle up')}
      description={t('Select groups and review money already returned.')}
    >
      <div className="space-y-5">
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {balances.map(({ group, net, transfers }) => (
            <label
              key={group.id}
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${!transfers.length ? 'opacity-50' : ''}`}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                disabled={busy || !!jobs || !transfers.length}
                checked={selected.includes(group.id)}
                onChange={(event) =>
                  setSelected((ids) =>
                    event.target.checked
                      ? [...ids, group.id]
                      : ids.filter((id) => id !== group.id)
                  )
                }
              />
              <span className="min-w-0 flex-1 break-words font-medium">
                {group.name}
              </span>
              <span
                className={
                  net > 0
                    ? 'text-positive'
                    : net < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }
              >
                {t(
                  net > 0
                    ? 'You received'
                    : net < 0
                      ? 'You returned'
                      : 'All settled up'
                )}{' '}
                {net !== 0 && formatMoney(Math.abs(net), group.baseCurrency)}
              </span>
            </label>
          ))}
        </div>
        {!!preview.length && (
          <div className="space-y-3 rounded-lg bg-muted/40 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Handshake className="size-4" />
              {t('Review settlements')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('Date')}: {formatDate(new Date())}
            </p>
            <ul className="max-h-56 divide-y overflow-y-auto text-sm">
              {preview.map((job) => (
                <li key={job.id} className="py-3">
                  <p className="font-medium">
                    {
                      balances.find((b) => b.group.id === job.groupId)?.group
                        .name
                    }
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span>{name(job.from)}</span>
                    <ArrowRight className="size-3" />
                    <span>{name(job.to)}</span>
                    <strong className="ml-auto">
                      {formatMoney(job.amount, job.currency)}
                    </strong>
                    {saved.includes(job.id) && (
                      <span className="flex items-center gap-1 text-positive">
                        <Check className="size-4" />
                        {t('Saved')}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {[...totals].map(([currency, total]) => (
              <div
                key={currency}
                className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm"
              >
                <span>
                  {t('You returned')}: {formatMoney(total.sent / 100, currency)}
                </span>
                <span>
                  {t('You received')}:{' '}
                  {formatMoney(total.received / 100, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
        {error && <Message error>{t(error)}</Message>}
        {!!saved.length && (
          <Message>
            {t('Saved {{saved}} of {{total}} settlements.', {
              saved: saved.length,
              total: jobs?.length,
            })}
          </Message>
        )}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t(complete ? 'Done' : 'Close')}
          </Button>
          {!complete && (
            <Button
              disabled={busy || !preview.length}
              onClick={async () => {
                if (saving.current) return;
                saving.current = true;
                const next =
                  jobs ??
                  preview.map((job) => ({ ...job, id: crypto.randomUUID() }));
                setJobs(next);
                setBusy(true);
                setError('');
                try {
                  await saveSettlementJobs(next, userId, (id) =>
                    setSaved((ids) => (ids.includes(id) ? ids : [...ids, id]))
                  );
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : 'Unable to record payment. Try again.'
                  );
                } finally {
                  saving.current = false;
                  setBusy(false);
                }
              }}
            >
              {t(busy ? 'Saving...' : jobs ? 'Retry' : 'Record returns')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
