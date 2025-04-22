'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/database'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceMessage } from './VoiceMessage'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageBubbleProps {
  message: Message
  isUser: boolean
  userId?: string
  avatar?: string
  reactions?: Array<{
    type: string
    count: number
    hasReacted: boolean
  }>
  onDelete?: () => Promise<void>
}

export function MessageBubble({ message, isUser, userId, avatar, reactions, onDelete }: MessageBubbleProps) {
  const canDelete = userId && message.user_id === userId
  const isVoiceMessage = message.type === 'voice' && message.voice_url

  return (
    <div className={cn("flex w-full gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatar || (isUser ? "/user-avatar.png" : "/ai-avatar.png")} />
        <AvatarFallback>{isUser ? "U" : "AI"}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 gap-2">
        <Card className={cn(
          "max-w-[80%] p-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isVoiceMessage ? (
            <VoiceMessage
              mode="playback"
              audioUrl={message.voice_url}
              className={cn(
                "min-w-[200px]",
                isUser ? "text-primary-foreground" : "text-foreground"
              )}
            />
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
          {reactions && reactions.length > 0 && (
            <div className="mt-2 flex gap-1">
              {reactions.map((reaction) => (
                <span key={reaction.type} className="text-xs">
                  {reaction.type} {reaction.count}
                </span>
              ))}
            </div>
          )}
        </Card>
        {canDelete && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
} 