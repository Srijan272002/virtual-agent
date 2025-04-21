'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import ChatContainer from '@/components/chat/ChatContainer'
import { useProfileStore } from '@/lib/stores/useProfileStore'

interface Message {
  id: string
  content: string
  created_at: string
  is_user: boolean
  conversation_id: string
}

export default function ChatPage() {
  const params = useParams()
  const { profile } = useProfileStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClientSupabase()
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', params.id)
        .order('created_at', { ascending: true })

      if (error) {
        setError(error.message)
        return
      }

      setMessages(data || [])
    }

    fetchMessages()

    // Set up real-time subscription
    const supabase = createClientSupabase()
    const channel = supabase
      .channel(`conversation:${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${params.id}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  const handleSendMessage = async (content: string) => {
    const supabase = createClientSupabase()
    
    setIsTyping(true)
    
    try {
      // Insert user message
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: params.id,
          content,
          is_user: true,
        })

      if (userMessageError) throw userMessageError

      // TODO: Call AI API to get response
      // For now, simulate AI response
      setTimeout(async () => {
        const { error: aiMessageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: params.id,
            content: 'This is a simulated AI response.',
            is_user: false,
          })

        if (aiMessageError) throw aiMessageError
        
        setIsTyping(false)
      }, 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message')
      setIsTyping(false)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatContainer
        messages={messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.created_at,
          isUser: msg.is_user,
          avatar: msg.is_user ? profile?.avatar_url : null,
        }))}
        onSendMessageAction={handleSendMessage}
        isTyping={isTyping}
      />
    </div>
  )
} 