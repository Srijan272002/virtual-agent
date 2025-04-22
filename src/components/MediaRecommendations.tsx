/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { useConversationStore } from '@/lib/stores/useConversationStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VoiceMessage } from '@/components/chat/VoiceMessage'
import { Image as ImageIcon, Mic } from 'lucide-react'
import type { SharedImage, SharedVoice } from '@/types/database'
import { MediaRecommender } from '@/lib/recommendation/MediaRecommender'

interface RecommendedItem {
  item: SharedImage | SharedVoice
  type: 'image' | 'voice'
  score: number
}

const recommender = new MediaRecommender()

export function MediaRecommendations() {
  const { 
    sharedImages, 
    sharedVoices, 
    messages, 
    isLoading,
    currentConversation,
    fetchMessages
  } = useConversationStore()
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([])

  useEffect(() => {
    if (currentConversation) {
      fetchMessages()
    }
  }, [currentConversation, fetchMessages])

  useEffect(() => {
    if (!isLoading && messages && (sharedImages.length > 0 || sharedVoices.length > 0)) {
      const recentMessages = messages.slice(-10) // Get last 10 messages
      const fetchRecommendations = async () => {
        const newRecommendations = await recommender.getRecommendations(
          sharedImages,
          sharedVoices,
          recentMessages
        )
        setRecommendations(newRecommendations)
      }
      fetchRecommendations()
    }
  }, [isLoading, messages, sharedImages, sharedVoices])

  const handleInteraction = (item: RecommendedItem, type: 'view' | 'play') => {
    recommender.addInteraction(item.item.id, type)
  }

  if (isLoading || recommendations.length === 0) return null

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Suggested Media</CardTitle>
        <CardDescription>Based on your conversation</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-2 gap-4 p-2 md:grid-cols-3">
            {recommendations.map((item) => (
              <div
                key={item.item.id}
                className="group relative"
                onClick={() => handleInteraction(item, item.type === 'image' ? 'view' : 'play')}
              >
                {item.type === 'voice' ? (
                  <Card className="p-3">
                    <VoiceMessage
                      mode="playback"
                      audioUrl={item.item.url}
                      className="min-w-[150px]"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={item.item.url}
                      alt={(item.item as SharedImage).caption || 'Recommended image'}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {(item.item as SharedImage).caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <p className="text-xs text-white truncate">
                          {(item.item as SharedImage).caption}
                        </p>
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <ImageIcon className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 