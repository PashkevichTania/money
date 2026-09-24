import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from '@/config/firebase';
import type { Settlement } from '@/types/expense';
import { nowIso } from '@/utils/dates';

export interface CreateSettlementInput {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note?: string;
}

function assertFirebase() {
  if (!isFirebaseConfigured || !db)
    throw new Error('Firebase is not configured.');
}

/** Reuse id for retries of the same form submission to avoid duplicate payments. */
export async function createSettlement(
  id: string,
  input: CreateSettlementInput
): Promise<Settlement> {
  assertFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in.');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
    throw new Error('Invalid settlement identifier.');
  if (
    !input.fromUserId ||
    !input.toUserId ||
    input.fromUserId === input.toUserId
  )
    throw new Error('Choose two different members.');
  if (uid !== input.fromUserId && uid !== input.toUserId)
    throw new Error('Only the sender or recipient can record this payment.');
  const amountMinor = Math.round(input.amount * 100);
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    amountMinor > 99999999900 ||
    Math.abs(input.amount * 100 - amountMinor) > 0.000001
  ) {
    throw new Error(
      'Enter a positive amount with at most two decimal places (maximum 999999999).'
    );
  }
  const note = input.note?.trim() || '';
  if (note.length > 500)
    throw new Error('Note must be at most 500 characters.');
  const reference = doc(db, 'groups', input.groupId, 'settlements', id);
  const parent = doc(db, 'groups', input.groupId);
  const settlement = {
    ...input,
    amount: amountMinor / 100,
    amountMinor,
    note,
    createdBy: uid,
    createdAt: nowIso(),
  };
  return runTransaction(db, async (transaction) => {
    const group = await transaction.get(parent);
    const existing = await transaction.get(reference);
    if (!group.exists() || group.get('deleting'))
      throw new Error('Group is unavailable or being deleted.');
    const members = group.get('memberIds') as string[];
    if (
      ![uid, input.fromUserId, input.toUserId].every((member) =>
        members.includes(member)
      )
    )
      throw new Error('Both people must still belong to this group.');
    if (group.get('baseCurrency') !== input.currency)
      throw new Error('Settlement currency must match the group currency.');
    if (existing.exists()) {
      const saved = existing.data();
      if (
        saved.createdBy !== uid ||
        saved.fromUserId !== input.fromUserId ||
        saved.toUserId !== input.toUserId ||
        saved.amount !== settlement.amount ||
        saved.currency !== input.currency ||
        (saved.note || '') !== note
      ) {
        throw new Error(
          'This payment was already recorded with different details. Close this form and check recorded payments.'
        );
      }
      return { ...saved, id, groupId: input.groupId } as Settlement;
    }
    if (group.get('hasExpenseHistory') !== true)
      transaction.update(parent, { hasExpenseHistory: true });
    transaction.set(reference, settlement);
    return { ...settlement, id };
  });
}

export async function deleteSettlement(
  groupId: string,
  id: string
): Promise<void> {
  assertFirebase();
  const reference = doc(db, 'groups', groupId, 'settlements', id);
  const saved = await getDoc(reference);
  if (!saved.exists()) return;
  if (!auth.currentUser || saved.get('createdBy') !== auth.currentUser.uid)
    throw new Error('Only the author can delete this payment record.');
  await deleteDoc(reference);
}

export function subscribeSettlements(
  groupId: string,
  next: (settlements: Settlement[]) => void,
  error: (error: Error) => void
) {
  if (!isFirebaseConfigured || !db)
    throw new Error('Firebase is not configured.');
  return onSnapshot(
    collection(db, 'groups', groupId, 'settlements'),
    (snapshot) => {
      next(
        snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id, groupId }) as Settlement
        )
      );
    },
    error
  );
}
