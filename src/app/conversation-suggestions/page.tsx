import { ConversationSuggestions } from '@/components/ConversationSuggestions'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conversation Suggestions | AI Girlfriend',
  description: 'Discover interesting topics to discuss with your AI partner',
}

export default function ConversationSuggestionsPage() {
  return (
    <div className="container py-10">
      <ConversationSuggestions />
    </div>
  )
} 