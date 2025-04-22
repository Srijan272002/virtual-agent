import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface Interest {
  topic: string
  sentiment: number // -1 to 1
  confidence: number // 0 to 1
  lastUpdated: string
  frequency: number
  relatedTopics: string[]
}

interface Preference {
  category: string
  value: string
  strength: number // 0 to 1
  lastUpdated: string
  context: string[]
}

const INTEREST_CATEGORIES = {
  activities: ['sports', 'reading', 'gaming', 'cooking', 'travel', 'music', 'art'],
  entertainment: ['movies', 'books', 'shows', 'games', 'music', 'artists'],
  topics: ['technology', 'science', 'politics', 'culture', 'fashion', 'food'],
  social: ['family', 'friends', 'dating', 'socializing', 'community'],
  lifestyle: ['health', 'fitness', 'food', 'fashion', 'home', 'work']
}

const PREFERENCE_TYPES = {
  communication: ['direct', 'indirect', 'formal', 'casual', 'detailed', 'brief'],
  interaction: ['frequent', 'occasional', 'deep', 'light', 'serious', 'playful'],
  content: ['intellectual', 'emotional', 'practical', 'creative', 'social', 'technical'],
  style: ['humor', 'sarcasm', 'empathy', 'logic', 'enthusiasm', 'calmness']
}

export class InterestLearner {
  private supabase
  private conversationId: string
  private interests: Map<string, Interest> = new Map()
  private preferences: Map<string, Preference> = new Map()
  private interactionHistory: Array<{
    timestamp: string
    topic: string
    sentiment: number
    context: string
  }> = []
  private lastCategoryExploration: Record<string, number> = {}

