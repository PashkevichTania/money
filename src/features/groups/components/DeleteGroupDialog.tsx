import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Field, Message } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useNotify } from '@/hooks/useNotify';
import { useGroupStore } from '@/stores/groupStore';
import type { Group } from '@/types/group';

export default function DeleteGroupDialog({
  open,
  onClose,
  group,
}: {
  open: boolean;
  onClose: () => void;
  group: Group;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useNotify();
  const removeGroup = useGroupStore((s) => s.removeGroup);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canDelete = confirmText.trim() === group.name;

  const onConfirm = async () => {
    if (!canDelete) return;
    setBusy(true);
    setLocalError(null);
    try {
      await removeGroup(group.id);
      enqueueSnackbar(t('Group "{{name}}" deleted', { name: group.name }), {
        variant: 'success',
      });
      onClose();
      setConfirmText('');
      navigate('/groups', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete group';
      setLocalError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Delete group?')}
      description={t(
        'This action permanently removes this group and its expense history.'
      )}
      busy={busy}
    >
      <Message error>
        {t('This cannot be undone. Type {{name}} below to confirm.', {
          name: group.name,
        })}
      </Message>
      {localError && <Message error>{localError}</Message>}
      <Field
        label={t('Group name to confirm')}
        value={confirmText}
        disabled={busy}
        onChange={(e) => setConfirmText(e.target.value)}
      />
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          {t('Cancel')}
        </Button>
        <Button
          variant="destructive"
          disabled={!canDelete || busy}
          onClick={() => void onConfirm()}
        >
          {busy ? t('Deleting...') : t('Delete permanently')}
        </Button>
      </div>
    </Modal>
  );
}
