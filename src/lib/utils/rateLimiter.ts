interface RateLimiterOptions {
  maxRequests: number
  timeWindow: number // in milliseconds
}

export class RateLimiter {
  private requests: number[] = []
  private maxRequests: number
  private timeWindow: number

  constructor({ maxRequests, timeWindow }: RateLimiterOptions) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
  }

  async waitForCapacity(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.timeWindow)

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.timeWindow - (now - oldestRequest)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.waitForCapacity()
    }

    this.requests.push(now)
  }

  get remaining(): number {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    return Math.max(0, this.maxRequests - this.requests.length)
  }
} 