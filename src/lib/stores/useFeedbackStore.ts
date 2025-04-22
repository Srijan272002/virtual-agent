import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ConversationRating {
  id: string
  user_id: string
  conversation_id: string
  rating: number
  feedback: string | null
  created_at: string
}

interface FeatureSuggestion {
  id: string
  user_id: string
  category: string
  title: string
  description: string
  status: 'pending' | 'reviewing' | 'planned' | 'implemented' | 'rejected'
  created_at: string
  updated_at: string
}

interface FeedbackStore {
  conversationRatings: ConversationRating[]
  featureSuggestions: FeatureSuggestion[]
  isLoading: boolean
  error: string | null
  
  // Rating methods
  fetchConversationRatings: () => Promise<void>
  rateConversation: (conversationId: string, rating: number, feedback?: string) => Promise<void>
  
  // Feature suggestion methods
  fetchFeatureSuggestions: () => Promise<void>
  addFeatureSuggestion: (category: string, title: string, description: string) => Promise<void>
  
  // Feedback categories
  getCategories: () => string[]
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  conversationRatings: [],
  featureSuggestions: [],
  isLoading: false,
  error: null,

  fetchConversationRatings: async () => {
    set({ isLoading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('conversation_ratings')
        .select()
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ conversationRatings: data || [] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch ratings' })
      console.error('Failed to fetch conversation ratings:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  rateConversation: async (conversationId, rating, feedback) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if a rating already exists for this conversation
      const { data: existingRating, error: checkError } = await supabase
        .from('conversation_ratings')
        .select()
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .maybeSingle()

      if (checkError) throw checkError

      // Update or insert rating
      if (existingRating) {
        const { error } = await supabase
          .from('conversation_ratings')
          .update({
            rating,
            feedback: feedback || existingRating.feedback
          })
          .eq('id', existingRating.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('conversation_ratings')
          .insert({
            user_id: user.id,
            conversation_id: conversationId,
            rating,
            feedback: feedback || null
          })

        if (error) throw error
      }

      // Show success message
      toast.success('Thank you for your feedback!', {
        description: 'Your rating has been recorded.',
      })

      // Refresh conversation ratings
      get().fetchConversationRatings()
    } catch (error) {
      toast.error('Error submitting rating', {
        description: error instanceof Error ? error.message : 'An error occurred while submitting your rating'
      })
      console.error('Failed to rate conversation:', error)
    }
  },

  fetchFeatureSuggestions: async () => {
    set({ isLoading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('feature_suggestions')
        .select()
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ featureSuggestions: data || [] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch suggestions' })
      console.error('Failed to fetch feature suggestions:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  addFeatureSuggestion: async (category, title, description) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feature_suggestions')
        .insert({
          user_id: user.id,
          category,
          title,
          description,
          status: 'pending'
        })

      if (error) throw error

      // Show success message
      toast.success('Suggestion submitted!', {
        description: 'Thank you for helping us improve.',
      })

      // Refresh feature suggestions
      get().fetchFeatureSuggestions()
    } catch (error) {
      toast.error('Error submitting suggestion', {
        description: error instanceof Error ? error.message : 'An error occurred while submitting your suggestion'
      })
      console.error('Failed to add feature suggestion:', error)
    }
  },

  getCategories: () => [
    'AI Personality',
    'User Interface',
    'Conversations',
    'Appearance',
    'Performance',
    'Other'
  ]
})) 