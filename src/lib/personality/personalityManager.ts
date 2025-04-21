import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

export interface PersonalityConfig {
  baselineValues: Record<string, number>
  minValue: number
  maxValue: number
  decayRate: number
  boostRate: number
  moodInfluence: number
  consistencyThreshold: number
}

const DEFAULT_CONFIG: PersonalityConfig = {
  baselineValues: {
    // Core Traits
    openness: 75,        // Curiosity and appreciation for new experiences
    conscientiousness: 65, // Organization and responsibility
    extraversion: 60,    // Social energy and expressiveness
    agreeableness: 70,   // Warmth and cooperation
    neuroticism: 45,     // Emotional sensitivity and stability
    
    // Social Traits
    empathy: 80,         // Understanding and sharing others' feelings
    assertiveness: 55,   // Confidence in expressing opinions
    adaptability: 70,    // Flexibility in different situations
    
    // Emotional Traits
    emotionalDepth: 75,  // Capacity for deep emotional experiences
    emotionalExpression: 65, // Comfort in showing emotions
    emotionalStability: 70,  // Consistency in emotional responses
    
    // Behavioral Traits
    playfulness: 60,     // Tendency for lighthearted interaction
    intellect: 80,       // Interest in ideas and abstract thinking
    creativity: 75,      // Innovation and artistic expression
    nurturing: 85,       // Caring and supportive behavior
  },
  minValue: 0,
  maxValue: 100,
  decayRate: 0.1,
  boostRate: 0.2,
  moodInfluence: 0.3,
  consistencyThreshold: 0.25,
}

interface EmotionalState {
  mood: number // -1 to 1
  energy: number // 0 to 1
  dominantEmotion: string
  lastUpdate: Date
}

interface TraitInteraction {
  trait1: string
  trait2: string
  influence: number // -1 to 1
}

const TRAIT_INTERACTIONS: TraitInteraction[] = [
  { trait1: 'empathy', trait2: 'emotionalDepth', influence: 0.5 },
  { trait1: 'assertiveness', trait2: 'emotionalExpression', influence: 0.3 },
  { trait1: 'openness', trait2: 'creativity', influence: 0.4 },
  { trait1: 'neuroticism', trait2: 'emotionalStability', influence: -0.6 },
  { trait1: 'extraversion', trait2: 'playfulness', influence: 0.4 },
]

export class PersonalityManager {
  private supabase
  private conversationId: string
  private config: PersonalityConfig
  private attributes: Map<string, number>
  private lastUpdate: Date
  private emotionalState: EmotionalState
  private recentResponses: string[] = []
  private traitInteractions: Map<string, TraitInteraction[]> = new Map()

