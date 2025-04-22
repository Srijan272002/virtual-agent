import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

export interface Emotion {
  primary: string
  secondary?: string
  intensity: number // 0 to 1
  valence: number // -1 to 1 (negative to positive)
  arousal: number // 0 to 1 (calm to excited)
}

const EMOTIONS = {
  joy: {
    keywords: ['happy', 'excited', 'delighted', 'glad', 'wonderful', 'great', 'love'],
    patterns: [/\b(ha|he){2,}h?\b/i, /😊|😄|😃|🥰|❤️/],
    weight: 1.0
  },
  sadness: {
    keywords: ['sad', 'unhappy', 'depressed', 'down', 'hurt', 'disappointed'],
    patterns: [/😢|😭|😔|💔/, /\bsigh\b/i],
    weight: 0.9
  },
  anger: {
    keywords: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate'],
    patterns: [/😠|😡|💢/, /\b(ugh|argh)\b/i],
    weight: 0.8
  },
  fear: {
    keywords: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'terrified'],
    patterns: [/😨|😰|😱/, /\b(eek|yikes)\b/i],
    weight: 0.8
  },
  surprise: {
    keywords: ['surprised', 'shocked', 'amazed', 'wow', 'unexpected'],
    patterns: [/😮|😲|😱|😨/, /\b(whoa|wow)\b/i],
    weight: 0.7
  },
  disgust: {
    keywords: ['disgusted', 'gross', 'ew', 'yuck', 'horrible'],
    patterns: [/🤢|🤮/, /\b(ew|yuck)\b/i],
    weight: 0.7
  },
  trust: {
    keywords: ['trust', 'believe', 'sure', 'confident', 'safe'],
    patterns: [/🤝|👍|💪/, /\bcan rely\b|\bbelieve in\b/i],
    weight: 0.6
  },
  anticipation: {
    keywords: ['excited', 'looking forward', 'cant wait', 'hope', 'eager'],
    patterns: [/🤞|🙏/, /\bcan'?t wait\b|\bhope\b/i],
    weight: 0.6
  }
} as const

export class EmotionAnalyzer {
  private supabase
  private conversationId: string
  private emotionHistory: Emotion[] = []