  constructor(conversationId: string) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
  }

  async initialize(): Promise<void> {
    // Load existing interests and preferences from database
    const { data: interests } = await this.supabase
      .from('user_interests')
      .select('*')
      .eq('conversation_id', this.conversationId)

    const { data: preferences } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('conversation_id', this.conversationId)

    if (interests) {
      interests.forEach(interest => {
        this.interests.set(interest.topic, {
          topic: interest.topic,
          sentiment: interest.sentiment,
          confidence: interest.confidence,
          lastUpdated: interest.last_updated,
          frequency: interest.frequency,
          relatedTopics: interest.related_topics
        })
      })
    }

    if (preferences) {
      preferences.forEach(pref => {
        this.preferences.set(`${pref.category}:${pref.value}`, {
          category: pref.category,
          value: pref.value,
          strength: pref.strength,
          lastUpdated: pref.last_updated,
          context: pref.context
        })
      })
    }
  }

  async processMessage(content: string, sentiment: number): Promise<void> {
    const timestamp = new Date().toISOString()
    const topics = this.extractTopics(content)
    const preferences = this.inferPreferences(content)

    // Update interests
    topics.forEach(topic => {
      this.updateInterest(topic, sentiment, content)
      this.interactionHistory.push({
        timestamp,
        topic,
        sentiment,
        context: content
      })
    })

    // Update preferences
    preferences.forEach(pref => {
      this.updatePreference(pref.category, pref.value, pref.confidence, content)
    })

    // Prune old history
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100)
    }

    await this.saveToDatabase()
  }

  private extractTopics(content: string): string[] {
    const topics = new Set<string>()
    const lowerContent = content.toLowerCase()

    // Check each category and track topics with their categories
    Object.entries(INTEREST_CATEGORIES).forEach(([category, keywords]) => {
      const categoryTopics = keywords.filter(keyword => 
        lowerContent.includes(keyword)
      ).map(keyword => ({
        topic: keyword,
        category
      }))

      categoryTopics.forEach(({ topic }) => topics.add(topic))
    })

    return Array.from(topics)
  }

  private inferPreferences(content: string): Array<{
    category: string
    value: string
    confidence: number
  }> {
    const preferences: Array<{
      category: string
      value: string
      confidence: number
    }> = []

    Object.entries(PREFERENCE_TYPES).forEach(([category, values]) => {
      values.forEach(value => {
        const confidence = this.calculatePreferenceConfidence(content, value)
        if (confidence > 0.3) {
          preferences.push({ category, value, confidence })
        }
      })
    })

    return preferences
  }

  private calculatePreferenceConfidence(content: string, preference: string): number {
    const indicators = {
      direct: /\b(straight[- ]?forward|direct|exactly|precisely)\b/i,
      indirect: /\b(maybe|perhaps|possibly|kind of|sort of)\b/i,
      formal: /\b(proper|formal|respectful|professional)\b/i,
      casual: /\b(casual|relaxed|chill|easy[- ]?going)\b/i,
      humor: /\b(fun|funny|joke|lol|haha|😄|😂)\b/i,
      serious: /\b(serious|important|crucial|significant)\b/i
    }

    const indicator = indicators[preference as keyof typeof indicators]
    if (!indicator) return 0

    const matches = (content.match(indicator) || []).length
    return Math.min(matches * 0.3, 1)
  }

  private updateInterest(topic: string, sentiment: number, context: string): void {
    const existing = this.interests.get(topic)
    const now = new Date().toISOString()

    if (existing) {
      // Update existing interest
      existing.sentiment = (existing.sentiment * existing.frequency + sentiment) / (existing.frequency + 1)
      existing.frequency += 1
      existing.confidence = Math.min(existing.confidence + 0.1, 1)
      existing.lastUpdated = now
      this.updateRelatedTopics(topic, context)
    } else {
      // Create new interest
      this.interests.set(topic, {
        topic,
        sentiment,
        confidence: 0.3,
        lastUpdated: now,
        frequency: 1,
        relatedTopics: this.findRelatedTopics(topic, context)
      })
    }
  }

  private updatePreference(category: string, value: string, confidence: number, context: string): void {
    const key = `${category}:${value}`
    const existing = this.preferences.get(key)
    const now = new Date().toISOString()

    if (existing) {
      // Update existing preference
      existing.strength = (existing.strength + confidence) / 2
      existing.lastUpdated = now
      existing.context.push(context)
      if (existing.context.length > 5) {
        existing.context.shift()
      }
    } else {
      // Create new preference
      this.preferences.set(key, {
        category,
        value,
        strength: confidence,
        lastUpdated: now,
        context: [context]
      })
    }
  }

  private updateRelatedTopics(topic: string, context: string): void {
    const interest = this.interests.get(topic)
    if (!interest) return

    const relatedTopics = this.findRelatedTopics(topic, context)
    interest.relatedTopics = Array.from(new Set([...interest.relatedTopics, ...relatedTopics]))
  }

  private findRelatedTopics(topic: string, context: string): string[] {
    const related: string[] = []
    const lowerContext = context.toLowerCase()

    Object.values(INTEREST_CATEGORIES).flat().forEach(otherTopic => {
      if (otherTopic !== topic && lowerContext.includes(otherTopic)) {
        related.push(otherTopic)
      }
    })

    return related
  }

  async getInterestSummary(): Promise<{
    topInterests: Array<{ topic: string; strength: number }>
    recentPreferences: Array<{ category: string; value: string; strength: number }>
    suggestedTopics: string[]
  }> {
    const topInterests = Array.from(this.interests.values())
      .sort((a, b) => (b.frequency * b.confidence) - (a.frequency * a.confidence))
      .slice(0, 5)
      .map(interest => ({
        topic: interest.topic,
        strength: interest.frequency * interest.confidence
      }))

    const recentPreferences = Array.from(this.preferences.values())
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
      .slice(0, 3)
      .map(pref => ({
        category: pref.category,
        value: pref.value,
        strength: pref.strength
      }))

    const suggestedTopics = this.getSuggestedTopics()

    return {
      topInterests,
      recentPreferences,
      suggestedTopics
    }
  }

  private getSuggestedTopics(): string[] {
    const suggestions = new Set<string>()
    const categoryExploration: Record<string, number> = {}
    
    // Get topics related to top interests
    const topInterests = Array.from(this.interests.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)

    topInterests.forEach(interest => {
      interest.relatedTopics.forEach(topic => {
        if (!this.interests.has(topic)) {
          suggestions.add(topic)
        }
      })
    })

    // Add topics from underexplored categories
    Object.entries(INTEREST_CATEGORIES).forEach(([category, topics]) => {
      const exploredTopics = topics.filter(topic => this.interests.has(topic))
      categoryExploration[category] = exploredTopics.length

      if (exploredTopics.length < 2) {
        const unexploredTopics = topics
          .filter(topic => !this.interests.has(topic))
          .slice(0, 2)
        
        unexploredTopics.forEach(topic => suggestions.add(topic))
      }
    })

    // Store category exploration data for potential future use
    this.lastCategoryExploration = categoryExploration

    return Array.from(suggestions).slice(0, 5)
  }

  private async saveToDatabase(): Promise<void> {
    // Save interests
    const interestData = Array.from(this.interests.values()).map(interest => ({
      conversation_id: this.conversationId,
      topic: interest.topic,
      sentiment: interest.sentiment,
      confidence: interest.confidence,
      last_updated: interest.lastUpdated,
      frequency: interest.frequency,
      related_topics: interest.relatedTopics
    }))

    // Save preferences
    const preferenceData = Array.from(this.preferences.values()).map(pref => ({
      conversation_id: this.conversationId,
      category: pref.category,
      value: pref.value,
      strength: pref.strength,
      last_updated: pref.lastUpdated,
      context: pref.context
    }))

    await Promise.all([
      this.supabase
        .from('user_interests')
        .upsert(interestData, { onConflict: 'conversation_id,topic' }),
      this.supabase
        .from('user_preferences')
        .upsert(preferenceData, { onConflict: 'conversation_id,category,value' })
    ])
  }
} 