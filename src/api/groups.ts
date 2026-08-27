import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'
import type { Group } from '@/types/group'
import { nowIso } from '@/utils/dates'

export interface CreateGroupInput {
  name: string
  baseCurrency: string
  memberIds: string[]
  createdBy: string
}

export interface UpdateGroupInput {
  name?: string
  baseCurrency?: string
  memberIds?: string[]
}

function assertFirebase() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      'Firebase is not configured. Add your VITE_FIREBASE_* variables in .env.local and reload.',
    )
  }
}

const groupConverter: FirestoreDataConverter<Group> = {
  toFirestore: (group: Group) => ({
    name: group.name,
    baseCurrency: group.baseCurrency,
    memberIds: group.memberIds,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }),
  fromFirestore: (snap: QueryDocumentSnapshot): Group => {
    const data = snap.data()
    return {
      id: snap.id,
      name: data.name,
      baseCurrency: data.baseCurrency,
      memberIds: data.memberIds,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  },
}

function groupRef(id: string): DocumentReference<Group> {
  assertFirebase()
  return doc(db, 'groups', id).withConverter(groupConverter)
}

function groupsColl() {
  assertFirebase()
  return collection(db, 'groups').withConverter(groupConverter)
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  assertFirebase()
  const id = doc(groupsColl()).id
  const now = nowIso()
  const group: Group = {
    id,
    name: input.name.trim(),
    baseCurrency: input.baseCurrency,
    memberIds: Array.from(new Set(input.memberIds)),
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(groupRef(id), group)
  return group
}

export async function getGroup(groupId: string): Promise<Group | null> {
  assertFirebase()
  const snap = await getDoc(groupRef(groupId))
  return snap.exists() ? snap.data()! : null
}

export async function getGroupsForUser(userId: string): Promise<Group[]> {
  assertFirebase()
  const q = query(groupsColl(), where('memberIds', 'array-contains', userId))
  const snap = await getDocs(q)
  const groups: Group[] = []
  snap.forEach((docSnap) => groups.push(docSnap.data()))
  groups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return groups
}

export async function updateGroup(
  groupId: string,
  patch: UpdateGroupInput,
): Promise<Group> {
  assertFirebase()
  const existing = await getGroup(groupId)
  if (!existing) throw new Error('Group not found')
  const next: Group = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.baseCurrency !== undefined ? { baseCurrency: patch.baseCurrency } : {}),
    ...(patch.memberIds !== undefined ? { memberIds: Array.from(new Set(patch.memberIds)) } : {}),
    updatedAt: nowIso(),
  }
  await updateDoc(groupRef(groupId), {
    ...(patch.name !== undefined ? { name: next.name } : {}),
    ...(patch.baseCurrency !== undefined ? { baseCurrency: next.baseCurrency } : {}),
    ...(patch.memberIds !== undefined ? { memberIds: next.memberIds } : {}),
    updatedAt: next.updatedAt,
  })
  return next
}

export async function deleteGroup(groupId: string): Promise<void> {
  assertFirebase()
  await deleteDoc(groupRef(groupId))
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<Group> {
  const current = await getGroup(groupId)
  if (!current) throw new Error('Group not found')
  if (current.memberIds.includes(userId)) return current
  return updateGroup(groupId, { memberIds: [...current.memberIds, userId] })
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<Group> {
  const current = await getGroup(groupId)
  if (!current) throw new Error('Group not found')
  if (!current.memberIds.includes(userId)) return current
  if (current.memberIds.length <= 1) {
    throw new Error('A group must have at least one member. Delete the group instead.')
  }
  return updateGroup(groupId, {
    memberIds: current.memberIds.filter((id) => id !== userId),
  })
}
