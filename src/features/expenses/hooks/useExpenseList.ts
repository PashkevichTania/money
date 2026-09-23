import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Expense, Settlement } from '@/types/expense'
import type { UserProfile } from '@/types/user'
import { useExpenseStore } from '@/stores/expenseStore'
import { useCurrentUser } from '@/hooks/useGroups'
import { useNotify } from '@/hooks/useNotify'
import { subscribeExpenses } from '@/api/expenses'
import { subscribeSettlements } from '@/api/settlements'

export type LedgerEntry =
  | { kind: 'expense'; value: Expense }
  | { kind: 'settlement'; value: Settlement }
export function useExpenseList(groupId: string, members: UserProfile[]) {
  const { t } = useTranslation()
  const removeExpense = useExpenseStore((state) => state.removeExpense)
  const currentUser = useCurrentUser()
  const { enqueueSnackbar } = useNotify()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<{
    groupId: string
    expenses?: Expense[]
    settlements?: Settlement[]
    error?: string
  }>({ groupId })
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    let active = true
    const stops: (() => void)[] = []
    const update = (patch: Partial<typeof data>) => {
      if (active)
        setData((old) => ({
          ...(old.groupId === groupId ? old : {}),
          groupId,
          ...patch,
        }))
    }
    const fail = (error: Error) => update({ error: error.message })
    try {
      stops.push(
        subscribeExpenses(groupId, (expenses) => update({ expenses }), fail),
      )
      stops.push(
        subscribeSettlements(
          groupId,
          (settlements) => update({ settlements }),
          fail,
        ),
      )
    } catch (cause) {
      fail(
        cause instanceof Error ? cause : new Error('Unable to load balances.'),
      )
    }
    return () => {
      active = false
      stops.forEach((stop) => stop())
    }
  }, [groupId, attempt])
  const memberNames = useMemo(
    () => new Map(members.map(({ id, displayName }) => [id, displayName])),
    [members],
  )
  const entries: LedgerEntry[] =
    data.groupId === groupId
      ? [
          ...(data.expenses ?? []).map((value): LedgerEntry => ({
            kind: 'expense',
            value,
          })),
          ...(data.settlements ?? []).map((value): LedgerEntry => ({
            kind: 'settlement',
            value,
          })),
        ]
      : []
  const date = (entry: LedgerEntry) =>
    entry.kind === 'expense' ? entry.value.expenseDate : entry.value.createdAt
  entries.sort(
    (a, b) =>
      date(b).localeCompare(date(a)) ||
      b.value.createdAt.localeCompare(a.value.createdAt) ||
      a.value.id.localeCompare(b.value.id),
  )
  const visibleExpenses = entries.filter((entry) => {
    const isSettlement = entry.kind === 'settlement' || entry.value.isSettlement
    if (
      (filter === 'expense' && isSettlement) ||
      (filter === 'settlement' && !isSettlement)
    )
      return false
    const text =
      entry.kind === 'expense'
        ? `${entry.value.title} ${entry.value.description ?? ''}`
        : `${t('Settlement')} ${memberNames.get(entry.value.fromUserId) ?? ''} ${memberNames.get(entry.value.toUserId) ?? ''} ${entry.value.note ?? ''}`
    return text.toLowerCase().includes(query.trim().toLowerCase())
  })
  const confirmDelete = async () => {
    if (!expenseToDelete || expenseToDelete.createdBy !== currentUser?.id)
      return
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
  return {
    confirmDelete,
    currentUser,
    deleting,
    error: data.groupId === groupId ? data.error : undefined,
    expenseToDelete,
    expenses: entries,
    getMemberName: (id: string) => memberNames.get(id) || id.slice(0, 6),
    loading: data.groupId !== groupId || !data.expenses || !data.settlements,
    query,
    setExpenseToDelete,
    setQuery,
    visibleExpenses,
    filter,
    setFilter,
    retry: () => {
      setData({ groupId })
      setAttempt((n) => n + 1)
    },
  }
}
