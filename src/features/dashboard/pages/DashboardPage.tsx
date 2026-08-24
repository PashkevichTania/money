import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import GroupsIcon from '@mui/icons-material/Groups'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import LanguageIcon from '@mui/icons-material/Language'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney } from '@/utils/currency'

const HIGHLIGHTS = [
  {
    title: 'Create groups',
    description: 'Trips, roommates, events — create a group for every shared occasion.',
    Icon: GroupsIcon,
  },
  {
    title: 'Flexible splits',
    description: 'Equal, exact, percentages, or shares — split expenses exactly how you want.',
    Icon: AddCircleIcon,
  },
  {
    title: 'Automatic balances',
    description: 'Instantly see who owes whom with one-tap settle-up suggestions.',
    Icon: AccountBalanceWalletIcon,
  },
  {
    title: 'Multi-currency',
    description: 'Expenses in any currency automatically converted to your group base.',
    Icon: LanguageIcon,
  },
]

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const displayName = profile?.displayName?.split(' ')[0] || 'there'
  const currency = profile?.defaultCurrency || 'USD'

  return (
    <Container maxWidth="lg" disableGutters>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        sx={{
          justifyContent: { xs: 'flex-start', sm: 'space-between' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Hi {displayName} 👋
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
            Track shared expenses, balances, and settlements — all in one place.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} to="/groups" variant="outlined">
            View groups
          </Button>
          <Button
            component={RouterLink}
            to="/groups"
            variant="contained"
            startIcon={<AddCircleIcon />}
          >
            Create group
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          mb: 4,
        }}
      >
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            You owe
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, color: 'error.main', fontWeight: 800 }}>
            {formatMoney(0, currency)}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            across all groups
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            You are owed
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, color: 'success.main', fontWeight: 800 }}>
            {formatMoney(0, currency)}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            across all groups
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Groups
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
            0
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            create your first group
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Expenses
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
            0
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            add expenses inside a group
          </Typography>
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        {HIGHLIGHTS.map(({ title, description, Icon }) => (
          <Paper key={title} sx={{ p: 4, borderRadius: 3, height: '100%' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: (t) => t.palette.primary.main + '18',
                color: (t) => t.palette.primary.main,
                display: 'grid',
                placeItems: 'center',
                mb: 2,
              }}
            >
              <Icon />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {description}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Container>
  )
}
