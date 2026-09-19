import { collection, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'
import type { Settlement } from '@/types/expense'

export function subscribeSettlements(
  groupId: string,
  next: (settlements: Settlement[]) => void,
  error: (error: Error) => void,
) {
  if (!isFirebaseConfigured || !db)
    throw new Error('Firebase is not configured.')
  return onSnapshot(
    collection(db, 'groups', groupId, 'settlements'),
    (snapshot) => {
      next(
        snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id, groupId }) as Settlement,
        ),
      )
    },
    error,
  )
}
