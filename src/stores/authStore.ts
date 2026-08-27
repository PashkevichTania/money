import { create } from 'zustand'
import type { User, AuthError } from 'firebase/auth'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/config/firebase'
import type { AuthStatus, UserProfile } from '@/types/user'
import { DEFAULT_BASE_CURRENCY } from '@/config/currencies'
import { nowIso } from '@/utils/dates'

export interface AuthStoreState {
  firebaseUser: User | null
  profile: UserProfile | null
  status: AuthStatus
  initialized: boolean
  error: string | null
  init: () => () => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

function translateAuthError(error: unknown): string {
  const e = error as AuthError
  switch (e?.code) {
    case 'auth/invalid-email':
      return 'Invalid email address'
    case 'auth/user-disabled':
      return 'This account has been disabled'
    case 'auth/user-not-found':
      return 'No account found with this email'
    case 'auth/wrong-password':
      return 'Incorrect password'
    case 'auth/email-already-in-use':
      return 'An account already exists with this email'
    case 'auth/operation-not-allowed':
      return 'Sign-in method not enabled'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters'
    default:
      return e?.message || 'Something went wrong. Please try again.'
  }
}

async function createProfileIfMissing(user: User, displayNameFallback?: string): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data() as UserProfile
    const email = (user.email || data.email || '').toLowerCase()
    const profile: UserProfile = { ...data, id: user.uid, email }
    if (data.email !== email || data.id !== user.uid) {
      await setDoc(ref, { email, id: user.uid }, { merge: true })
    }
    return profile
  }
  const profile: UserProfile = {
    id: user.uid,
    displayName: user.displayName || displayNameFallback || user.email?.split('@')[0] || 'User',
    email: (user.email || '').toLowerCase(),
    photoURL: user.photoURL || undefined,
    defaultCurrency: DEFAULT_BASE_CURRENCY,
    createdAt: nowIso(),
  }
  await setDoc(ref, profile)
  return profile
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  firebaseUser: null,
  profile: null,
  status: 'idle',
  initialized: false,
  error: null,

  init: () => {
    if (!isFirebaseConfigured) {
      set({ initialized: true, status: 'unauthenticated' })
      return () => {}
    }
    set({ status: 'loading' })
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const profile = await createProfileIfMissing(user)
          set({
            firebaseUser: user,
            profile,
            status: 'authenticated',
            initialized: true,
            error: null,
          })
        } else {
          set({
            firebaseUser: null,
            profile: null,
            status: 'unauthenticated',
            initialized: true,
          })
        }
      } catch (error) {
        set({
          firebaseUser: user ?? null,
          profile: null,
          status: user ? 'authenticated' : 'unauthenticated',
          initialized: true,
          error: translateAuthError(error),
        })
      }
    })
    return unsubscribe
  },

  login: async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured. Add your VITE_FIREBASE_* variables in .env.local')
    }
    set({ status: 'loading', error: null })
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await createProfileIfMissing(credential.user)
      set({ firebaseUser: credential.user, profile, status: 'authenticated', error: null })
    } catch (error) {
      set({ status: 'unauthenticated', error: translateAuthError(error) })
      throw error
    }
  },

  signup: async (email: string, password: string, displayName: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured. Add your VITE_FIREBASE_* variables in .env.local')
    }
    set({ status: 'loading', error: null })
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName && credential.user) {
        await updateProfile(credential.user, { displayName })
      }
      const profile = await createProfileIfMissing(credential.user, displayName)
      set({ firebaseUser: credential.user, profile, status: 'authenticated', error: null })
    } catch (error) {
      set({ status: 'unauthenticated', error: translateAuthError(error) })
      throw error
    }
  },

  logout: async () => {
    if (!isFirebaseConfigured) {
      set({ firebaseUser: null, profile: null, status: 'unauthenticated' })
      return
    }
    try {
      await fbSignOut(auth)
    } finally {
      set({ firebaseUser: null, profile: null, status: 'unauthenticated' })
    }
  },

  clearError: () => {
    if (get().error) set({ error: null })
  },
}))
