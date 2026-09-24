import { useEffect, useState } from 'react';

import { getExchangeRate } from '@/api/rates';
import type { Expense } from '@/types/expense';

export interface ExpenseRateState {
  key: string;
  loading: boolean;
  rate: number | null;
  date: string | null;
  source: string | null;
  error: string | null;
}

interface UseExpenseExchangeRateOptions {
  enabled: boolean;
  expenseDate: string;
  groupCurrency: string;
  originalCurrency: string;
  editingExpense?: Expense | null;
}

const pendingRate = (key: string): ExpenseRateState => ({
  key,
  loading: true,
  rate: null,
  date: null,
  source: null,
  error: null,
});

export function useExpenseExchangeRate({
  enabled,
  expenseDate,
  groupCurrency,
  originalCurrency,
  editingExpense,
}: UseExpenseExchangeRateOptions) {
  const normalizedOriginalCurrency = originalCurrency.toUpperCase();
  const normalizedGroupCurrency = groupCurrency.toUpperCase();
  const currencyMismatch =
    normalizedOriginalCurrency !== normalizedGroupCurrency;
  const requestKey = `${normalizedOriginalCurrency}:${normalizedGroupCurrency}:${expenseDate}`;
  const [requestedRate, setRequestedRate] = useState<ExpenseRateState>(() =>
    pendingRate('')
  );

  const savedSnapshot =
    editingExpense &&
    editingExpense.originalCurrency === normalizedOriginalCurrency &&
    editingExpense.groupCurrency === normalizedGroupCurrency &&
    editingExpense.expenseDate.slice(0, 10) === expenseDate.slice(0, 10)
      ? editingExpense.rateSnapshot
      : undefined;

  const rateState: ExpenseRateState = !currencyMismatch
    ? {
        key: requestKey,
        loading: false,
        rate: 1,
        date: expenseDate,
        source: 'identity',
        error: null,
      }
    : savedSnapshot
      ? { key: requestKey, loading: false, error: null, ...savedSnapshot }
      : requestedRate.key === requestKey
        ? requestedRate
        : pendingRate(requestKey);

  useEffect(() => {
    if (!enabled || !currencyMismatch || savedSnapshot) return;

    let cancelled = false;
    void getExchangeRate(
      normalizedOriginalCurrency,
      normalizedGroupCurrency,
      expenseDate
    )
      .then((result) => {
        if (cancelled) return;
        setRequestedRate({
          key: requestKey,
          loading: false,
          rate: result.rate,
          date: result.date,
          source: result.source,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRequestedRate({
          key: requestKey,
          loading: false,
          rate: null,
          date: null,
          source: null,
          error:
            error instanceof Error ? error.message : 'Failed to fetch FX rate',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    currencyMismatch,
    enabled,
    expenseDate,
    normalizedGroupCurrency,
    normalizedOriginalCurrency,
    requestKey,
    savedSnapshot,
  ]);

  return { currencyMismatch, rateState };
}
