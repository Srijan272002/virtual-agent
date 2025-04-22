'use client'

import React, { useEffect } from 'react'
import { useConversationStore, InteractionPattern } from '@/lib/stores/useConversationStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Clock, Calendar, Bell, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type PatternDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export function InteractionPatterns() {
  const { 
    interactionPatterns, 
    isLoading, 
    fetchInteractionPatterns,
    togglePatternActive
  } = useConversationStore()
  
  useEffect(() => {
    fetchInteractionPatterns()
  }, [fetchInteractionPatterns])
  
  const formatDayDisplay = (day: PatternDay): string => {
    return day.charAt(0).toUpperCase() + day.slice(1)
  }
  
  const dailyPatterns = interactionPatterns.filter(
    (pattern) => pattern.type === 'daily'
  )
  
  const weeklyPatterns = interactionPatterns.filter(
    (pattern) => pattern.type === 'weekly'
  )
  
  const renderPatternCard = (pattern: InteractionPattern) => (
    <Card key={pattern.id} className={!pattern.active ? "opacity-70" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{pattern.title}</CardTitle>
            <CardDescription>
              {pattern.type === 'daily' ? 'Every day' : pattern.day ? `Every ${formatDayDisplay(pattern.day)}` : ''}
              {pattern.time && ` at ${pattern.time}`}
            </CardDescription>
          </div>
          <Switch 
            checked={pattern.active} 
            onCheckedChange={() => togglePatternActive(pattern.id)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{pattern.description}</p>
        
        {pattern.active && pattern.reminderEnabled && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Reminder {pattern.reminderTime} minutes before
            </span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {pattern.lastInteracted ? (
            <>Last interaction: {formatDistanceToNow(new Date(pattern.lastInteracted), {
              addSuffix: true,
            })}</>
          ) : 'No previous interactions'}
        </div>
        
        <div className="flex items-center gap-2">
          {pattern.active ? (
            <div className="flex items-center gap-1 text-sm font-medium text-green-500">
              <Check className="h-4 w-4" />
              <span>Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <X className="h-4 w-4" />
              <span>Inactive</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
  
  if (isLoading) {
    return <div className="text-center py-8">Loading interaction patterns...</div>
  }

  if (interactionPatterns.length === 0) {
    return (
      <div className="text-center py-8">
        No interaction patterns available. Create your first pattern!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Interaction Patterns</h2>
      </div>
      
      <Tabs defaultValue="daily">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Daily</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Weekly</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="mt-4">
          {dailyPatterns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {dailyPatterns.map(renderPatternCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No Daily Patterns</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      You haven&apos;t set up any daily interaction patterns yet. Create daily patterns to establish a routine with your AI partner.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="weekly" className="mt-4">
          {weeklyPatterns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {weeklyPatterns.map(renderPatternCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No Weekly Patterns</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      You haven&apos;t set up any weekly interaction patterns yet. Create weekly patterns to establish a schedule with your AI partner.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 