  constructor(conversationId: string, config: Partial<PersonalityConfig> = {}) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.attributes = new Map()
    this.lastUpdate = new Date()
    this.emotionalState = {
      mood: 0,
      energy: 0.5,
      dominantEmotion: 'neutral',
      lastUpdate: new Date()
    }
    this.initializeTraitInteractions()
  }

  private initializeTraitInteractions(): void {
    TRAIT_INTERACTIONS.forEach(interaction => {
      if (!this.traitInteractions.has(interaction.trait1)) {
        this.traitInteractions.set(interaction.trait1, [])
      }
      if (!this.traitInteractions.has(interaction.trait2)) {
        this.traitInteractions.set(interaction.trait2, [])
      }
      this.traitInteractions.get(interaction.trait1)!.push(interaction)
      this.traitInteractions.get(interaction.trait2)!.push({
        trait1: interaction.trait2,
        trait2: interaction.trait1,
        influence: interaction.influence
      })
    })
  }

  private async updateInteractingTraits(trait: string, value: number): Promise<void> {
    const interactions = this.traitInteractions.get(trait) || []
    for (const interaction of interactions) {
      const otherTrait = interaction.trait1 === trait ? interaction.trait2 : interaction.trait1
      const currentValue = this.attributes.get(otherTrait) || this.config.baselineValues[otherTrait] || 50
      const influence = value * interaction.influence
      await this.updateAttribute(otherTrait, currentValue + influence)
    }
  }

  async initialize(): Promise<void> {
    // Load existing attributes from database
    const { data: attributes } = await this.supabase
      .from('personality_attributes')
      .select('*')
      .eq('conversation_id', this.conversationId)

    if (attributes && attributes.length > 0) {
      attributes.forEach(attr => {
        this.attributes.set(attr.name, attr.value)
      })
    } else {
      // Initialize with baseline values
      for (const [name, value] of Object.entries(this.config.baselineValues)) {
        await this.setAttribute(name, value)
      }
    }
  }

  private clampValue(value: number): number {
    return Math.max(this.config.minValue, Math.min(this.config.maxValue, value))
  }

  private async updateAttribute(name: string, value: number): Promise<void> {
    const clampedValue = this.clampValue(value)
    
    const { error } = await this.supabase
      .from('personality_attributes')
      .upsert({
        conversation_id: this.conversationId,
        name,
        value: clampedValue,
      })

    if (error) {
      console.error('Error updating personality attribute:', error)
      throw error
    }

    this.attributes.set(name, clampedValue)
  }

  async setAttribute(name: string, value: number): Promise<void> {
    await this.updateAttribute(name, value)
    await this.updateInteractingTraits(name, value)
  }

  async adjustAttribute(name: string, delta: number): Promise<void> {
    const currentValue = this.attributes.get(name) ?? this.config.baselineValues[name] ?? 50
    await this.updateAttribute(name, currentValue + delta)
  }

  async boostAttribute(name: string): Promise<void> {
    const currentValue = this.attributes.get(name) ?? this.config.baselineValues[name] ?? 50
    await this.adjustAttribute(name, currentValue * this.config.boostRate)
  }

  async decayAttributes(): Promise<void> {
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - this.lastUpdate.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceUpdate >= 1) {
      for (const [name, value] of this.attributes.entries()) {
        const baseline = this.config.baselineValues[name] ?? 50
        const decayAmount = (value - baseline) * this.config.decayRate * hoursSinceUpdate
        await this.updateAttribute(name, value - decayAmount)
      }
      this.lastUpdate = now
    }
  }

  getAttributeValue(name: string): number {
    return this.attributes.get(name) ?? this.config.baselineValues[name] ?? 50
  }

  getAllAttributes(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [name, value] of this.attributes.entries()) {
      result[name] = value
    }
    return result
  }

  async updateEmotionalState(input: string): Promise<void> {
    // Simple sentiment analysis to adjust mood
    const lowerInput = input.toLowerCase()
    const positiveWords = ['happy', 'good', 'great', 'love', 'wonderful']
    const negativeWords = ['sad', 'bad', 'angry', 'upset', 'frustrated']
    
    let moodDelta = 0
    positiveWords.forEach(word => {
      if (lowerInput.includes(word)) moodDelta += 0.2
    })
    negativeWords.forEach(word => {
      if (lowerInput.includes(word)) moodDelta -= 0.2
    })

    this.emotionalState.mood = this.clampValue((this.emotionalState.mood + moodDelta) / 2)
    
    // Update energy based on conversation activity
    const timeSinceLastUpdate = (new Date().getTime() - this.emotionalState.lastUpdate.getTime()) / (1000 * 60)
    this.emotionalState.energy = Math.max(0.2, this.emotionalState.energy - (timeSinceLastUpdate * 0.01))
    
    // Update dominant emotion
    if (this.emotionalState.mood > 0.3) {
      this.emotionalState.dominantEmotion = this.emotionalState.energy > 0.6 ? 'excited' : 'content'
    } else if (this.emotionalState.mood < -0.3) {
      this.emotionalState.dominantEmotion = this.emotionalState.energy > 0.6 ? 'angry' : 'sad'
    } else {
      this.emotionalState.dominantEmotion = this.emotionalState.energy > 0.6 ? 'focused' : 'calm'
    }

    this.emotionalState.lastUpdate = new Date()
  }

  async addResponse(response: string): Promise<void> {
    this.recentResponses.push(response)
    if (this.recentResponses.length > 5) {
      this.recentResponses.shift()
    }
  }

  async checkResponseConsistency(proposedResponse: string): Promise<{
    isConsistent: boolean
    reason?: string
  }> {
    if (this.recentResponses.length === 0) {
      return { isConsistent: true }
    }

    // Check for emotional consistency
    const moodConsistent = this.checkMoodConsistency(proposedResponse)
    
    if (!moodConsistent) {
      return {
        isConsistent: false,
        reason: 'Response emotion does not match current emotional state'
      }
    }

    // Check for personality trait consistency
    const traitConsistent = this.checkTraitConsistency(proposedResponse)
    
    if (!traitConsistent) {
      return {
        isConsistent: false,
        reason: 'Response conflicts with dominant personality traits'
      }
    }

    return { isConsistent: true }
  }

  private checkMoodConsistency(response: string): boolean {
    const lowerResponse = response.toLowerCase()
    
    if (this.emotionalState.mood > 0.3) {
      // Should have positive tone
      return !/(sad|angry|upset|frustrated|annoyed)/i.test(lowerResponse)
    } else if (this.emotionalState.mood < -0.3) {
      // Should have negative tone
      return !/(happy|excited|wonderful|great)/i.test(lowerResponse)
    }
    
    return true
  }

  private checkTraitConsistency(response: string): boolean {
    const lowerResponse = response.toLowerCase()
    const dominantTraits = Array.from(this.attributes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    for (const [trait, value] of dominantTraits) {
      if (value > 70) {
        switch (trait) {
          case 'empathy':
            if (!/\b(understand|feel|care|sorry|help)\b/i.test(lowerResponse)) {
              return false
            }
            break
          case 'assertiveness':
            if (!/\b(think|believe|sure|definitely|must)\b/i.test(lowerResponse)) {
              return false
            }
            break
          case 'openness':
            if (!/\b(interesting|curious|wonder|explore|learn)\b/i.test(lowerResponse)) {
              return false
            }
            break
          case 'emotionalDepth':
            if (!/\b(deeply|truly|heartfelt|meaningful|profound)\b/i.test(lowerResponse)) {
              return false
            }
            break
          case 'playfulness':
            if (!/\b(fun|play|enjoy|laugh|smile)\b/i.test(lowerResponse)) {
              return false
            }
            break
          case 'intellect':
            if (!/\b(think|analyze|consider|perspective|understand)\b/i.test(lowerResponse)) {
              return false
            }
            break
          case 'nurturing':
            if (!/\b(help|support|care|guide|protect)\b/i.test(lowerResponse)) {
              return false
            }
            break
        }
      }
    }

    return true
  }

  getEmotionalState(): EmotionalState {
    return { ...this.emotionalState }
  }

  async getPersonalitySnapshot(): Promise<string> {
    const attributes = this.getAllAttributes()
    const dominantTraits = Object.entries(attributes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, value]) => `${name} (${Math.round(value)}%)`)
      .join(', ')

    return `Current personality traits: ${dominantTraits}\nEmotional state: ${this.emotionalState.dominantEmotion} (mood: ${Math.round(this.emotionalState.mood * 100)}%, energy: ${Math.round(this.emotionalState.energy * 100)}%)`
  }
} 