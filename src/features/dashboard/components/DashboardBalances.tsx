import { ArrowDownLeft, ArrowUpRight, Users, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Message } from '@/components/ui/field';
import QuickSettleButton from '@/features/balances/components/QuickSettleButton';
import type { GroupBalance } from '@/features/balances/hooks/useBalanceOverview';
import { useOverviewRates } from '@/features/balances/hooks/useOverviewRates';
import { formatMoney } from '@/utils/currency';
import { convertTotals } from '@/utils/settlementPlan';

export default function DashboardBalances({
  balances,
  userId,
  currency,
  onSettleGroup,
}: {
  balances: GroupBalance[];
  userId: string;
  currency: string;
  onSettleGroup: (id: string) => void;
}) {
  const { t } = useTranslation();
  const fx = useOverviewRates(
    balances.filter((b) => b.net !== 0).map((b) => b.group.baseCurrency),
    currency
  );
  const totals = new Map<
    string,
    { currency: string; owed: number; owing: number; net: number }
  >();
  for (const { group, net } of balances) {
    if (!net) continue;
    const total = totals.get(group.baseCurrency) ?? {
      currency: group.baseCurrency,
      owed: 0,
      owing: 0,
      net: 0,
    };
    total.owed += Math.max(0, Math.round(net * 100));
    total.owing += Math.max(0, -Math.round(net * 100));
    total.net += Math.round(net * 100);
    totals.set(group.baseCurrency, total);
  }
  const currencies = [...totals.values()].map((r) => ({
    currency: r.currency,
    owed: r.owed / 100,
    owing: r.owing / 100,
    net: r.net / 100,
  }));
  let converted: ReturnType<typeof convertTotals>;
  try {
    converted = convertTotals(currencies, fx.rates);
  } catch (error) {
    return (
      <Message error>
        {error instanceof Error
          ? error.message
          : 'Unable to calculate balances.'}
      </Message>
    );
  }
  const cards = [
    {
      key: 'net' as const,
      title: 'Net balance',
      Icon: Wallet,
      style: 'from-violet-500/10 via-card to-card',
      color:
        converted.net > 0
          ? 'text-positive'
          : converted.net < 0
            ? 'text-destructive'
            : '',
    },
    {
      key: 'owed' as const,
      title: 'You are owed',
      Icon: ArrowDownLeft,
      style: 'from-emerald-500/15 via-card to-card',
      color: 'text-positive',
    },
    {
      key: 'owing' as const,
      title: 'You owe',
      Icon: ArrowUpRight,
      style: 'from-rose-500/15 via-card to-card',
      color: 'text-destructive',
    },
  ];
  const value = (balance: GroupBalance, key: 'net' | 'owed' | 'owing') =>
    key === 'net'
      ? balance.net
      : key === 'owed'
        ? Math.max(0, balance.net)
        : Math.max(0, -balance.net);
  const worth = (amount: number, code: string) =>
    fx.rates[code] ? Math.abs(amount * fx.rates[code]) : -1;
  return (
    <section aria-label={t('Your balances')} className="space-y-3">
      <div className="grid gap-4 xl:grid-cols-3">
        {cards.map(({ key, title, Icon, style, color }) => {
          const rows = balances
            .filter((b) => value(b, key) !== 0)
            .sort(
              (a, b) =>
                worth(value(b, key), b.group.baseCurrency) -
                  worth(value(a, key), a.group.baseCurrency) ||
                a.group.name.localeCompare(b.group.name)
            );
          const currencyRows = currencies
            .filter((r) => r[key] !== 0)
            .sort(
              (a, b) =>
                worth(b[key], b.currency) - worth(a[key], a.currency) ||
                a.currency.localeCompare(b.currency)
            );
          return (
            <article
              key={key}
              className={`rounded-2xl border bg-gradient-to-bl ${style} p-5 sm:p-6`}
            >
              <h2 className="flex items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
                {t(title)}
                <Icon className={`size-5 ${color}`} />
              </h2>
              <p
                className={`mt-6 break-words text-3xl font-semibold tracking-tight tabular-nums ${color}`}
                aria-busy={!fx.ready}
              >
                {fx.ready
                  ? `${currencies.some((c) => c.currency !== currency) ? '≈ ' : ''}${formatMoney(converted[key], currency)}`
                  : '…'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('Default currency')} · {currency}
                {fx.ready &&
                  !!converted.missing.length &&
                  ` · ${t('Incomplete total')}`}
              </p>
              <div className="mt-4 flex min-h-7 flex-wrap gap-2">
                {currencyRows.slice(0, 3).map((row) => (
                  <span
                    key={row.currency}
                    className="rounded-md bg-background/60 px-2 py-1 text-xs tabular-nums"
                  >
                    {formatMoney(row[key], row.currency)}
                  </span>
                ))}
                {currencyRows.length > 3 && (
                  <Link
                    to="/balances"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {t('{{count}} more', { count: currencyRows.length - 3 })}
                  </Link>
                )}
              </div>
              <ul className="mt-4 divide-y">
                {rows.slice(0, 3).map((balance) => (
                  <li key={balance.group.id} className="space-y-2 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="size-3 shrink-0 text-muted-foreground" />
                      <Link
                        to={`/groups/${balance.group.id}`}
                        className="min-w-0 flex-1 truncate hover:underline"
                      >
                        {balance.group.name}
                      </Link>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(
                          value(balance, key),
                          balance.group.baseCurrency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {balance.transfers.length === 1 ? (
                        <QuickSettleButton
                          groupId={balance.group.id}
                          currency={balance.group.baseCurrency}
                          transfer={balance.transfers[0]}
                          userId={userId}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => onSettleGroup(balance.group.id)}
                        >
                          {t('Settle this')}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {!rows.length && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('All settled up')}
                </p>
              )}
              {rows.length > 3 && (
                <Link
                  to="/balances"
                  className="mt-2 inline-block text-sm text-muted-foreground hover:underline"
                >
                  {t('{{count}} more', { count: rows.length - 3 })}
                </Link>
              )}
            </article>
          );
        })}
      </div>
      {fx.ready && !!converted.missing.length && (
        <Message>
          {t(
            'Some exchange rates are unavailable: {{currencies}}. Totals are incomplete.',
            { currencies: converted.missing.join(', ') }
          )}{' '}
          <Button variant="ghost" onClick={fx.retry}>
            {t('Retry')}
          </Button>
        </Message>
      )}
      {!!fx.dates.length && (
        <p className="text-xs text-muted-foreground">
          {t('Estimated using exchange rates dated {{dates}}.', {
            dates: fx.dates.join(', '),
          })}
        </p>
      )}
    </section>
  );
}
