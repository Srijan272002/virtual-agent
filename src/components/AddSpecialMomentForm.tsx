'use client'

import { useState } from 'react'
import { useConversationStore, SpecialMoment } from '@/lib/stores/useConversationStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { CalendarIcon, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// We're creating a simplified version that doesn't require additional dependencies
export function AddSpecialMomentForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    date: '',
    recurring: false,
    recurrencePattern: 'yearly'
  })
  const { createSpecialMoment } = useConversationStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, recurring: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.type || !formData.date) {
      return // basic validation
    }

    const newMoment: Omit<SpecialMoment, 'id' | 'celebrated'> = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      date: new Date(formData.date).toISOString(),
      recurring: formData.recurring,
      recurrencePattern: formData.recurring ? formData.recurrencePattern : undefined
    }

    await createSpecialMoment(newMoment)
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      type: '',
      date: '',
      recurring: false,
      recurrencePattern: 'yearly'
    })
    
    setIsOpen(false)
  }

  const showForm = () => setIsOpen(true)
  const hideForm = () => setIsOpen(false)

  return (
    <div className="w-full">
      {!isOpen ? (
        <Button 
          variant="outline" 
          className="flex items-center gap-2 w-full" 
          onClick={showForm}
        >
          <PlusCircle className="h-4 w-4" />
          Add Special Moment
        </Button>
      ) : (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Add Special Moment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="title">
                  Title
                </label>
                <Input 
                  id="title"
                  name="title"
                  placeholder="Moment title" 
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="description">
                  Description
                </label>
                <Textarea 
                  id="description"
                  name="description"
                  placeholder="Describe what makes this moment special" 
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type
                </label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select moment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="date">
                  Date
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className={cn(
                      "w-full pl-3",
                      !formData.date && "text-muted-foreground"
                    )}
                  />
                  <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
                </div>
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Recurring</label>
                  <div className="text-sm text-muted-foreground">
                    Does this moment repeat yearly?
                  </div>
                </div>
                <Switch
                  checked={formData.recurring}
                  onCheckedChange={handleSwitchChange}
                />
              </div>

              {formData.recurring && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Recurrence Pattern
                  </label>
                  <Select 
                    value={formData.recurrencePattern} 
                    onValueChange={(value) => handleSelectChange('recurrencePattern', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={hideForm}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Moment</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 