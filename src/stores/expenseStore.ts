import { create } from 'zustand'
import type { Expense } from '@/types/expense'
import {
  createExpense as apiCreateExpense,
  deleteExpense as apiDeleteExpense,
  listExpenses,
  updateExpense as apiUpdateExpense,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '@/api/expenses'
import { isFirebaseConfigured } from '@/config/firebase'

export interface ExpenseFilters {
  dateFrom?: string
  dateTo?: string
  userId?: string
  minAmount?: number
  maxAmount?: number
}

export interface ExpenseStoreState {
  expensesByGroup: Record<string, Expense[]>
  loadingByGroup: Record<string, boolean>
  errorsByGroup: Record<string, string | undefined>
  selectedExpenseId: string | null
  filters: ExpenseFilters
  loadedGroups: Record<string, boolean>
  loadExpenses: (groupId: string, force?: boolean) => Promise<Expense[]>
  addExpense: (groupId: string, input: CreateExpenseInput) => Promise<Expense>
  updateExpense: (
    groupId: string,
    expenseId: string,
    patch: UpdateExpenseInput,
  ) => Promise<Expense>
  removeExpense: (groupId: string, expenseId: string) => Promise<void>
  setSelectedExpenseId: (id: string | null) => void
  setFilters: (filters: Partial<ExpenseFilters>) => void
  clearFilters: () => void
  getExpense: (groupId: string, expenseId: string) => Expense | undefined
  setError: (groupId: string, message: string | undefined) => void
}

type ExpenseSetState = (
  partial:
    | Partial<ExpenseStoreState>
    | ((state: ExpenseStoreState) => Partial<ExpenseStoreState>),
) => void

function makeErrorBoundary<T>(
  set: ExpenseSetState,
  groupId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return fn().catch((err) => {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    set((s) => ({ errorsByGroup: { ...s.errorsByGroup, [groupId]: msg } }))
    throw err
  })
}

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  expensesByGroup: {},
  loadingByGroup: {},
  errorsByGroup: {},
  selectedExpenseId: null,
  filters: {},
  loadedGroups: {},

  setSelectedExpenseId: (id) => set({ selectedExpenseId: id }),

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),

  clearFilters: () => set({ filters: {} }),

  setError: (groupId, message) =>
    set((s) => ({
      errorsByGroup: { ...s.errorsByGroup, [groupId]: message },
    })),

  getExpense: (groupId, expenseId) => {
    const list = get().expensesByGroup[groupId] ?? []
    return list.find((e) => e.id === expenseId)
  },

  loadExpenses: async (groupId, force = false) => {
    if (!isFirebaseConfigured) {
      set({ loadedGroups: { ...get().loadedGroups, [groupId]: true } })
      return []
    }
    if (!force && get().loadedGroups[groupId]) {
      return get().expensesByGroup[groupId] ?? []
    }
    set({
      loadingByGroup: { ...get().loadingByGroup, [groupId]: true },
      errorsByGroup: { ...get().errorsByGroup, [groupId]: undefined },
    })
    try {
      return await makeErrorBoundary(set, groupId, async () => {
        const expenses = await listExpenses(groupId)
        set({
          expensesByGroup: { ...get().expensesByGroup, [groupId]: expenses },
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
          loadedGroups: { ...get().loadedGroups, [groupId]: true },
        })
        return expenses
      })
    } finally {
      if (get().loadingByGroup[groupId]) {
        set({
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
        })
      }
    }
  },

  addExpense: async (groupId, input) => {
    if (!isFirebaseConfigured) throw new Error('Firebase is not configured')
    set({ loadingByGroup: { ...get().loadingByGroup, [groupId]: true } })
    try {
      return await makeErrorBoundary(set, groupId, async () => {
        const expense = await apiCreateExpense(input)
        const current = get().expensesByGroup[groupId] ?? []
        const next = [expense, ...current].sort((a, b) =>
          b.expenseDate.localeCompare(a.expenseDate),
        )
        set({
          expensesByGroup: { ...get().expensesByGroup, [groupId]: next },
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
        })
        return expense
      })
    } finally {
      if (get().loadingByGroup[groupId]) {
        set({
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
        })
      }
    }
  },

  updateExpense: async (groupId, expenseId, patch) => {
    if (!isFirebaseConfigured) throw new Error('Firebase is not configured')
    set({ loadingByGroup: { ...get().loadingByGroup, [groupId]: true } })
    try {
      return await makeErrorBoundary(set, groupId, async () => {
        const updated = await apiUpdateExpense(groupId, expenseId, patch)
        const current = get().expensesByGroup[groupId] ?? []
        const next = current
          .map((e) => (e.id === expenseId ? updated : e))
          .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
        set({
          expensesByGroup: { ...get().expensesByGroup, [groupId]: next },
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
        })
        return updated
      })
    } finally {
      if (get().loadingByGroup[groupId]) {
        set({
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
        })
      }
    }
  },

  removeExpense: async (groupId, expenseId) => {
    if (!isFirebaseConfigured) throw new Error('Firebase is not configured')
    set({ loadingByGroup: { ...get().loadingByGroup, [groupId]: true } })
    try {
      await makeErrorBoundary(set, groupId, async () => {
        await apiDeleteExpense(groupId, expenseId)
        const current = get().expensesByGroup[groupId] ?? []
        const next = current.filter((e) => e.id !== expenseId)
        const deselected =
          get().selectedExpenseId === expenseId ? null : get().selectedExpenseId
        set({
          expensesByGroup: { ...get().expensesByGroup, [groupId]: next },
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
          selectedExpenseId: deselected,
        })
      })
    } finally {
      if (get().loadingByGroup[groupId]) {
        set({
          loadingByGroup: { ...get().loadingByGroup, [groupId]: false },
        })
      }
    }
  },
}))
