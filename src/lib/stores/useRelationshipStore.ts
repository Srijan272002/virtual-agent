import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface RelationshipProgress {
  id: string
  user_id: string
  level: number
  experience: number
  next_level_exp: number
  milestones: string[]
  relationship_stage: string
  created_at: string
  updated_at: string
}

interface RelationshipEvent {
  id: string
  user_id: string
  event_type: string
  experience_points: number
  description: string | null
  created_at: string
}

// Define relationship stages with requirements
const relationshipStages = {
  acquaintance: { level: 1, description: 'Just getting to know each other' },
  friend: { level: 5, description: 'Becoming more comfortable together' },
  close_friend: { level: 10, description: 'Regularly engaging in meaningful conversation' },
  intimate: { level: 15, description: 'Sharing thoughts and feelings openly' },
  partner: { level: 20, description: 'Deep emotional connection established' },
  soulmate: { level: 25, description: 'Profound understanding of each other' }
}

// Define event types and their experience values
const eventTypes = {
  conversation: { exp: 10, description: 'Having a conversation' },
  deep_conversation: { exp: 25, description: 'Having a deep, meaningful conversation' },
  shared_interest: { exp: 15, description: 'Discussing a shared interest' },
  daily_check_in: { exp: 5, description: 'Checking in daily' },
  milestone_reached: { exp: 50, description: 'Reaching a relationship milestone' }
}

interface RelationshipStore {
  progress: RelationshipProgress | null
  recentEvents: RelationshipEvent[]
  isLoading: boolean
  error: string | null
  fetchRelationshipProgress: () => Promise<void>
  fetchRecentEvents: () => Promise<void>
  addRelationshipEvent: (eventType: string, description?: string) => Promise<void>
  getRelationshipStages: () => typeof relationshipStages
  getEventTypes: () => typeof eventTypes
}

export const useRelationshipStore = create<RelationshipStore>((set, get) => ({
  progress: null,
  recentEvents: [],
  isLoading: false,
  error: null,

  fetchRelationshipProgress: async () => {
    set({ isLoading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user has relationship progress record
      let { data, error } = await supabase
        .from('relationship_progress')
        .select()
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          // Create initial relationship progress
          const { data: newData, error: insertError } = await supabase
            .from('relationship_progress')
            .insert({
              user_id: user.id,
              level: 1,
              experience: 0,
              next_level_exp: 100,
              milestones: [],
              relationship_stage: 'acquaintance'
            })
            .select()
            .single()

          if (insertError) throw insertError
          data = newData
        } else {
          throw error
        }
      }

      set({ progress: data })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch relationship progress' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchRecentEvents: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('relationship_events')
        .select()
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      set({ recentEvents: data || [] })
    } catch (error) {
      console.error('Failed to fetch relationship events:', error)
    }
  },

  addRelationshipEvent: async (eventType: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Validate event type
      const event = eventTypes[eventType as keyof typeof eventTypes]
      if (!event) throw new Error('Invalid event type')

      // Get current progress
      const progress = get().progress
      if (!progress) {
        await get().fetchRelationshipProgress()
        return
      }

      // Add the event
      const { error: eventError } = await supabase
        .from('relationship_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          experience_points: event.exp,
          description: description || null
        })

      if (eventError) throw eventError

      // Update progress with new experience
      const newExperience = progress.experience + event.exp
      let newLevel = progress.level
      let newNextLevelExp = progress.next_level_exp
      let newRelationshipStage = progress.relationship_stage

      // Check if leveled up
      if (newExperience >= progress.next_level_exp) {
        newLevel++
        newNextLevelExp = Math.round(progress.next_level_exp * 1.5) // Increase exp required for next level
        
        // Check if relationship stage changed
        for (const [stage, requirements] of Object.entries(relationshipStages)) {
          if (newLevel >= requirements.level && stage !== progress.relationship_stage) {
            // Find the highest stage they qualify for
            if (relationshipStages[stage as keyof typeof relationshipStages].level <= newLevel) {
              newRelationshipStage = stage
            }
          }
        }
      }

      // Update progress
      const { data: updatedProgress, error: updateError } = await supabase
        .from('relationship_progress')
        .update({
          level: newLevel,
          experience: newExperience,
          next_level_exp: newNextLevelExp,
          relationship_stage: newRelationshipStage
        })
        .eq('id', progress.id)
        .select()
        .single()

      if (updateError) throw updateError
      
      // Update local state
      set({ progress: updatedProgress })
      await get().fetchRecentEvents()
    } catch (error) {
      console.error('Failed to add relationship event:', error)
    }
  },

  getRelationshipStages: () => relationshipStages,
  getEventTypes: () => eventTypes
})) 