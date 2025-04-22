import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Message } from '@/types/database'
import { ConversationManager } from './conversationManager'
import { EmotionAnalyzer, Emotion } from '../emotion/emotionAnalyzer'

interface ConversationState {
  currentTopic: string
  emotionalState: Emotion
  contextRelevance: number
  turnCount: number
  lastResponseType: string
}

interface ResponseStrategy {
  type: string
  condition: (state: ConversationState) => boolean
  priority: number
  templates: string[]
}

const RESPONSE_STRATEGIES: ResponseStrategy[] = [
  {
    type: 'emotional_support',
    condition: (state) => state.emotionalState.valence < -0.3,
    priority: 1,
    templates: [
      "I can sense that you're feeling {emotion}. Would you like to talk about it?",
      "It seems like something's bothering you. I'm here to listen.",
      "I understand this might be difficult. Take your time."
    ]
  },
  {
    type: 'topic_continuation',
    condition: (state) => state.contextRelevance > 0.7,
    priority: 2,
    templates: [
      "That's interesting about {topic}. Can you tell me more?",
      "I'd love to hear more about your thoughts on {topic}.",
      "What else comes to mind when you think about {topic}?"
    ]
  },
  {
    type: 'topic_transition',
    condition: (state) => state.contextRelevance < 0.3,
    priority: 3,
    templates: [
      "That reminds me, earlier you mentioned {previous_topic}. How does that relate?",
      "Interesting perspective. How does this connect with {previous_topic}?",
      "I see. Does this have any connection to what we discussed about {previous_topic}?"
    ]
  },
  {
    type: 'clarification',
    condition: (state) => state.contextRelevance < 0.5,
    priority: 4,
    templates: [
      "Could you help me understand how this relates to what we were discussing?",
      "I want to make sure I'm following. Can you elaborate on that?",
      "That's an interesting point. How does it connect to our previous conversation?"
    ]
  }
]

export class ConversationHandler {
  private supabase
  private conversationId: string
  private manager: ConversationManager
  private emotionAnalyzer: EmotionAnalyzer
  private state: ConversationState
  private topicHistory: string[] = []

  constructor(conversationId: string) {
    this.supabase = createClientComponentClient<Database>()
    this.conversationId = conversationId
    this.manager = new ConversationManager(conversationId)
    this.emotionAnalyzer = new EmotionAnalyzer(conversationId)
    this.state = {
      currentTopic: '',
      emotionalState: {
        primary: 'neutral',
        intensity: 0,
        valence: 0,
        arousal: 0
      },
      contextRelevance: 1,
      turnCount: 0,
      lastResponseType: 'greeting'
    }
  }

  async initialize(): Promise<void> {
    await this.manager.initialize()
  }

  async processMessage(message: Message): Promise<string> {
    // Update conversation state
    await this.manager.processMessage(message)
    
    // Analyze emotion
    const emotion = this.emotionAnalyzer.analyzeEmotion(message.content)
    this.state.emotionalState = emotion

    // Update topic and context
    this.updateTopicAndContext(message.content)

    // Generate response
    const response = await this.generateResponse()
    
    // Update state
    this.state.turnCount++
    await this.manager.addResponse(response)

    return response
  }

  private updateTopicAndContext(message: string): void {
    // Extract topic from message and context
    const topics = this.manager.getActiveContext()
      .map(m => this.extractTopics(m.content))
      .flat()
    
    const currentTopics = this.extractTopics(message)
    
    // Calculate topic overlap for context relevance
    const overlap = currentTopics.filter(topic => 
      topics.includes(topic)
    ).length

    this.state.contextRelevance = topics.length > 0 ? 
      overlap / Math.max(currentTopics.length, 1) : 1

    if (currentTopics.length > 0) {
      this.state.currentTopic = currentTopics[0]
      if (this.topicHistory[this.topicHistory.length - 1] !== this.state.currentTopic) {
        this.topicHistory.push(this.state.currentTopic)
      }
    }
  }

  private extractTopics(text: string): string[] {
    const topics = new Set<string>()
    
    // Simple keyword-based topic extraction
    const topicKeywords = {
      'family': ['family', 'parent', 'sister', 'brother', 'mom', 'dad'],
      'work': ['work', 'job', 'career', 'office', 'business'],
      'hobbies': ['hobby', 'interest', 'fun', 'enjoy', 'like to'],
      'feelings': ['feel', 'emotion', 'mood', 'happy', 'sad', 'angry'],
      'relationships': ['relationship', 'friend', 'partner', 'love', 'dating'],
      'future': ['future', 'plan', 'goal', 'dream', 'hope'],
      'problems': ['problem', 'issue', 'worry', 'concern', 'trouble']
    }

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        topics.add(topic)
      }
    })

    return Array.from(topics)
  }

  private async generateResponse(): Promise<string> {
    // Get applicable strategies
    const applicableStrategies = RESPONSE_STRATEGIES
      .filter(strategy => strategy.condition(this.state))
      .sort((a, b) => a.priority - b.priority)

    if (applicableStrategies.length === 0) {
      return this.generateDefaultResponse()
    }

    // Select strategy
    const strategy = applicableStrategies[0]
    this.state.lastResponseType = strategy.type

    // Get template and fill placeholders
    let template = strategy.templates[Math.floor(Math.random() * strategy.templates.length)]
    
    template = template
      .replace('{emotion}', this.state.emotionalState.primary)
      .replace('{topic}', this.state.currentTopic)
      .replace('{previous_topic}', this.topicHistory[this.topicHistory.length - 2] || this.state.currentTopic)

    return template
  }

  private generateDefaultResponse(): string {
    const defaultTemplates = [
      "That's interesting! Tell me more.",
      "I see. How do you feel about that?",
      "What are your thoughts on this?",
      "Could you elaborate on that?"
    ]

    return defaultTemplates[Math.floor(Math.random() * defaultTemplates.length)]
  }

  async suggestNextAction(): Promise<{
    action: string
    explanation: string
  }> {
    const emotionalTrend = this.emotionAnalyzer.getEmotionalTrend()

    // Analyze conversation state and suggest appropriate action
    if (emotionalTrend.averageValence < -0.3 && emotionalTrend.emotionalStability < 0.5) {
      return {
        action: 'emotional_support',
        explanation: 'User shows signs of emotional distress. Provide empathetic support.'
      }
    }

    if (this.state.contextRelevance < 0.3 && this.topicHistory.length > 1) {
      return {
        action: 'topic_connection',
        explanation: 'Conversation seems disconnected. Try to bridge current topic with previous ones.'
      }
    }

    if (this.state.turnCount > 5 && this.state.contextRelevance > 0.8) {
      return {
        action: 'topic_expansion',
        explanation: 'Conversation is focused but might benefit from exploring related topics.'
      }
    }

    return {
      action: 'continue_engagement',
      explanation: 'Maintain current conversation flow and encourage user expression.'
    }
  }
} 