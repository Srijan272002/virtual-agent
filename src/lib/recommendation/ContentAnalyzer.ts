import type { Message, SharedImage, SharedVoice } from '@/types/database'

interface EmbeddingVector {
  values: number[]
  timestamp: number
}

interface MediaMetadata {
  id: string
  type: 'image' | 'voice'
  embedding: EmbeddingVector
  tags: string[]
  categories: string[]
}

export class ContentAnalyzer {
  private mediaEmbeddings: Map<string, MediaMetadata> = new Map()
  private readonly EMBEDDING_DIMENSION = 384 // Using 384-dimensional embeddings
  private readonly EMBEDDING_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  // Simulated embedding generation (in a real app, you'd use a proper embedding model)
  private generateEmbedding(text: string): number[] {
    // This is a placeholder. In production, use a real embedding model
    const hash = Array.from(text).reduce((h, c) => 
      Math.imul(31, h) + c.charCodeAt(0) | 0, 0x811c9dc5)
    
    return Array(this.EMBEDDING_DIMENSION).fill(0).map((_, i) => {
      const value = Math.sin(hash * (i + 1))
      return (value - Math.floor(value)) * 2 - 1 // Normalize to [-1, 1]
    })
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  private async analyzeImageContent(image: SharedImage): Promise<MediaMetadata> {
    // In production, you would:
    // 1. Use a vision model to detect objects/scenes
    // 2. Generate image embeddings
    // 3. Extract relevant tags and categories
    const caption = image.caption || ''
    const embedding = this.generateEmbedding(caption)
    
    // Simple tag extraction from caption
    const tags = caption
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
    
    // Basic category detection
    const categories = this.detectCategories(caption)

    return {
      id: image.id,
      type: 'image',
      embedding: {
        values: embedding,
        timestamp: Date.now()
      },
      tags,
      categories
    }
  }

  private async analyzeVoiceContent(voice: SharedVoice): Promise<MediaMetadata> {
    // In production, you would:
    // 1. Use speech-to-text to get transcript
    // 2. Generate text embeddings from transcript
    // 3. Extract relevant tags and categories
    const mockTranscript = `Voice message ${voice.id}`
    const embedding = this.generateEmbedding(mockTranscript)
    
    return {
      id: voice.id,
      type: 'voice',
      embedding: {
        values: embedding,
        timestamp: Date.now()
      },
      tags: ['voice', 'audio', 'message'],
      categories: ['communication']
    }
  }

  public detectCategories(text: string): string[] {
    const categories = new Set<string>()
    const categoryKeywords: Record<string, string[]> = {
      'nature': ['tree', 'flower', 'sky', 'beach', 'mountain', 'sunset'],
      'people': ['person', 'face', 'smile', 'family', 'friend'],
      'food': ['meal', 'dish', 'restaurant', 'cooking', 'food'],
      'travel': ['trip', 'vacation', 'journey', 'destination', 'travel'],
      'events': ['party', 'celebration', 'wedding', 'birthday', 'anniversary'],
      'pets': ['dog', 'cat', 'pet', 'animal'],
      'art': ['drawing', 'painting', 'artwork', 'creative'],
      'technology': ['computer', 'phone', 'device', 'tech']
    }

    const lowercaseText = text.toLowerCase()
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        categories.add(category)
      }
    })

    return Array.from(categories)
  }

  public async analyzeMedia(media: SharedImage | SharedVoice): Promise<MediaMetadata> {
    const existingMetadata = this.mediaEmbeddings.get(media.id)
    const now = Date.now()

    // Return cached metadata if it exists and is not expired
    if (existingMetadata && 
        (now - existingMetadata.embedding.timestamp) < this.EMBEDDING_CACHE_DURATION) {
      return existingMetadata
    }

    // Generate new metadata based on media type
    const metadata = 'caption' in media 
      ? await this.analyzeImageContent(media as SharedImage)
      : await this.analyzeVoiceContent(media as SharedVoice)

    this.mediaEmbeddings.set(media.id, metadata)
    return metadata
  }

  public async getContextEmbedding(messages: Message[]): Promise<number[]> {
    // Combine recent messages for context
    const recentMessages = messages.slice(-5)
    const combinedText = recentMessages
      .map(msg => msg.content)
      .join(' ')
    
    return this.generateEmbedding(combinedText)
  }

  public async findSimilarContent(
    contextEmbedding: number[],
    mediaItems: (SharedImage | SharedVoice)[],
    limit: number = 5
  ): Promise<Array<{ mediaId: string; similarity: number }>> {
    const similarities: Array<{ mediaId: string; similarity: number }> = []

    for (const media of mediaItems) {
      const metadata = await this.analyzeMedia(media)
      const similarity = this.cosineSimilarity(
        contextEmbedding,
        metadata.embedding.values
      )

      similarities.push({
        mediaId: media.id,
        similarity
      })
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }
} 