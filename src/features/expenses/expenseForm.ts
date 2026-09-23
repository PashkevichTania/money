import { z } from 'zod'
import { EXPENSE_TYPES, type Expense } from '@/types/expense'
import type { CreateExpenseInput } from '@/api/expenses'
import { DEFAULT_RATE_SOURCE } from '@/features/expenses/constants'
import type { ExpenseRateState } from '@/features/expenses/hooks/useExpenseExchangeRate'
import { nowIso, toIsoDate } from '@/utils/dates'
import { roundMoney } from '@/utils/currency'
import { buildParticipants } from '@/utils/split'

export const expenseSchema = z.object({
  type: z.union([z.enum(EXPENSE_TYPES), z.literal('')]),
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  expenseDate: z.string().min(1, 'Date is required'),
  originalCurrency: z.string().min(3, 'Currency is required').max(3),
  originalAmount: z.coerce.number({ invalid_type_error: 'Enter a number' }).positive('Amount must be positive').finite('Amount must be a valid number').max(999999999, 'Amount is too large'),
  splitType: z.enum(['equal', 'exact', 'percentage', 'shares']),
  participantIds: z.array(z.string()).min(1, 'Select at least one participant'),
  participantValues: z.record(z.string(), z.coerce.number()),
  paidBy: z.array(z.object({
    userId: z.string().min(1),
    amount: z.coerce.number().finite().gte(0),
  })).min(1, 'At least one person must pay'),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

interface BuildDefaultsOptions {
  currency: string
  editingExpense?: Expense | null
  participantIds: string[]
  payerId: string
}

export function buildExpenseDefaults({
  currency,
  editingExpense,
  participantIds,
  payerId,
}: BuildDefaultsOptions): ExpenseFormValues {
  if (editingExpense) {
    const participantValues = Object.fromEntries(
      editingExpense.participants.map(({ userId, value }) => [userId, value]),
    )
    const {
      description,
      expenseDate,
      originalAmount,
      originalCurrency,
      paidBy,
      participants,
      splitType,
      title,
      type,
    } = editingExpense
    return {
      title,
      type: type && EXPENSE_TYPES.includes(type) ? type : '',
      description: description ?? '',
      expenseDate: expenseDate.slice(0, 10),
      originalCurrency,
      originalAmount,
      splitType,
      participantIds: participants.map(({ userId }) => userId),
      participantValues,
      paidBy: paidBy.map(({ userId, amount }) => ({ userId, amount })),
    }
  }

  return {
    title: '',
    description: '',
    type: '',
    expenseDate: nowIso().slice(0, 10),
    originalCurrency: currency,
    originalAmount: 0,
    splitType: 'equal',
    participantIds,
    participantValues: {},
    paidBy: [{ userId: payerId, amount: 0 }],
  }
}

interface BuildExpenseInputOptions {
  groupCurrency: string
  groupId: string
  rateState: ExpenseRateState
  userId: string
  values: ExpenseFormValues
}

export function buildExpenseInput({
  groupCurrency,
  groupId,
  rateState,
  userId,
  values,
}: BuildExpenseInputOptions): CreateExpenseInput {
  if (rateState.rate == null) throw new Error('A valid FX rate is required')

  const originalCurrency = values.originalCurrency.toUpperCase()
  const normalizedGroupCurrency = groupCurrency.toUpperCase()
  const sameCurrency = originalCurrency === normalizedGroupCurrency
  const originalAmount = Number(values.originalAmount)

  return {
    groupId,
    title: values.title,
    description: values.description,
    type: values.type || undefined,
    originalAmount,
    originalCurrency,
    convertedAmount: sameCurrency
      ? originalAmount
      : roundMoney(originalAmount * rateState.rate),
    groupCurrency: normalizedGroupCurrency,
    rateSnapshot: sameCurrency
      ? undefined
      : {
          date: rateState.date || values.expenseDate,
          rate: rateState.rate,
          source: rateState.source || DEFAULT_RATE_SOURCE,
        },
    paidBy: values.paidBy.map(({ userId: payerId, amount }) => ({
      userId: payerId,
      amount: Number(amount),
    })),
    participants: buildParticipants(
      values.splitType,
      values.participantIds,
      values.participantValues,
    ),
    splitType: values.splitType,
    expenseDate: toIsoDate(values.expenseDate),
    createdBy: userId,
  }
}
