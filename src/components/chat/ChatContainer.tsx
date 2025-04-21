'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useMessageStore } from '@/lib/stores/useMessageStore'
import { useConversationStore } from '@/lib/stores/useConversationStore'
import { useUserStore } from '@/lib/stores/useUserStore'
import { MessageBubble } from './MessageBubble'
import { Button, Input, useToast } from '@/components/ui'
import { Send } from 'lucide-react'

export default function ChatContainer() {
  const { messages, sendMessage } = useMessageStore()
  const { currentConversation, ai, initializeAI } = useConversationStore()
  const { user } = useUserStore()
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (user && !ai) {
      initializeAI(user.name || 'User')
    }
  }, [user, ai, initializeAI])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentConversation || !ai) return

    try {
      setIsTyping(true)
      
      // Send user message
      await sendMessage(currentConversation.id, newMessage)

      // Get AI response
      const response = await ai.sendMessage(newMessage)
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to get AI response')
      }
      
      // Send AI response
      await sendMessage(currentConversation.id, response.data)

      setNewMessage('')
    } catch (error: unknown) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsTyping(false)
    }
  }

  if (!currentConversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select or create a conversation to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={{
              ...message,
              role: message.is_user ? 'user' : 'assistant',
              created_at: new Date().toISOString()
            }}
            isUser={message.is_user}
          />
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-pulse">AI is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
} 