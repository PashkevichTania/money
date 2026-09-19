import { create } from 'zustand'

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

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  themeMode: localStorage.getItem('theme-mode') === 'dark' ? 'dark' : 'light',
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
