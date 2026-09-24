import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFriends } from '@/hooks/useFriends';
import { useNotify } from '@/hooks/useNotify';
import { useGroupStore } from '@/stores/groupStore';
import type { Group } from '@/types/group';
import type { UserProfile } from '@/types/user';

export function useMemberManagement(group: Group) {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useNotify();
  const {
    friends,
    loading: searchingUsers,
    error: friendsError,
  } = useFriends();
  const addMemberByEmail = useGroupStore((state) => state.addMemberByEmail);
  const removeMember = useGroupStore((state) => state.removeMember);
  const errors = useGroupStore((state) => state.errors);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(
    null
  );

  const { id: groupId, memberIds } = group;

  const options = friends
    .filter(
      (user) =>
        !memberIds.includes(user.id) &&
        (user.email + ' ' + user.displayName)
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    )
    .map((user) => ({ user }));

  const addMember = async (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setBusy(true);
    try {
      await addMemberByEmail(groupId, trimmedEmail);
      enqueueSnackbar('Member added', { variant: 'success' });
      setQuery('');
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not add member',
        { variant: 'error' }
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!memberToRemove) return;
    setBusy(true);
    try {
      await removeMember(groupId, memberToRemove.id);
      enqueueSnackbar(
        t('{{name}} removed', { name: memberToRemove.displayName }),
        {
          variant: 'success',
        }
      );
      setMemberToRemove(null);
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not remove member',
        { variant: 'error' }
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    addError: friendsError || errors[`addMember:${groupId}`],
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
  };
}
