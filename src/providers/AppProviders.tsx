import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { ThemeProvider, type Theme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SnackbarProvider } from 'notistack'
import { getTheme } from '@/theme'
import { useUIStore } from '@/stores/uiStore'

interface AppContextValue {
  theme: Theme
  themeMode: 'light' | 'dark'
  toggleTheme: () => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProviders({ children }: { children: ReactNode }) {
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const theme = useMemo(() => getTheme(themeMode), [themeMode])

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')
  }

  const value: AppContextValue = { theme, themeMode, toggleTheme }

  return (
    <AppContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={4}
          autoHideDuration={3500}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProviders')
  return ctx
}

export function useThemeModeListener() {
  const themeMode = useUIStore((s) => s.themeMode)
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])
}
