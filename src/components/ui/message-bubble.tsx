"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Message } from "@/types/chat"
import { format } from "date-fns"

interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: Message
  isAI?: boolean
}

export function MessageBubble({ message, isAI = false, className, ...props }: MessageBubbleProps) {
  const timestamp = message.created_at ? format(new Date(message.created_at), 'HH:mm') : ''
  
  return (
    <div
      className={cn(
        "flex w-full gap-3 p-4",
        isAI ? "bg-muted/50" : "bg-background",
        className
      )}
      {...props}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={isAI ? "/ai-avatar.png" : "/user-avatar.png"} />
        <AvatarFallback>{isAI ? "AI" : "You"}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isAI ? "AI Assistant" : "You"}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          )}
        </div>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
} 