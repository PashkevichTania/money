import { createTheme, type Theme } from '@mui/material/styles'

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#11b981',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff7a59',
      contrastText: '#ffffff',
    },
    success: {
      main: '#11b981',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: '#f6f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    divider: '#e5e7eb',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Inter", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          ':hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(17, 24, 39, 0.06), 0 1px 2px -1px rgba(17, 24, 39, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#11b981',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff7a59',
      contrastText: '#ffffff',
    },
    success: {
      main: '#11b981',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: '#0b1020',
      paper: '#121a33',
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
    divider: '#1f2a44',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Inter", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          ':hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export function getTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : lightTheme
}
