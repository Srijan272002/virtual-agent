import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface ModerationConfig {
  profanityThreshold: number
  toxicityThreshold: number
  sensitiveTopicsThreshold: number
  maxMessageLength: number
  bannedWords: string[]
  sensitiveTopics: string[]
  warningWords: string[]
}

interface ModerationResult {
  isAllowed: boolean
  warnings: string[]
  filteredContent: string
  moderationScore: number
  detectedIssues: {
    profanity: boolean
    toxicity: boolean
    sensitiveTopics: boolean
    length: boolean
    bannedWords: string[]
  }
}

const DEFAULT_CONFIG: ModerationConfig = {
  profanityThreshold: 0.7,
  toxicityThreshold: 0.8,
  sensitiveTopicsThreshold: 0.6,
  maxMessageLength: 1000,
  bannedWords: [],
  sensitiveTopics: [
    'politics',
    'religion',
    'violence',
    'drugs',
    'adult content',
    'discrimination'
  ],
  warningWords: []
}

export class ContentModerator {
  private supabase
  private config: ModerationConfig
  private moderationHistory: Array<{
    timestamp: string
    content: string
    result: ModerationResult
  }> = []

  constructor(customConfig: Partial<ModerationConfig> = {}) {
    this.supabase = createClientComponentClient<Database>()
    this.config = { ...DEFAULT_CONFIG, ...customConfig }
  }

  async initialize(): Promise<void> {
    // Load custom moderation rules from database
    const { data: rules } = await this.supabase
      .from('moderation_rules')
      .select('*')

    if (rules) {
      this.config.bannedWords = [
        ...this.config.bannedWords,
        ...rules.filter(r => r.type === 'banned').map(r => r.word)
      ]
      this.config.warningWords = [
        ...this.config.warningWords,
        ...rules.filter(r => r.type === 'warning').map(r => r.word)
      ]
      this.config.sensitiveTopics = [
        ...this.config.sensitiveTopics,
        ...rules.filter(r => r.type === 'sensitive').map(r => r.topic)
      ]
    }
  }

  async moderateContent(content: string): Promise<ModerationResult> {
    const result: ModerationResult = {
      isAllowed: true,
      warnings: [],
      filteredContent: content,
      moderationScore: 0,
      detectedIssues: {
        profanity: false,
        toxicity: false,
        sensitiveTopics: false,
        length: false,
        bannedWords: []
      }
    }

    // Check message length
    if (content.length > this.config.maxMessageLength) {
      result.isAllowed = false
      result.warnings.push(`Message exceeds maximum length of ${this.config.maxMessageLength} characters`)
      result.detectedIssues.length = true
    }

    // Check for banned words
    const bannedWordsFound = this.detectBannedWords(content)
    if (bannedWordsFound.length > 0) {
      result.isAllowed = false
      result.warnings.push('Message contains banned words')
      result.detectedIssues.bannedWords = bannedWordsFound
      result.filteredContent = this.filterBannedWords(content)
    }

    // Check for sensitive topics
    const { hasSensitiveTopics, topics } = this.detectSensitiveTopics(content)
    if (hasSensitiveTopics) {
      result.warnings.push(`Message contains sensitive topics: ${topics.join(', ')}`)
      result.detectedIssues.sensitiveTopics = true
    }

    // Calculate toxicity score
    const toxicityScore = await this.calculateToxicityScore(content)
    if (toxicityScore > this.config.toxicityThreshold) {
      result.isAllowed = false
      result.warnings.push('Message contains toxic content')
      result.detectedIssues.toxicity = true
    }

    // Calculate profanity score
    const profanityScore = this.calculateProfanityScore(content)
    if (profanityScore > this.config.profanityThreshold) {
      result.warnings.push('Message contains potentially inappropriate language')
      result.detectedIssues.profanity = true
    }

    // Calculate overall moderation score
    result.moderationScore = this.calculateModerationScore({
      toxicity: toxicityScore,
      profanity: profanityScore,
      sensitiveTopics: hasSensitiveTopics ? 1 : 0,
      bannedWords: bannedWordsFound.length
    })

    // Add to moderation history
    this.moderationHistory.push({
      timestamp: new Date().toISOString(),
      content,
      result
    })

    // Save moderation result to database
    await this.saveModerationResult(content, result)

    return result
  }

