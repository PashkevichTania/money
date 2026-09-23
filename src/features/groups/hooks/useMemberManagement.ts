import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import { useGroupStore } from '@/stores/groupStore'
import { useNotify } from '@/hooks/useNotify'
import { USER_SEARCH_DEBOUNCE_MS } from '@/features/groups/constants'

export function useMemberManagement(group: Group) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useNotify()
  const searchUsers = useGroupStore((state) => state.searchUsers)
  const clearSearch = useGroupStore((state) => state.clearSearch)
  const searchResults = useGroupStore((state) => state.searchResults)
  const searchingUsers = useGroupStore((state) => state.searchingUsers)
  const addMemberByEmail = useGroupStore((state) => state.addMemberByEmail)
  const removeMember = useGroupStore((state) => state.removeMember)
  const errors = useGroupStore((state) => state.errors)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null)

  const { id: groupId, memberIds } = group

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void searchUsers(query, memberIds)
    }, USER_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [memberIds, query, searchUsers])

  useEffect(() => () => clearSearch(), [clearSearch])

  const options = useMemo(
    () => searchResults.filter(({ alreadyMember }) => !alreadyMember),
    [searchResults],
  )

  const addMember = async (email: string) => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    setBusy(true)
    try {
      await addMemberByEmail(groupId, trimmedEmail)
      enqueueSnackbar('Member added', { variant: 'success' })
      setQuery('')
      clearSearch()
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not add member',
        { variant: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }

  const confirmRemove = async () => {
    if (!memberToRemove) return
    setBusy(true)
    try {
      await removeMember(groupId, memberToRemove.id)
      enqueueSnackbar(t('{{name}} removed', { name: memberToRemove.displayName }), {
        variant: 'success',
      })
      setMemberToRemove(null)
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not remove member',
        { variant: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }

  return {
    addError: errors[`addMember:${groupId}`],
    addMember,
    busy,
    canRemove: memberIds.length > 1,
    confirmRemove,
    memberToRemove,
    options,
    query,
    searchingUsers,
    setMemberToRemove,
    setQuery,
  }
}
