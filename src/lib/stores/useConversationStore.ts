import { create } from 'zustand'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'
import { GeminiChat } from '@/lib/gemini'

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

interface ConversationState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  error: string | null
  ai: GeminiChat | null
  fetchConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<string>
  setCurrentConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  initializeAI: (userName: string) => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  error: null,
  ai: null,

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
  }
})) 