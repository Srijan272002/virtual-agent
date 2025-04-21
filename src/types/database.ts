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

export type Message = {
  id: string
  conversation_id: string
  content: string
  role: 'user' | 'assistant'
  created_at: string
  embedding: number[] | null
}

export type PersonalityTrait = {
  id: string
  user_id: string
  trait_name: string
  trait_value: number
  created_at: string
  updated_at: string
}

export type Memory = {
  id: string
  user_id: string
  content: string
  importance: number
  created_at: string
  last_accessed: string
  embedding: number[] | null
}

export type Database = {
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
        Update: Partial<Omit<Message, 'id' | 'created_at'>>
      }
      personality_traits: {
        Row: PersonalityTrait
        Insert: Omit<PersonalityTrait, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PersonalityTrait, 'id' | 'created_at' | 'updated_at'>>
      }
      memories: {
        Row: Memory
        Insert: Omit<Memory, 'id' | 'created_at' | 'last_accessed'>
        Update: Partial<Omit<Memory, 'id' | 'created_at'>>
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