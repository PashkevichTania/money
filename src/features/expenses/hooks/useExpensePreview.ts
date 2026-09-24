import { useMemo } from 'react';

import {
  DEFAULT_RATE_SOURCE,
  EXPENSE_PREVIEW_ID,
} from '@/features/expenses/constants';
import type { Expense, PayerContribution, SplitType } from '@/types/expense';
import { roundMoney } from '@/utils/currency';
import { nowIso, toIsoDate } from '@/utils/dates';
import {
  buildParticipants,
  computeNetBalances,
  resolveOwedPerUser,
  validateSplit,
} from '@/utils/split';

import type { ExpenseRateState } from './useExpenseExchangeRate';

interface UseExpensePreviewOptions {
  expenseDate: string;
  groupCurrency: string;
  groupId: string;
  originalAmount: number;
  originalCurrency: string;
  paidBy: PayerContribution[];
  participantIds: string[];
  participantValues: Record<string, number>;
  rateState: ExpenseRateState;
  splitType: SplitType;
  userId?: string;
}

export function useExpensePreview({
  expenseDate,
  groupCurrency,
  groupId,
  originalAmount,
  originalCurrency,
  paidBy,
  participantIds,
  participantValues,
  rateState,
  splitType,
  userId,
}: UseExpensePreviewOptions) {
  const convertedAmount = rateState.rate
    ? roundMoney(originalAmount * rateState.rate)
    : 0;

  const participants = useMemo(
    () => buildParticipants(splitType, participantIds, participantValues),
    [participantIds, participantValues, splitType]
  );

  const owedPreview = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length) return {};
    return resolveOwedPerUser(convertedAmount, participants, splitType);
  }, [convertedAmount, participants, rateState.rate, splitType]);

  const previewNetBalances = useMemo<Record<string, number>>(() => {
    if (!rateState.rate || !participants.length || !paidBy.length) return {};

    const originalCur = originalCurrency.toUpperCase();
    const groupCur = groupCurrency.toUpperCase();
    const syntheticExpense: Expense = {
      id: EXPENSE_PREVIEW_ID,
      groupId,
      title: '',
      originalAmount,
      originalCurrency: originalCur,
      convertedAmount,
      groupCurrency: groupCur,
      rateSnapshot:
        originalCur !== groupCur
          ? {
              date: rateState.date || expenseDate,
              rate: rateState.rate,
              source: rateState.source || DEFAULT_RATE_SOURCE,
            }
          : undefined,
      paidBy,
      participants,
      splitType,
      expenseDate: toIsoDate(expenseDate),
      createdBy: userId || '',
      updatedBy: userId || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return computeNetBalances(syntheticExpense);
  }, [
    convertedAmount,
    expenseDate,
    groupCurrency,
    groupId,
    originalAmount,
    originalCurrency,
    paidBy,
    participants,
    rateState.date,
    rateState.rate,
    rateState.source,
    splitType,
    userId,
  ]);

  const validationErrors = useMemo(
    () => validateSplit({ originalAmount, participants, paidBy, splitType }),
    [originalAmount, paidBy, participants, splitType]
  );

  return {
    convertedAmount,
    owedPreview,
    participants,
    previewNetBalances,
    validationErrors,
  };
}
