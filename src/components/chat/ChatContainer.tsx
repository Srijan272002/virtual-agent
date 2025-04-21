'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'

interface Message {
  id: string
  content: string
  timestamp: Date | string
  isUser: boolean
  avatar?: string | null
}

interface ChatContainerProps {
  messages: Message[]
  onSendMessageAction: (message: string) => Promise<void>
  isTyping?: boolean
  disabled?: boolean
}

export default function ChatContainer({
  messages,
  onSendMessageAction,
  isTyping = false,
  disabled = false,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            id={message.id}
            content={message.content}
            timestamp={message.timestamp}
            isUser={message.isUser}
            avatar={message.avatar || undefined}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendAction={onSendMessageAction}
        disabled={disabled}
        placeholder="Type your message..."
      />
    </div>
  )
} 