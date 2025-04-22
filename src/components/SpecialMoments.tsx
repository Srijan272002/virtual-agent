import { useEffect } from 'react'
import { useConversationStore } from '@/lib/stores/useConversationStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CalendarHeart, Gift, PartyPopper, Star, Trash2 } from 'lucide-react'
import { formatDistanceToNow, format, isAfter, isBefore, addDays } from 'date-fns'
import { AddSpecialMomentForm } from '@/components/AddSpecialMomentForm'

export function SpecialMoments() {
  const { 
    specialMoments, 
    isLoading, 
    fetchSpecialMoments,
    markMomentAsCelebrated,
    deleteSpecialMoment
  } = useConversationStore()
  
  useEffect(() => {
    fetchSpecialMoments()
  }, [fetchSpecialMoments])
  
  // Group moments into upcoming and past
  const today = new Date()
  const upcomingMoments = specialMoments.filter(moment => 
    isAfter(new Date(moment.date), today) && 
    isBefore(new Date(moment.date), addDays(today, 30))
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const pastMoments = specialMoments.filter(moment => 
    isBefore(new Date(moment.date), today) && 
    !moment.celebrated
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const recentlyCelebrated = specialMoments.filter(moment => 
    moment.celebrated
  ).slice(0, 3)
  
  const getMomentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'anniversary':
        return <CalendarHeart className="h-5 w-5" />
      case 'birthday':
        return <Gift className="h-5 w-5" />
      case 'milestone':
        return <Star className="h-5 w-5" />
      default:
        return <PartyPopper className="h-5 w-5" />
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Special Moments</h2>
      </div>
      
      <AddSpecialMomentForm />
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {upcomingMoments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Upcoming</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingMoments.map((moment) => (
                  <Card key={moment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getMomentIcon(moment.type)}
                          {moment.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge>{moment.type}</Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => deleteSpecialMoment(moment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {format(new Date(moment.date), 'MMMM d, yyyy')} • {formatDistanceToNow(new Date(moment.date), { addSuffix: true })}
                        {moment.recurring && (
                          <span className="ml-2">(Recurring {moment.recurrencePattern})</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{moment.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {pastMoments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Ready to Celebrate</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {pastMoments.map((moment) => (
                  <Card key={moment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getMomentIcon(moment.type)}
                          {moment.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{moment.type}</Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => deleteSpecialMoment(moment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {format(new Date(moment.date), 'MMMM d, yyyy')} • {formatDistanceToNow(new Date(moment.date), { addSuffix: true })}
                        {moment.recurring && (
                          <span className="ml-2">(Recurring {moment.recurrencePattern})</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{moment.description}</p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => markMomentAsCelebrated(moment.id)}
                        className="w-full"
                      >
                        <PartyPopper className="h-4 w-4 mr-2" />
                        Celebrate Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {recentlyCelebrated.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Recently Celebrated</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {recentlyCelebrated.map((moment) => (
                  <Card key={moment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getMomentIcon(moment.type)}
                          {moment.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{moment.type}</Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => deleteSpecialMoment(moment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {format(new Date(moment.date), 'MMMM d, yyyy')} • Celebrated!
                        {moment.recurring && (
                          <span className="ml-2">(Recurring {moment.recurrencePattern})</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{moment.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {upcomingMoments.length === 0 && pastMoments.length === 0 && recentlyCelebrated.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CalendarHeart className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No Special Moments</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      You haven&apos;t added any special moments yet. Add birthdays, anniversaries, and other important dates to celebrate with your AI partner.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
} 