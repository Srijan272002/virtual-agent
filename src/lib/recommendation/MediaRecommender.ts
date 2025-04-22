import type { Message, SharedImage, SharedVoice } from '@/types/database'
import { ContentAnalyzer } from './ContentAnalyzer'

interface MediaInteraction {
  mediaId: string
  type: 'view' | 'play' | 'share' | 'delete'
  timestamp: number
}

interface MediaScore {
  id: string
  score: number
  lastInteraction: number
  categories: string[]
  tags: string[]
  similarityScore?: number
}

export class MediaRecommender {
  private imageScores: Map<string, MediaScore> = new Map()
  private voiceScores: Map<string, MediaScore> = new Map()
  private userInteractions: MediaInteraction[] = []
  private contentAnalyzer: ContentAnalyzer
  private readonly DECAY_FACTOR = 0.1 // Score decay over time
  private readonly INTERACTION_WEIGHTS = {
    view: 1,
    play: 2,
    share: 3,
    delete: -2
  }
  private readonly CONTEXT_MATCH_SCORE = 2
  private readonly SIMILARITY_WEIGHT = 1.5
  private readonly CATEGORY_MATCH_BONUS = 0.5
  private readonly TAG_MATCH_BONUS = 0.3
  private readonly MAX_HISTORY = 100

  constructor() {
    this.contentAnalyzer = new ContentAnalyzer()
    this.resetScores()
  }

  private resetScores() {
    this.imageScores.clear()
    this.voiceScores.clear()
    this.userInteractions = []
  }

  public addInteraction(mediaId: string, type: MediaInteraction['type']) {
    const interaction: MediaInteraction = {
      mediaId,
      type,
      timestamp: Date.now()
    }

    this.userInteractions.unshift(interaction)
    if (this.userInteractions.length > this.MAX_HISTORY) {
      this.userInteractions.pop()
    }

    this.updateScores()
  }

  private updateScores() {
    const now = Date.now()
    
    // Reset scores
    this.resetScores()

    // Calculate scores based on interactions
    this.userInteractions.forEach(interaction => {
      const timeDiff = (now - interaction.timestamp) / (1000 * 60 * 60 * 24) // Days
      const timeDecay = Math.exp(-this.DECAY_FACTOR * timeDiff)
      const interactionScore = this.INTERACTION_WEIGHTS[interaction.type] * timeDecay

      const existingScore = this.imageScores.get(interaction.mediaId) || 
                           this.voiceScores.get(interaction.mediaId)

      if (existingScore) {
        existingScore.score += interactionScore
        existingScore.lastInteraction = Math.max(existingScore.lastInteraction, interaction.timestamp)
      } else {
        const newScore: MediaScore = {
          id: interaction.mediaId,
          score: interactionScore,
          lastInteraction: interaction.timestamp,
          categories: [],
          tags: []
        }
        // We'll determine which map to use when we match with actual media items
        this.imageScores.set(interaction.mediaId, newScore)
      }
    })
  }

  private async updateMediaMetadata(media: SharedImage | SharedVoice) {
    const metadata = await this.contentAnalyzer.analyzeMedia(media)
    const score = this.imageScores.get(media.id) || this.voiceScores.get(media.id) || {
      id: media.id,
      score: 0,
      lastInteraction: Date.now(),
      categories: [],
      tags: []
    }

    score.categories = metadata.categories
    score.tags = metadata.tags

    if ('caption' in media) {
      this.imageScores.set(media.id, score)
    } else {
      this.voiceScores.set(media.id, score)
    }
  }

  private calculateCategoryAndTagBonus(
    mediaScore: MediaScore,
    recentCategories: Set<string>,
    recentTags: Set<string>
  ): number {
    let bonus = 0

    // Category matches
    mediaScore.categories.forEach(category => {
      if (recentCategories.has(category)) {
        bonus += this.CATEGORY_MATCH_BONUS
      }
    })

    // Tag matches
    mediaScore.tags.forEach(tag => {
      if (recentTags.has(tag)) {
        bonus += this.TAG_MATCH_BONUS
      }
    })

    return bonus
  }

  private extractRecentCategoriesAndTags(messages: Message[]): {
    categories: Set<string>;
    tags: Set<string>;
  } {
    const recentMessages = messages.slice(-5)
    const categories = new Set<string>()
    const tags = new Set<string>()

    recentMessages.forEach(message => {
      // Extract categories
      const messageCategories = this.contentAnalyzer.detectCategories(message.content)
      messageCategories.forEach(category => categories.add(category))

      // Extract tags (words longer than 3 characters)
      const words = message.content
        .toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3)
      words.forEach(word => tags.add(word))
    })

    return { categories, tags }
  }

  public async getRecommendations(
    images: SharedImage[],
    voices: SharedVoice[],
    recentMessages: Message[],
    limit: number = 5
  ) {
    const now = Date.now()

    // Get context embedding
    const contextEmbedding = await this.contentAnalyzer.getContextEmbedding(recentMessages)
    
    // Get similarity scores for all media
    const allMedia = [...images, ...voices]
    const similarities = await this.contentAnalyzer.findSimilarContent(
      contextEmbedding,
      allMedia,
      allMedia.length
    )

    // Create similarity score lookup
    const similarityMap = new Map(
      similarities.map(({ mediaId, similarity }) => [mediaId, similarity])
    )

    // Extract categories and tags from recent messages
    const { categories: recentCategories, tags: recentTags } = 
      this.extractRecentCategoriesAndTags(recentMessages)

    // Update metadata for all media items
    await Promise.all([
      ...images.map(img => this.updateMediaMetadata(img)),
      ...voices.map(voice => this.updateMediaMetadata(voice))
    ])

    // Score images
    const scoredImages = images.map(image => {
      const baseScore = this.imageScores.get(image.id)?.score || 0
      const similarityScore = (similarityMap.get(image.id) || 0) * this.SIMILARITY_WEIGHT
      const recency = baseScore > 0 
        ? Math.exp(-this.DECAY_FACTOR * ((now - (this.imageScores.get(image.id)?.lastInteraction || now)) / (1000 * 60 * 60 * 24)))
        : 1

      const categoryTagBonus = this.calculateCategoryAndTagBonus(
        this.imageScores.get(image.id) || {
          id: image.id,
          score: 0,
          lastInteraction: now,
          categories: [],
          tags: []
        },
        recentCategories,
        recentTags
      )

      return {
        item: image,
        type: 'image' as const,
        score: (baseScore + similarityScore + categoryTagBonus) * recency
      }
    })

    // Score voice messages
    const scoredVoices = voices.map(voice => {
      const baseScore = this.voiceScores.get(voice.id)?.score || 0
      const similarityScore = (similarityMap.get(voice.id) || 0) * this.SIMILARITY_WEIGHT
      const recency = baseScore > 0
        ? Math.exp(-this.DECAY_FACTOR * ((now - (this.voiceScores.get(voice.id)?.lastInteraction || now)) / (1000 * 60 * 60 * 24)))
        : 1

      const categoryTagBonus = this.calculateCategoryAndTagBonus(
        this.voiceScores.get(voice.id) || {
          id: voice.id,
          score: 0,
          lastInteraction: now,
          categories: [],
          tags: []
        },
        recentCategories,
        recentTags
      )

      return {
        item: voice,
        type: 'voice' as const,
        score: (baseScore + similarityScore + categoryTagBonus) * recency
      }
    })

    // Combine and sort by score
    return [...scoredImages, ...scoredVoices]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
} 