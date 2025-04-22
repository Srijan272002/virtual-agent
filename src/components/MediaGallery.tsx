/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react'
import { useConversationStore } from '@/lib/stores/useConversationStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { VoiceMessage } from '@/components/chat/VoiceMessage'
import { Image as ImageIcon, Mic, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SharedImage, SharedVoice } from '@/types/database'

interface MediaItemProps {
  item: SharedImage | SharedVoice
  onDelete: (id: string) => Promise<void>
}

function MediaItem({ item, onDelete }: MediaItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(item.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const isVoice = 'duration' in item

  return (
    <div className="group relative">
      {isVoice ? (
        <Card className="p-4">
          <VoiceMessage
            mode="playback"
            audioUrl={item.url}
            className="min-w-[200px]"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString()}
          </p>
        </Card>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <img
            src={item.url}
            alt={item.caption || 'Shared image'}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {item.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
              <p className="text-sm text-white">{item.caption}</p>
            </div>
          )}
        </div>
      )}
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          "absolute right-2 top-2 h-8 w-8",
          !isVoice && "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

export function MediaGallery() {
  const { sharedImages, sharedVoices, fetchSharedImages, fetchSharedVoices, deleteImage, deleteVoice, isLoading } = useConversationStore()

  useEffect(() => {
    fetchSharedImages()
    fetchSharedVoices()
  }, [fetchSharedImages, fetchSharedVoices])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Gallery</CardTitle>
        <CardDescription>View and manage your shared media</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="images">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images
              {sharedImages.length > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {sharedImages.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice Messages
              {sharedVoices.length > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {sharedVoices.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="images">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sharedImages.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3">
                    {sharedImages.map((image) => (
                      <MediaItem
                        key={image.id}
                        item={image}
                        onDelete={deleteImage}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Images</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your first image to see it here
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="voice">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sharedVoices.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-4 p-4">
                    {sharedVoices.map((voice) => (
                      <MediaItem
                        key={voice.id}
                        item={voice}
                        onDelete={deleteVoice}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center">
                  <Mic className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Voice Messages</h3>
                  <p className="text-sm text-muted-foreground">
                    Record your first voice message to see it here
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
} 