  private detectBannedWords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/)
    return this.config.bannedWords.filter(banned =>
      words.some(word => word.includes(banned.toLowerCase()))
    )
  }

  private filterBannedWords(content: string): string {
    let filtered = content
    this.config.bannedWords.forEach(word => {
      const regex = new RegExp(word, 'gi')
      filtered = filtered.replace(regex, '*'.repeat(word.length))
    })
    return filtered
  }

  private detectSensitiveTopics(content: string): {
    hasSensitiveTopics: boolean
    topics: string[]
  } {
    const lowerContent = content.toLowerCase()
    const detectedTopics = this.config.sensitiveTopics.filter(topic =>
      lowerContent.includes(topic.toLowerCase())
    )

    return {
      hasSensitiveTopics: detectedTopics.length > 0,
      topics: detectedTopics
    }
  }

  private async calculateToxicityScore(content: string): Promise<number> {
    // This is a placeholder for actual toxicity detection
    // In a real implementation, you would use a proper toxicity detection service
    // such as Perspective API or a custom ML model
    const toxicityIndicators = [
      'hate',
      'angry',
      'stupid',
      'idiot',
      'dumb',
      'kill',
      'die'
    ]

    const words = content.toLowerCase().split(/\s+/)
    const toxicWordCount = words.filter(word =>
      toxicityIndicators.some(indicator => word.includes(indicator))
    ).length

    return toxicWordCount / words.length
  }

  private calculateProfanityScore(content: string): number {
    // This is a placeholder for actual profanity detection
    // In a real implementation, you would use a proper profanity detection service
    // or a comprehensive word list
    const words = content.toLowerCase().split(/\s+/)
    const profanityCount = this.config.warningWords.filter(word =>
      words.some(w => w.includes(word.toLowerCase()))
    ).length

    return profanityCount / words.length
  }

  private calculateModerationScore(scores: {
    toxicity: number
    profanity: number
    sensitiveTopics: number
    bannedWords: number
  }): number {
    // Weight factors for different aspects
    const weights = {
      toxicity: 0.4,
      profanity: 0.3,
      sensitiveTopics: 0.2,
      bannedWords: 0.1
    }

    return (
      scores.toxicity * weights.toxicity +
      scores.profanity * weights.profanity +
      scores.sensitiveTopics * weights.sensitiveTopics +
      Math.min(scores.bannedWords / 5, 1) * weights.bannedWords
    )
  }

  private async saveModerationResult(
    content: string,
    result: ModerationResult
  ): Promise<void> {
    await this.supabase.from('moderation_history').insert({
      content: content,
      is_allowed: result.isAllowed,
      warnings: result.warnings,
      moderation_score: result.moderationScore,
      detected_issues: result.detectedIssues,
      timestamp: new Date().toISOString()
    })
  }

  async getModerationStats(): Promise<{
    totalModerated: number
    blockedCount: number
    averageScore: number
    commonIssues: Record<string, number>
  }> {
    const stats = {
      totalModerated: this.moderationHistory.length,
      blockedCount: this.moderationHistory.filter(h => !h.result.isAllowed).length,
      averageScore: 0,
      commonIssues: {} as Record<string, number>
    }

    if (stats.totalModerated > 0) {
      stats.averageScore = this.moderationHistory.reduce(
        (sum, h) => sum + h.result.moderationScore,
        0
      ) / stats.totalModerated

      // Count issue types
      this.moderationHistory.forEach(h => {
        Object.entries(h.result.detectedIssues).forEach(([issue, value]) => {
          if (typeof value === 'boolean' && value) {
            stats.commonIssues[issue] = (stats.commonIssues[issue] || 0) + 1
          } else if (Array.isArray(value) && value.length > 0) {
            stats.commonIssues[issue] = (stats.commonIssues[issue] || 0) + value.length
          }
        })
      })
    }

    return stats
  }

  updateConfig(newConfig: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
} 