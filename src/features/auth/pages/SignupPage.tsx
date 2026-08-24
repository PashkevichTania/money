import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbar } from 'notistack'

const schema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(40),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type FormValues = z.infer<typeof schema>

export default function SignupPage() {
  const navigate = useNavigate()
  const signup = useAuthStore((s) => s.signup)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const { enqueueSnackbar } = useSnackbar()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (profile) {
      enqueueSnackbar('Account created', { variant: 'success' })
      navigate('/groups', { replace: true })
    }
  }, [profile, navigate, enqueueSnackbar])

  const onSubmit = async (values: FormValues) => {
    clearError()
    try {
      await signup(values.email, values.password, values.displayName)
    } catch {
      // error already set in store
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: (t) =>
          t.palette.mode === 'dark'
            ? 'radial-gradient(80% 80% at 20% 0%, #1b274d 0%, transparent 60%), radial-gradient(60% 60% at 100% 100%, #1f4d3a 0%, transparent 60%), #0b1020'
            : 'radial-gradient(80% 80% at 20% 0%, #dffbf0 0%, transparent 60%), radial-gradient(60% 60% at 100% 100%, #ffe6dd 0%, transparent 60%), #f6f7fb',
      }}
    >
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 2,
              borderRadius: 3,
              bgcolor: (t) => t.palette.primary.main,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 28,
            }}
          >
            $
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Create your SplitSmart account
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
            Free forever. No credit card. Just share expenses easily.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Full name"
                autoComplete="name"
                fullWidth
                {...register('displayName')}
                error={!!errors.displayName}
                helperText={errors.displayName?.message}
              />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                fullWidth
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                fullWidth
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                fullWidth
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting || status === 'loading'}
                sx={{ py: 1.4, fontWeight: 700 }}
              >
                {isSubmitting || status === 'loading' ? 'Creating account…' : 'Create account'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
