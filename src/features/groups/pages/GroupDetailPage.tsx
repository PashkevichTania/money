import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useState, type SyntheticEvent } from 'react'
import { useSelectedGroup } from '@/hooks/useSelectedGroup'
import { getCurrencySymbol } from '@/config/currencies'
import MembersTab from '@/features/groups/components/MembersTab'
import GroupSettingsTab from '@/features/groups/components/GroupSettingsTab'

const TAB_LABELS = ['Expenses', 'Balances', 'Members', 'Activity', 'Settings'] as const

export default function GroupDetailPage() {
  const { group, members, loadingMembers, loading, notFound, error } = useSelectedGroup()
  const [tab, setTab] = useState(0)

  const handleChangeTab = (_: SyntheticEvent, newValue: number) => setTab(newValue)

  return (
    <Container maxWidth="lg" disableGutters>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button component={RouterLink} to="/groups" variant="text" startIcon={<ArrowBackIcon />}>
          All groups
        </Button>
      </Stack>

      {loading ? (
        <Box>
          <Skeleton variant="text" width={280} height={48} />
          <Skeleton variant="text" width={180} />
          <Skeleton variant="rounded" height={64} sx={{ mt: 3, mb: 3 }} />
          <Skeleton variant="rounded" height={240} />
        </Box>
      ) : notFound || !group ? (
        <Card sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Group not found
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
            {error ||
              'This group does not exist, or you are not a member. Ask someone to add you by email.'}
          </Typography>
          <Button component={RouterLink} to="/groups" variant="contained">
            Back to groups
          </Button>
        </Card>
      ) : (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between', mb: 3 }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                {group.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {group.baseCurrency} {getCurrencySymbol(group.baseCurrency)} ·{' '}
                {group.memberIds.length} member
                {group.memberIds.length === 1 ? '' : 's'}
              </Typography>
            </Box>
          </Stack>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <Tabs
              value={tab}
              onChange={handleChangeTab}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 1, pt: 1 }}
            >
              {TAB_LABELS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Card>
          <Card sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
            {tab === 2 ? (
              <MembersTab group={group} members={members} loadingMembers={loadingMembers} />
            ) : tab === 4 ? (
              <GroupSettingsTab group={group} />
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {TAB_LABELS[tab]}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  {tab === 0 && 'Expenses arrive in Phase 4 — equal split and a single payer.'}
                  {tab === 1 && 'Balances and settle-up suggestions arrive in Phase 7.'}
                  {tab === 3 && 'Activity log arrives in Phase 7.'}
                </Typography>
              </Box>
            )}
          </Card>
        </>
      )}
    </Container>
  )
}
