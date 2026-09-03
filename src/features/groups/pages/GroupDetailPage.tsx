import { Link as RouterLink } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import Fab from '@mui/material/Fab'
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
import ExpenseList from '@/features/expenses/components/ExpenseList'
import AddExpenseDialog from '@/features/expenses/components/AddExpenseDialog'
import type { Expense } from '@/types/expense'

const TAB_LABELS = ['Expenses', 'Balances', 'Members', 'Activity', 'Settings'] as const

export default function GroupDetailPage() {
  const { group, members, loadingMembers, loading, notFound, error } = useSelectedGroup()
  const [tab, setTab] = useState(0)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const openAddExpense = () => {
    setEditingExpense(null)
    setExpenseDialogOpen(true)
  }
  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseDialogOpen(true)
  }
  const closeExpenseDialog = () => {
    setExpenseDialogOpen(false)
    setEditingExpense(null)
  }

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
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            {tab === 0 ? (
              <ExpenseList group={group} members={members} onEditExpense={openEditExpense} />
            ) : tab === 2 ? (
              <Card sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
                <MembersTab group={group} members={members} loadingMembers={loadingMembers} />
              </Card>
            ) : tab === 4 ? (
              <Card sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
                <GroupSettingsTab group={group} />
              </Card>
            ) : (
              <Card sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4, textAlign: 'center', py: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {TAB_LABELS[tab]}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  {tab === 1 && 'Balances and settle-up suggestions arrive in Phase 7.'}
                  {tab === 3 && 'Activity log arrives in Phase 7.'}
                </Typography>
              </Card>
            )}
          </Box>

          {tab === 0 && (
            <Fab
              color="primary"
              variant="extended"
              sx={{
                position: 'fixed',
                right: { xs: 16, sm: 32 },
                bottom: { xs: 16, sm: 32 },
                boxShadow: (t) => t.shadows[8],
                borderRadius: 3,
                px: 2.5,
                fontWeight: 700,
                zIndex: (t) => t.zIndex.modal - 1,
              }}
              onClick={openAddExpense}
            >
              <AddIcon sx={{ mr: 1 }} />
              Add expense
            </Fab>
          )}

          <AddExpenseDialog
            open={expenseDialogOpen}
            onClose={closeExpenseDialog}
            group={group}
            members={members}
            editingExpense={editingExpense}
          />
        </>
      )}
    </Container>
  )
}
