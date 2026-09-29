import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ExternalLink, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import {
  providerRatesQueryOptions,
  type RateProvider,
  watchedCurrencies,
} from '@/api/rates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Message } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrencySymbol } from '@/config/currencies';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/dates';

const PROVIDERS: { id: RateProvider; name: string; url: string }[] = [
  {
    id: 'exchangerate-api',
    name: 'ExchangeRate-API',
    url: 'https://www.exchangerate-api.com',
  },
  { id: 'frankfurter', name: 'Frankfurter', url: 'https://frankfurter.dev' },
];

function ProviderCard({
  provider,
  base,
  currencies,
}: {
  provider: (typeof PROVIDERS)[number];
  base: string;
  currencies: string[];
}) {
  const { t, i18n } = useTranslation();
  const query = useQuery(
    providerRatesQueryOptions(provider.id, base, currencies)
  );
  const formatter = new Intl.NumberFormat(i18n.resolvedLanguage, {
    maximumSignificantDigits: 6,
  });
  return (
    <Card aria-labelledby={provider.id + '-title'}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <h2 id={provider.id + '-title'} className="text-lg font-semibold">
            {provider.name}
          </h2>
          <a
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('Open {{provider}} website', {
              provider: provider.name,
            })}
            className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
        <CardDescription>
          {t('Rates for 1 {{currency}}', { currency: base })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">{t('Loading exchange rates...')}</span>
            {currencies.map((code) => (
              <Skeleton key={code} className="h-14 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="space-y-3">
            <Message error>
              {t('Could not load rates from {{provider}}.', {
                provider: provider.name,
              })}
            </Message>
            <Button
              variant="outline"
              size="sm"
              disabled={query.isFetching}
              onClick={() => {
                void (async () => {
                  if (provider.id === 'exchangerate-api') {
                    await queryClient.invalidateQueries({
                      queryKey: ['exchange-rate-table', base],
                      exact: true,
                    });
                  }
                  await query.refetch();
                })();
              }}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t('Retry')}
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {currencies.map((code) => {
              const entry = query.data.rates[code];
              return (
                <li
                  key={code}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted px-1 text-base font-semibold text-positive"
                    >
                      <bdi>{getCurrencySymbol(code)}</bdi>
                    </span>
                    <span className="font-semibold">{code}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {entry
                        ? formatter.format(entry.rate)
                        : t('Rate unavailable')}
                    </p>
                    {entry && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {code === base
                          ? t('Base currency')
                          : t('Rate dated {{date}}', {
                              date: formatDate(entry.date),
                            })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExchangeRatesPage() {
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const base = (profile?.defaultCurrency || 'USD').trim().toUpperCase();
  const currencies = watchedCurrencies(profile?.favoriteCurrencies);
  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
          <ArrowLeftRight className="size-7 text-positive" aria-hidden="true" />
          {t('Exchange rates')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('Your favorite currencies, plus USD and EUR.')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('Base currency: {{currency}}', { currency: base })}
          {' · '}
          <Link
            to="/settings"
            className="font-medium text-positive underline underline-offset-4"
          >
            {t('Currency preferences')}
          </Link>
        </p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            base={base}
            currencies={currencies}
          />
        ))}
      </div>
    </div>
  );
}
