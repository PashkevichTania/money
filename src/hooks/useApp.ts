import { createContext, useContext } from 'react';

export interface AppContextValue {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProviders');
  return ctx;
}
