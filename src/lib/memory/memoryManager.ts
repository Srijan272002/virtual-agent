import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Memory } from '@/types/database'

export interface MemoryConfig {
  maxMemories: number
  minImportance: number
  decayRate: number
  similarityThreshold: number
}

const DEFAULT_CONFIG: MemoryConfig = {
  maxMemories: 100,
  minImportance: 0.3,
  decayRate: 0.05,
  similarityThreshold: 0.7,
}

interface EmotionalKeywords {
  positive: string[]
  negative: string[]
  neutral: string[]
}

const EMOTIONAL_KEYWORDS: EmotionalKeywords = {
  positive: ['love', 'happy', 'excited', 'wonderful', 'amazing', 'great', 'joy', 'delighted'],
  negative: ['hate', 'sad', 'angry', 'upset', 'terrible', 'awful', 'disappointed', 'frustrated'],
  neutral: ['think', 'believe', 'understand', 'know', 'remember', 'consider']
}

const IMPORTANCE_FACTORS = {
  EMOTIONAL_WEIGHT: 0.3,
  LENGTH_WEIGHT: 0.15,
  PERSONAL_INFO_WEIGHT: 0.25,
  RECENCY_WEIGHT: 0.15,
  CONTEXT_WEIGHT: 0.15
}

export class MemoryManager {
  private supabase
  private conversationId: string
  private config: MemoryConfig

  constructor(conversationId: string, config: Partial<MemoryConfig> = {}) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private calculateImportance(content: string, context: string): number {
    const factors: { [key: string]: number } = {}
    
    // 1. Emotional Content (30%)
    factors.emotional = this.calculateEmotionalImportance(content)
    
    // 2. Length and Complexity (15%)
    factors.length = Math.min(content.length / 1000, 1) * 
      (content.split(' ').length / 200) // Normalize by typical message length
    
    // 3. Personal Information (25%)
    factors.personalInfo = this.calculatePersonalInfoImportance(content)
    
    // 4. Recency Bonus (15%)
    factors.recency = 1.0 // Start with max recency for new memories
    
    // 5. Context Importance (15%)
    factors.context = this.calculateContextImportance(context)

    // Calculate weighted average
    const importance = 
      factors.emotional * IMPORTANCE_FACTORS.EMOTIONAL_WEIGHT +
      factors.length * IMPORTANCE_FACTORS.LENGTH_WEIGHT +
      factors.personalInfo * IMPORTANCE_FACTORS.PERSONAL_INFO_WEIGHT +
      factors.recency * IMPORTANCE_FACTORS.RECENCY_WEIGHT +
      factors.context * IMPORTANCE_FACTORS.CONTEXT_WEIGHT

    return Math.min(Math.max(importance, 0), 1)
  }

  private calculateEmotionalImportance(content: string): number {
    const lowerContent = content.toLowerCase()
    let emotionalScore = 0
    
    // Check for emotional keywords
    EMOTIONAL_KEYWORDS.positive.forEach(word => {
      if (lowerContent.includes(word)) emotionalScore += 0.2
    })
    EMOTIONAL_KEYWORDS.negative.forEach(word => {
      if (lowerContent.includes(word)) emotionalScore += 0.2
    })
    
    // Check for exclamation marks and question marks
    const exclamationCount = (content.match(/!/g) || []).length
    const questionCount = (content.match(/\?/g) || []).length
    emotionalScore += Math.min((exclamationCount + questionCount) * 0.1, 0.3)
    
    // Check for ALL CAPS words (emphasis)
    const capsWords = content.split(' ').filter(word => 
      word.length > 2 && word === word.toUpperCase()
    ).length
    emotionalScore += Math.min(capsWords * 0.1, 0.2)
    
    return Math.min(emotionalScore, 1)
  }

