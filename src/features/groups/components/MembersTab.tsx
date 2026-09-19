import { UserPlus, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Field, Section, Message } from '@/components/ui/field'
import { useEffect, useMemo, useState } from 'react'
import { useNotify } from '@/hooks/useNotify'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import { useCurrentUser } from '@/hooks/useGroups'
import { useGroupStore } from '@/stores/groupStore'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function MembersTab({
  group,
  members,
  loadingMembers,
}: {
  group: Group
  members: UserProfile[]
  loadingMembers: boolean
}) {
  const me = useCurrentUser()
  const { enqueueSnackbar } = useNotify()
  const searchUsers = useGroupStore((s) => s.searchUsers)
  const clearSearch = useGroupStore((s) => s.clearSearch)
  const searchResults = useGroupStore((s) => s.searchResults)
  const searchingUsers = useGroupStore((s) => s.searchingUsers)
  const addMemberByEmail = useGroupStore((s) => s.addMemberByEmail)
  const removeMember = useGroupStore((s) => s.removeMember)
  const errors = useGroupStore((s) => s.errors)

  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [toRemove, setToRemove] = useState<UserProfile | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void searchUsers(query, group.memberIds)
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query, group.memberIds, searchUsers])

  useEffect(() => () => clearSearch(), [clearSearch])

  const addError = errors[`addMember:${group.id}`]

  const canRemove = group.memberIds.length > 1

  const options = useMemo(
    () => searchResults.filter((r) => !r.alreadyMember),
    [searchResults],
  )

  const onAddEmail = async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await addMemberByEmail(group.id, trimmed)
      enqueueSnackbar('Member added', { variant: 'success' })
      setQuery('')
      clearSearch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add member'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const onConfirmRemove = async () => {
    if (!toRemove) return
    setBusy(true)
    try {
      await removeMember(group.id, toRemove.id)
      enqueueSnackbar(`${toRemove.displayName} removed`, { variant: 'success' })
      setToRemove(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove member'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Members"
      description="Add people who already have a SplitSmart account."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void onAddEmail(query)
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Field
            label="Add by email"
            type="email"
            placeholder="friend@example.com"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={busy}
          />
        </div>
        <Button type="submit" disabled={busy || !query.trim()}>
          <UserPlus />
          {busy ? 'Working...' : 'Add member'}
        </Button>
      </form>
      {addError && <Message error>{addError}</Message>}
      {searchingUsers && (
        <p role="status" className="text-xs text-muted-foreground">
          Searching...
        </p>
      )}
      {query.trim() && options.length > 0 && (
        <ul
          aria-label="Matching accounts"
          className="divide-y rounded-md border"
        >
          {options.map(({ user }) => (
            <li key={user.id}>
              <button
                type="button"
                disabled={busy}
                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted"
                onClick={() => void onAddEmail(user.email)}
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
                  {initials(member?.displayName || id)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member?.displayName || 'Loading member'}
                    {id === me?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
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
                  disabled={!canRemove || busy || !member}
                  aria-label={`Remove ${member?.displayName || 'member'}`}
                  onClick={() => member && setToRemove(member)}
                >
                  <UserMinus className="text-destructive" />
                </Button>
              </div>
            )
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Members are retained once the group has expense history.
      </p>
      <Modal
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        title="Remove member?"
        description={`Remove ${toRemove?.displayName || 'this member'} from ${group.name}?`}
        busy={busy}
      >
        <p className="text-sm text-muted-foreground">
          They will lose access to the group. Removal is blocked if the group
          has expense history.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setToRemove(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void onConfirmRemove()}
          >
            {busy ? 'Removing...' : 'Remove member'}
          </Button>
        </div>
      </Modal>
    </Section>
  )
}
