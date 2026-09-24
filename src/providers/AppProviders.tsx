import { type ReactNode, useEffect } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { AppContext } from '@/hooks/useApp';
import { useThemeModeListener } from '@/hooks/useThemeModeListener';
import i18n from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
export function AppProviders({ children }: { children: ReactNode }) {
  useThemeModeListener();
  const profileId = useAuthStore((s) => s.profile?.id);
  const language = useAuthStore((s) => s.profile?.language);
  useEffect(() => {
    if (profileId) void i18n.changeLanguage(language || 'en');
  }, [profileId, language]);
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
