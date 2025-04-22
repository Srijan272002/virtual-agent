import { useEffect, useState } from 'react'
import { useConversationStore } from '@/lib/stores/useConversationStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Activity, ThumbsUp, ThumbsDown } from 'lucide-react'

interface ActivityRecommendation {
  id: string
  title: string
  description: string
  category: string
  intensity: 'low' | 'medium' | 'high'
  duration: number // in minutes
  isLiked?: boolean
}

export function ActivityRecommendations() {
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { interestLearner } = useConversationStore()

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    setIsLoading(true)
    try {
      const summary = await interestLearner.getInterestSummary()
      
      // Generate recommendations based on top interests
      const newRecommendations = generateRecommendations(summary.topInterests)
      setRecommendations(newRecommendations)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateRecommendations = (topInterests: Array<{ topic: string; strength: number }>) => {
    const activityTemplates: Record<string, ActivityRecommendation[]> = {
      sports: [
        {
          id: 'workout-1',
          title: 'Quick Home Workout',
          description: 'A 15-minute workout routine you can do at home',
          category: 'fitness',
          intensity: 'medium',
          duration: 15
        },
        {
          id: 'yoga-1',
          title: 'Morning Yoga Session',
          description: 'Start your day with energizing yoga poses',
          category: 'fitness',
          intensity: 'low',
          duration: 20
        }
      ],
      reading: [
        {
          id: 'book-club-1',
          title: 'Start a Book Club',
          description: 'Choose a book and discuss it together',
          category: 'education',
          intensity: 'low',
          duration: 60
        }
      ],
      gaming: [
        {
          id: 'game-1',
          title: 'Gaming Session',
          description: 'Play your favorite game and share the experience',
          category: 'entertainment',
          intensity: 'low',
          duration: 30
        }
      ],
      cooking: [
        {
          id: 'recipe-1',
          title: 'Try a New Recipe',
          description: 'Cook something new and share the results',
          category: 'food',
          intensity: 'medium',
          duration: 45
        }
      ],
      music: [
        {
          id: 'playlist-1',
          title: 'Create a Shared Playlist',
          description: 'Build a playlist together with your favorite songs',
          category: 'entertainment',
          intensity: 'low',
          duration: 30
        }
      ],
      art: [
        {
          id: 'art-1',
          title: 'Creative Art Session',
          description: 'Express yourself through drawing or painting',
          category: 'creativity',
          intensity: 'medium',
          duration: 40
        }
      ]
    }

    const recommendations: ActivityRecommendation[] = []
    
    topInterests.forEach(interest => {
      const templates = activityTemplates[interest.topic.toLowerCase()]
      if (templates) {
        const recommendation = {
          ...templates[Math.floor(Math.random() * templates.length)],
          id: `${interest.topic}-${Date.now()}`
        }
        recommendations.push(recommendation)
      }
    })

    return recommendations.slice(0, 3) // Return top 3 recommendations
  }

  const handleLike = (id: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === id ? { ...rec, isLiked: true } : rec
      )
    )
  }

  const handleDislike = (id: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === id ? { ...rec, isLiked: false } : rec
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activity Recommendations</h2>
        <Button onClick={fetchRecommendations} variant="outline" size="sm">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {recommendations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {recommendations.map((recommendation) => (
            <Card key={recommendation.id}>
              <CardHeader>
                <CardTitle>{recommendation.title}</CardTitle>
                <CardDescription>
                  {recommendation.duration} minutes • {recommendation.intensity} intensity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{recommendation.description}</p>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant={recommendation.isLiked === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDislike(recommendation.id)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={recommendation.isLiked === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLike(recommendation.id)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No Recommendations</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Share your interests and activities to get personalized recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 