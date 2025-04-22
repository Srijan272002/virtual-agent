'use client'

import { useState, useEffect } from 'react'
import { useConversationStore, ConversationSuggestion } from '@/lib/stores/useConversationStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, MessageSquarePlus, RefreshCw, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ConversationSuggestions() {
  const { 
    suggestions, 
    predefinedTopics,
    isLoading, 
    fetchSuggestions, 
    fetchPredefinedTopics,
    markSuggestionAsUsed, 
    generateSuggestions,
    addCustomSuggestion,
    getTopicCategories
  } = useConversationStore()
  
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  useEffect(() => {
    fetchSuggestions()
    fetchPredefinedTopics()
  }, [fetchSuggestions, fetchPredefinedTopics])
  
  const handleGenerateSuggestions = async () => {
    setIsGenerating(true)
    await generateSuggestions()
    setIsGenerating(false)
  }
  
  const handleAddCustomTopic = async () => {
    await addCustomSuggestion(newTopic, newDescription, newCategory)
    setNewTopic('')
    setNewDescription('')
    setNewCategory('')
    setOpenAddDialog(false)
  }
  
  const topicCategories = getTopicCategories()
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Conversation Suggestions</h2>
        <div className="flex gap-2">
          <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Topic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Conversation Topic</DialogTitle>
                <DialogDescription>
                  Create your own conversation topic to discuss with your AI partner.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input 
                    id="topic" 
                    value={newTopic} 
                    onChange={(e) => setNewTopic(e.target.value)} 
                    placeholder="What would you like to talk about?"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea 
                    id="description" 
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)} 
                    placeholder="Add more details about this topic"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newCategory} 
                    onValueChange={setNewCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {topicCategories.map((category: string) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddCustomTopic} 
                  disabled={!newTopic || !newCategory}
                >
                  Add Topic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={handleGenerateSuggestions} 
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <MessageSquarePlus className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No Conversation Suggestions</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Generate some conversation topics to get ideas for what to discuss with your AI partner.
                </p>
                <Button onClick={handleGenerateSuggestions} className="mt-4">
                  Generate Suggestions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {suggestions.map((suggestion: ConversationSuggestion) => (
            <Card key={suggestion.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{suggestion.topic}</CardTitle>
                  <Badge>{suggestion.category}</Badge>
                </div>
                {suggestion.description && (
                  <CardDescription>{suggestion.description}</CardDescription>
                )}
              </CardHeader>
              <CardFooter>
                <Button 
                  variant="secondary" 
                  onClick={() => markSuggestionAsUsed(suggestion.id)}
                >
                  Use This Topic
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}