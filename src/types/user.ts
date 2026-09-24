export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  defaultCurrency: string;
  favoriteCurrencies?: string[];
  language?: 'en' | 'ru';
  createdAt: string;
}

export type AuthStatus =
  'idle' | 'loading' | 'authenticated' | 'unauthenticated';
