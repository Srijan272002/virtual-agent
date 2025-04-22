import { create } from 'zustand'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Message } from '@/types/database'
import { GeminiChat } from '@/lib/gemini'
import { InterestLearner } from '@/lib/learning/interestLearner'

export interface Conversation {
  id: string
  title: string | null
  created_at: string
  last_message_at: string
  last_message?: string
  ai_personality?: {
    empathy: number
    playfulness: number
    independence: number
    expressiveness: number
    supportiveness: number
  }
}

type PatternDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface InteractionPattern {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly'
  day?: PatternDay
  time?: string
  active: boolean
  reminderEnabled: boolean
  reminderTime?: number // minutes before the interaction
  lastInteracted?: string
  nextReminder?: string // ISO string of next reminder time
}

export interface SpecialMoment {
  id: string
  title: string
  description: string
  type: string // anniversary, birthday, milestone, etc.
  date: string
  celebrated: boolean
  recurring: boolean
  recurrencePattern?: string
}

export interface ConversationSuggestion {
  id: string
  topic: string
  description: string
  category: string
  used: boolean
  created_at: string
}

export interface PredefinedTopic {
  id: string
  topic: string
  description: string
  category: string
  difficulty: number
}

export interface SharedImage {
  id: string
  url: string
  caption?: string
  created_at: string
}

export interface SharedVoice {
  id: string
  url: string
  duration: number
  created_at: string
}

interface ConversationState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  error: string | null
  ai: GeminiChat | null
  interactionPatterns: InteractionPattern[]
  specialMoments: SpecialMoment[]
  suggestions: ConversationSuggestion[]
  predefinedTopics: PredefinedTopic[]
  sharedImages: SharedImage[]
  sharedVoices: SharedVoice[]
  messages: Message[]
  fetchConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<string>
  setCurrentConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  initializeAI: (userName: string) => void
  fetchInteractionPatterns: () => Promise<void>
  togglePatternActive: (patternId: string) => Promise<void>
  fetchSpecialMoments: () => Promise<void>
  createSpecialMoment: (moment: Omit<SpecialMoment, 'id' | 'celebrated'>) => Promise<void>
  markMomentAsCelebrated: (momentId: string) => Promise<void>
  deleteSpecialMoment: (momentId: string) => Promise<void>
  fetchSuggestions: () => Promise<void>
  fetchPredefinedTopics: () => Promise<void>
  markSuggestionAsUsed: (suggestionId: string) => Promise<void>
  generateSuggestions: () => Promise<void>
  addCustomSuggestion: (topic: string, description: string, category: string) => Promise<void>
  getTopicCategories: () => string[]
  interestLearner: InterestLearner
  checkReminders: () => Promise<void>
  updateNextReminder: (patternId: string) => Promise<void>
  togglePatternReminder: (patternId: string) => Promise<void>
  uploadImage: (file: File, caption?: string) => Promise<void>
  deleteImage: (imageId: string) => Promise<void>
  fetchSharedImages: () => Promise<void>
  uploadVoice: (blob: Blob) => Promise<void>
  deleteVoice: (voiceId: string) => Promise<void>
  fetchSharedVoices: () => Promise<void>
  fetchMessages: () => Promise<void>
}

