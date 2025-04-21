import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { PromptManager, type ConversationContext } from './prompts/promptManager'
import { RateLimiter } from './utils/rateLimiter'
import { ResponseFormatter } from './utils/responseFormatter'
import type { APIResponse } from './utils/responseFormatter'

const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-pro'
const API_KEY = process.env.GEMINI_API_KEY
const MAX_TOKENS = 1024
const RATE_LIMIT_REQUESTS = 60
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

if (!API_KEY) {
  throw new Error('Missing Gemini API key - please add it to your .env.local file')
}

const genAI = new GoogleGenerativeAI(API_KEY)

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GeminiConfig {
  temperature?: number
  topK?: number
  topP?: number
  maxOutputTokens?: number
}

const defaultConfig: GeminiConfig = {
  temperature: 0.9,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: MAX_TOKENS,
}

const defaultSafetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

export class GeminiChat {
  private model
  private chat
  private config: GeminiConfig
  private promptManager: PromptManager
  private rateLimiter: RateLimiter

  constructor(
    userName: string,
    config: Partial<GeminiConfig> = {},
    initialMemories: string[] = []
  ) {
    this.model = genAI.getGenerativeModel({ model: MODEL_NAME })
    this.config = { ...defaultConfig, ...config }
    this.promptManager = new PromptManager(userName, undefined, initialMemories)
    this.rateLimiter = new RateLimiter({
      maxRequests: RATE_LIMIT_REQUESTS,
      timeWindow: RATE_LIMIT_WINDOW,
    })
    this.chat = this.model.startChat({
      generationConfig: this.config,
      safetySettings: defaultSafetySettings,
    })
  }

  private async initializeChat(context: ConversationContext = {}) {
    const systemPrompt = this.promptManager.generatePrompt(context)
    this.chat = this.model.startChat({
      generationConfig: this.config,
      safetySettings: defaultSafetySettings,
    })
    await this.rateLimiter.waitForCapacity()
    await this.chat.sendMessage(systemPrompt)
  }

  setMood(mood: string) {
    this.promptManager.setMood(mood)
  }

  addMemory(memory: string) {
    this.promptManager.addMemory(memory)
  }

  async sendMessage(
    message: string,
    context: ConversationContext = {}
  ): Promise<APIResponse<string>> {
    try {
      await this.rateLimiter.waitForCapacity()
      await this.initializeChat(context)
      
      const result = await this.chat.sendMessage(message)
      const response = await result.response
      const text = ResponseFormatter.truncateResponse(response.text(), MAX_TOKENS)

      return ResponseFormatter.success(text, {
        remaining: this.rateLimiter.remaining
      })
    } catch (error) {
      console.error('Error sending message to Gemini:', error)
      return ResponseFormatter.error(
        'Failed to process message',
        'GEMINI_ERROR',
        error,
        { remaining: this.rateLimiter.remaining }
      )
    }
  }

  async sendMessageWithHistory(
    message: string,
    history: ChatMessage[],
    context: ConversationContext = {}
  ): Promise<APIResponse<string>> {
    try {
      await this.rateLimiter.waitForCapacity()
      await this.initializeChat(context)

      // Send previous messages to build context
      for (const msg of history) {
        if (msg.role === 'user') {
          await this.rateLimiter.waitForCapacity()
          await this.chat.sendMessage(msg.content)
        }
      }

      // Analyze message sentiment and update mood
      const emotionalResponse = this.promptManager.analyzeEmotionalResponse(message)
      if (emotionalResponse.sentiment !== 'neutral') {
        this.setMood(emotionalResponse.sentiment === 'positive' ? 'happy' : 'caring')
      }

      // Send the current message
      await this.rateLimiter.waitForCapacity()
      const result = await this.chat.sendMessage(message)
      const response = await result.response
      const text = ResponseFormatter.truncateResponse(response.text(), MAX_TOKENS)
      
      // Store the interaction as a memory
      this.addMemory(`User: ${message}\nAssistant: ${text}`)

      return ResponseFormatter.success(text, {
        remaining: this.rateLimiter.remaining
      })
    } catch (error) {
      console.error('Error sending message to Gemini:', error)
      return ResponseFormatter.error(
        'Failed to process message with history',
        'GEMINI_ERROR',
        error,
        { remaining: this.rateLimiter.remaining }
      )
    }
  }
} 