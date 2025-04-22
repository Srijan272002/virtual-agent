'use client'

import { useEffect } from 'react'
import { useRelationshipStore } from '@/lib/stores/useRelationshipStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Heart, Star, ArrowUp, Clock, MessageSquare } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

export default function RelationshipProgress() {
  const { 
    progress, 
    recentEvents, 
    isLoading, 
    error, 
    fetchRelationshipProgress, 
    fetchRecentEvents,
    getRelationshipStages,
    getEventTypes
  } = useRelationshipStore()
  
  const relationshipStages = getRelationshipStages()
  const eventTypes = getEventTypes()

  useEffect(() => {
    fetchRelationshipProgress()
    fetchRecentEvents()
  }, [fetchRelationshipProgress, fetchRecentEvents])

  // Calculate progress percentage
  const progressPercentage = progress 
    ? Math.min(Math.round((progress.experience / progress.next_level_exp) * 100), 100)
    : 0

  // Get current stage details
  const currentStage = progress 
    ? relationshipStages[progress.relationship_stage as keyof typeof relationshipStages]
    : relationshipStages.acquaintance

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-10 w-10"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-destructive text-center">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Relationship Status</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Heart className="h-3 w-3 fill-current text-rose-500" />
            <span className="font-semibold">Level {progress?.level}</span>
          </Badge>
        </div>
        <CardDescription>
          Track your relationship growth and progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge className="capitalize bg-pink-100 text-pink-800 hover:bg-pink-100">
                {progress?.relationship_stage.replace('_', ' ')}
              </Badge>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Star className="h-4 w-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Relationship Stages</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(relationshipStages).map(([stage, details]) => (
                        <div key={stage} className="flex justify-between items-center">
                          <span className={`capitalize ${progress?.relationship_stage === stage ? 'font-bold text-primary' : ''}`}>
                            {stage.replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground text-xs">Level {details.level}+</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress?.experience} / {progress?.next_level_exp} XP
            </span>
          </div>
          <Progress value={progressPercentage} />
          <p className="text-sm text-muted-foreground">{currentStage.description}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent Interactions</h3>
          {recentEvents.length > 0 ? (
            <div className="space-y-2">
              {recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{eventTypes[event.event_type as keyof typeof eventTypes]?.description || event.event_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">+{event.experience_points} XP</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No recent interactions yet
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Relationship started: {progress?.created_at ? formatDate(progress.created_at) : 'N/A'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchRelationshipProgress()} className="gap-1">
          <ArrowUp className="h-4 w-4" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  )
} 