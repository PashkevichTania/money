import { useEffect, useState } from 'react';

import { type Friendship, watchFriendships } from '@/api/friends';
import { getUsersByIds } from '@/api/users';
import { isFirebaseConfigured } from '@/config/firebase';
import type { UserProfile } from '@/types/user';

import { useCurrentUser } from './useGroups';

export function useFriends() {
  const me = useCurrentUser();
  const userId = me?.id;
  const [state, setState] = useState<{
    userId?: string;
    items: Friendship[];
    profiles: UserProfile[];
    loading: boolean;
    error: string;
  }>({ items: [], profiles: [], loading: true, error: '' });
  useEffect(() => {
    if (!userId || !isFirebaseConfigured) return;
    let active = true;
    let version = 0;
    const unsubscribe = watchFriendships(
      userId,
      (items) => {
        const current = ++version;
        setState((previous) => ({
          userId,
          items,
          profiles: previous.userId === userId ? previous.profiles : [],
          loading: true,
          error: '',
        }));
        void getUsersByIds([
          ...new Set(
            items
              .flatMap((item) => item.memberIds)
              .filter((id) => id !== userId)
          ),
        ])
          .then((profiles) => {
            if (active && current === version)
              setState({ userId, items, profiles, loading: false, error: '' });
          })
          .catch((error) => {
            if (active && current === version)
              setState({
                userId,
                items,
                profiles: [],
                loading: false,
                error: error.message,
              });
          });
      },
      (error) => {
        version++;
        if (active)
          setState({
            userId,
            items: [],
            profiles: [],
            loading: false,
            error: error.message,
          });
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId]);
  const visible =
    state.userId === userId && userId
      ? state
      : {
          items: [],
          profiles: [],
          loading: !!userId && isFirebaseConfigured,
          error: '',
        };
  const friendIds = new Set(
    visible.items
      .filter((item) => item.status === 'accepted')
      .flatMap((item) => item.memberIds)
      .filter((id) => id !== userId)
  );
  return {
    ...visible,
    friends: visible.profiles.filter((profile) => friendIds.has(profile.id)),
  };
}
