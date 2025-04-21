'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface Reaction {
  type: string
  count: number
  hasReacted: boolean
}

interface MessageBubbleProps {
  id: string
  content: string
  timestamp: Date | string
  isUser: boolean
  userId?: string
  avatar?: string
  reactions?: Reaction[]
  onDelete?: () => void
  readReceipts?: string[]
}

const REACTIONS = ['❤️', '👍', '😊', '😂', '🎉']

export function MessageBubble({
  id,
  content,
  timestamp,
  isUser,
  userId,
  avatar,
  reactions = [],
  onDelete,
  readReceipts = [],
}: MessageBubbleProps) {
  const [isDeleted, setIsDeleted] = useState(false)
  const supabase = createClientComponentClient<Database>()
  const timestampDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp

  const handleReaction = async (type: string) => {
    try {
      const { data: existingReaction } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', id)
        .eq('user_id', userId)
        .eq('type', type)
        .single()

      if (existingReaction) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id)
      } else {
        await supabase.from('message_reactions').insert({
          message_id: id,
          user_id: userId,
          type,
        })
      }
    } catch (error) {
      console.error('Error handling reaction:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await supabase
        .from('messages')
        .update({ deleted: true })
        .eq('id', id)
      setIsDeleted(true)
      onDelete?.()
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  return (
    <div
      className={`flex ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } items-start gap-2 group`}
    >
      <Avatar className="w-8 h-8">
        <AvatarImage src={avatar} />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>

      <div
        className={`flex flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`relative px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          {isDeleted ? (
            <span className="italic text-muted-foreground">
              This message has been deleted
            </span>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words">{content}</p>
              {isUser && (
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="More options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(timestampDate, { addSuffix: true })}
          </span>
          {readReceipts.length > 0 && (
            <div className="flex -space-x-2">
              {readReceipts.map((receipt, index) => (
                <Avatar key={receipt} className="w-4 h-4 border-2 border-background">
                  <AvatarImage src={receipt} />
                  <AvatarFallback>{index + 1}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>

        {!isDeleted && (
          <div
            className={`flex gap-1 mt-1 ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {REACTIONS.map((reaction) => {
              const reactionData = reactions.find((r) => r.type === reaction)
              return (
                <Button
                  key={reaction}
                  variant={reactionData?.hasReacted ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleReaction(reaction)}
                >
                  {reaction}
                  {reactionData?.count ? ` ${reactionData.count}` : ''}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
} 