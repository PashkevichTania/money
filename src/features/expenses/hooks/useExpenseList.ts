import { useEffect, useMemo, useState } from 'react'
import type { Expense } from '@/types/expense'
import type { UserProfile } from '@/types/user'
import { useExpenseStore } from '@/stores/expenseStore'
import { useCurrentUser } from '@/hooks/useGroups'
import { useNotify } from '@/hooks/useNotify'

const EMPTY_EXPENSES: Expense[] = []

export function useExpenseList(groupId: string, members: UserProfile[]) {
  const expenses = useExpenseStore(
    (state) => state.expensesByGroup[groupId] ?? EMPTY_EXPENSES,
  )
  const loading = useExpenseStore((state) => state.loadingByGroup[groupId])
  const error = useExpenseStore((state) => state.errorsByGroup[groupId])
  const loadExpenses = useExpenseStore((state) => state.loadExpenses)
  const removeExpense = useExpenseStore((state) => state.removeExpense)
  const currentUser = useCurrentUser()
  const { enqueueSnackbar } = useNotify()
  const [query, setQuery] = useState('')
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void loadExpenses(groupId).catch(() => undefined)
  }, [groupId, loadExpenses])

  const memberNames = useMemo(
    () => new Map(members.map(({ id, displayName }) => [id, displayName])),
    [members],
  )

  const visibleExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return expenses
    return expenses.filter(({ title, description }) =>
      `${title} ${description || ''}`.toLowerCase().includes(normalizedQuery),
    )
  }, [expenses, query])

  const confirmDelete = async () => {
    if (!expenseToDelete || expenseToDelete.createdBy !== currentUser?.id) return
    setDeleting(true)
    try {
      await removeExpense(groupId, expenseToDelete.id)
      setExpenseToDelete(null)
      enqueueSnackbar('Expense deleted', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not delete expense',
        { variant: 'error' },
      )
    } finally {
      setDeleting(false)
    }
  }

  const getMemberName = (id: string) => memberNames.get(id) || id.slice(0, 6)

  return {
    confirmDelete,
    currentUser,
    deleting,
    error,
    expenseToDelete,
    expenses,
    getMemberName,
    loading,
    query,
    setExpenseToDelete,
    setQuery,
    visibleExpenses,
  }
}
