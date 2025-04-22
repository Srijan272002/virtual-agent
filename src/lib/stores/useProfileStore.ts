import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

interface PersonalityTrait {
  id: string
  user_id: string
  trait_name: string
  trait_value: number
  created_at: string
  updated_at: string
}

interface AppearanceSetting {
  id: string
  user_id: string
  setting_name: string
  setting_value: string
  created_at: string
  updated_at: string
}

interface AppearanceSettings {
  avatarStyle: string
  hairColor: string
  eyeColor: string
  skinTone: string
  outfitStyle: string
  [key: string]: string
}

interface ProfileStore {
  profile: Profile | null
  personalityTraits: PersonalityTrait[]
  appearanceSettings: AppearanceSettings | null
  isLoading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  fetchPersonalityTraits: () => Promise<void>
  fetchAppearanceSettings: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  updatePersonalityTrait: (traitName: string, value: number) => Promise<void>
  updateAppearanceSetting: (settingName: string, value: string) => Promise<void>
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  personalityTraits: [],
  appearanceSettings: null,
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
      
      // Fetch personality traits and appearance settings after profile
      await get().fetchPersonalityTraits()
      await get().fetchAppearanceSettings()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch profile' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPersonalityTraits: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('personality_traits')
        .select()
        .eq('user_id', user.id)

      if (error) throw error

      set({ personalityTraits: data || [] })
    } catch (error) {
      console.error('Failed to fetch personality traits:', error)
    }
  },

  fetchAppearanceSettings: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('appearance_settings')
        .select()
        .eq('user_id', user.id)

      if (error) throw error

      // Convert array of settings to an object
      if (data && data.length > 0) {
        const settings: AppearanceSettings = {
          avatarStyle: 'photo',
          hairColor: 'brown',
          eyeColor: 'brown',
          skinTone: 'medium',
          outfitStyle: 'casual'
        }

        data.forEach((setting: AppearanceSetting) => {
          settings[setting.setting_name] = setting.setting_value
        })

        set({ appearanceSettings: settings })
      } else {
        // Set default values if no settings found
        set({
          appearanceSettings: {
            avatarStyle: 'photo',
            hairColor: 'brown',
            eyeColor: 'brown',
            skinTone: 'medium',
            outfitStyle: 'casual'
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch appearance settings:', error)
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

  updatePersonalityTrait: async (traitName, value) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const existingTraits = get().personalityTraits
    const existingTrait = existingTraits.find(trait => trait.trait_name === traitName)

    if (existingTrait) {
      // Update existing trait
      const { error } = await supabase
        .from('personality_traits')
        .update({
          trait_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTrait.id)

      if (error) throw error
    } else {
      // Create new trait
      const { error } = await supabase
        .from('personality_traits')
        .insert({
          user_id: user.id,
          trait_name: traitName,
          trait_value: value,
        })

      if (error) throw error
    }

    // Update local state
    await get().fetchPersonalityTraits()
  },

  updateAppearanceSetting: async (settingName, value) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if we have existing appearance settings
    const { data, error: fetchError } = await supabase
      .from('appearance_settings')
      .select()
      .eq('user_id', user.id)
      .eq('setting_name', settingName)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (data) {
      // Update existing setting
      const { error } = await supabase
        .from('appearance_settings')
        .update({
          setting_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)

      if (error) throw error
    } else {
      // Create new setting
      const { error } = await supabase
        .from('appearance_settings')
        .insert({
          user_id: user.id,
          setting_name: settingName,
          setting_value: value,
        })

      if (error) throw error
    }

    // Update local state with the new setting
    set((state) => ({
      appearanceSettings: state.appearanceSettings 
        ? { ...state.appearanceSettings, [settingName]: value } 
        : { avatarStyle: 'photo', hairColor: 'brown', eyeColor: 'brown', skinTone: 'medium', outfitStyle: 'casual', [settingName]: value },
    }))
  },
})) 