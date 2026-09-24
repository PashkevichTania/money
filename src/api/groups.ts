import {
  collection,
  deleteDoc,
  doc,
  type DocumentReference,
  type FirestoreDataConverter,
  getDoc,
  getDocs,
  limit,
  query,
  type QueryDocumentSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from '@/config/firebase';
import type { Group } from '@/types/group';
import { nowIso } from '@/utils/dates';

export interface CreateGroupInput {
  name: string;
  baseCurrency: string;
  memberIds: string[];
  createdBy: string;
}

export interface UpdateGroupInput {
  name?: string;
  baseCurrency?: string;
  memberIds?: string[];
}

function assertFirebase() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      'Firebase is not configured. Add your VITE_FIREBASE_* variables in .env.local and reload.'
    );
  }
}

const groupConverter: FirestoreDataConverter<Group> = {
  toFirestore: (group: Group) => ({
    hasExpenseHistory: false,
    name: group.name,
    baseCurrency: group.baseCurrency,
    memberIds: group.memberIds,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }),
  fromFirestore: (snap: QueryDocumentSnapshot): Group => {
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      baseCurrency: data.baseCurrency,
      memberIds: data.memberIds,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

function groupRef(id: string): DocumentReference<Group> {
  assertFirebase();
  return doc(db, 'groups', id).withConverter(groupConverter);
}

function groupsColl() {
  assertFirebase();
  return collection(db, 'groups').withConverter(groupConverter);
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  assertFirebase();
  if (input.memberIds.some((id) => id !== input.createdBy))
    throw new Error('Create the group first, then add confirmed friends.');
  const id = doc(groupsColl()).id;
  const now = nowIso();
  const group: Group = {
    id,
    name: input.name.trim(),
    baseCurrency: input.baseCurrency,
    memberIds: [input.createdBy],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(groupRef(id), group);
  return group;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  assertFirebase();
  const snap = await getDoc(groupRef(groupId));
  return snap.exists() ? snap.data()! : null;
}

export async function getGroupsForUser(userId: string): Promise<Group[]> {
  assertFirebase();
  const q = query(groupsColl(), where('memberIds', 'array-contains', userId));
  const snap = await getDocs(q);
  const groups: Group[] = [];
  snap.forEach((docSnap) => groups.push(docSnap.data()));
  groups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return groups;
}

export async function updateGroup(
  groupId: string,
  patch: UpdateGroupInput
): Promise<Group> {
  assertFirebase();
  const existing = await getGroup(groupId);
  if (!existing) throw new Error('Group not found');
  const added = [
    ...new Set(
      patch.memberIds?.filter((id) => !existing.memberIds.includes(id)) ?? []
    ),
  ];
  if (added.length > 1) throw new Error('Add one friend at a time.');
  if (added.length) {
    const me = auth.currentUser?.uid;
    if (!me || !existing.memberIds.includes(me))
      throw new Error('Permission denied');
    const friendship = await getDoc(
      doc(db, 'friendships', [me, added[0]].sort().join(':'))
    );
    if (
      !friendship.exists() ||
      friendship.data().status !== 'accepted' ||
      !friendship.data().memberIds.includes(me) ||
      !friendship.data().memberIds.includes(added[0])
    ) {
      throw new Error('Only confirmed friends can be added to a group.');
    }
  }
  if (patch.memberIds && !patch.memberIds.includes(existing.createdBy)) {
    throw new Error('The group author must remain a member.');
  }
  if (
    patch.baseCurrency !== undefined &&
    patch.baseCurrency !== existing.baseCurrency
  ) {
    throw new Error(
      'The base currency cannot be changed after group creation.'
    );
  }
  if (
    patch.memberIds &&
    existing.memberIds.some((id) => !patch.memberIds!.includes(id))
  ) {
    const raw = await getDoc(groupRef(groupId));
    if (raw.get('hasExpenseHistory') !== false) {
      throw new Error(
        'Members cannot be removed after expenses have been recorded. Their history must be retained.'
      );
    }
    const history = await getDocs(
      query(collection(db, 'groups', groupId, 'expenses'), limit(1))
    );
    if (!history.empty)
      throw new Error(
        'Members cannot be removed from a group with expense history.'
      );
  }
  const next: Group = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.baseCurrency !== undefined
      ? { baseCurrency: patch.baseCurrency }
      : {}),
    ...(patch.memberIds !== undefined
      ? { memberIds: Array.from(new Set(patch.memberIds)) }
      : {}),
    updatedAt: nowIso(),
  };
  await updateDoc(groupRef(groupId), {
    ...(patch.name !== undefined ? { name: next.name } : {}),
    ...(patch.baseCurrency !== undefined
      ? { baseCurrency: next.baseCurrency }
      : {}),
    ...(patch.memberIds !== undefined ? { memberIds: next.memberIds } : {}),
    updatedAt: next.updatedAt,
  });
  return next;
}

export async function deleteGroup(groupId: string): Promise<void> {
  assertFirebase();
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (!auth.currentUser || group.createdBy !== auth.currentUser.uid) {
    throw new Error('Only the group author can delete this group.');
  }
  // Keep the parent (and membership authorization) until all children are gone.
  await updateDoc(groupRef(groupId), { deleting: true });
  try {
    for (const name of ['expenses', 'settlements', 'activity']) {
      for (;;) {
        const page = await getDocs(
          query(collection(db, 'groups', groupId, name), limit(400))
        );
        if (page.empty) break;
        const batch = writeBatch(db);
        page.docs.forEach((child) => batch.delete(child.ref));
        await batch.commit();
      }
    }
    await deleteDoc(groupRef(groupId));
  } catch (cause) {
    throw new Error(
      'Group deletion is incomplete. New expenses are blocked; retry deletion to finish cleanup.',
      { cause }
    );
  }
}

export async function addMemberToGroup(
  groupId: string,
  userId: string
): Promise<Group> {
  assertFirebase();
  const me = auth.currentUser?.uid;
  if (!me) throw new Error('Permission denied');
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new Error('Group not found');
    const current = snapshot.data();
    if (!current.memberIds.includes(me)) throw new Error('Permission denied');
    if (current.memberIds.includes(userId)) return current;
    const friendship = await transaction.get(
      doc(db, 'friendships', [me, userId].sort().join(':'))
    );
    if (
      !friendship.exists() ||
      friendship.data().status !== 'accepted' ||
      !friendship.data().memberIds.includes(me) ||
      !friendship.data().memberIds.includes(userId)
    ) {
      throw new Error('Only confirmed friends can be added to a group.');
    }
    const next = {
      ...current,
      memberIds: [...current.memberIds, userId],
      updatedAt: nowIso(),
    };
    transaction.update(groupRef(groupId), {
      memberIds: next.memberIds,
      updatedAt: next.updatedAt,
    });
    return next;
  });
}

export async function removeMemberFromGroup(
  groupId: string,
  userId: string
): Promise<Group> {
  const current = await getGroup(groupId);
  if (!current) throw new Error('Group not found');
  if (!current.memberIds.includes(userId)) return current;
  if (current.memberIds.length <= 1) {
    throw new Error(
      'A group must have at least one member. Delete the group instead.'
    );
  }
  return updateGroup(groupId, {
    memberIds: current.memberIds.filter((id) => id !== userId),
  });
}
