import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGroupStore } from '@/stores/groupStore'

export function useSelectedGroup() {
  const { id } = useParams<{ id: string }>()
  const groups = useGroupStore((s) => s.groups)
  const groupsLoading = useGroupStore((s) => s.loading)
  const setSelectedGroupId = useGroupStore((s) => s.setSelectedGroupId)
  const selectedGroupId = useGroupStore((s) => s.selectedGroupId)
  const refreshGroup = useGroupStore((s) => s.refreshGroup)
  const loadMembersFor = useGroupStore((s) => s.loadMembersFor)
  const loadingMembers = useGroupStore((s) => s.loadingMembers)
  const membersMap = useGroupStore((s) => s.membersMap)
  const errors = useGroupStore((s) => s.errors)
  const [refreshing, setRefreshing] = useState(false)

  const groupId = id ?? selectedGroupId ?? null

  const group = useMemo(
    () => (groupId ? groups.find((g) => g.id === groupId) ?? null : null),
    [groupId, groups],
  )

  useEffect(() => {
    if (groupId && groupId !== selectedGroupId) {
      setSelectedGroupId(groupId)
    }
  }, [groupId, selectedGroupId, setSelectedGroupId])

  useEffect(() => {
    if (!groupId) return
    setRefreshing(true)
    void refreshGroup(groupId).finally(() => setRefreshing(false))
  }, [groupId, refreshGroup])

  useEffect(() => {
    if (!group) return
    const missing = group.memberIds.filter((memberId) => !membersMap[memberId])
    if (missing.length > 0) {
      void loadMembersFor(missing)
    }
  }, [group, membersMap, loadMembersFor])

  const members = useMemo(() => {
    if (!group) return []
    return group.memberIds
      .map((uid) => membersMap[uid])
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
  }, [group, membersMap])

  const error = groupId ? errors[`group:${groupId}`] : undefined
  const loading = Boolean(groupId) && (refreshing || groupsLoading) && !group

  return {
    groupId,
    group,
    members,
    membersMap,
    loadingMembers,
    loading,
    notFound: Boolean(groupId) && !loading && !group,
    error,
    setSelectedGroupId,
  }
}
