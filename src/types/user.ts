export interface UserProfile {
  id: string
  displayName: string
  email: string
  photoURL?: string
  defaultCurrency: string
  createdAt: string
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
