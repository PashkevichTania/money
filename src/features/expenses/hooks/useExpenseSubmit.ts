import type { UseFormSetError } from 'react-hook-form'
import type { Group } from '@/types/group'
import type { Expense } from '@/types/expense'
import type { UserProfile } from '@/types/user'
import { useExpenseStore } from '@/stores/expenseStore'
import { useNotify } from '@/hooks/useNotify'
import { buildExpenseInput, type ExpenseFormValues } from '@/features/expenses/expenseForm'
import type { ExpenseRateState } from './useExpenseExchangeRate'
import { buildParticipants, validateSplit } from '@/utils/split'

interface UseExpenseSubmitOptions {
  editingExpense?: Expense | null
  group: Group
  onClose: () => void
  preview: boolean
  rateState: ExpenseRateState
  setError: UseFormSetError<ExpenseFormValues>
  user: UserProfile | null
}

export function useExpenseSubmit({
  editingExpense,
  group,
  onClose,
  preview,
  rateState,
  setError,
  user,
}: UseExpenseSubmitOptions) {
  const addExpense = useExpenseStore((state) => state.addExpense)
  const updateExpense = useExpenseStore((state) => state.updateExpense)
  const { enqueueSnackbar } = useNotify()

  const validateForm = (values: ExpenseFormValues) => {
    const errors = validateSplit({
      originalAmount: Number(values.originalAmount),
      participants: buildParticipants(
        values.splitType,
        values.participantIds,
        values.participantValues,
      ),
      paidBy: values.paidBy.map((payer) => ({
        ...payer,
        amount: Number(payer.amount),
      })),
      splitType: values.splitType,
    })

    for (const error of errors) {
      if (error.field === 'originalAmount') {
        setError('originalAmount', { message: error.message })
      } else if (error.field === 'participants') {
        setError('participantIds', { message: error.message })
      } else if (error.field === 'paidBy' || error.field === 'paidBy.sum') {
        setError('paidBy', { message: error.message })
      } else if (error.field.startsWith('split')) {
        setError('splitType', { message: error.message })
      }
    }
    return errors.length === 0
  }

  const submitExpense = async (values: ExpenseFormValues) => {
    if (import.meta.env.DEV && preview) {
      if (validateForm(values)) {
        enqueueSnackbar('Preview validated. No expense was saved.', {
          variant: 'success',
        })
      }
      return
    }
    if (!user) {
      enqueueSnackbar('You must be signed in', { variant: 'error' })
      return
    }
    if (editingExpense && editingExpense.createdBy !== user.id) {
      enqueueSnackbar('Only the expense author can edit this expense.', {
        variant: 'error',
      })
      return
    }
    if (rateState.loading || rateState.error || rateState.rate == null) {
      enqueueSnackbar('A valid FX rate is required for currency conversion', {
        variant: 'error',
      })
      return
    }
    if (!validateForm(values)) return

    const input = buildExpenseInput({
      groupCurrency: group.baseCurrency,
      groupId: group.id,
      rateState,
      userId: user.id,
      values,
    })

    try {
      if (editingExpense) {
        const { createdBy: _createdBy, groupId: _groupId, ...fields } = input
        void _createdBy
        void _groupId
        await updateExpense(group.id, editingExpense.id, {
          ...fields,
          updatedBy: user.id,
        })
        enqueueSnackbar('Expense updated', { variant: 'success' })
      } else {
        await addExpense(group.id, input)
        enqueueSnackbar('Expense added', { variant: 'success' })
      }
      onClose()
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to save expense',
        { variant: 'error' },
      )
    }
  }

  return { submitExpense }
}
