import { create } from 'zustand'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

export interface Message {
  id: string
  conversation_id: string
  content: string
  is_user: boolean
  created_at: string
  reactions?: {
    type: string
    count: number
    hasReacted: boolean
  }[]
}

interface MessageReaction {
  type: string
  user_id: string
}

interface RawMessage extends Omit<Message, 'reactions'> {
  reactions?: MessageReaction[]
}

interface MessageState {
  messages: Message[]
  isLoading: boolean
  isTyping: boolean
  error: string | null
  fetchMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  addReaction: (messageId: string, type: string) => Promise<void>
  removeReaction: (messageId: string, type: string) => Promise<void>
  setTyping: (isTyping: boolean) => void
  subscribeToMessages: (conversationId: string) => () => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  isTyping: false,
  error: null,

  fetchMessages: async (conversationId: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          reactions:message_reactions(
            type,
            user_id
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Process reactions
      const processedMessages = (messages as RawMessage[]).map(msg => ({
        ...msg,
        reactions: Object.entries(
          msg.reactions?.reduce((acc: Record<string, number>, r: MessageReaction) => {
            acc[r.type] = (acc[r.type] || 0) + 1
            return acc
          }, {}) || {}
        ).map(([type, count]) => ({
          type,
          count,
          hasReacted: msg.reactions?.some(r => r.type === type && r.user_id === user.id) ?? false
        }))
      }))

      set({ messages: processedMessages })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch messages' })
    } finally {
      set({ isLoading: false })
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          content,
          is_user: true
        }])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        messages: [...state.messages, message]
      }))

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send message' })
    } finally {
      set({ isLoading: false })
    }
  },

  addReaction: async (messageId: string, type: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert([{
          message_id: messageId,
          type
        }])

      if (error) throw error

      // Refresh messages to get updated reactions
      const conversationId = get().messages.find(m => m.id === messageId)?.conversation_id
      if (conversationId) {
        await get().fetchMessages(conversationId)
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add reaction' })
    } finally {
      set({ isLoading: false })
    }
  },

  removeReaction: async (messageId: string, type: string) => {
    const supabase = createClientComponentClient<Database>()
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .match({
          message_id: messageId,
          type
        })

      if (error) throw error

      // Refresh messages to get updated reactions
      const conversationId = get().messages.find(m => m.id === messageId)?.conversation_id
      if (conversationId) {
        await get().fetchMessages(conversationId)
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove reaction' })
    } finally {
      set({ isLoading: false })
    }
  },

  setTyping: (isTyping: boolean) => {
    set({ isTyping })
  },

  subscribeToMessages: (conversationId: string) => {
    const supabase = createClientComponentClient<Database>()

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { messages } = get()
          const newMessage = payload.new as Message

          // Only add the message if it's not already in the list
          if (!messages.some(m => m.id === newMessage.id)) {
            set((state) => ({
              messages: [...state.messages, newMessage]
            }))
          }
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription)
    }
  }
})) 