import { useEffect, useState } from 'react';

import { getExchangeRate } from '@/api/rates';

export function useOverviewRates(currencies: string[], target: string) {
  const key = JSON.stringify([...new Set(currencies)].sort());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    target: string;
    rates: Record<string, number>;
    dates: string[];
  }>({ key: '', target: '', rates: {}, dates: [] });
  useEffect(() => {
    let active = true;
    void Promise.allSettled(
      (JSON.parse(key) as string[]).map(async (currency) => ({
        currency,
        ...(await getExchangeRate(currency, target)),
      }))
    ).then((results) => {
      if (!active) return;
      const rates: Record<string, number> = { [target]: 1 };
      const dates: string[] = [];
      for (const result of results)
        if (result.status === 'fulfilled') {
          rates[result.value.currency] = result.value.rate;
          if (result.value.source !== 'identity') dates.push(result.value.date);
        }
      setState({ key, target, rates, dates: [...new Set(dates)].sort() });
    });
    return () => {
      active = false;
    };
  }, [key, target, attempt]);
  const ready = state.key === key && state.target === target;
  return {
    ready,
    rates: ready ? state.rates : { [target]: 1 },
    dates: ready ? state.dates : [],
    retry: () => {
      setState({ key: '', target: '', rates: {}, dates: [] });
      setAttempt((n) => n + 1);
    },
  };
}