  constructor(conversationId: string) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
  }

  analyzeEmotion(text: string): Emotion {
    const scores = new Map<string, number>()

    // Analyze each emotion
    Object.entries(EMOTIONS).forEach(([emotion, indicators]) => {
      let score = 0

      // Check keywords
      indicators.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        const matches = (text.match(regex) || []).length
        if (matches > 0) {
          score += matches * 0.2 * indicators.weight
        }
      })

      // Check patterns
      indicators.patterns.forEach(pattern => {
        const matches = (text.match(pattern) || []).length
        if (matches > 0) {
          score += matches * 0.3 * indicators.weight
        }
      })

      if (score > 0) {
        scores.set(emotion, score)
      }
    })

    // Find primary and secondary emotions
    const sortedEmotions = Array.from(scores.entries())
      .sort(([, a], [, b]) => b - a)

    if (sortedEmotions.length === 0) {
      return {
        primary: 'neutral',
        intensity: 0,
        valence: 0,
        arousal: 0
      }
    }

    // Calculate valence and arousal
    const valence = this.calculateValence(sortedEmotions)
    const arousal = this.calculateArousal(sortedEmotions)

    const result: Emotion = {
      primary: sortedEmotions[0][0],
      intensity: Math.min(sortedEmotions[0][1] / 2, 1),
      valence,
      arousal
    }

    if (sortedEmotions.length > 1) {
      result.secondary = sortedEmotions[1][0]
    }

    this.emotionHistory.push(result)
    if (this.emotionHistory.length > 10) {
      this.emotionHistory.shift()
    }

    return result
  }

  private calculateValence(emotions: [string, number][]): number {
    let totalValence = 0
    let totalWeight = 0

    const valenceMap = {
      joy: 1,
      trust: 0.7,
      anticipation: 0.5,
      surprise: 0.2,
      neutral: 0,
      fear: -0.3,
      disgust: -0.6,
      anger: -0.8,
      sadness: -0.9
    }

    emotions.forEach(([emotion, score]) => {
      if (emotion in valenceMap) {
        totalValence += valenceMap[emotion as keyof typeof valenceMap] * score
        totalWeight += score
      }
    })

    return totalWeight > 0 ? totalValence / totalWeight : 0
  }

  private calculateArousal(emotions: [string, number][]): number {
    let totalArousal = 0
    let totalWeight = 0

    const arousalMap = {
      anger: 1,
      fear: 0.9,
      joy: 0.8,
      surprise: 0.8,
      anticipation: 0.6,
      disgust: 0.5,
      sadness: 0.3,
      trust: 0.2,
      neutral: 0
    }

    emotions.forEach(([emotion, score]) => {
      if (emotion in arousalMap) {
        totalArousal += arousalMap[emotion as keyof typeof arousalMap] * score
        totalWeight += score
      }
    })

    return totalWeight > 0 ? totalArousal / totalWeight : 0
  }

  getEmotionalTrend(): {
    dominantEmotion: string
    averageValence: number
    averageArousal: number
    emotionalStability: number
  } {
    if (this.emotionHistory.length === 0) {
      return {
        dominantEmotion: 'neutral',
        averageValence: 0,
        averageArousal: 0,
        emotionalStability: 1
      }
    }

    const emotionCounts = new Map<string, number>()
    let totalValence = 0
    let totalArousal = 0
    let valenceVariance = 0

    this.emotionHistory.forEach(emotion => {
      emotionCounts.set(
        emotion.primary,
        (emotionCounts.get(emotion.primary) || 0) + 1
      )
      totalValence += emotion.valence
      totalArousal += emotion.arousal
    })

    const averageValence = totalValence / this.emotionHistory.length
    const averageArousal = totalArousal / this.emotionHistory.length

    // Calculate emotional stability based on valence variance
    this.emotionHistory.forEach(emotion => {
      valenceVariance += Math.pow(emotion.valence - averageValence, 2)
    })
    const emotionalStability = 1 - Math.min(
      Math.sqrt(valenceVariance / this.emotionHistory.length),
      1
    )

    const dominantEmotion = Array.from(emotionCounts.entries())
      .sort(([, a], [, b]) => b - a)[0][0]

    return {
      dominantEmotion,
      averageValence,
      averageArousal,
      emotionalStability
    }
  }

  suggestResponse(emotion: Emotion): string {
    const responseTemplates = {
      joy: [
        "I'm so happy to see you're feeling good!",
        "That's wonderful! Your happiness is contagious!",
        "I'm glad things are going well for you!"
      ],
      sadness: [
        "I'm here for you if you want to talk about it.",
        "I'm sorry you're feeling down. Would you like to share what's bothering you?",
        "It's okay to feel sad sometimes. I'm here to listen."
      ],
      anger: [
        "I understand you're frustrated. Let's talk about it.",
        "Your feelings are valid. Would you like to explain what's making you angry?",
        "I'm here to listen if you want to vent."
      ],
      fear: [
        "It's okay to feel scared. I'm here with you.",
        "Would you like to talk about what's worrying you?",
        "You're not alone in this. Let's work through it together."
      ],
      surprise: [
        "That's quite unexpected! Tell me more about it.",
        "Wow! I'd love to hear more details.",
        "That's fascinating! How do you feel about it?"
      ],
      trust: [
        "I really appreciate your openness.",
        "Thank you for sharing that with me.",
        "I value the trust you're showing."
      ],
      anticipation: [
        "That sounds exciting! Tell me more about your plans.",
        "I can feel your enthusiasm! What are you looking forward to most?",
        "It's great to have something to look forward to!"
      ],
      neutral: [
        "How are you feeling about that?",
        "Would you like to share more?",
        "I'm interested in hearing your thoughts."
      ]
    }

    const templates = responseTemplates[emotion.primary as keyof typeof responseTemplates] ||
                     responseTemplates.neutral

    return templates[Math.floor(Math.random() * templates.length)]
  }
} 