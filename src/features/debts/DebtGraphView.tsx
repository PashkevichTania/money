import { ArrowDownLeft, ArrowUpRight, Network, Scale } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatMoney } from '@/utils/currency';
import {
  buildDirectDebts,
  type DirectDebt,
  valueDebt,
} from '@/utils/directDebts';

import DebtCanvas from './DebtCanvas';
import { DebtDetails } from './DebtDetails';

export interface DebtGraphViewProps {
  graph: ReturnType<typeof buildDirectDebts>;
  userId: string;
  names: Record<string, string>;
  currency: string;
  rates: Record<string, number>;
  dates: string[];
  ratesReady: boolean;
  retryRates?: () => void;
  preview?: boolean;
}

export default function DebtGraphView({
  graph,
  userId,
  names,
  currency,
  rates,
  dates,
  ratesReady,
  retryRates,
  preview,
}: DebtGraphViewProps) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<string | null>(null);
  const [person, setPerson] = useState('');
  const [expanded, setExpanded] = useState(false);
  const name = (id: string) => (id === userId ? t('You') : names[id] || id);
  const values = new Map(
    graph.edges.map((edge) => [edge.id, valueDebt(edge, rates)])
  );
  const missing = [
    ...new Set([...values.values()].flatMap((value) => value.missing)),
  ];
  const incomplete = graph.issues.length > 0 || missing.length > 0;
  const approximate = graph.edges.some((edge) =>
    edge.parts.some((part) => part.currency !== currency)
  );
  const money = (amountMinor: number, estimate = approximate) =>
    (estimate ? '≈ ' : '') + formatMoney(amountMinor / 100, currency);
  const label = (edge: DirectDebt) => {
    const value = values.get(edge.id)!;
    if (value.missing.length)
      return [...value.currencies]
        .map(([code, amount]) => formatMoney(amount / 100, code))
        .join(' + ');
    return (
      (edge.parts.some((part) => part.currency !== currency) ? '≈ ' : '') +
      formatMoney(value.amountMinor / 100, currency)
    );
  };
  const personal = graph.edges.filter(
    (edge) => edge.from === userId || edge.to === userId
  );
  const owed = personal
    .filter((edge) => edge.to === userId)
    .reduce((sum, edge) => sum + values.get(edge.id)!.amountMinor, 0);
  const owing = personal
    .filter((edge) => edge.from === userId)
    .reduce((sum, edge) => sum + values.get(edge.id)!.amountMinor, 0);
  const people = [
    ...new Set(graph.edges.flatMap((edge) => [edge.from, edge.to])),
  ]
    .filter((id) => id !== userId)
    .sort((a, b) => name(a).localeCompare(name(b)));
  const visible = graph.edges.filter(
    (edge) => !person || edge.from === person || edge.to === person
  );
  const selected = graph.edges.find((edge) => edge.id === selection);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold">
            <Network className="size-7 text-positive" />
            {t('Debt graph')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(
              'Arrows point from the debtor to the person they owe. Opposite debts stay separate.'
            )}
          </p>
        </div>
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          {t('Base currency')}: <strong>{currency}</strong>
        </div>
      </header>
      {preview && (
        <p className="rounded-md border border-info/30 bg-info/5 p-3 text-sm">
          {t('Preview data. No payments or expenses are saved.')}
        </p>
      )}
      {graph.issues.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="font-semibold">
            {t('Some groups are excluded. Totals are incomplete.')}
          </p>
          {graph.issues.map((issue) => (
            <p key={issue.groupId} className="mt-2">
              <Link
                className="underline"
                to={'/groups/' + encodeURIComponent(issue.groupId)}
              >
                {issue.groupName}
              </Link>
              :{' '}
              {issue.reason === 'payment'
                ? t(
                    'A recorded payment cannot be matched to direct debts. Review group balances.'
                  )
                : t('The group ledger contains invalid data.')}
            </p>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4 text-sm"
        >
          <span>
            {ratesReady
              ? t(
                  'Missing exchange rates. Original balances remain visible; totals are incomplete.'
                )
              : t('Loading exchange rates…')}{' '}
            {missing.join(', ')}
          </span>
          {ratesReady && retryRates && (
            <Button variant="outline" size="sm" onClick={retryRates}>
              {t('Retry')}
            </Button>
          )}
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section
          className={
            'order-2 min-w-0 rounded-md border bg-card xl:order-1 ' +
            (expanded ? 'xl:col-span-2' : '')
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">{t('Direct debts')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  'Hover for a breakdown. Click for details. Drag people to rearrange.'
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? t('Compact view') : t('Expand graph')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <NativeSelect
              aria-label={t('Participant')}
              value={person}
              onChange={(event) => setPerson(event.target.value)}
            >
              <option value="">{t('All participants')}</option>
              {people.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </NativeSelect>
            <span className="text-xs text-positive">↗ {t('You are owed')}</span>
            <span className="text-xs text-destructive">↗ {t('You owe')}</span>
            <span className="text-xs text-info">↗ {t('Between friends')}</span>
          </div>
          {visible.length > 0 ? (
            <DebtCanvas
              debts={visible}
              userId={userId}
              name={name}
              label={label}
              open={setSelection}
            />
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <Network className="size-10 text-muted-foreground" />
              <p className="font-medium">
                {graph.issues.length
                  ? t('No debt graph is available for these records.')
                  : t('No outstanding direct debts')}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t(
                  'Shared expenses create connections here. Recorded payments reduce them.'
                )}
              </p>
            </div>
          )}
        </section>
        <aside
          className={
            'order-1 space-y-4 xl:order-2 ' +
            (expanded
              ? 'xl:col-span-2 xl:grid xl:grid-cols-3 xl:gap-4 xl:space-y-0'
              : '')
          }
        >
          {[
            {
              title: t('You are owed'),
              amount: owed,
              estimate: personal.some(
                (edge) =>
                  edge.to === userId &&
                  edge.parts.some((part) => part.currency !== currency)
              ),
              Icon: ArrowDownLeft,
              color: 'text-positive',
            },
            {
              title: t('You owe'),
              amount: owing,
              estimate: personal.some(
                (edge) =>
                  edge.from === userId &&
                  edge.parts.some((part) => part.currency !== currency)
              ),
              Icon: ArrowUpRight,
              color: 'text-destructive',
            },
            {
              title: t('Net balance'),
              amount: owed - owing,
              estimate: personal.some((edge) =>
                edge.parts.some((part) => part.currency !== currency)
              ),
              Icon: Scale,
              color: owed >= owing ? 'text-positive' : 'text-destructive',
            },
          ].map(({ title, amount, estimate, Icon, color }) => (
            <div key={title} className="rounded-md border bg-card p-5">
              <Icon className={'mb-4 size-6 ' + color} />
              <p className="text-sm text-muted-foreground">{title}</p>
              <p
                className={'mt-2 text-2xl font-semibold tabular-nums ' + color}
              >
                {money(amount, estimate)}
              </p>
              {incomplete && (
                <p className="mt-2 text-xs text-destructive">
                  {t('Partial total')}
                </p>
              )}
            </div>
          ))}
        </aside>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {t(
          'Personal totals include only your debts, across all participants in this view. Friend-to-friend debts are excluded from your totals.'
        )}{' '}
        {t(
          'Conversion is for display only; debts remain in their group currency.'
        )}
        {dates.length > 0 && (
          <>
            {' '}
            {t('Rate dates')}: {dates.join(', ')}.
          </>
        )}
      </p>
      <section className="overflow-hidden rounded-md border bg-card">
        <h2 className="border-b p-4 font-semibold">{t('Debt breakdown')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-4">{t('Debtor')}</th>
                <th className="p-4">{t('Recipient')}</th>
                <th className="p-4">{t('Remaining debt')}</th>
                <th className="p-4">{t('Expenses')}</th>
                <th className="p-4">
                  <span className="sr-only">{t('Details')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((edge) => (
                <tr key={edge.id} className="border-t">
                  <td className="p-4">{name(edge.from)}</td>
                  <td className="p-4">{name(edge.to)}</td>
                  <td className="whitespace-nowrap p-4 font-semibold">
                    {label(edge)}
                  </td>
                  <td className="p-4">{edge.parts.length}</td>
                  <td className="p-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelection(edge.id)}
                      aria-label={
                        t('Details') +
                        ': ' +
                        name(edge.from) +
                        ' → ' +
                        name(edge.to)
                      }
                    >
                      {t('Details')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="rounded-md border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          {t('How direct debts are calculated')}
        </summary>
        <p className="mt-3 text-muted-foreground">
          {t(
            'Each expense is calculated separately. Each payer covers their own share first; remaining shares are allocated proportionally to the other payers. Opposite expenses are not offset.'
          )}
        </p>
        <p className="mt-2 text-muted-foreground">
          {t(
            'Payments reduce the oldest expenses in the same group first. Existing simplified payments can reduce a chain of debts. Payments that cannot be matched exclude the group from this graph.'
          )}
        </p>
        <p className="mt-2 text-muted-foreground">
          {t(
            'Original expense is the full purchase amount, not the remaining personal debt. Only groups you can access are included.'
          )}
        </p>
      </details>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
      >
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selected
                ? name(selected.from) + ' → ' + name(selected.to)
                : t('Details')}
            </SheetTitle>
            <SheetDescription>
              {t('Remaining debt')}: {selected ? label(selected) : ''}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="px-4 pb-6">
              <DebtDetails debt={selected} preview={preview} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
