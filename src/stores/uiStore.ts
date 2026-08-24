import { create } from 'zustand'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'

export interface UIState {
  sidebarOpen: boolean
  themeMode: 'light' | 'dark'
  openDialogs: Record<string, boolean>
  toast: { message: string; variant: 'success' | 'error' | 'info' | 'warning' } | null
  toggleSidebar: (force?: boolean) => void
  setThemeMode: (mode: 'light' | 'dark') => void
  toggleDialog: (key: string, value?: boolean) => void
  showToast: (
    message: string,
    variant?: 'success' | 'error' | 'info' | 'warning',
  ) => void
  clearToast: () => void
}

export interface GroupState {
  groups: Group[]
  selectedGroupId: string | null
  membersMap: Record<string, UserProfile>
  loading: boolean
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (group: Group) => void
  removeGroup: (id: string) => void
  setSelectedGroupId: (id: string | null) => void
  setMembersMap: (members: Record<string, UserProfile>) => void
  setLoading: (loading: boolean) => void
  addMember: (user: UserProfile) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  themeMode: (localStorage.getItem('theme-mode') as 'light' | 'dark') || 'light',
  openDialogs: {},
  toast: null,

  toggleSidebar: (force) => {
    const current = get().sidebarOpen
    const next = typeof force === 'boolean' ? force : !current
    set({ sidebarOpen: next })
  },

  setThemeMode: (mode) => {
    localStorage.setItem('theme-mode', mode)
    set({ themeMode: mode })
  },

  toggleDialog: (key, value) => {
    set((state) => ({
      openDialogs: {
        ...state.openDialogs,
        [key]: typeof value === 'boolean' ? value : !state.openDialogs[key],
      },
    }))
  },

  showToast: (message, variant = 'info') => {
    set({ toast: { message, variant } })
  },

  clearToast: () => set({ toast: null }),
}))

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  selectedGroupId: null,
  membersMap: {},
  loading: false,

  setGroups: (groups) => set({ groups }),
  addGroup: (group) =>
    set((s) => ({ groups: [group, ...s.groups.filter((g) => g.id !== group.id)] })),
  updateGroup: (group) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === group.id ? group : g)),
    })),
  removeGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
  setMembersMap: (membersMap) => set({ membersMap }),
  setLoading: (loading) => set({ loading }),
  addMember: (user) =>
    set((s) => ({
      membersMap: { ...s.membersMap, [user.id]: user },
    })),
}))
