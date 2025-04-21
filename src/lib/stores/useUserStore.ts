import { create } from 'zustand'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface User {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
}

interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  fetchUser: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        set({
          user: {
            id: user.id,
            name: profile?.name || user.email?.split('@')[0] || null,
            email: user.email || null,
            avatar_url: profile?.avatar_url || null
          }
        })
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch user' })
    } finally {
      set({ isLoading: false })
    }
  },

  updateUser: async (updates) => {
    const supabase = createClientComponentClient<Database>()
    const state = useUserStore.getState()
    if (!state.user) return

    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id)

      if (error) throw error

      set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update user' })
    } finally {
      set({ isLoading: false })
    }
  }
})) 