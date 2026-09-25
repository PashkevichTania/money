import type { Language } from '@/i18n';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  defaultCurrency: string;
  favoriteCurrencies?: string[];
  language?: Language;
  createdAt: string;
}

export type AuthStatus =
  'idle' | 'loading' | 'authenticated' | 'unauthenticated';
