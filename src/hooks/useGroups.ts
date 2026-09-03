import { useGroupStore } from '@/stores/groupStore'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

export function useGroups() {
  const profile = useAuthStore((s) => s.profile)
  const initGroupsForUser = useGroupStore((s) => s.initGroupsForUser)
  const groups = useGroupStore((s) => s.groups)
  const loading = useGroupStore((s) => s.loading)

  useEffect(() => {
    if (profile?.id && groups.length === 0) {
      void initGroupsForUser(profile.id)
    }
  }, [profile?.id, groups.length, initGroupsForUser])

  return { groups, loading }
}

export function useCurrentUser() {
  return useAuthStore((s) => s.profile)
}
