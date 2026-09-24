import { create } from 'zustand';

import {
  createExpense as apiCreateExpense,
  type CreateExpenseInput,
  deleteExpense as apiDeleteExpense,
  listExpenses,
  updateExpense as apiUpdateExpense,
  type UpdateExpenseInput,
} from '@/api/expenses';
import { isFirebaseConfigured } from '@/config/firebase';
import type { Expense } from '@/types/expense';

import {
  getErrorMessage,
  removeById,
  replaceById,
  setRecordValue,
} from './utils';

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ExpenseStoreState {
  expensesByGroup: Record<string, Expense[]>;
  loadingByGroup: Record<string, boolean>;
  errorsByGroup: Record<string, string | undefined>;
  selectedExpenseId: string | null;
  filters: ExpenseFilters;
  loadedGroups: Record<string, boolean>;
  loadExpenses: (groupId: string, force?: boolean) => Promise<Expense[]>;
  addExpense: (groupId: string, input: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (
    groupId: string,
    expenseId: string,
    patch: UpdateExpenseInput
  ) => Promise<Expense>;
  removeExpense: (groupId: string, expenseId: string) => Promise<void>;
  setSelectedExpenseId: (id: string | null) => void;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  clearFilters: () => void;
  getExpense: (groupId: string, expenseId: string) => Expense | undefined;
  setError: (groupId: string, message: string | undefined) => void;
}

type ExpenseSetState = (
  partial:
    | Partial<ExpenseStoreState>
    | ((state: ExpenseStoreState) => Partial<ExpenseStoreState>)
) => void;

type ExpenseGetState = () => ExpenseStoreState;

async function runGroupRequest<T>(
  set: ExpenseSetState,
  get: ExpenseGetState,
  groupId: string,
  request: () => Promise<T>
) {
  set((state) => ({
    loadingByGroup: setRecordValue(state.loadingByGroup, groupId, true),
    errorsByGroup: setRecordValue(state.errorsByGroup, groupId, undefined),
  }));
  try {
    return await request();
  } catch (error) {
    set((state) => ({
      errorsByGroup: setRecordValue(
        state.errorsByGroup,
        groupId,
        getErrorMessage(error)
      ),
    }));
    throw error;
  } finally {
    if (get().loadingByGroup[groupId]) {
      set((state) => ({
        loadingByGroup: setRecordValue(state.loadingByGroup, groupId, false),
      }));
    }
  }
}

const sortExpenses = (expenses: Expense[]) =>
  [...expenses].sort((first, second) =>
    second.expenseDate.localeCompare(first.expenseDate)
  );

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
      errorsByGroup: setRecordValue(s.errorsByGroup, groupId, message),
    })),

  getExpense: (groupId, expenseId) => {
    const list = get().expensesByGroup[groupId] ?? [];
    return list.find((e) => e.id === expenseId);
  },

  loadExpenses: async (groupId, force = false) => {
    if (!isFirebaseConfigured) {
      set((state) => ({
        loadedGroups: setRecordValue(state.loadedGroups, groupId, true),
      }));
      return [];
    }
    if (!force && get().loadedGroups[groupId]) {
      return get().expensesByGroup[groupId] ?? [];
    }
    return runGroupRequest(set, get, groupId, async () => {
      const expenses = await listExpenses(groupId);
      set((state) => ({
        expensesByGroup: setRecordValue(
          state.expensesByGroup,
          groupId,
          expenses
        ),
        loadedGroups: setRecordValue(state.loadedGroups, groupId, true),
      }));
      return expenses;
    });
  },

  addExpense: async (groupId, input) => {
    if (!isFirebaseConfigured) throw new Error('Firebase is not configured');
    return runGroupRequest(set, get, groupId, async () => {
      const expense = await apiCreateExpense(input);
      set((state) => ({
        expensesByGroup: setRecordValue(
          state.expensesByGroup,
          groupId,
          sortExpenses([expense, ...(state.expensesByGroup[groupId] ?? [])])
        ),
      }));
      return expense;
    });
  },

  updateExpense: async (groupId, expenseId, patch) => {
    if (!isFirebaseConfigured) throw new Error('Firebase is not configured');
    return runGroupRequest(set, get, groupId, async () => {
      const updated = await apiUpdateExpense(groupId, expenseId, patch);
      set((state) => ({
        expensesByGroup: setRecordValue(
          state.expensesByGroup,
          groupId,
          sortExpenses(
            replaceById(state.expensesByGroup[groupId] ?? [], updated)
          )
        ),
      }));
      return updated;
    });
  },

  removeExpense: async (groupId, expenseId) => {
    if (!isFirebaseConfigured) throw new Error('Firebase is not configured');
    await runGroupRequest(set, get, groupId, async () => {
      await apiDeleteExpense(groupId, expenseId);
      set((state) => ({
        expensesByGroup: setRecordValue(
          state.expensesByGroup,
          groupId,
          removeById(state.expensesByGroup[groupId] ?? [], expenseId)
        ),
        selectedExpenseId:
          state.selectedExpenseId === expenseId
            ? null
            : state.selectedExpenseId,
      }));
    });
  },
}));
