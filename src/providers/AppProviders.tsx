import type { ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { AppContext } from '@/hooks/useApp';
import { useThemeModeListener } from '@/hooks/useThemeModeListener';
import { useUIStore } from '@/stores/uiStore';
export function AppProviders({ children }: { children: ReactNode }) {
  useThemeModeListener();
  const themeMode = useUIStore((s) => s.themeMode);
  const setThemeMode = useUIStore((s) => s.setThemeMode);
  return (
    <AppContext.Provider
      value={{
        themeMode,
        toggleTheme: () =>
          setThemeMode(themeMode === 'dark' ? 'light' : 'dark'),
      }}
    >
      {children}
      <Toaster theme={themeMode} position="top-right" closeButton />
    </AppContext.Provider>
  );
}
