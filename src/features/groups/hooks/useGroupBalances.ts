import { useEffect, useState } from 'react'
import { subscribeExpenses } from '@/api/expenses'
import {
  createSettlement,
  deleteSettlement,
  subscribeSettlements,
  type CreateSettlementInput,
} from '@/api/settlements'
import type { Expense, Settlement } from '@/types/expense'
import type { TransferSuggestion } from '@/features/groups/components/RecordSettlementDialog'
import { useNotify } from '@/hooks/useNotify'

interface BalanceDataState {
  groupId: string
  expenses?: Expense[]
  settlements?: Settlement[]
  error?: string
}

export function useGroupBalances(groupId: string) {
  const { enqueueSnackbar } = useNotify()
  const [record, setRecord] = useState<{ suggestion?: TransferSuggestion } | null>(null)
  const [settlementToDelete, setSettlementToDelete] = useState<Settlement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<BalanceDataState>({ groupId })

  useEffect(() => {
    let active = true
    const unsubscribes: (() => void)[] = []
    const fail = (error: Error) => {
      if (active) setData({ groupId, error: error.message })
    }

    try {
      unsubscribes.push(
        subscribeExpenses(
          groupId,
          (expenses) => {
            if (active)
              setData((current) => ({
                ...(current.groupId === groupId ? current : {}),
                groupId,
                expenses,
              }))
          },
          fail,
        ),
        subscribeSettlements(
          groupId,
          (settlements) => {
            if (active)
              setData((current) => ({
                ...(current.groupId === groupId ? current : {}),
                groupId,
                settlements,
              }))
          },
          fail,
        ),
      )
    } catch (error) {
      fail(error instanceof Error ? error : new Error('Unable to load balances.'))
    }

    return () => {
      active = false
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [attempt, groupId])

  const retry = () => {
    setData({ groupId })
    setAttempt((current) => current + 1)
  }

  const selectSettlementToDelete = (settlement: Settlement | null) => {
    setDeleteError('')
    setSettlementToDelete(settlement)
  }

  const confirmDelete = async () => {
    if (!settlementToDelete || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteSettlement(groupId, settlementToDelete.id)
      setSettlementToDelete(null)
      enqueueSnackbar('Payment record deleted', { variant: 'success' })
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Unable to delete payment.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const saveSettlement = async (id: string, input: CreateSettlementInput) => {
    await createSettlement(id, input)
    enqueueSnackbar('Payment recorded', { variant: 'success' })
  }

  return {
    closeRecord: () => setRecord(null),
    confirmDelete,
    data,
    deleteError,
    deleting,
    openRecord: (suggestion?: TransferSuggestion) => setRecord({ suggestion }),
    record,
    retry,
    saveSettlement,
    selectSettlementToDelete,
    settlementToDelete,
  }
}
