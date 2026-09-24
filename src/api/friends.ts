import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { getUserByEmail } from './users'

export interface Friendship {
  id: string
  memberIds: string[]
  senderId: string
  recipientId: string
  status: 'pending' | 'accepted'
}
export const friendshipId = (a: string, b: string) => [a, b].sort().join(':')
export function watchFriendships(userId: string, next: (items: Friendship[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'friendships'), where('memberIds', 'array-contains', userId)),
    snapshot => next(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Friendship)), error)
}
export async function sendFriendRequest(email: string) {
  const me = auth.currentUser?.uid
  if (!me) throw new Error('Please sign in')
  const user = await getUserByEmail(email)
  if (!user) throw new Error('No account found. Ask them to sign up first.')
  if (user.id === me) throw new Error('You cannot add yourself as a friend.')
  const reference = doc(db, 'friendships', friendshipId(me, user.id))
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(reference)
    if (existing.exists()) throw new Error('A friendship or request already exists.')
    transaction.set(reference, {
      memberIds: [me, user.id].sort(), senderId: me, recipientId: user.id,
      status: 'pending', createdAt: serverTimestamp(),
    })
  })
}
export async function respondToFriendship(id: string, action: 'accept' | 'remove') {
  const me = auth.currentUser?.uid
  if (!me) throw new Error('Please sign in')
  const reference = doc(db, 'friendships', id)
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists()) throw new Error('This request is no longer available.')
    const item = snapshot.data() as Friendship
    if (!item.memberIds.includes(me)) throw new Error('Permission denied')
    if (action === 'accept') {
      if (item.recipientId !== me || item.status !== 'pending') throw new Error('This request is no longer available.')
      transaction.update(reference, { status: 'accepted' })
    } else transaction.delete(reference)
  })
}
