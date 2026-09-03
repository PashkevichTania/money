import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import type { Group } from '@/types/group'
import { useGroupStore } from '@/stores/groupStore'
import { useSnackbar } from 'notistack'
import { useNavigate } from 'react-router-dom'

export default function DeleteGroupDialog({
  open,
  onClose,
  group,
}: {
  open: boolean
  onClose: () => void
  group: Group
}) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const removeGroup = useGroupStore((s) => s.removeGroup)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const canDelete = confirmText.trim() === group.name

  const onConfirm = async () => {
    if (!canDelete) return
    setBusy(true)
    setLocalError(null)
    try {
      await removeGroup(group.id)
      enqueueSnackbar(`Group "${group.name}" deleted`, { variant: 'success' })
      onClose()
      setConfirmText('')
      navigate('/groups', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete group'
      setLocalError(msg)
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
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Delete group?
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="error">
            This permanently deletes the group <strong>&ldquo;{group.name}&rdquo;</strong> and all
            of its expenses, balances, and activity history. This cannot be undone.
          </Alert>
          {localError && (
            <Alert severity="error">{localError}</Alert>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Type <strong>{group.name}</strong> below to confirm:
          </Typography>
          <TextField
            label={`Type "${group.name}" to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            fullWidth
            autoFocus
            disabled={busy}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="text" disabled={busy}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => void onConfirm()}
          disabled={!canDelete || busy}
        >
          {busy ? 'Deleting…' : 'Delete group permanently'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
