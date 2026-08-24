import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { CURRENCIES, DEFAULT_BASE_CURRENCY } from '@/config/currencies'
import { useAuthStore } from '@/stores/authStore'
import { useApp } from '@/providers/AppProviders'

export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile)
  const { themeMode, toggleTheme } = useApp()

  return (
    <Container maxWidth="md" disableGutters>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', mb: 4 }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Settings
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
            Manage your profile, preferences, and defaults.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={3}>
        <Card sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Profile
          </Typography>
          <Stack spacing={3}>
            <TextField
              label="Display name"
              defaultValue={profile?.displayName || ''}
              fullWidth
              disabled
            />
            <TextField label="Email" defaultValue={profile?.email || ''} fullWidth disabled />
          </Stack>
        </Card>

        <Card sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Preferences
          </Typography>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel id="default-currency-label">Default currency</InputLabel>
              <Select
                labelId="default-currency-label"
                label="Default currency"
                defaultValue={profile?.defaultCurrency || DEFAULT_BASE_CURRENCY}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.label} ({c.symbol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={themeMode === 'dark'} onChange={toggleTheme} />}
              label="Dark mode"
            />
          </Stack>
        </Card>

        <Card sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Firebase setup
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Copy the snippet below into <code>.env.local</code> and fill the values from your Firebase
            console.
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: (t) => (t.palette.mode === 'dark' ? t.palette.background.default : '#0b1020'),
              color: (t) => (t.palette.mode === 'dark' ? '#a7f3d0' : '#d1fae5'),
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              overflowX: 'auto',
            }}
          >
            {`VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_APP_BASE_CURRENCY=USD`}
          </Box>
        </Card>
      </Stack>
    </Container>
  )
}
