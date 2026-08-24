import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  if (!initialized || status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading SplitSmart…
        </Typography>
      </Box>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
