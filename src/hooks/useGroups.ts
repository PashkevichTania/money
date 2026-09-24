import { useEffect } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import type { Group } from '@/types/group';
const EMPTY: Group[] = [];

export function useGroups() {
  const profile = useAuthStore((s) => s.profile);
  const initGroupsForUser = useGroupStore((s) => s.initGroupsForUser);
  const groups = useGroupStore((s) => s.groups);
  const loading = useGroupStore((s) => s.loading);
  const groupsUserId = useGroupStore((s) => s.groupsUserId);

  useEffect(() => {
    if (profile?.id && groupsUserId !== profile.id) {
      void initGroupsForUser(profile.id).catch(() => undefined);
    }
  }, [profile?.id, groupsUserId, initGroupsForUser]);

  return {
    groups: groupsUserId === profile?.id ? groups : EMPTY,
    loading: loading || (!!profile && groupsUserId !== profile.id),
  };
}

export function useCurrentUser() {
  return useAuthStore((s) => s.profile);
}
