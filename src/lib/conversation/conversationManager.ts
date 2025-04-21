import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Message, Memory } from '@/types/database'
import { ContextManager } from '../context/contextManager'
import { PersonalityManager } from '../personality/personalityManager'
import { MemoryManager } from '../memory/memoryManager'

export interface ConversationConfig {
  contextConfig?: Partial<ConstructorParameters<typeof ContextManager>[1]>
  personalityConfig?: Partial<ConstructorParameters<typeof PersonalityManager>[1]>
  memoryConfig?: Partial<ConstructorParameters<typeof MemoryManager>[1]>
}

export class ConversationManager {
  private supabase
  private conversationId: string
  private contextManager: ContextManager
  private personalityManager: PersonalityManager
  private memoryManager: MemoryManager

  constructor(conversationId: string, config: ConversationConfig = {}) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
    this.contextManager = new ContextManager(conversationId, config.contextConfig)
    this.personalityManager = new PersonalityManager(conversationId, config.personalityConfig)
    this.memoryManager = new MemoryManager(conversationId, config.memoryConfig)
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.contextManager.initialize(),
      this.personalityManager.initialize(),
    ])
  }

  async processMessage(message: Message): Promise<void> {
    // Update context
    await this.contextManager.addMessage(message)

    // Update emotional state based on message content
    await this.personalityManager.updateEmotionalState(message.content)

    // Store important information as memories
    if (this.shouldCreateMemory(message)) {
      await this.memoryManager.addMemory(
        message.content,
        'conversation',
        this.extractAttributes(message.content)
      )
    }
  }

  private shouldCreateMemory(message: Message): boolean {
    // Create memories for user messages or important assistant responses
    if (message.role === 'user') return true
    
    const importantPhrases = [
      'remember',
      'important',
      'never forget',
      'always',
      'love',
      'hate'
    ]

    return importantPhrases.some(phrase => 
      message.content.toLowerCase().includes(phrase)
    )
  }

  private extractAttributes(content: string): string[] {
    const attributes: string[] = []
    
    // Extract topics/themes
    const topics = [
      'family',
      'work',
      'hobbies',
      'feelings',
      'preferences',
      'plans'
    ]

    topics.forEach(topic => {
      if (content.toLowerCase().includes(topic)) {
        attributes.push(topic)
      }
    })

    return attributes
  }

  async validateResponse(proposedResponse: string): Promise<{
    isValid: boolean
    reason?: string
  }> {
    // Check personality consistency
    const personalityCheck = await this.personalityManager.checkResponseConsistency(proposedResponse)
    if (!personalityCheck.isConsistent) {
      return {
        isValid: false,
        reason: personalityCheck.reason
      }
    }

    // Check context coherence
    const contextCheck = await this.contextManager.analyzeContextContinuity()
    if (!contextCheck.isCoherent) {
      return {
        isValid: false,
        reason: `Context coherence issues: ${contextCheck.gaps.join(', ')}`
      }
    }

    return { isValid: true }
  }

  async getConversationState(): Promise<{
    context: string
    personality: string
    memories: string
  }> {
    const [contextSummary, personalitySnapshot, memorySnapshot] = await Promise.all([
      this.contextManager.getContextSummary(),
      this.personalityManager.getPersonalitySnapshot(),
      this.memoryManager.getMemorySnapshot()
    ])

    return {
      context: contextSummary,
      personality: personalitySnapshot,
      memories: memorySnapshot
    }
  }

  async getRelevantMemories(query: string): Promise<Memory[]> {
    return this.memoryManager.getRelevantMemories(query)
  }

  getActiveContext(): Message[] {
    return this.contextManager.getActiveContext()
  }

  async addResponse(response: string): Promise<void> {
    await this.personalityManager.addResponse(response)
  }
} 