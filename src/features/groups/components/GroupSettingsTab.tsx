import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Section, Field } from '@/components/ui/field'
import { useState } from 'react'
import { useNotify } from '@/hooks/useNotify'
import type { Group } from '@/types/group'
import { useGroupStore } from '@/stores/groupStore'
import DeleteGroupDialog from './DeleteGroupDialog'
import { useCurrentUser } from '@/hooks/useGroups'

export default function GroupSettingsTab({ group }: { group: Group }) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const { enqueueSnackbar } = useNotify()
  const renameGroup = useGroupStore((s) => s.renameGroup)
  const [draft, setDraft] = useState({
    id: group.id,
    original: group.name,
    name: group.name,
  })
  const name =
    draft.id === group.id && draft.original === group.name
      ? draft.name
      : group.name
  const setName = (name: string) =>
    setDraft({ id: group.id, original: group.name, name })
  const [savingName, setSavingName] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const nameDirty = name.trim() !== group.name && name.trim().length >= 2

  const onSaveName = async () => {
    setSavingName(true)
    try {
      await renameGroup(group.id, name.trim())
      enqueueSnackbar('Group renamed', { variant: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not rename group'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title={t('Group settings')}>
        <Field
          label={t('Group name')}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          disabled={!nameDirty || savingName}
          onClick={() => void onSaveName()}
        >
          {savingName ? t('Saving...') : t('Save name')}
        </Button>
        <Field label={t('Base currency')} value={group.baseCurrency} readOnly />
        <p className="text-xs text-muted-foreground">
          {t('The base currency cannot be changed after creation.')}
        </p>
      </Section>
      {group.createdBy === me?.id && (
        <Section
          title={t('Delete this group')}
          description={t(
            'Permanently remove the group and its expense history.',
          )}
        >
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t('Delete group')}
          </Button>
        </Section>
      )}
      {deleteOpen && group.createdBy === me?.id && (
        <DeleteGroupDialog
          open
          onClose={() => setDeleteOpen(false)}
          group={group}
        />
      )}
    </div>
  )
}
