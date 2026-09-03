import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ReceiptIcon from '@mui/icons-material/Receipt'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import type { MouseEvent } from 'react'
import type { Expense } from '@/types/expense'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import { useExpenseStore } from '@/stores/expenseStore'
import { useGroupStore } from '@/stores/groupStore'
import { useCurrentUser } from '@/hooks/useGroups'
import { useSnackbar } from 'notistack'
import { formatMoney } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { computeNetBalances } from '@/utils/split'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function ExpenseList({
  group,
  members,
  onEditExpense,
}: {
  group: Group
  members: UserProfile[]
  onEditExpense: (expense: Expense) => void
}) {
  const me = useCurrentUser()
  const { enqueueSnackbar } = useSnackbar()
  // TODO: fix Maximum update depth exceeded.
  const expenses = useExpenseStore((s) => s.expensesByGroup[group.id] ?? [])
  const loading = useExpenseStore((s) => s.loadingByGroup[group.id] ?? false)
  const error = useExpenseStore((s) => s.errorsByGroup[group.id])
  const loadExpenses = useExpenseStore((s) => s.loadExpenses)
  const removeExpense = useExpenseStore((s) => s.removeExpense)
  const membersMap = useGroupStore((s) => s.membersMap)

  const [menuAnchor, setMenuAnchor] = useState<{
    event: MouseEvent<HTMLElement>
    expenseId: string
  } | null>(null)
  const [toDelete, setToDelete] = useState<Expense | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  useEffect(() => {
    void loadExpenses(group.id)
  }, [group.id, loadExpenses])

  const getName = (userId: string) =>
    membersMap[userId]?.displayName ||
    members.find((m) => m.id === userId)?.displayName ||
    userId.slice(0, 6)

  const getInitials = (userId: string) => {
    const name = getName(userId)
    return initials(name || userId)
  }

  const onDeleteClick = (expense: Expense) => {
    setMenuAnchor(null)
    setToDelete(expense)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeletingBusy(true)
    try {
      await removeExpense(group.id, toDelete.id)
      enqueueSnackbar('Expense deleted', { variant: 'success' })
      setToDelete(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete expense'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const renderNetSummary = (expense: Expense) => {
    if (!me) return null
    const net = computeNetBalances(expense)
    const mine = net[me.id] ?? 0
    if (Math.abs(mine) < 0.005) {
      return (
        <Chip
          label="Settled"
          size="small"
          variant="outlined"
          sx={{ bgcolor: 'action.hover', borderColor: 'divider' }}
        />
      )
    }
    if (mine > 0) {
      return (
        <Chip
          label={`You get back ${formatMoney(mine, expense.groupCurrency)}`}
          size="small"
          color="success"
          variant="filled"
        />
      )
    }
    return (
      <Chip
        label={`You owe ${formatMoney(Math.abs(mine), expense.groupCurrency)}`}
        size="small"
        color="error"
        variant="filled"
      />
    )
  }

  const renderPayerSummary = (expense: Expense) => {
    const parts = expense.paidBy
      .slice(0, 2)
      .map((p) => `${getInitials(p.userId)} paid ${formatMoney(p.amount, expense.originalCurrency)}`)
    if (expense.paidBy.length > 2) parts.push(`+${expense.paidBy.length - 2}`)
    return parts.join(' · ')
  }

  const renderSplitSummary = (expense: Expense) => {
    const participants = expense.participants.length
    if (expense.splitType === 'equal') {
      return `${participants} way${participants > 1 ? 's' : ''} · Equal`
    }
    return `${participants} participant${participants > 1 ? 's' : ''} · ${expense.splitType}`
  }

  const emptyState = (
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
        <ReceiptIcon sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        No expenses yet
      </Typography>
      <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
        Add your first expense to start splitting with the group.
      </Typography>
    </Card>
  )

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => useExpenseStore.getState().setError(group.id, undefined)}>
          {error}
        </Alert>
      )}

      {loading && expenses.length === 0 ? (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 3 }} />
          ))}
        </Stack>
      ) : expenses.length === 0 ? (
        emptyState
      ) : (
        <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <List disablePadding>
            {expenses.map((expense, idx) => (
              <Box key={expense.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem
                  sx={{
                    px: { xs: 2, sm: 3 },
                    py: 2,
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          {formatMoney(expense.convertedAmount, expense.groupCurrency)}
                        </Typography>
                        {expense.originalCurrency !== expense.groupCurrency && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatMoney(expense.originalAmount, expense.originalCurrency)}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => setMenuAnchor({ event: e, expenseId: expense.id })}
                        aria-label="Expense options"
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <Menu
                        anchorEl={menuAnchor?.event.currentTarget}
                        open={menuAnchor?.expenseId === expense.id}
                        onClose={() => setMenuAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      >
                        <MenuItem
                          onClick={() => {
                            const target = expenses.find((e) => e.id === menuAnchor?.expenseId)
                            if (target) onEditExpense(target)
                            setMenuAnchor(null)
                          }}
                        >
                          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
                          Edit
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            const target = expenses.find((e) => e.id === menuAnchor?.expenseId)
                            if (target) onDeleteClick(target)
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
                          Delete
                        </MenuItem>
                      </Menu>
                    </Box>
                  }
                >
                  <Stack direction="row" spacing={2} sx={{ flex: 1, pr: 10 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: (t) => t.palette.primary.main + '14',
                        color: (t) => t.palette.primary.main,
                        flexShrink: 0,
                      }}
                    >
                      <ReceiptIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {expense.title}
                        </Typography>
                        {expense.isSettlement && (
                          <Chip label="Settlement" size="small" color="info" variant="filled" />
                        )}
                      </Stack>
                      {expense.description && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                          {expense.description}
                        </Typography>
                      )}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(expense.expenseDate)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {renderPayerSummary(expense)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {renderSplitSummary(expense)}
                        </Typography>
                      </Stack>
                      <Box sx={{ mt: 1 }}>{renderNetSummary(expense)}</Box>
                    </Box>
                  </Stack>
                </ListItem>
              </Box>
            ))}
          </List>
        </Card>
      )}

      <Dialog
        open={Boolean(toDelete)}
        onClose={deletingBusy ? undefined : () => setToDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle>Delete expense?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <strong>{toDelete?.title}</strong> will be permanently removed. Balances will revert.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setToDelete(null)} disabled={deletingBusy}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
            disabled={deletingBusy}
            startIcon={<DeleteIcon />}
          >
            {deletingBusy ? 'Deleting…' : 'Delete expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
