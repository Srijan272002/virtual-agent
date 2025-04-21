export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  userId?: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  userId: string
} 