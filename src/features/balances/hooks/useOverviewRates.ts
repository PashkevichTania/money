import { useQueries } from '@tanstack/react-query';

import { exchangeRateQueryOptions } from '@/api/rates';

export function useOverviewRates(currencies: string[], target: string) {
  const normalizedTarget = target.trim().toUpperCase();
  const sources = [
    ...new Set(currencies.map((currency) => currency.trim().toUpperCase())),
  ]
    .filter((currency) => currency !== normalizedTarget)
    .sort();
  const queries = useQueries({
    queries: sources.map((currency) =>
      exchangeRateQueryOptions(currency, normalizedTarget)
    ),
  });
  const rates: Record<string, number> = { [normalizedTarget]: 1 };
  const dates: string[] = [];
  queries.forEach((query, index) => {
    if (query.data && !query.isError) {
      rates[sources[index]] = query.data.rate;
      dates.push(query.data.date);
    }
  });
  return {
    ready: queries.every((query) => !query.isPending),
    rates,
    dates: [...new Set(dates)].sort(),
    retry: () => {
      queries.forEach((query) => {
        void query.refetch();
      });
    },
  };
}
