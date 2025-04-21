import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Theme {
  mode: 'light' | 'dark' | 'system'
  accent: 'blue' | 'purple' | 'pink' | 'green'
}

interface Notifications {
  enabled: boolean
  sound: boolean
  desktop: boolean
}

interface Privacy {
  shareTyping: boolean
  shareReadReceipts: boolean
  shareOnline: boolean
}

interface Settings {
  theme: Theme
  notifications: Notifications
  privacy: Privacy
}

interface SettingsState extends Settings {
  updateTheme: (theme: Partial<Theme>) => void
  updateNotifications: (notifications: Partial<Notifications>) => void
  updatePrivacy: (privacy: Partial<Privacy>) => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  theme: {
    mode: 'system',
    accent: 'blue',
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: false,
  },
  privacy: {
    shareTyping: true,
    shareReadReceipts: true,
    shareOnline: true,
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateTheme: (theme) =>
        set((state) => ({
          theme: { ...state.theme, ...theme },
        })),

      updateNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),

      updatePrivacy: (privacy) =>
        set((state) => ({
          privacy: { ...state.privacy, ...privacy },
        })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'ai-girlfriend-settings',
    }
  )
) 