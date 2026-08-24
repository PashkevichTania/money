import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import GroupsIcon from '@mui/icons-material/Groups'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { getCurrencySymbol } from '@/config/currencies'
import type { Group } from '@/types/group'

const EMPTY_GROUPS: Group[] = []

export default function GroupsPage() {
  const groups = EMPTY_GROUPS

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
            Your groups
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
            Create a group for trips, homes, weddings, and more.
          </Typography>
        </Box>
        <Button variant="contained" size="large" startIcon={<AddIcon />}>
          New group
        </Button>
      </Stack>

      {groups.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 5,
              bgcolor: (t) => t.palette.primary.main + '1a',
              color: (t) => t.palette.primary.main,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <GroupsIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            No groups yet
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            Create your first group to start splitting expenses with friends.
          </Typography>
          <Button variant="contained" size="large" startIcon={<AddIcon />}>
            Create first group
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
          }}
        >
          {groups.map((group) => (
            <Card key={group.id} sx={{ borderRadius: 3, height: '100%' }}>
              <CardActionArea
                component={RouterLink}
                to={`/groups/${group.id}`}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {group.name}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                        <AttachMoneyIcon fontSize="small" sx={{ color: 'action.active' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {group.baseCurrency} {getCurrencySymbol(group.baseCurrency)}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2.5 }}>
                    <GroupsIcon fontSize="small" sx={{ color: 'action.active' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {group.memberIds.length} member
                      {group.memberIds.length === 1 ? '' : 's'}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  )
}
