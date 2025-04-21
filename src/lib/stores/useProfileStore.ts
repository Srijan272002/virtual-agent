import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

interface ProfileStore {
  profile: Profile | null
  isLoading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single()

      if (error) throw error

      set({ profile: data })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch profile' })
    } finally {
      set({ isLoading: false })
    }
  },

  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) throw error

    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }))
  },

  uploadAvatar: async (file) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    // Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update the profile with the new avatar URL
    await useProfileStore.getState().updateProfile({
      avatar_url: publicUrl,
    })
  },
})) 