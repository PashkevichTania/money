import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  onSnapshot,
  query,
  runTransaction,
  limit,
  type DocumentReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/config/firebase'
import type {
  Expense,
  ParticipantShare,
  PayerContribution,
  RateSnapshot,
} from '@/types/expense'
import { validateSplit } from '@/utils/split'
import { roundMoney } from '@/utils/currency'
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

function expenseRef(
  groupId: string,
  expenseId: string,
): DocumentReference<Expense> {
  assertFirebase()
  return doc(db, 'groups', groupId, 'expenses', expenseId).withConverter(
    expenseConverter,
  )
}

function expensesColl(groupId: string) {
  assertFirebase()
  return collection(db, 'groups', groupId, 'expenses').withConverter(
    expenseConverter,
  )
}

export function subscribeExpenses(
  groupId: string,
  next: (expenses: Expense[]) => void,
  error: (error: Error) => void,
) {
  return onSnapshot(
    expensesColl(groupId),
    (snapshot) => next(snapshot.docs.map((doc) => doc.data())),
    error,
  )
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

function validateExpense(expense: Expense) {
  if (
    !expense.title.trim() ||
    !['equal', 'exact', 'percentage', 'shares'].includes(expense.splitType)
  ) {
    throw new Error(
      'An expense title and a supported split method are required.',
    )
  }
  const errors = validateSplit(expense)
  if (errors.length) throw new Error(errors[0].message)
  const rate =
    expense.originalCurrency === expense.groupCurrency
      ? 1
      : expense.rateSnapshot?.rate
  if (
    !rate ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(expense.convertedAmount) ||
    expense.convertedAmount <= 0 ||
    roundMoney(expense.originalAmount * rate) !== expense.convertedAmount
  ) {
    throw new Error(
      'A valid exchange-rate snapshot and matching converted amount are required.',
    )
  }
}

async function saveExpense(expense: Expense, expected?: Expense) {
  validateExpense(expense)
  const parent = doc(db, 'groups', expense.groupId)
  await runTransaction(db, async (transaction) => {
    const group = await transaction.get(parent)
    if (expected) {
      const current = await transaction.get(
        expenseRef(expense.groupId, expense.id),
      )
      if (
        !current.exists() ||
        current.data().updatedAt !== expected.updatedAt
      ) {
        throw new Error(
          'This expense changed or was deleted. Reload before editing.',
        )
      }
    }
    if (!group.exists() || group.get('deleting'))
      throw new Error('Group is unavailable or being deleted.')
    if (group.get('baseCurrency') !== expense.groupCurrency)
      throw new Error('Expense currency must match the group currency.')
    const members = group.get('memberIds') as string[]
    if (
      [...expense.paidBy, ...expense.participants].some(
        (p) => !members.includes(p.userId),
      )
    ) {
      throw new Error('Every payer and participant must belong to the group.')
    }
    transaction.update(parent, { hasExpenseHistory: true })
    transaction.set(expenseRef(expense.groupId, expense.id), expense)
  })
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<Expense> {
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
    isSettlement:
      input.paidBy.length === 1 && input.participants.length === 1
        ? undefined
        : false,
  }
  await saveExpense(expense)
  return expense
}

export async function getExpense(
  groupId: string,
  expenseId: string,
): Promise<Expense | null> {
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
  const constraints: ReturnType<typeof orderBy>[] = [
    orderBy('expenseDate', 'desc'),
  ]
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
  if (
    !auth.currentUser ||
    existing.createdBy !== auth.currentUser.uid ||
    patch.updatedBy !== auth.currentUser.uid
  ) {
    throw new Error('Only the expense author can edit this expense.')
  }
  const next: Expense = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description?.trim() || undefined }
      : {}),
    ...(patch.originalAmount !== undefined
      ? { originalAmount: patch.originalAmount }
      : {}),
    ...(patch.originalCurrency !== undefined
      ? { originalCurrency: patch.originalCurrency.toUpperCase() }
      : {}),
    ...(patch.convertedAmount !== undefined
      ? { convertedAmount: patch.convertedAmount }
      : {}),
    ...(patch.groupCurrency !== undefined
      ? { groupCurrency: patch.groupCurrency.toUpperCase() }
      : {}),
    ...('rateSnapshot' in patch ? { rateSnapshot: patch.rateSnapshot } : {}),
    ...(patch.paidBy !== undefined ? { paidBy: patch.paidBy } : {}),
    ...(patch.participants !== undefined
      ? { participants: patch.participants }
      : {}),
    ...(patch.splitType !== undefined ? { splitType: patch.splitType } : {}),
    ...(patch.expenseDate !== undefined
      ? { expenseDate: patch.expenseDate }
      : {}),
    updatedBy: patch.updatedBy,
    updatedAt: nowIso(),
  }
  await saveExpense(next, existing)
  return next
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
): Promise<void> {
  assertFirebase()
  const existing = await getExpense(groupId, expenseId)
  if (!existing) throw new Error('Expense not found')
  if (!auth.currentUser || existing.createdBy !== auth.currentUser.uid) {
    throw new Error('Only the expense author can delete this expense.')
  }
  await deleteDoc(expenseRef(groupId, expenseId))
}
