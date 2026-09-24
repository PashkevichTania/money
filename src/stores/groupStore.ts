import { create } from 'zustand';

import {
  addMemberToGroup,
  createGroup,
  type CreateGroupInput,
  deleteGroup,
  getGroup,
  getGroupsForUser,
  removeMemberFromGroup,
  updateGroup,
} from '@/api/groups';
import {
  getUserByEmail,
  getUsersByIds,
  type SearchUserResult,
  searchUsersByEmail,
} from '@/api/users';
import { isFirebaseConfigured } from '@/config/firebase';
import type { Group } from '@/types/group';
import type { UserProfile } from '@/types/user';

import {
  getErrorMessage,
  removeById,
  replaceById,
  setRecordValue,
} from './utils';

export interface GroupStoreState {
  groupsUserId: string | null;
  groups: Group[];
  selectedGroupId: string | null;
  membersMap: Record<string, UserProfile>;
  loading: boolean;
  loadingMembers: boolean;
  searchResults: SearchUserResult[];
  searchingUsers: boolean;
  errors: Record<string, string | undefined>;
  initGroupsForUser: (userId: string) => Promise<Group[]>;
  refreshGroup: (groupId: string) => Promise<void>;
  createGroupAndSelect: (
    input: Omit<CreateGroupInput, 'createdBy'> & { createdBy: string }
  ) => Promise<Group>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  setSelectedGroupId: (id: string | null) => void;
  loadMembersFor: (memberIds: string[]) => Promise<UserProfile[]>;
  addMemberByEmail: (groupId: string, email: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  searchUsers: (term: string, excludeMemberIds?: string[]) => Promise<void>;
  clearSearch: () => void;
  setError: (key: string, message: string | undefined) => void;
  clearErrors: () => void;
}

type GroupSetState = (
  partial:
    | Partial<GroupStoreState>
    | ((state: GroupStoreState) => Partial<GroupStoreState>)
) => void;

function makeErrorBoundary<T>(
  set: GroupSetState,
  scope: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error) => {
    set((state) => ({
      errors: setRecordValue(state.errors, scope, getErrorMessage(error)),
    }));
    throw error;
  });
}

export const useGroupStore = create<GroupStoreState>((set, get) => ({
  groupsUserId: null,
  groups: [],
  selectedGroupId: null,
  membersMap: {},
  loading: false,
  loadingMembers: false,
  searchResults: [],
  searchingUsers: false,
  errors: {},

  setError: (key, message) =>
    set((state) => ({
      errors: setRecordValue(state.errors, key, message),
    })),
  clearErrors: () => set({ errors: {} }),

  setSelectedGroupId: (id) => set({ selectedGroupId: id }),

  initGroupsForUser: async (userId) => {
    set({
      groupsUserId: userId,
      groups: get().groupsUserId === userId ? get().groups : [],
      errors: {},
    });
    if (!isFirebaseConfigured) {
      set({ groups: [], loading: false });
      return [];
    }
    set({ loading: true });
    try {
      const groups = await getGroupsForUser(userId);
      if (get().groupsUserId === userId) set({ groups });
      return groups;
    } catch (error) {
      if (get().groupsUserId === userId)
        set((state) => ({
          errors: setRecordValue(
            state.errors,
            'groups',
            getErrorMessage(error, 'Unable to load groups.')
          ),
        }));
      throw error;
    } finally {
      if (get().groupsUserId === userId && get().loading)
        set({ loading: false });
    }
  },

  refreshGroup: async (groupId) => {
    if (!isFirebaseConfigured) return;
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      const updated = await getGroup(groupId);
      if (!updated) return;
      set((state) => {
        const exists = state.groups.some(({ id }) => id === groupId);
        return {
          groups: exists
            ? replaceById(state.groups, updated)
            : [updated, ...state.groups],
        };
      });
    });
  },

  createGroupAndSelect: async (input) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured');
    }
    set({ loading: true });
    try {
      return await makeErrorBoundary(set, 'createGroup', async () => {
        const group = await createGroup({
          name: input.name,
          baseCurrency: input.baseCurrency,
          memberIds: Array.from(new Set([input.createdBy, ...input.memberIds])),
          createdBy: input.createdBy,
        });
        set((state) => ({
          groups: [group, ...state.groups],
          selectedGroupId: group.id,
        }));
        return group;
      });
    } finally {
      if (get().loading) set({ loading: false });
    }
  },

  renameGroup: async (groupId, name) => {
    if (!isFirebaseConfigured) return;
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      const updated = await updateGroup(groupId, { name });
      set((state) => ({
        groups: replaceById(state.groups, updated),
      }));
    });
  },

  removeGroup: async (groupId) => {
    if (!isFirebaseConfigured) return;
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      await deleteGroup(groupId);
      set((state) => ({
        groups: removeById(state.groups, groupId),
        selectedGroupId:
          state.selectedGroupId === groupId ? null : state.selectedGroupId,
      }));
    });
  },

  loadMembersFor: async (memberIds) => {
    if (!isFirebaseConfigured || !memberIds.length) return [];
    set({ loadingMembers: true });
    try {
      return await makeErrorBoundary(set, 'members', async () => {
        const users = await getUsersByIds(memberIds);
        const memberEntries = users.map((user) => [user.id, user] as const);
        set((state) => ({
          membersMap: {
            ...state.membersMap,
            ...Object.fromEntries(memberEntries),
          },
        }));
        return users;
      });
    } finally {
      if (get().loadingMembers) set({ loadingMembers: false });
    }
  },

  addMemberByEmail: async (groupId, email) => {
    if (!isFirebaseConfigured) return;
    return makeErrorBoundary(set, `addMember:${groupId}`, async () => {
      const user = await getUserByEmail(email);
      if (!user) {
        throw new Error(
          `No user found with email "${email.trim()}". Ask them to sign up first, then add them.`
        );
      }
      const current =
        get().groups.find(({ id }) => id === groupId) ??
        (await getGroup(groupId));
      const memberIds = current?.memberIds ?? [];
      if (memberIds.includes(user.id)) {
        throw new Error('This user is already a member of the group');
      }
      const updated = await addMemberToGroup(groupId, user.id);
      set((state) => ({
        groups: replaceById(state.groups, updated),
        membersMap: setRecordValue(state.membersMap, user.id, user),
      }));
    });
  },

  removeMember: async (groupId, userId) => {
    if (!isFirebaseConfigured) return;
    return makeErrorBoundary(set, `removeMember:${groupId}`, async () => {
      const updated = await removeMemberFromGroup(groupId, userId);
      set((state) => ({
        groups: replaceById(state.groups, updated),
      }));
    });
  },

  searchUsers: async (term, excludeMemberIds = []) => {
    if (!isFirebaseConfigured || !term.trim()) {
      set({ searchResults: [], searchingUsers: false });
      return;
    }
    set({ searchingUsers: true });
    try {
      const results = await searchUsersByEmail(term, { excludeMemberIds });
      set({ searchResults: results, searchingUsers: false });
    } catch (error) {
      set({ searchResults: [], searchingUsers: false });
      get().setError('userSearch', getErrorMessage(error, 'Search failed'));
    }
  },

  clearSearch: () => set({ searchResults: [], searchingUsers: false }),
}));
