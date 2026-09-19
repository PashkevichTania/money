import type { ReactNode } from 'react'
import { AppContext } from '@/hooks/useApp'
import { useUIStore } from '@/stores/uiStore'
import { useThemeModeListener } from '@/hooks/useThemeModeListener'
import { Toaster } from '@/components/ui/sonner'
export function AppProviders({ children }: { children: ReactNode }) {
  useThemeModeListener()
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
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
  )
}