  private calculatePersonalInfoImportance(content: string): number {
    const lowerContent = content.toLowerCase()
    let personalScore = 0
    
    // Personal pronouns
    const personalPronouns = ['i', 'me', 'my', 'mine', 'myself']
    personalPronouns.forEach(pronoun => {
      const matches = lowerContent.match(new RegExp(`\\b${pronoun}\\b`, 'g'))
      if (matches) personalScore += matches.length * 0.1
    })
    
    // Important personal topics
    const personalTopics = [
      'family', 'friend', 'love', 'hate', 'feel', 'think', 'believe',
      'want', 'need', 'dream', 'hope', 'fear', 'work', 'study'
    ]
    personalTopics.forEach(topic => {
      if (lowerContent.includes(topic)) personalScore += 0.15
    })
    
    // Numbers (potentially dates, ages, etc.)
    const numbers = content.match(/\d+/g)
    if (numbers) personalScore += Math.min(numbers.length * 0.1, 0.2)
    
    return Math.min(personalScore, 1)
  }

  private calculateContextImportance(context: string): number {
    const lowerContext = context.toLowerCase()
    let contextScore = 0
    
    // Important context indicators
    const importantContexts = [
      'important', 'remember', 'key', 'critical', 'essential',
      'never forget', 'always', 'must', 'should'
    ]
    
    importantContexts.forEach(indicator => {
      if (lowerContext.includes(indicator)) contextScore += 0.25
    })
    
    // Time-related context
    const timeIndicators = ['today', 'tomorrow', 'yesterday', 'next', 'last', 'future']
    timeIndicators.forEach(indicator => {
      if (lowerContext.includes(indicator)) contextScore += 0.15
    })
    
    return Math.min(contextScore, 1)
  }

  private async pruneOldMemories(): Promise<void> {
    const { data: memories } = await this.supabase
      .from('memories')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('importance', { ascending: true })

    if (!memories || memories.length <= this.config.maxMemories) return

    const toDelete = memories
      .slice(0, memories.length - this.config.maxMemories)
      .map(m => m.id)

    await this.supabase
      .from('memories')
      .delete()
      .in('id', toDelete)
  }

  async addMemory(
    content: string,
    context: string = '',
    attributes: string[] = []
  ): Promise<void> {
    const importance = this.calculateImportance(content, context)
    if (importance < this.config.minImportance) return

    // Simple sentiment analysis
    const sentiment = content.toLowerCase().includes('happy') || content.toLowerCase().includes('good')
      ? 'positive'
      : content.toLowerCase().includes('sad') || content.toLowerCase().includes('bad')
      ? 'negative'
      : 'neutral'

    const { error } = await this.supabase
      .from('memories')
      .insert({
        conversation_id: this.conversationId,
        content,
        importance,
        context,
        sentiment,
        associated_attributes: attributes,
        embedding: null, // TODO: Add embedding generation
      })

    if (error) {
      console.error('Error adding memory:', error)
      throw error
    }

    await this.pruneOldMemories()
  }

  async getRelevantMemories(query: string, limit: number = 5): Promise<Memory[]> {
    // For now, use simple text matching
    // TODO: Implement proper vector similarity search
    const { data: memories } = await this.supabase
      .from('memories')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('importance', { ascending: false })
      .limit(limit)

    if (!memories) return []

    // Update last_accessed
    const now = new Date().toISOString()
    await this.supabase
      .from('memories')
      .update({ last_accessed: now })
      .in('id', memories.map(m => m.id))

    return memories
  }

  async getMemoriesByAttribute(attribute: string): Promise<Memory[]> {
    const { data: memories } = await this.supabase
      .from('memories')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .contains('associated_attributes', [attribute])
      .order('importance', { ascending: false })

    return memories || []
  }

  async getMemorySnapshot(): Promise<string> {
    const { data: memories } = await this.supabase
      .from('memories')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('last_accessed', { ascending: false })
      .limit(3)

    if (!memories || memories.length === 0) {
      return 'No significant memories.'
    }

    return memories
      .map(m => `${m.content} (${Math.round(m.importance * 100)}% importance)`)
      .join('\n')
  }

  async searchMemories(query: string): Promise<Memory[]> {
    // Simple text search implementation
    // TODO: Implement vector similarity search
    const { data: memories } = await this.supabase
      .from('memories')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .textSearch('content', query)
      .order('importance', { ascending: false })

    return memories || []
  }
} 