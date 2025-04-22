'use client'

import { useState, useRef, useEffect } from 'react'
import { VoiceMessage } from './VoiceMessage'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessageAction: (message: string) => Promise<void>
  onSendVoiceMessage?: (blob: Blob) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({ 
  onSendMessageAction, 
  onSendVoiceMessage,
  disabled = false, 
  placeholder = 'Type a message...' 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      await onSendMessageAction(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    if (onSendVoiceMessage) {
      setIsRecording(false)
      await onSendVoiceMessage(blob)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 bg-white border-t">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isRecording}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm",
              "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            style={{ maxHeight: '200px' }}
          />
        </div>
        <div className="flex gap-2">
          {onSendVoiceMessage && (
            <VoiceMessage
              mode="record"
              onRecordingComplete={handleVoiceRecordingComplete}
              className="flex-shrink-0"
            />
          )}
          <button
            type="submit"
            disabled={!message.trim() || disabled || isRecording}
            className={cn(
              "flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              (!message.trim() || disabled || isRecording)
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            )}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  )
} 