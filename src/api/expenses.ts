import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  limit,
  type DocumentReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'
import type {
  Expense,
  ParticipantShare,
  PayerContribution,
  RateSnapshot,
} from '@/types/expense'
import { nowIso } from '@/utils/dates'

function assertFirebase() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      'Firebase is not configured. Add your VITE_FIREBASE_* variables in .env.local and reload.',
    )
  }
}

const expenseConverter: FirestoreDataConverter<Expense> = {
  toFirestore: (expense: Expense) => ({
    groupId: expense.groupId,
    title: expense.title,
    description: expense.description ?? null,
    originalAmount: expense.originalAmount,
    originalCurrency: expense.originalCurrency,
    convertedAmount: expense.convertedAmount,
    groupCurrency: expense.groupCurrency,
    rateSnapshot: expense.rateSnapshot ?? null,
    paidBy: expense.paidBy,
    participants: expense.participants,
    splitType: expense.splitType,
    expenseDate: expense.expenseDate,
    createdBy: expense.createdBy,
    updatedBy: expense.updatedBy,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    isSettlement: expense.isSettlement ?? false,
  }),
  fromFirestore: (snap: QueryDocumentSnapshot): Expense => {
    const data = snap.data()
    return {
      id: snap.id,
      groupId: data.groupId,
      title: data.title,
      description: data.description ?? undefined,
      originalAmount: data.originalAmount,
      originalCurrency: data.originalCurrency,
      convertedAmount: data.convertedAmount,
      groupCurrency: data.groupCurrency,
      rateSnapshot: data.rateSnapshot ?? undefined,
      paidBy: (data.paidBy ?? []) as PayerContribution[],
      participants: (data.participants ?? []) as ParticipantShare[],
      splitType: data.splitType,
      expenseDate: data.expenseDate,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isSettlement: data.isSettlement ?? undefined,
    }
  },
}

function expenseRef(groupId: string, expenseId: string): DocumentReference<Expense> {
  assertFirebase()
  return doc(db, 'groups', groupId, 'expenses', expenseId).withConverter(expenseConverter)
}

function expensesColl(groupId: string) {
  assertFirebase()
  return collection(db, 'groups', groupId, 'expenses').withConverter(expenseConverter)
}

export interface CreateExpenseInput {
  groupId: string
  title: string
  description?: string
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  groupCurrency: string
  rateSnapshot?: RateSnapshot
  paidBy: PayerContribution[]
  participants: ParticipantShare[]
  splitType: Expense['splitType']
  expenseDate: string
  createdBy: string
}

export type UpdateExpenseInput = Partial<
  Omit<CreateExpenseInput, 'groupId' | 'createdBy'>
> & { updatedBy: string }

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  assertFirebase()
  const id = doc(expensesColl(input.groupId)).id
  const now = nowIso()
  const expense: Expense = {
    id,
    groupId: input.groupId,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    originalAmount: input.originalAmount,
    originalCurrency: input.originalCurrency.toUpperCase(),
    convertedAmount: input.convertedAmount,
    groupCurrency: input.groupCurrency.toUpperCase(),
    rateSnapshot: input.rateSnapshot,
    paidBy: input.paidBy,
    participants: input.participants,
    splitType: input.splitType,
    expenseDate: input.expenseDate,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    isSettlement: input.paidBy.length === 1 && input.participants.length === 1 ? undefined : false,
  }
  await setDoc(expenseRef(input.groupId, id), expense)
  return expense
}

export async function getExpense(groupId: string, expenseId: string): Promise<Expense | null> {
  assertFirebase()
  const snap = await getDoc(expenseRef(groupId, expenseId))
  return snap.exists() ? snap.data()! : null
}

export async function listExpenses(
  groupId: string,
  opts: { limitCount?: number; includeSettlements?: boolean } = {},
): Promise<Expense[]> {
  assertFirebase()
  const { limitCount, includeSettlements = true } = opts
  const constraints: ReturnType<typeof orderBy>[] = [orderBy('expenseDate', 'desc')]
  let q: ReturnType<typeof query>
  if (limitCount) {
    q = query(expensesColl(groupId), ...constraints, limit(limitCount))
  } else {
    q = query(expensesColl(groupId), ...constraints)
  }
  const snap = (await getDocs(q)) as QuerySnapshot<Expense>
  const out: Expense[] = []
  snap.forEach((docSnap) => {
    const expense: Expense = docSnap.data()
    if (!includeSettlements && expense.isSettlement) return
    out.push(expense)
  })
  return out
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  patch: UpdateExpenseInput,
): Promise<Expense> {
  assertFirebase()
  const existing = await getExpense(groupId, expenseId)
  if (!existing) throw new Error('Expense not found')
  const next: Expense = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description?.trim() || undefined }
      : {}),
    ...(patch.originalAmount !== undefined ? { originalAmount: patch.originalAmount } : {}),
    ...(patch.originalCurrency !== undefined
      ? { originalCurrency: patch.originalCurrency.toUpperCase() }
      : {}),
    ...(patch.convertedAmount !== undefined ? { convertedAmount: patch.convertedAmount } : {}),
    ...(patch.groupCurrency !== undefined
      ? { groupCurrency: patch.groupCurrency.toUpperCase() }
      : {}),
    ...(patch.rateSnapshot !== undefined ? { rateSnapshot: patch.rateSnapshot } : {}),
    ...(patch.paidBy !== undefined ? { paidBy: patch.paidBy } : {}),
    ...(patch.participants !== undefined ? { participants: patch.participants } : {}),
    ...(patch.splitType !== undefined ? { splitType: patch.splitType } : {}),
    ...(patch.expenseDate !== undefined ? { expenseDate: patch.expenseDate } : {}),
    updatedBy: patch.updatedBy,
    updatedAt: nowIso(),
  }
  await updateDoc(expenseRef(groupId, expenseId), {
    ...(patch.title !== undefined ? { title: next.title } : {}),
    ...(patch.description !== undefined ? { description: next.description ?? null } : {}),
    ...(patch.originalAmount !== undefined ? { originalAmount: next.originalAmount } : {}),
    ...(patch.originalCurrency !== undefined ? { originalCurrency: next.originalCurrency } : {}),
    ...(patch.convertedAmount !== undefined ? { convertedAmount: next.convertedAmount } : {}),
    ...(patch.groupCurrency !== undefined ? { groupCurrency: next.groupCurrency } : {}),
    ...(patch.rateSnapshot !== undefined ? { rateSnapshot: next.rateSnapshot ?? null } : {}),
    ...(patch.paidBy !== undefined ? { paidBy: next.paidBy } : {}),
    ...(patch.participants !== undefined ? { participants: next.participants } : {}),
    ...(patch.splitType !== undefined ? { splitType: next.splitType } : {}),
    ...(patch.expenseDate !== undefined ? { expenseDate: next.expenseDate } : {}),
    updatedBy: next.updatedBy,
    updatedAt: next.updatedAt,
  })
  return next
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  assertFirebase()
  await deleteDoc(expenseRef(groupId, expenseId))
}
