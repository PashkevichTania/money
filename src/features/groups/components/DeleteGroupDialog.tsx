import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Message } from '@/components/ui/field'
import { useState } from 'react'
import type { Group } from '@/types/group'
import { useGroupStore } from '@/stores/groupStore'
import { useNotify } from '@/hooks/useNotify'
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
  const { enqueueSnackbar } = useNotify()
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
    <Modal
      open={open}
      onClose={onClose}
      title="Delete group?"
      description="This action permanently removes this group and its expense history."
      busy={busy}
    >
      <Message error>
        This cannot be undone. Type {group.name} below to confirm.
      </Message>
      {localError && <Message error>{localError}</Message>}
      <Field
        label="Group name to confirm"
        value={confirmText}
        disabled={busy}
        onChange={(e) => setConfirmText(e.target.value)}
      />
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={!canDelete || busy}
          onClick={() => void onConfirm()}
        >
          {busy ? 'Deleting...' : 'Delete permanently'}
        </Button>
      </div>
    </Modal>
  )
}
