import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Message } from '@/types/database'

export interface ContextConfig {
  maxContextWindow: number
  relevanceThreshold: number
  contextRetentionHours: number
  topicChangeThreshold: number
  maxTopicDistance: number
}

const DEFAULT_CONFIG: ContextConfig = {
  maxContextWindow: 10,
  relevanceThreshold: 0.6,
  contextRetentionHours: 24,
  topicChangeThreshold: 0.7,
  maxTopicDistance: 0.8,
}

interface Topic {
  name: string
  keywords: string[]
  weight: number
}

const TOPICS: Topic[] = [
  {
    name: 'personal',
    keywords: ['i', 'me', 'my', 'mine', 'feel', 'think', 'want', 'need'],
    weight: 1.0
  },
  {
    name: 'relationships',
    keywords: ['family', 'friend', 'love', 'relationship', 'together', 'us', 'we'],
    weight: 0.9
  },
  {
    name: 'activities',
    keywords: ['do', 'play', 'work', 'study', 'learn', 'create', 'make'],
    weight: 0.7
  },
  {
    name: 'emotions',
    keywords: ['happy', 'sad', 'angry', 'excited', 'worried', 'scared', 'love', 'hate'],
    weight: 0.8
  },
  {
    name: 'preferences',
    keywords: ['like', 'dislike', 'prefer', 'favorite', 'enjoy', 'hate'],
    weight: 0.6
  }
]

export class ContextManager {
  private supabase
  private conversationId: string
  private config: ContextConfig
  private activeContext: Message[] = []
  private currentTopics: Map<string, number> = new Map()

  constructor(conversationId: string, config: Partial<ContextConfig> = {}) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async initialize(): Promise<void> {
    // Load recent messages for context
    const { data: messages } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('created_at', { ascending: false })
      .limit(this.config.maxContextWindow)

    if (messages) {
      this.activeContext = messages.reverse()
    }
  }

  async addMessage(message: Message): Promise<void> {
    this.activeContext.push(message)
    
    // Maintain context window size
    if (this.activeContext.length > this.config.maxContextWindow) {
      this.activeContext.shift()
    }
  }

  private analyzeTopics(content: string): Map<string, number> {
    const topics = new Map<string, number>()
    const words = content.toLowerCase().split(/\s+/)
    
    TOPICS.forEach(topic => {
      let score = 0
      let matches = 0
      
      topic.keywords.forEach(keyword => {
        const count = words.filter(word => word.includes(keyword)).length
        if (count > 0) {
          score += count * topic.weight
          matches++
        }
      })
      
      if (matches > 0) {
        topics.set(topic.name, score / topic.keywords.length)
      }
    })
    
    return topics
  }

  private updateCurrentTopics(newTopics: Map<string, number>): void {
    // Decay existing topics
    this.currentTopics.forEach((value, topic) => {
      this.currentTopics.set(topic, value * 0.8)
    })
    
    // Add new topics
    newTopics.forEach((score, topic) => {
      const currentScore = this.currentTopics.get(topic) || 0
      this.currentTopics.set(topic, currentScore + score)
    })
  }

  private calculateTopicDistance(topics1: Map<string, number>, topics2: Map<string, number>): number {
    let distance = 0
    let totalWeight = 0
    
    // Compare all topics present in either map
    const allTopics = new Set([...topics1.keys(), ...topics2.keys()])
    
    allTopics.forEach(topic => {
      const score1 = topics1.get(topic) || 0
      const score2 = topics2.get(topic) || 0
      const weight = Math.max(score1, score2)
      
      distance += Math.abs(score1 - score2) * weight
      totalWeight += weight
    })
    
    return totalWeight > 0 ? distance / totalWeight : 1
  }

  async analyzeContextContinuity(): Promise<{
    isCoherent: boolean
    gaps: string[]
    topicShifts: string[]
  }> {
    const gaps: string[] = []
    const topicShifts: string[] = []
    let isCoherent = true

    // Check for time gaps
    for (let i = 1; i < this.activeContext.length; i++) {
      const timeDiff = new Date(this.activeContext[i].created_at).getTime() -
                      new Date(this.activeContext[i - 1].created_at).getTime()
      
      if (timeDiff > 1000 * 60 * 30) { // 30 minute gap
        gaps.push(`Time gap of ${Math.round(timeDiff / (1000 * 60))} minutes detected`)
        isCoherent = false
      }
      
      // Analyze topic continuity
      const prevTopics = this.analyzeTopics(this.activeContext[i - 1].content)
      const currentTopics = this.analyzeTopics(this.activeContext[i].content)
      const topicDistance = this.calculateTopicDistance(prevTopics, currentTopics)
      
      if (topicDistance > this.config.topicChangeThreshold) {
        const prevTopicsList = Array.from(prevTopics.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([topic]) => topic)
          .slice(0, 2)
        
        const currentTopicsList = Array.from(currentTopics.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([topic]) => topic)
          .slice(0, 2)
        
        topicShifts.push(
          `Topic shift from ${prevTopicsList.join('/')} to ${currentTopicsList.join('/')}`
        )
        
        if (topicDistance > this.config.maxTopicDistance) {
          isCoherent = false
        }
      }
    }

    return { isCoherent, gaps, topicShifts }
  }

  async getRelevantContext(query: string): Promise<Message[]> {
    // Get recent context messages
    const recentContext = this.activeContext.slice(-5)
    
    // Analyze query topics
    const queryTopics = this.analyzeTopics(query)
    
    // Get messages with similar topics and content
    const { data: similarMessages } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .textSearch('content', query)
      .limit(5)

    // Filter and sort similar messages by topic relevance
    const topicRelevantMessages = (similarMessages || [])
      .map(message => ({
        message,
        relevance: this.calculateTopicDistance(
          queryTopics,
          this.analyzeTopics(message.content)
        )
      }))
      .filter(({ relevance }) => relevance < this.config.topicChangeThreshold)
      .sort((a, b) => a.relevance - b.relevance)
      .map(({ message }) => message)

    return [...recentContext, ...topicRelevantMessages]
  }

  async getContextSummary(): Promise<string> {
    if (this.activeContext.length === 0) {
      return 'No active context.'
    }

    const lastMessages = this.activeContext.slice(-3)
    const currentTopics = Array.from(this.currentTopics.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([topic, score]) => `${topic} (${Math.round(score * 100)}%)`)
      .join(', ')

    return `Current topics: ${currentTopics}\n\nRecent messages:\n` +
      lastMessages
        .map(m => `${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
        .join('\n')
  }

  getActiveContext(): Message[] {
    return this.activeContext
  }

  async pruneOldContext(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - this.config.contextRetentionHours)

    this.activeContext = this.activeContext.filter(
      message => new Date(message.created_at) > cutoffDate
    )
  }
} 