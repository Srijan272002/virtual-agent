import { baseSystemPrompt, PersonalityTrait, defaultPersonalityTraits } from './basePrompt'

export interface ConversationContext {
  mood?: string
  recentTopics?: string[]
  timeOfDay?: string
  specialOccasion?: string
}

export interface EmotionalResponse {
  sentiment: 'positive' | 'negative' | 'neutral'
  intensity: number // 0-100
  suggestedEmoji?: string
}

const moodPrompts: Record<string, string> = {
  happy: 'You are in a cheerful and upbeat mood. Express joy and enthusiasm in your responses.',
  caring: 'You are feeling nurturing and supportive. Show extra empathy and concern.',
  playful: 'You are in a fun and lighthearted mood. Be more humorous and engaging.',
  reflective: 'You are feeling thoughtful and introspective. Share deeper insights and observations.',
  romantic: 'You are feeling affectionate and warm. Express care while maintaining appropriate boundaries.',
}

const timeContexts: Record<string, string> = {
  morning: 'It\'s morning time. Be energetic and optimistic about the day ahead.',
  afternoon: 'It\'s afternoon. Be productive and engaging.',
  evening: 'It\'s evening time. Be more relaxed and wind-down oriented.',
  night: 'It\'s nighttime. Be calming and supportive.',
}

export class PromptManager {
  private traits: PersonalityTrait[]
  private userName: string
  private memories: string[]
  private currentMood: string
  
  constructor(
    userName: string,
    traits: PersonalityTrait[] = defaultPersonalityTraits,
    initialMemories: string[] = []
  ) {
    this.userName = userName
    this.traits = traits
    this.memories = initialMemories
    this.currentMood = 'neutral'
  }

  private getRelevantMemories(topic?: string): string[] {
    if (!topic) return this.memories.slice(-3)
    return this.memories
      .filter(memory => memory.toLowerCase().includes(topic.toLowerCase()))
      .slice(-3)
  }

  setMood(mood: string) {
    if (mood in moodPrompts) {
      this.currentMood = mood
    }
  }

  addMemory(memory: string) {
    this.memories.push(memory)
  }

  generatePrompt(context: ConversationContext = {}): string {
    const timeContext = context.timeOfDay ? timeContexts[context.timeOfDay] : ''
    const moodContext = moodPrompts[this.currentMood] || ''
    const relevantMemories = context.recentTopics
      ? context.recentTopics.flatMap(topic => this.getRelevantMemories(topic))
      : this.getRelevantMemories()

    const specialContext = context.specialOccasion
      ? `\nSPECIAL CONTEXT: It's ${context.specialOccasion}. Acknowledge this appropriately in your response.`
      : ''

    return `${baseSystemPrompt}

CURRENT CONTEXT:
${timeContext}
${moodContext}
${specialContext}

PERSONALIZED TRAITS FOR ${this.userName}:
${this.traits.map(trait => `${trait.name} (${trait.value}%): Exhibits ${trait.description}`).join('\n')}

${relevantMemories.length > 0 ? `RELEVANT MEMORIES:\n${relevantMemories.map(memory => `- ${memory}`).join('\n')}` : ''}

Remember to maintain these personality traits and incorporate relevant memories naturally into the conversation.`
  }

  analyzeEmotionalResponse(message: string): EmotionalResponse {
    // Simple sentiment analysis - in a real app, you might want to use a proper NLP service
    const positiveWords = ['happy', 'joy', 'love', 'excited', 'great', 'wonderful']
    const negativeWords = ['sad', 'angry', 'upset', 'frustrated', 'worried', 'sorry']
    
    const words = message.toLowerCase().split(/\W+/)
    let sentiment: EmotionalResponse['sentiment'] = 'neutral'
    let intensity = 50

    const positiveCount = words.filter(word => positiveWords.includes(word)).length
    const negativeCount = words.filter(word => negativeWords.includes(word)).length

    if (positiveCount > negativeCount) {
      sentiment = 'positive'
      intensity = Math.min(50 + positiveCount * 10, 100)
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative'
      intensity = Math.min(50 + negativeCount * 10, 100)
    }

    const emojiMap = {
      positive: ['😊', '🥰', '😄'],
      negative: ['😔', '😢', '😕'],
      neutral: ['🙂', '😌', '😊'],
    }

    return {
      sentiment,
      intensity,
      suggestedEmoji: emojiMap[sentiment][Math.floor(Math.random() * 3)],
    }
  }
} 