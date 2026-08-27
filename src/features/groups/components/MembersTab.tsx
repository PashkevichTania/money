import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import { useSnackbar } from 'notistack'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import { useCurrentUser } from '@/hooks/useGroups'
import { useGroupStore } from '@/stores/groupStore'
import type { SearchUserResult } from '@/api/users'

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
  const { enqueueSnackbar } = useSnackbar()
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
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Members
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Add people who already have an account. They must sign up first.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          fullWidth
          freeSolo
          loading={searchingUsers}
          options={options}
          filterOptions={(x) => x}
          getOptionLabel={(opt) =>
            typeof opt === 'string' ? opt : `${opt.user.displayName} (${opt.user.email})`
          }
          inputValue={query}
          onInputChange={(_, value) => setQuery(value)}
          onChange={(_, value) => {
            if (value && typeof value !== 'string') {
              void onAddEmail(value.user.email)
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Add member by email"
              placeholder="friend@example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onAddEmail(query)
                }
              }}
            />
          )}
          renderOption={(props, option: SearchUserResult) => {
            const { key: _optionKey, ...rest } = props as typeof props & { key: string }
            return (
              <li key={option.user.id} {...rest}>
                {option.user.displayName} · {option.user.email}
              </li>
            )
          }}
        />
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => void onAddEmail(query)}
          disabled={busy || !query.trim()}
          sx={{ flexShrink: 0, minHeight: 56 }}
        >
          Add
        </Button>
      </Stack>

      {addError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {addError}
        </Alert>
      )}

      {loadingMembers && members.length === 0 ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={64} />
        </Stack>
      ) : (
        <List disablePadding>
          {group.memberIds.map((uid) => {
            const member = members.find((m) => m.id === uid)
            const name = member?.displayName || 'Unknown member'
            const isMe = me?.id === uid
            return (
              <ListItem
                key={uid}
                sx={{ px: 0, py: 1.25 }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={`Remove ${name}`}
                    disabled={!canRemove || busy}
                    onClick={() => member && setToRemove(member)}
                  >
                    <PersonRemoveIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar src={member?.photoURL}>
                    {initials(name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600 }}>
                      {name}
                      {isMe ? ' (you)' : ''}
                    </Typography>
                  }
                  secondary={member?.email || uid}
                />
              </ListItem>
            )
          })}
        </List>
      )}

      {!canRemove && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          A group must have at least one member. Delete the group instead of removing the last person.
        </Typography>
      )}

      <Dialog
        open={Boolean(toRemove)}
        onClose={busy ? undefined : () => setToRemove(null)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle>Remove {toRemove?.displayName}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            They will lose access to this group. Expense balance checks will land in a later phase.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToRemove(null)} disabled={busy}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void onConfirmRemove()} disabled={busy}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
