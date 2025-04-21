export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Conversation = {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  last_message_at: string
}

export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  conversation_id: string
  content: string
  role: Role
  created_at: string
  parent_id?: string
  embedding?: number[]
  deleted?: boolean
  thread_count?: number
  user_id?: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  type: string
  created_at: string
}

export type PersonalityTrait = {
  id: string
  user_id: string
  trait_name: string
  trait_value: number
  created_at: string
  updated_at: string
}

export type PersonalityAttribute = {
  id: string
  conversation_id: string
  name: string
  value: number
  created_at: string
  updated_at: string
}

export type Memory = {
  id: string
  conversation_id: string
  content: string
  importance: number
  context: string
  embedding: number[] | null
  created_at: string
  last_accessed: string
  sentiment: 'positive' | 'negative' | 'neutral'
  associated_attributes: string[]
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at' | 'last_message_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at' | 'updated_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Message>
      }
      personality_traits: {
        Row: PersonalityTrait
        Insert: Omit<PersonalityTrait, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PersonalityTrait, 'id' | 'created_at' | 'updated_at'>>
      }
      personality_attributes: {
        Row: PersonalityAttribute
        Insert: Omit<PersonalityAttribute, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PersonalityAttribute, 'id' | 'created_at' | 'updated_at'>>
      }
      memories: {
        Row: Memory
        Insert: Omit<Memory, 'id' | 'created_at' | 'last_accessed'>
        Update: Partial<Omit<Memory, 'id' | 'created_at'>>
      }
      message_reactions: {
        Row: MessageReaction
        Insert: Omit<MessageReaction, 'id' | 'created_at'>
        Update: Partial<MessageReaction>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 