// Define the store with proper type
export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  error: null,
  ai: null,
  interactionPatterns: [],
  specialMoments: [],
  suggestions: [],
  predefinedTopics: [],
  sharedImages: [],
  sharedVoices: [],
  messages: [],
  interestLearner: new InterestLearner('default'),

  fetchConversations: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error
      set({ conversations })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch conversations' })
    } finally {
      set({ isLoading: false })
    }
  },

  createConversation: async (title?: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert([{
          title: title || 'New Conversation',
          ai_personality: {
            empathy: 85,
            playfulness: 70,
            independence: 75,
            expressiveness: 80,
            supportiveness: 90
          }
        }])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation
      }))

      return conversation.id
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create conversation' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  setCurrentConversation: (conversation: Conversation) => {
    set({ currentConversation: conversation })
  },

  updateConversation: async (id: string, updates: Partial<Conversation>) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        conversations: state.conversations.map(conv =>
          conv.id === id ? { ...conv, ...updates } : conv
        ),
        currentConversation: state.currentConversation?.id === id
          ? { ...state.currentConversation, ...updates }
          : state.currentConversation
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update conversation' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteConversation: async (id: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        conversations: state.conversations.filter(conv => conv.id !== id),
        currentConversation: state.currentConversation?.id === id ? null : state.currentConversation
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete conversation' })
    } finally {
      set({ isLoading: false })
    }
  },

  initializeAI: (userName: string) => {
    const ai = new GeminiChat(userName)
    set({ ai })
  },
  
  fetchInteractionPatterns: async () => {
    // Mock implementation - will be replaced with real API call
    set({ isLoading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      const patterns: InteractionPattern[] = [
        {
          id: '1',
          title: 'Morning Coffee Chat',
          description: 'Start your day with a quick conversation over coffee',
          type: 'daily',
          time: '08:00',
          active: true,
          reminderEnabled: true,
          reminderTime: 15,
          lastInteracted: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Evening Check-in',
          description: 'Wind down your day with a relaxing conversation',
          type: 'daily',
          time: '20:00',
          active: false,
          reminderEnabled: false
        },
        {
          id: '3',
          title: 'Weekend Planning',
          description: 'Plan your weekend activities together',
          type: 'weekly',
          day: 'friday',
          time: '18:00',
          active: true,
          reminderEnabled: true,
          reminderTime: 30
        }
      ];
      
      set({ interactionPatterns: patterns });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch interaction patterns' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  togglePatternActive: async (patternId: string) => {
    // Mock implementation - will be replaced with real API call
    set(state => {
      const updatedPatterns = state.interactionPatterns.map(pattern => 
        pattern.id === patternId 
          ? { ...pattern, active: !pattern.active }
          : pattern
      );
      
      return { interactionPatterns: updatedPatterns };
    });
  },

  fetchSpecialMoments: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('special_moments')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error

      // Transform the data to match our interface
      const specialMoments: SpecialMoment[] = data?.map(moment => ({
        id: moment.id,
        title: moment.title,
        description: moment.description || '',
        type: moment.moment_type,
        date: moment.date,
        celebrated: moment.is_celebrated,
        recurring: moment.is_recurring,
        recurrencePattern: moment.recurrence_pattern
      })) || []

      set({ specialMoments })
    } catch (error) {
      // For development, use mock data if the table doesn't exist yet
      console.error('Error fetching special moments:', error)
      
      // Mock data for development
      const mockMoments: SpecialMoment[] = [
        {
          id: '1',
          title: 'Our First Conversation',
          description: 'The day we first started talking',
          type: 'anniversary',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          celebrated: false,
          recurring: true,
          recurrencePattern: 'yearly'
        },
        {
          id: '2',
          title: 'Your Birthday',
          description: 'A special day to celebrate you',
          type: 'birthday',
          date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days in future
          celebrated: false,
          recurring: true,
          recurrencePattern: 'yearly'
        },
        {
          id: '3',
          title: '100 Conversations Milestone',
          description: 'We\'ve had 100 meaningful conversations',
          type: 'milestone',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          celebrated: false,
          recurring: false
        },
        {
          id: '4',
          title: 'New Job Celebration',
          description: 'Celebrating your new job',
          type: 'achievement',
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
          celebrated: true,
          recurring: false
        }
      ]
      
      set({ specialMoments: mockMoments, error: null })
    } finally {
      set({ isLoading: false })
    }
  },

  createSpecialMoment: async (moment) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('special_moments')
        .insert([{
          title: moment.title,
          description: moment.description,
          moment_type: moment.type,
          date: moment.date,
          is_recurring: moment.recurring,
          recurrence_pattern: moment.recurrencePattern,
          is_celebrated: false
        }])
        .select()
        .single()

      if (error) throw error

      // Transform the data to match our interface
      const newMoment: SpecialMoment = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        type: data.moment_type,
        date: data.date,
        celebrated: data.is_celebrated,
        recurring: data.is_recurring,
        recurrencePattern: data.recurrence_pattern
      }

      set((state) => ({
        specialMoments: [...state.specialMoments, newMoment]
      }))
    } catch (error) {
      // For development, create a mock moment if the table doesn't exist yet
      console.error('Error creating special moment:', error)
      
      const mockMoment: SpecialMoment = {
        ...moment,
        id: Date.now().toString(),
        celebrated: false
      }
      
      set((state) => ({
        specialMoments: [...state.specialMoments, mockMoment],
        error: null
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  markMomentAsCelebrated: async (momentId) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('special_moments')
        .update({ is_celebrated: true })
        .eq('id', momentId)

      if (error) throw error

      set((state) => ({
        specialMoments: state.specialMoments.map(moment =>
          moment.id === momentId ? { ...moment, celebrated: true } : moment
        )
      }))
    } catch (error) {
      // For development, update the mock data if the table doesn't exist yet
      console.error('Error marking moment as celebrated:', error)
      
      set((state) => ({
        specialMoments: state.specialMoments.map(moment =>
          moment.id === momentId ? { ...moment, celebrated: true } : moment
        ),
        error: null
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  deleteSpecialMoment: async (momentId) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('special_moments')
        .delete()
        .eq('id', momentId)

      if (error) throw error

      set((state) => ({
        specialMoments: state.specialMoments.filter(moment => moment.id !== momentId)
      }))
    } catch (error) {
      // For development, update the mock data if the table doesn't exist yet
      console.error('Error deleting special moment:', error)
      
      set((state) => ({
        specialMoments: state.specialMoments.filter(moment => moment.id !== momentId),
        error: null
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSuggestions: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('conversation_suggestions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const suggestions: ConversationSuggestion[] = data || []
      set({ suggestions })
    } catch (error) {
      // For development, use mock data if the table doesn't exist yet
      console.error('Error fetching conversation suggestions:', error)
      
      // Mock data for development
      const mockSuggestions: ConversationSuggestion[] = [
        {
          id: '1',
          topic: 'Dream Travel Destinations',
          description: 'Discuss places you would love to visit someday',
          category: 'Travel',
          used: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          topic: 'Favorite Childhood Memories',
          description: 'Share memories from when you were growing up',
          category: 'Personal',
          used: false,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          topic: 'Future Goals',
          description: 'Talk about what you hope to achieve in the coming years',
          category: 'Personal',
          used: true,
          created_at: new Date().toISOString()
        }
      ]
      
      set({ suggestions: mockSuggestions, error: null })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPredefinedTopics: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('predefined_conversation_topics')
        .select('*')
        .order('category', { ascending: true })

      if (error) throw error

      const predefinedTopics: PredefinedTopic[] = data || []
      set({ predefinedTopics })
    } catch (error) {
      // For development, use mock data if the table doesn't exist yet
      console.error('Error fetching predefined topics:', error)
      
      // Mock data for development - using some sample topics from the migration file
      const mockTopics: PredefinedTopic[] = [
        {
          id: '1',
          topic: 'Childhood Memories',
          description: 'Share favorite memories from your childhood',
          category: 'Personal',
          difficulty: 1
        },
        {
          id: '2',
          topic: 'Dream Travel Destinations',
          description: 'Discuss places you would love to visit someday',
          category: 'Travel',
          difficulty: 1
        },
        {
          id: '3',
          topic: 'Favorite Movies',
          description: 'Talk about movies that have left an impression on you',
          category: 'Entertainment',
          difficulty: 1
        },
        {
          id: '4',
          topic: 'Life Goals',
          description: 'Share your aspirations and what you want to achieve',
          category: 'Personal',
          difficulty: 2
        },
        {
          id: '5',
          topic: 'Book Recommendations',
          description: 'Discuss books that have changed your perspective',
          category: 'Culture',
          difficulty: 2
        }
      ]
      
      set({ predefinedTopics: mockTopics, error: null })
    } finally {
      set({ isLoading: false })
    }
  },

  markSuggestionAsUsed: async (suggestionId: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('conversation_suggestions')
        .update({ used: true })
        .eq('id', suggestionId)

      if (error) throw error

      set((state) => ({
        suggestions: state.suggestions.map(suggestion =>
          suggestion.id === suggestionId ? { ...suggestion, used: true } : suggestion
        )
      }))
    } catch (error) {
      // For development, update the mock data if the table doesn't exist yet
      console.error('Error marking suggestion as used:', error)
      
      set((state) => ({
        suggestions: state.suggestions.map(suggestion =>
          suggestion.id === suggestionId ? { ...suggestion, used: true } : suggestion
        ),
        error: null
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  generateSuggestions: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      // In a real implementation, this would call an AI service to generate personalized suggestions
      // For this implementation, we'll simulate by randomly selecting from predefined topics

      // First try to get the predefined topics from the database
      const { data: predefinedData, error: predefinedError } = await supabase
        .from('predefined_conversation_topics')
        .select('*')
        .order('topic', { ascending: true })
        .limit(10)

      if (predefinedError) throw predefinedError

      // If we have predefined topics, use those to "generate" suggestions
      if (predefinedData && predefinedData.length > 0) {
        // Randomly select 3-5 topics
        const numTopics = Math.floor(Math.random() * 3) + 3
        const selectedIndexes = new Set<number>()
        
        while (selectedIndexes.size < numTopics && selectedIndexes.size < predefinedData.length) {
          const randomIndex = Math.floor(Math.random() * predefinedData.length)
          selectedIndexes.add(randomIndex)
        }
        
        const newSuggestions = Array.from(selectedIndexes).map(index => {
          const topic = predefinedData[index]
          return {
            topic: topic.topic,
            description: topic.description,
            category: topic.category
          }
        })
        
        // Now insert these as new suggestions
        const { error: insertError } = await supabase
          .from('conversation_suggestions')
          .insert(newSuggestions.map(s => ({
            topic: s.topic,
            description: s.description,
            category: s.category,
            used: false
          })))
        
        if (insertError) throw insertError
        
        // Refresh the suggestions list
        await get().fetchSuggestions()
      } else {
        // Fallback mock suggestions if no predefined topics
        const mockSuggestions = [
          {
            topic: 'Weekend Plans',
            description: 'What are you looking forward to this weekend?',
            category: 'Lifestyle'
          },
          {
            topic: 'Favorite Music',
            description: 'What kind of music do you enjoy listening to?',
            category: 'Entertainment'
          },
          {
            topic: 'Dream Vacation',
            description: 'If you could travel anywhere right now, where would you go?',
            category: 'Travel'
          }
        ]
        
        // Insert these mock suggestions
        const { error: mockInsertError } = await supabase
          .from('conversation_suggestions')
          .insert(mockSuggestions.map(s => ({
            topic: s.topic,
            description: s.description,
            category: s.category,
            used: false
          })))
        
        if (mockInsertError) throw mockInsertError
        
        // Refresh the suggestions list
        await get().fetchSuggestions()
      }
    } catch (error) {
      // For development, create mock suggestions if the table doesn't exist yet
      console.error('Error generating suggestions:', error)
      
      const mockNewSuggestions: ConversationSuggestion[] = [
        {
          id: Date.now().toString() + '1',
          topic: 'Recent Books',
          description: 'What books have you been reading lately?',
          category: 'Culture',
          used: false,
          created_at: new Date().toISOString()
        },
        {
          id: Date.now().toString() + '2',
          topic: 'Cooking Adventures',
          description: 'Have you tried cooking anything new recently?',
          category: 'Food',
          used: false,
          created_at: new Date().toISOString()
        },
        {
          id: Date.now().toString() + '3',
          topic: 'Future Technology',
          description: 'What technology advancements are you excited about?',
          category: 'Technology',
          used: false,
          created_at: new Date().toISOString()
        }
      ]
      
      set((state) => ({
        suggestions: [...mockNewSuggestions, ...state.suggestions],
        error: null
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  addCustomSuggestion: async (topic: string, description: string, category: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('conversation_suggestions')
        .insert([{
          topic,
          description,
          category,
          used: false
        }])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        suggestions: [data as ConversationSuggestion, ...state.suggestions]
      }))
    } catch (error) {
      // For development, create a mock suggestion if the table doesn't exist yet
      console.error('Error adding custom suggestion:', error)
      
      const mockSuggestion: ConversationSuggestion = {
        id: Date.now().toString(),
        topic,
        description,
        category,
        used: false,
        created_at: new Date().toISOString()
      }
      
      set((state) => ({
        suggestions: [mockSuggestion, ...state.suggestions],
        error: null
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  getTopicCategories: (): string[] => {
    // Get all categories from the current predefined topics
    const state = get()
    
    if (state.predefinedTopics.length > 0) {
      const categories = new Set(state.predefinedTopics.map((topic: PredefinedTopic) => topic.category))
      return Array.from(categories).sort()
    }
    
    // Default categories if no predefined topics are available
    return [
      'Personal',
      'Travel',
      'Entertainment',
      'Culture',
      'Food',
      'Technology',
      'Philosophy',
      'Work',
      'Lifestyle',
      'Health',
      'Relationships',
      'Future',
      'Art'
    ]
  },

  checkReminders: async () => {
    const patterns = get().interactionPatterns
    const now = new Date()
    
    patterns.forEach(pattern => {
      if (!pattern.active || !pattern.reminderEnabled || !pattern.nextReminder) return
      
      const reminderTime = new Date(pattern.nextReminder)
      if (reminderTime <= now) {
        // Trigger reminder notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Interaction Reminder', {
            body: `Time for: ${pattern.title}\n${pattern.description}`,
            icon: '/favicon.ico'
          })
        }
        
        // Update next reminder time
        get().updateNextReminder(pattern.id)
      }
    })
  },
  
  updateNextReminder: async (patternId: string) => {
    const patterns = get().interactionPatterns
    const pattern = patterns.find(p => p.id === patternId)
    if (!pattern || !pattern.active || !pattern.reminderEnabled) return
    
    const now = new Date()
    const nextTime = new Date()
    
    if (pattern.type === 'daily') {
      const [hours, minutes] = pattern.time?.split(':') || ['9', '0']
      nextTime.setHours(parseInt(hours), parseInt(minutes) - (pattern.reminderTime || 0))
      
      if (nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + 1)
      }
    } else if (pattern.type === 'weekly' && pattern.day) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = days.indexOf(pattern.day.toLowerCase())
      const [hours, minutes] = pattern.time?.split(':') || ['9', '0']
      
      nextTime.setHours(parseInt(hours), parseInt(minutes) - (pattern.reminderTime || 0))
      
      while (nextTime.getDay() !== targetDay || nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + 1)
      }
    }
    
    set(state => ({
      interactionPatterns: state.interactionPatterns.map(p =>
        p.id === patternId ? { ...p, nextReminder: nextTime.toISOString() } : p
      )
    }))
  },

  togglePatternReminder: async (patternId: string) => {
    const pattern = get().interactionPatterns.find(p => p.id === patternId)
    if (!pattern) return
    
    const updatedPattern = {
      ...pattern,
      reminderEnabled: !pattern.reminderEnabled
    }
    
    // Update next reminder time if enabling reminders
    if (updatedPattern.reminderEnabled) {
      await get().updateNextReminder(patternId)
    }
    
    set(state => ({
      interactionPatterns: state.interactionPatterns.map(p =>
        p.id === patternId ? updatedPattern : p
      )
    }))
  },

  uploadImage: async (file: File, caption?: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `shared-images/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // Save image metadata to the database
      const { data: image, error: dbError } = await supabase
        .from('shared_images')
        .insert([{
          user_id: user.id,
          url: publicUrl,
          caption,
          file_path: filePath
        }])
        .select()
        .single()

      if (dbError) throw dbError

      // Update local state
      set(state => ({
        sharedImages: [image as SharedImage, ...state.sharedImages]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to upload image' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  deleteImage: async (imageId: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      // Get the image data first to get the file path
      const { data: image, error: fetchError } = await supabase
        .from('shared_images')
        .select('file_path')
        .eq('id', imageId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      if (image.file_path) {
        const { error: storageError } = await supabase.storage
          .from('images')
          .remove([image.file_path])

        if (storageError) throw storageError
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('shared_images')
        .delete()
        .eq('id', imageId)

      if (dbError) throw dbError

      // Update local state
      set(state => ({
        sharedImages: state.sharedImages.filter(img => img.id !== imageId)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete image' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSharedImages: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: images, error } = await supabase
        .from('shared_images')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ sharedImages: images as SharedImage[] })
    } catch (error) {
      // For development, use mock data if the table doesn't exist yet
      console.error('Error fetching shared images:', error)
      
      const mockImages: SharedImage[] = [
        {
          id: '1',
          url: 'https://picsum.photos/400/400',
          caption: 'Sample image 1',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          url: 'https://picsum.photos/401/401',
          caption: 'Sample image 2',
          created_at: new Date().toISOString()
        }
      ]
      
      set({ sharedImages: mockImages, error: null })
    } finally {
      set({ isLoading: false })
    }
  },

  uploadVoice: async (blob: Blob) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      // Upload voice file to storage
      const fileName = `voice-${Date.now()}.wav`
      const { error: uploadError } = await supabase
        .storage
        .from('voices')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('voices')
        .getPublicUrl(fileName)

      // Create voice record in database
      const { data: voice, error: dbError } = await supabase
        .from('shared_voices')
        .insert([{
          url: publicUrl,
          duration: 0 // TODO: Calculate actual duration
        }])
        .select()
        .single()

      if (dbError) throw dbError

      set((state) => ({
        sharedVoices: [voice, ...state.sharedVoices]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to upload voice message' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  deleteVoice: async (voiceId: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('shared_voices')
        .delete()
        .eq('id', voiceId)

      if (dbError) throw dbError

      // Update state
      set((state) => ({
        sharedVoices: state.sharedVoices.filter(voice => voice.id !== voiceId)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete voice message' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSharedVoices: async () => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: voices, error } = await supabase
        .from('shared_voices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ sharedVoices: voices })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch voice messages' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMessages: async () => {
    const supabase = createClientComponentClient<Database>()
    const currentConversation = get().currentConversation
    
    if (!currentConversation) {
      set({ messages: [] })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      set({ messages: messages || [] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch messages' })
      set({ messages: [] })
    } finally {
      set({ isLoading: false })
    }
  }
})) 