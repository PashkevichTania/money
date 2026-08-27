import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useEffect, useState } from 'react'
import { useGroupStore } from '@/stores/groupStore'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import type { Group } from '@/types/group'

export default function DeleteGroupDialog({
  open,
  onClose,
  group,
}: {
  open: boolean
  onClose: () => void
  group: Group | null
}) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const removeGroup = useGroupStore((s) => s.removeGroup)
  const errors = useGroupStore((s) => s.errors)
  const [busy, setBusy] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const scope = group ? `group:${group.id}` : ''

  useEffect(() => {
    if (open) setConfirmName('')
  }, [open, group?.id])

  if (!group) return null

  const nameMatches = confirmName.trim() === group.name

  const onConfirm = async () => {
    if (!nameMatches) return
    setBusy(true)
    try {
      await removeGroup(group.id)
      enqueueSnackbar(`Group "${group.name}" deleted`, { variant: 'success' })
      onClose()
      navigate('/groups', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete group'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Delete &ldquo;{group.name}&rdquo;?
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="warning">
            This will permanently delete the group, all expenses, settlements, and activity. This
            action cannot be undone.
          </Alert>
          <TextField
            label="Type the group name to confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
            fullWidth
          />
          {errors[scope] && <Alert severity="error">{errors[scope]}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="text" disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={busy || !nameMatches}
        >
          {busy ? 'Deleting…' : 'Yes, delete group'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
