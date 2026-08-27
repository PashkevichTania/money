import { create } from 'zustand'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import {
  addMemberToGroup,
  createGroup,
  deleteGroup,
  getGroup,
  getGroupsForUser,
  removeMemberFromGroup,
  updateGroup,
  type CreateGroupInput,
} from '@/api/groups'
import { getUserByEmail, getUsersByIds, searchUsersByEmail, type SearchUserResult } from '@/api/users'
import { isFirebaseConfigured } from '@/config/firebase'

export interface GroupStoreState {
  groups: Group[]
  selectedGroupId: string | null
  membersMap: Record<string, UserProfile>
  loading: boolean
  loadingMembers: boolean
  searchResults: SearchUserResult[]
  searchingUsers: boolean
  errors: Record<string, string | undefined>
  initGroupsForUser: (userId: string) => Promise<Group[]>
  refreshGroup: (groupId: string) => Promise<void>
  createGroupAndSelect: (input: Omit<CreateGroupInput, 'createdBy'> & { createdBy: string }) => Promise<Group>
  renameGroup: (groupId: string, name: string) => Promise<void>
  changeBaseCurrency: (groupId: string, baseCurrency: string) => Promise<void>
  removeGroup: (groupId: string) => Promise<void>
  setSelectedGroupId: (id: string | null) => void
  loadMembersFor: (memberIds: string[]) => Promise<UserProfile[]>
  addMemberByEmail: (groupId: string, email: string) => Promise<void>
  removeMember: (groupId: string, userId: string) => Promise<void>
  searchUsers: (term: string, excludeMemberIds?: string[]) => Promise<void>
  clearSearch: () => void
  setError: (key: string, message: string | undefined) => void
  clearErrors: () => void
}

type GroupSetState = (
  partial:
    | Partial<GroupStoreState>
    | ((state: GroupStoreState) => Partial<GroupStoreState>),
) => void

function makeErrorBoundary<T>(
  set: GroupSetState,
  scope: string,
  fn: () => Promise<T>,
): Promise<T> {
  return fn().catch((err) => {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    set((s) => ({ errors: { ...s.errors, [scope]: msg } }))
    throw err
  })
}

export const useGroupStore = create<GroupStoreState>((set, get) => ({
  groups: [],
  selectedGroupId: null,
  membersMap: {},
  loading: false,
  loadingMembers: false,
  searchResults: [],
  searchingUsers: false,
  errors: {},

  setError: (key, message) =>
    set((s) => ({ errors: { ...s.errors, [key]: message } })),
  clearErrors: () => set({ errors: {} }),

  setSelectedGroupId: (id) => set({ selectedGroupId: id }),

  initGroupsForUser: async (userId) => {
    if (!isFirebaseConfigured) {
      set({ groups: [], loading: false })
      return []
    }
    set({ loading: true })
    try {
      return await makeErrorBoundary(set, 'groups', async () => {
        const groups = await getGroupsForUser(userId)
        set({ groups, loading: false })
        return groups
      })
    } finally {
      if (get().loading) set({ loading: false })
    }
  },

  refreshGroup: async (groupId) => {
    if (!isFirebaseConfigured) return
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      const updated = await getGroup(groupId)
      if (!updated) return
      set((s) => {
        const exists = s.groups.some((g) => g.id === groupId)
        return {
          groups: exists
            ? s.groups.map((g) => (g.id === groupId ? updated : g))
            : [updated, ...s.groups],
        }
      })
    })
  },

  createGroupAndSelect: async (input) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured')
    }
    set({ loading: true })
    try {
      return await makeErrorBoundary(set, 'createGroup', async () => {
        const group = await createGroup({
          name: input.name,
          baseCurrency: input.baseCurrency,
          memberIds: Array.from(new Set([input.createdBy, ...input.memberIds])),
          createdBy: input.createdBy,
        })
        set((s) => ({
          groups: [group, ...s.groups],
          selectedGroupId: group.id,
          loading: false,
        }))
        return group
      })
    } finally {
      if (get().loading) set({ loading: false })
    }
  },

  renameGroup: async (groupId, name) => {
    if (!isFirebaseConfigured) return
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      const updated = await updateGroup(groupId, { name })
      set((s) => ({
        groups: s.groups.map((g) => (g.id === groupId ? updated : g)),
      }))
    })
  },

  changeBaseCurrency: async (groupId, baseCurrency) => {
    if (!isFirebaseConfigured) return
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      const updated = await updateGroup(groupId, { baseCurrency })
      set((s) => ({
        groups: s.groups.map((g) => (g.id === groupId ? updated : g)),
      }))
    })
  },

  removeGroup: async (groupId) => {
    if (!isFirebaseConfigured) return
    return makeErrorBoundary(set, `group:${groupId}`, async () => {
      await deleteGroup(groupId)
      set((s) => ({
        groups: s.groups.filter((g) => g.id !== groupId),
        selectedGroupId: s.selectedGroupId === groupId ? null : s.selectedGroupId,
      }))
    })
  },

  loadMembersFor: async (memberIds) => {
    if (!isFirebaseConfigured || !memberIds.length) return []
    set({ loadingMembers: true })
    try {
      return await makeErrorBoundary(set, 'members', async () => {
        const users = await getUsersByIds(memberIds)
        const map: Record<string, UserProfile> = {}
        for (const u of users) map[u.id] = u
        set((s) => ({ membersMap: { ...s.membersMap, ...map }, loadingMembers: false }))
        return users
      })
    } finally {
      if (get().loadingMembers) set({ loadingMembers: false })
    }
  },

  addMemberByEmail: async (groupId, email) => {
    if (!isFirebaseConfigured) return
    return makeErrorBoundary(set, `addMember:${groupId}`, async () => {
      const user = await getUserByEmail(email)
      if (!user) {
        throw new Error(
          `No user found with email "${email.trim()}". Ask them to sign up first, then add them.`,
        )
      }
      const current = get().groups.find((g) => g.id === groupId) ?? (await getGroup(groupId))
      const memberIds = current?.memberIds ?? []
      if (memberIds.includes(user.id)) {
        throw new Error('This user is already a member of the group')
      }
      const updated = await addMemberToGroup(groupId, user.id)
      set((s) => ({
        groups: s.groups.map((g) => (g.id === groupId ? updated : g)),
        membersMap: { ...s.membersMap, [user.id]: user },
      }))
    })
  },

  removeMember: async (groupId, userId) => {
    if (!isFirebaseConfigured) return
    return makeErrorBoundary(set, `removeMember:${groupId}`, async () => {
      const updated = await removeMemberFromGroup(groupId, userId)
      set((s) => ({
        groups: s.groups.map((g) => (g.id === groupId ? updated : g)),
      }))
    })
  },

  searchUsers: async (term, excludeMemberIds = []) => {
    if (!isFirebaseConfigured || !term.trim()) {
      set({ searchResults: [], searchingUsers: false })
      return
    }
    set({ searchingUsers: true })
    try {
      const results = await searchUsersByEmail(term, { excludeMemberIds })
      set({ searchResults: results, searchingUsers: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed'
      set({ searchResults: [], searchingUsers: false })
      get().setError('userSearch', msg)
    }
  },

  clearSearch: () => set({ searchResults: [], searchingUsers: false }),
}))
