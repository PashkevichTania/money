import { useMemo, type ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SnackbarProvider } from 'notistack'
import { getTheme } from '@/theme'
import { useUIStore } from '@/stores/uiStore'
import {AppContext, type AppContextValue} from "@/hooks/useApp.ts";

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



