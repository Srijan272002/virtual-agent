import { useState, useEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { Button } from '@/components/ui/button'
import { ReplyIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'
import type { Message, MessageReaction } from '@/types/database'

const REACTIONS: string[] = ['❤️', '👍', '😊', '😂', '🎉']

interface ThreadedMessageProps {
  message: Message
  isUser: boolean
  userId?: string
  avatar?: string
  onReply: (parentId: string) => void
}

export function ThreadedMessage({
  message,
  isUser,
  userId,
  avatar,
  onReply,
}: ThreadedMessageProps) {
  const [isThreadExpanded, setIsThreadExpanded] = useState(false)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const supabase = createClientComponentClient<Database>()

  const loadThreadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('parent_id', message.id)
      .order('created_at', { ascending: true })

    if (data) {
      setThreadMessages(data)
    }
  }, [message.id, supabase])

  const loadReactions = useCallback(async () => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', message.id)

    if (data) {
      setReactions(data)
    }
  }, [message.id, supabase])

  const subscribeToUpdates = useCallback(() => {
    // Subscribe to new thread messages
    const threadSubscription = supabase
      .channel(`thread-${message.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${message.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setThreadMessages((prev) => [...prev, payload.new as Message])
          } else if (payload.eventType === 'DELETE') {
            setThreadMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            )
          } else if (payload.eventType === 'UPDATE') {
            setThreadMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            )
          }
        }
      )
      .subscribe()

    // Subscribe to reactions
    const reactionSubscription = supabase
      .channel(`reactions-${message.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${message.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReactions((prev) => [...prev, payload.new as MessageReaction])
          } else if (payload.eventType === 'DELETE') {
            setReactions((prev) =>
              prev.filter((reaction) => reaction.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      threadSubscription.unsubscribe()
      reactionSubscription.unsubscribe()
    }
  }, [message.id, supabase])

  useEffect(() => {
    if ((message.thread_count ?? 0) > 0 && isThreadExpanded) {
      loadThreadMessages()
    }
    loadReactions()
    const cleanup = subscribeToUpdates()
    return cleanup
  }, [
    message.thread_count,
    isThreadExpanded,
    loadThreadMessages,
    loadReactions,
    subscribeToUpdates
  ])

  const processedReactions = REACTIONS.map((type) => {
    const reactionCount = reactions.filter((r) => r.type === type).length
    const hasReacted = reactions.some(
      (r) => r.type === type && r.user_id === userId
    )
    return {
      type,
      count: reactionCount,
      hasReacted,
    }
  })

  return (
    <div className="space-y-2">
      <MessageBubble
        message={message}
        isUser={isUser}
        userId={userId}
        avatar={avatar}
        reactions={processedReactions}
        onDelete={async () => {
          await supabase
            .from('messages')
            .update({ deleted: true })
            .eq('id', message.id)
        }}
      />
      
      <div className="ml-10 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onReply(message.id)}
        >
          <ReplyIcon className="h-4 w-4 mr-1" />
          Reply
        </Button>
        
        {(message.thread_count ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setIsThreadExpanded(!isThreadExpanded)}
          >
            {isThreadExpanded ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
          </Button>
        )}
      </div>

      {isThreadExpanded && (message.thread_count ?? 0) > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-muted pl-4">
          {threadMessages.map((threadMessage) => (
            <MessageBubble
              key={threadMessage.id}
              message={threadMessage}
              isUser={threadMessage.role === 'user'}
              userId={userId}
              avatar={avatar}
              reactions={processedReactions}
              onDelete={async () => {
                await supabase
                  .from('messages')
                  .update({ deleted: true })
                  .eq('id', threadMessage.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
} 