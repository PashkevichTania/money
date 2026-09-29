import { useQuery } from '@tanstack/react-query';

import { exchangeRateQueryOptions } from '@/api/rates';
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

  const savedSnapshot =
    editingExpense &&
    editingExpense.originalCurrency === normalizedOriginalCurrency &&
    editingExpense.groupCurrency === normalizedGroupCurrency &&
    editingExpense.expenseDate.slice(0, 10) === expenseDate.slice(0, 10)
      ? editingExpense.rateSnapshot
      : undefined;

  const query = useQuery({
    ...exchangeRateQueryOptions(
      normalizedOriginalCurrency,
      normalizedGroupCurrency,
      expenseDate
    ),
    enabled: enabled && currencyMismatch && !savedSnapshot,
  });
  const requestedRate: ExpenseRateState =
    query.isPending || query.isFetching
      ? pendingRate(requestKey)
      : {
          key: requestKey,
          loading: false,
          rate: query.isError ? null : (query.data?.rate ?? null),
          date: query.isError ? null : (query.data?.date ?? null),
          source: query.isError ? null : (query.data?.source ?? null),
          error: query.error?.message ?? null,
        };

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
      : requestedRate;

  return { currencyMismatch, rateState };
}
