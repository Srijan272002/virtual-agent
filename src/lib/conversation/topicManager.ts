import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface Topic {
  name: string
  lastDiscussed: string
  frequency: number
  duration: number
  sentiment: number
  relatedTopics: string[]
  contextHistory: string[]
}

interface TopicTransition {
  fromTopic: string
  toTopic: string
  timestamp: string
  transitionType: 'natural' | 'forced' | 'suggested'
  context: string
}

export class TopicManager {
  private supabase
  private conversationId: string
  private topics: Map<string, Topic> = new Map()
  private currentTopic: string | null = null
  private topicHistory: string[] = []
  private transitions: TopicTransition[] = []
  private lastUpdateTime: string = new Date().toISOString()

  constructor(conversationId: string) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
  }

  async initialize(): Promise<void> {
    const { data: topics } = await this.supabase
      .from('conversation_topics')
      .select('*')
      .eq('conversation_id', this.conversationId)

    if (topics) {
      topics.forEach(topic => {
        this.topics.set(topic.name, {
          name: topic.name,
          lastDiscussed: topic.last_discussed,
          frequency: topic.frequency,
          duration: topic.duration,
          sentiment: topic.sentiment,
          relatedTopics: topic.related_topics,
          contextHistory: topic.context_history
        })
      })
    }

    // Load topic history
    const { data: history } = await this.supabase
      .from('topic_history')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('timestamp', { ascending: true })

    if (history) {
      this.topicHistory = history.map(h => h.topic)
      this.currentTopic = this.topicHistory[this.topicHistory.length - 1] || null
    }
  }

  updateTopic(content: string, sentiment: number): void {
    const timestamp = new Date().toISOString()
    const detectedTopics = this.detectTopics(content)
    
    if (detectedTopics.length === 0) return

    const newTopic = this.selectDominantTopic(detectedTopics, content)
    
    if (newTopic !== this.currentTopic && this.currentTopic) {
      // Record topic transition
      this.transitions.push({
        fromTopic: this.currentTopic,
        toTopic: newTopic,
        timestamp,
        transitionType: this.determineTransitionType(content),
        context: content
      })
    }

    // Update topic stats
    this.updateTopicStats(newTopic, sentiment, content, timestamp)
    
    // Update history
    if (newTopic !== this.currentTopic) {
      this.topicHistory.push(newTopic)
      this.currentTopic = newTopic
    }
  }

  private detectTopics(content: string): string[] {
    const topics = new Set<string>()
    const lowerContent = content.toLowerCase()

    // Use existing topics as keywords
    this.topics.forEach((topic, name) => {
      if (lowerContent.includes(name.toLowerCase())) {
        topics.add(name)
      }
    })

    // Detect new topics using NLP techniques
    const keywords = this.extractKeywords(content)
    keywords.forEach(keyword => {
      if (!topics.has(keyword)) {
        topics.add(keyword)
      }
    })

    return Array.from(topics)
  }

  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>()
    const sentences = content.toLowerCase().split(/[.!?]+/)

    // Simple keyword extraction based on common patterns
    const patterns = [
      /\b(?:talk about|discuss|regarding|concerning)\s+(\w+)\b/i,
      /\b(?:interested in|like|love|enjoy)\s+(\w+)\b/i,
      /\b(?:think|feel|believe)\s+(?:about|that)\s+(\w+)\b/i
    ]

    sentences.forEach(sentence => {
      patterns.forEach(pattern => {
        const matches = sentence.match(pattern)
        if (matches && matches[1]) {
          keywords.add(matches[1])
        }
      })
    })

    return Array.from(keywords)
  }

  private selectDominantTopic(topics: string[], content: string): string {
    if (topics.length === 1) return topics[0]

    // Score topics based on multiple factors
    const scores = new Map<string, number>()

    topics.forEach(topic => {
      let score = 0
      const topicData = this.topics.get(topic)

      // Frequency of topic mention in content
      const regex = new RegExp(`\\b${topic}\\b`, 'gi')
      const mentions = (content.match(regex) || []).length
      score += mentions * 2

      if (topicData) {
        // Previous discussion history
        score += topicData.frequency * 0.5
        
        // Recency of last discussion
        const hoursSinceLastDiscussion = (
          new Date(this.lastUpdateTime).getTime() -
          new Date(topicData.lastDiscussed).getTime()
        ) / (1000 * 60 * 60)
        score -= Math.min(hoursSinceLastDiscussion * 0.1, 5)

        // Topic sentiment
        score += topicData.sentiment > 0 ? 1 : 0
      }

      scores.set(topic, score)
    })

    // Return topic with highest score
    return Array.from(scores.entries())
      .sort(([, a], [, b]) => b - a)[0][0]
  }

  private determineTransitionType(content: string): 'natural' | 'forced' | 'suggested' {
    const transitionPhrases = {
      forced: [
        'let\'s talk about',
        'can we discuss',
        'changing the subject',
        'moving on to'
      ],
      suggested: [
        'speaking of',
        'that reminds me of',
        'on a related note',
        'by the way'
      ]
    }

    const lowerContent = content.toLowerCase()

    if (transitionPhrases.forced.some(phrase => lowerContent.includes(phrase))) {
      return 'forced'
    }

    if (transitionPhrases.suggested.some(phrase => lowerContent.includes(phrase))) {
      return 'suggested'
    }

    return 'natural'
  }

  private updateTopicStats(
    topic: string,
    sentiment: number,
    context: string,
    timestamp: string
  ): void {
    const existing = this.topics.get(topic)
    const timeDiff = existing ?
      (new Date(timestamp).getTime() - new Date(existing.lastDiscussed).getTime()) / 1000 :
      0

    if (existing) {
      existing.frequency += 1
      existing.duration += timeDiff
      existing.sentiment = (existing.sentiment * (existing.frequency - 1) + sentiment) / existing.frequency
      existing.lastDiscussed = timestamp
      existing.contextHistory.push(context)
      if (existing.contextHistory.length > 5) {
        existing.contextHistory.shift()
      }
      this.updateRelatedTopics(topic, context)
    } else {
      this.topics.set(topic, {
        name: topic,
        lastDiscussed: timestamp,
        frequency: 1,
        duration: 0,
        sentiment,
        relatedTopics: [],
        contextHistory: [context]
      })
    }

    this.lastUpdateTime = timestamp
  }

  private updateRelatedTopics(topic: string, context: string): void {
    const topicData = this.topics.get(topic)
    if (!topicData) return

    const relatedTopics = new Set<string>()
    
    // Find topics mentioned together
    this.topics.forEach((otherTopicData, otherTopic) => {
      if (otherTopic !== topic && context.toLowerCase().includes(otherTopic.toLowerCase())) {
        relatedTopics.add(otherTopic)
      }
    })

    topicData.relatedTopics = Array.from(new Set([...topicData.relatedTopics, ...relatedTopics]))
  }

  async getTopicSummary(): Promise<{
    currentTopic: string | null
    recentTopics: string[]
    topicStats: Array<{
      topic: string
      frequency: number
      duration: number
      sentiment: number
    }>
    suggestedTransitions: Array<{
      fromTopic: string
      toTopic: string
      confidence: number
    }>
  }> {
    const recentTopics = this.topicHistory.slice(-5)
    
    const topicStats = Array.from(this.topics.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(({ name, frequency, duration, sentiment }) => ({
        topic: name,
        frequency,
        duration,
        sentiment
      }))

    const suggestedTransitions = this.currentTopic ?
      this.suggestTopicTransitions(this.currentTopic) :
      []

    return {
      currentTopic: this.currentTopic,
      recentTopics,
      topicStats,
      suggestedTransitions
    }
  }

  private suggestTopicTransitions(fromTopic: string): Array<{
    fromTopic: string
    toTopic: string
    confidence: number
  }> {
    const suggestions: Array<{
      fromTopic: string
      toTopic: string
      confidence: number
    }> = []

    const currentTopicData = this.topics.get(fromTopic)
    if (!currentTopicData) return suggestions

    // Score potential transitions
    this.topics.forEach((toTopicData, toTopic) => {
      if (toTopic === fromTopic) return

      let confidence = 0

      // Related topics get higher confidence
      if (currentTopicData.relatedTopics.includes(toTopic)) {
        confidence += 0.3
      }

      // Topics with positive sentiment get higher confidence
      if (toTopicData.sentiment > 0) {
        confidence += 0.2
      }

      // Topics not recently discussed get higher confidence
      const hoursSinceLastDiscussion = (
        new Date(this.lastUpdateTime).getTime() -
        new Date(toTopicData.lastDiscussed).getTime()
      ) / (1000 * 60 * 60)
      if (hoursSinceLastDiscussion > 24) {
        confidence += 0.2
      }

      // Frequently discussed topics get higher confidence
      confidence += Math.min(toTopicData.frequency * 0.1, 0.3)

      if (confidence > 0.3) {
        suggestions.push({
          fromTopic,
          toTopic,
          confidence
        })
      }
    })

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }

  async saveToDatabase(): Promise<void> {
    // Save topics
    const topicData = Array.from(this.topics.values()).map(topic => ({
      conversation_id: this.conversationId,
      name: topic.name,
      last_discussed: topic.lastDiscussed,
      frequency: topic.frequency,
      duration: topic.duration,
      sentiment: topic.sentiment,
      related_topics: topic.relatedTopics,
      context_history: topic.contextHistory
    }))

    // Save topic history
    const historyData = this.topicHistory.map((topic, index) => ({
      conversation_id: this.conversationId,
      topic,
      timestamp: new Date(Date.now() - (this.topicHistory.length - index) * 1000).toISOString()
    }))

    await Promise.all([
      this.supabase
        .from('conversation_topics')
        .upsert(topicData, { onConflict: 'conversation_id,name' }),
      this.supabase
        .from('topic_history')
        .upsert(historyData, { onConflict: 'conversation_id,timestamp' })
    ])
  }
} 