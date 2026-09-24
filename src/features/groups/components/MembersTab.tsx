import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Field, Section, Message } from '@/components/ui/field'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import { useCurrentUser } from '@/hooks/useGroups'
import { useMemberManagement } from '@/features/groups/hooks/useMemberManagement'
import { getInitials } from '@/utils/user'

export default function MembersTab({
  group,
  members,
  loadingMembers,
}: {
  group: Group
  members: UserProfile[]
  loadingMembers: boolean
}) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const {
    addError,
    addMember,
    busy,
    canRemove,
    confirmRemove,
    memberToRemove,
    options,
    query,
    searchingUsers,
    setMemberToRemove,
    setQuery,
  } = useMemberManagement(group)

  return (
    <Section
      title={t('Members')}
      description={t('Choose friends to add to this group.')}
    >
      <Field
        label={t('Find a friend')}
        placeholder={t('Name or email')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        disabled={busy}
      />
      <Link className="text-sm text-primary underline" to={'/friends?email=' + encodeURIComponent(query.includes('@') ? query.trim() : '')}>{t('Invite someone to become friends')}</Link>
      {!searchingUsers && !options.length && <p className="text-sm text-muted-foreground">{t('No available friends')}</p>}
      {addError && <Message error>{addError}</Message>}
      {searchingUsers && (
        <p role="status" className="text-xs text-muted-foreground">
          {t('Searching...')}
        </p>
      )}
      {options.length > 0 && (
        <ul
          aria-label={t('Friends')}
          className="divide-y rounded-md border"
        >
          {options.map(({ user }) => (
            <li key={user.id}>
              <button
                type="button"
                disabled={busy}
                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted"
                onClick={() => void addMember(user.email)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {user.displayName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </span>
                <UserPlus className="size-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="divide-y">
        {loadingMembers ? (
          <Skeleton className="h-32" />
        ) : (
          group.memberIds.map((id) => {
            const member = members.find((m) => m.id === id)
            return (
              <div key={id} className="flex items-center gap-3 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  {getInitials(member?.displayName || id)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member?.displayName || t('Loading member')}
                    {id === me?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t('(you)')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member?.email || id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={
                    !canRemove ||
                    busy ||
                    !member ||
                    member.id === group.createdBy
                  }
                  aria-label={t('Remove {{name}}', {
                    name: member?.displayName || t('Member'),
                  })}
                  onClick={() => member && setMemberToRemove(member)}
                >
                  <UserMinus className="text-destructive" />
                </Button>
              </div>
            )
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('Members are retained once the group has expense history.')}
      </p>
      <Modal
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title={t('Remove member?')}
        description={t('Remove {{name}} from {{group}}?', {
          name: memberToRemove?.displayName || t('Member'),
          group: group.name,
        })}
        busy={busy}
      >
        <p className="text-sm text-muted-foreground">
          {t(
            'They will lose access to the group. Removal is blocked if the group has expense history.',
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setMemberToRemove(null)}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void confirmRemove()}
          >
            {busy ? t('Removing...') : t('Remove member')}
          </Button>
        </div>
      </Modal>
    </Section>
  )
}
