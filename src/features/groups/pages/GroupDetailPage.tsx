import { Link as RouterLink, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useState, type SyntheticEvent } from 'react'

export default function GroupDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState(0)

  const handleChangeTab = (_: SyntheticEvent, newValue: number) => setTab(newValue)

  return (
    <Container maxWidth="lg" disableGutters>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button component={RouterLink} to="/groups" variant="text" startIcon={<ArrowBackIcon />}>
          All groups
        </Button>
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            [Group] #{id}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create expenses and track balances — group management coming in Phase 3.
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
          <Tab label="Expenses" />
          <Tab label="Balances" />
          <Tab label="Members" />
          <Tab label="Activity" />
          <Tab label="Settings" />
        </Tabs>
      </Card>
      <Card sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {['Expenses', 'Balances', 'Members', 'Activity', 'Settings'][tab]}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Coming in the next phase. Check out <b>IMPLEMENTATION_PLAN.md</b> for the roadmap.
        </Typography>
      </Card>
    </Container>
  )
}
