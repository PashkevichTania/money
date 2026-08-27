import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  orderBy,
  startAt,
  endAt,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'
import type { UserProfile } from '@/types/user'

function assertFirebase() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      'Firebase is not configured. Add your VITE_FIREBASE_* variables in .env.local and reload.',
    )
  }
}

const userConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: (user: UserProfile) => ({
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL ?? null,
    defaultCurrency: user.defaultCurrency,
    createdAt: user.createdAt,
  }),
  fromFirestore: (snap: QueryDocumentSnapshot): UserProfile => {
    const data = snap.data()
    return {
      id: snap.id,
      displayName: data.displayName,
      email: data.email,
      photoURL: data.photoURL ?? undefined,
      defaultCurrency: data.defaultCurrency,
      createdAt: data.createdAt,
    }
  },
}

function userRef(id: string) {
  assertFirebase()
  return doc(db, 'users', id).withConverter(userConverter)
}

function usersColl() {
  assertFirebase()
  return collection(db, 'users').withConverter(userConverter)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  assertFirebase()
  const snap = await getDoc(userRef(userId))
  return snap.exists() ? snap.data()! : null
}

export async function getUsersByIds(userIds: string[]): Promise<UserProfile[]> {
  if (!userIds.length) return []
  assertFirebase()
  const results: UserProfile[] = []
  const chunks: string[][] = []
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30))
  }
  for (const chunk of chunks) {
    const q = query(usersColl(), where(documentId(), 'in', chunk))
    const snap = await getDocs(q)
    snap.forEach((docSnap) => results.push(docSnap.data()))
  }
  return results
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const term = normalizeEmail(email)
  if (!term) return null
  assertFirebase()
  const q = query(usersColl(), where('email', '==', term), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data()
}

export interface SearchUserResult {
  user: UserProfile
  alreadyMember: boolean
}

export async function searchUsersByEmail(
  searchTerm: string,
  opts: { excludeMemberIds?: string[]; maxResults?: number } = {},
): Promise<SearchUserResult[]> {
  const { excludeMemberIds = [], maxResults = 10 } = opts
  if (!searchTerm.trim()) return []
  assertFirebase()
  const term = normalizeEmail(searchTerm)
  const termUpper = term + '\uf8ff'
  const q = query(
    usersColl(),
    orderBy('email'),
    startAt(term),
    endAt(termUpper),
    limit(maxResults),
  )
  const snap = await getDocs(q)
  const out: SearchUserResult[] = []
  snap.forEach((docSnap) => {
    const user = docSnap.data()
    out.push({
      user,
      alreadyMember: excludeMemberIds.includes(user.id),
    })
  })
  return out
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'defaultCurrency'>>,
): Promise<UserProfile> {
  assertFirebase()
  const current = await getUser(userId)
  if (!current) throw new Error('User profile not found')
  const next: UserProfile = { ...current, ...patch }
  await updateDoc(userRef(userId), { ...patch })
  return next
}

export async function upsertUser(profile: UserProfile): Promise<UserProfile> {
  assertFirebase()
  await setDoc(userRef(profile.id), profile, { merge: true })
  return profile
}
