'use client'

import { useState } from 'react'
import { useFeedbackStore } from '@/lib/stores/useFeedbackStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'

interface ConversationRatingProps {
  conversationId: string
}

export default function ConversationRating({ conversationId }: ConversationRatingProps) {
  const { rateConversation } = useFeedbackStore()
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating)
    
    if (selectedRating <= 3) {
      setShowFeedback(true)
    } else {
      handleSubmit(selectedRating)
    }
  }

  const handleSubmit = async (selectedRating?: number) => {
    setIsSubmitting(true)
    
    try {
      await rateConversation(conversationId, selectedRating || rating, feedback || undefined)
      // Reset the form
      setRating(0)
      setFeedback('')
      setShowFeedback(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        {!showFeedback ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">How was this conversation?</p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="icon"
                  disabled={isSubmitting}
                  onClick={() => handleRatingSelect(value)}
                  className={`rounded-full h-10 w-10 ${rating === value ? 'text-yellow-500 bg-yellow-50' : ''}`}
                >
                  <Star className={`h-6 w-6 ${rating >= value ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Thank you for your rating. Would you like to provide more feedback?
            </p>
            <Textarea
              placeholder="What could be improved?"
              value={feedback}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
              className="resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  // Submit without feedback
                  handleSubmit()
                }}
              >
                Skip
              </Button>
              <Button 
                size="sm"
                disabled={isSubmitting || !feedback.trim()}
                onClick={() => handleSubmit()}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 