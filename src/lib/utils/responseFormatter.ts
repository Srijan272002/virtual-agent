export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    timestamp: string
    requestId?: string
    remaining?: number
  }
}

export class ResponseFormatter {
  static success<T>(data: T, metadata?: Partial<APIResponse<T>['metadata']>): APIResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    }
  }

  static error(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: unknown,
    metadata?: Partial<APIResponse<never>['metadata']>
  ): APIResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    }
  }

  static tokenize(text: string): string[] {
    // Simple tokenization - in production, use a proper tokenizer
    return text.split(/\s+/)
  }

  static truncateResponse(text: string, maxTokens: number): string {
    const tokens = this.tokenize(text)
    if (tokens.length <= maxTokens) return text

    // Try to find a good breakpoint (end of sentence)
    const truncated = tokens.slice(0, maxTokens).join(' ')
    const lastPeriod = truncated.lastIndexOf('.')
    const lastQuestion = truncated.lastIndexOf('?')
    const lastExclamation = truncated.lastIndexOf('!')

    const breakpoint = Math.max(lastPeriod, lastQuestion, lastExclamation)
    return breakpoint > 0 ? truncated.slice(0, breakpoint + 1) : truncated
  }
} 