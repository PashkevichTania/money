import { useEffect } from 'react'
import { AppRouter } from '@/routes'
import { AppProviders } from '@/providers/AppProviders'
import { useAuthStore } from '@/stores/authStore'
import { isFirebaseConfigured } from '@/config/firebase'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'
import { useSnackbar } from 'notistack'
import { useUIStore } from '@/stores/uiStore'

function AuthInit() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => init(), [init])
  return null
}

function UIStoreSnackbridge() {
  const toast = useUIStore((s) => s.toast)
  const clearToast = useUIStore((s) => s.clearToast)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    if (!toast) return
    enqueueSnackbar(toast.message, {
      variant: toast.variant === 'warning' ? 'warning' : toast.variant,
    })
    clearToast()
  }, [toast, clearToast, enqueueSnackbar])

  return null
}

function FirebaseNotice() {
  if (isFirebaseConfigured) return null
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="warning">
        Firebase is not configured yet. Add the <code>VITE_FIREBASE_*</code> variables to a new{' '}
        <code>.env.local</code> file (see{' '}
        <Link href="/settings" color="inherit" sx={{ fontWeight: 700 }}>
          Settings
        </Link>{' '}
        for the template). Auth and data features will be stubbed until configured.
      </Alert>
    </Box>
  )
}

export default function App() {
  return (
    <AppProviders>
      <AuthInit />
      <UIStoreSnackbridge />
      <FirebaseNotice />
      <AppRouter />
    </AppProviders>
  )
}
