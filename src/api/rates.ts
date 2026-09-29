import axios from 'axios';

import { queryClient } from '@/lib/queryClient';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v2/rates';

export interface RateResult {
  rate: number;
  date: string;
  source: 'exchangerate-api' | 'frankfurter' | 'identity';
  expiresAt?: number;
}
interface RateTable {
  base: string;
  rates: Record<string, number>;
  date: string;
  nextUpdate: number;
}

export function exchangeRateQueryOptions(
  from: string,
  to: string,
  date?: string
) {
  const base = from.trim().toUpperCase();
  const quote = to.trim().toUpperCase();
  return {
    queryKey: ['exchange-rate', base, quote, date?.slice(0, 10) || 'latest'],
    queryFn: () => getExchangeRate(base, quote, date),
    staleTime: (query: {
      state: { data?: RateResult; dataUpdatedAt: number };
    }) =>
      Math.max(
        0,
        (query.state.data?.expiresAt ?? 0) - query.state.dataUpdatedAt
      ),
  };
}

async function latestTable(base: string) {
  return queryClient.fetchQuery({
    queryKey: ['exchange-rate-table', base],
    queryFn: async (): Promise<RateTable | null> => {
      try {
        const { data } = await axios.get<RateTable>('/api/rates', {
          params: { base },
          timeout: 10000,
        });
        if (
          data?.base !== base ||
          !data.rates ||
          Array.isArray(data.rates) ||
          typeof data.rates !== 'object' ||
          data.rates[base] !== 1 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
          !Number.isFinite(data.nextUpdate) ||
          !Object.values(data.rates).every(
            (rate) =>
              typeof rate === 'number' && Number.isFinite(rate) && rate > 0
          )
        )
          throw new Error('Invalid rate table');
        return data;
      } catch (e) {
        console.error(e);
        // Cache primary failures briefly to avoid a request for every pair.
        return null;
      }
    },
    staleTime: (query) =>
      query.state.data
        ? Math.max(
            MINUTE,
            Math.min(
              DAY,
              query.state.data.nextUpdate - query.state.dataUpdatedAt
            )
          )
        : 5 * MINUTE,
  });
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: string
): Promise<RateResult> {
  if (!fromCurrency || !toCurrency)
    throw new Error('Both currencies are required');
  const base = fromCurrency.trim().toUpperCase();
  const quote = toCurrency.trim().toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const requestedDate = date?.slice(0, 10);
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote)) {
    throw new Error('Invalid currency code');
  }
  if (
    requestedDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ||
      !Number.isFinite(Date.parse(requestedDate)) ||
      new Date(requestedDate).toISOString().slice(0, 10) !== requestedDate)
  ) {
    throw new Error('Invalid exchange rate date');
  }
  if (base === quote) {
    return { rate: 1, date: requestedDate || today, source: 'identity' };
  }
  if (requestedDate && requestedDate > today) {
    throw new Error('Exchange rates are unavailable for future dates.');
  }
  const historical = !!requestedDate && requestedDate < today;
  if (!historical) {
    const table = await latestTable(base);
    const rate = table?.rates[quote];
    if (
      table &&
      typeof rate === 'number' &&
      Number.isFinite(rate) &&
      rate > 0
    ) {
      return {
        rate,
        date: table.date,
        source: 'exchangerate-api',
        expiresAt: Math.min(table.nextUpdate, Date.now() + DAY),
      };
    }
  }
  const params = new URLSearchParams({ base, quotes: quote });
  if (requestedDate) params.set('date', requestedDate);
  try {
    const { data } = await axios.get<
      {
        date: string;
        base: string;
        quote: string;
        rate: number;
      }[]
    >(FRANKFURTER_BASE + '?' + params, { timeout: 15000 });
    const entry = Array.isArray(data)
      ? data.find((row) => row?.base === base && row?.quote === quote)
      : undefined;
    if (
      !entry ||
      typeof entry.rate !== 'number' ||
      !Number.isFinite(entry.rate) ||
      entry.rate <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ) {
      throw new Error('Invalid rate');
    }
    return {
      rate: entry.rate,
      date: entry.date,
      source: 'frankfurter',
      expiresAt: Date.now() + (historical ? 30 * DAY : 5 * MINUTE),
    };
  } catch {
    throw new Error(
      'Failed to fetch exchange rate (' +
        fromCurrency +
        ' -> ' +
        toCurrency +
        '). Check the currency and connection, then try again.'
    );
  }
}

export type RateProvider = 'exchangerate-api' | 'frankfurter';
export interface ProviderRates {
  rates: Record<string, { rate: number; date: string }>;
  expiresAt: number;
}

export function watchedCurrencies(favorites: string[] = []) {
  return [
    ...new Set(
      [...favorites, 'USD', 'EUR'].map((code) => code.trim().toUpperCase())
    ),
  ].filter((code) => /^[A-Z]{3}$/.test(code));
}

// These queries intentionally never fall back: each card represents one provider.
export function providerRatesQueryOptions(
  provider: RateProvider,
  currency: string,
  currencies: string[]
) {
  const base = currency.trim().toUpperCase();
  const quotes = [
    ...new Set(currencies.map((code) => code.trim().toUpperCase())),
  ]
    .filter((code) => code !== base)
    .sort();
  return {
    queryKey: [
      'provider-rates',
      provider,
      base,
      ...(provider === 'frankfurter' ? [quotes] : []),
    ],
    queryFn: async (): Promise<ProviderRates> => {
      if (provider === 'exchangerate-api') {
        const table = await latestTable(base);
        if (!table)
          throw new Error('Provider rates are currently unavailable.');
        return {
          rates: Object.fromEntries(
            Object.entries(table.rates).map(([code, rate]) => [
              code,
              { rate, date: table.date },
            ])
          ),
          expiresAt: Math.min(table.nextUpdate, Date.now() + DAY),
        };
      }
      const rates: ProviderRates['rates'] = {
        [base]: { rate: 1, date: new Date().toISOString().slice(0, 10) },
      };
      if (quotes.length) {
        const params = new URLSearchParams({ base, quotes: quotes.join(',') });
        const { data } = await axios.get<unknown>(
          FRANKFURTER_BASE + '?' + params,
          { timeout: 15000 }
        );
        if (!Array.isArray(data))
          throw new Error('Provider rates are currently unavailable.');
        for (const row of data) {
          if (
            row?.base === base &&
            quotes.includes(row.quote) &&
            typeof row.rate === 'number' &&
            Number.isFinite(row.rate) &&
            row.rate > 0 &&
            typeof row.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
            Number.isFinite(Date.parse(row.date)) &&
            new Date(row.date).toISOString().slice(0, 10) === row.date
          ) {
            rates[row.quote] = { rate: row.rate, date: row.date };
          }
        }
      }
      return { rates, expiresAt: Date.now() + 60 * MINUTE };
    },
    staleTime: (query: {
      state: { data?: ProviderRates; dataUpdatedAt: number };
    }) =>
      Math.max(
        0,
        (query.state.data?.expiresAt ?? 0) - query.state.dataUpdatedAt
      ),
  };
}
