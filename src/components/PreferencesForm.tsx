'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Create local storage key for preferences
const PREFERENCES_KEY = 'user-preferences'

interface Preferences {
  darkMode: boolean
  notifications: boolean
  soundEffects: boolean
  autoSuggest: boolean
}

const defaultPreferences: Preferences = {
  darkMode: false,
  notifications: true,
  soundEffects: true,
  autoSuggest: true
}

export default function PreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Load saved preferences on initial render
  useEffect(() => {
    const savedPreferences = localStorage.getItem(PREFERENCES_KEY)
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences))
      } catch (error) {
        console.error('Failed to parse saved preferences:', error)
      }
    }
  }, [])

  const handleToggle = (key: keyof Preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    setIsDirty(true)
  }

  const handleSave = () => {
    setIsSaving(true)
    
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
      
      // Apply dark mode change immediately if needed
      if (preferences.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      toast.success('Preferences saved', {
        description: 'Your preferences have been updated successfully.',
      })
      
      setIsDirty(false)
    } catch {
      toast.error('Error', {
        description: 'Failed to save preferences',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interface Preferences</CardTitle>
        <CardDescription>Customize your app experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch to dark theme for reduced eye strain
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={preferences.darkMode}
              onCheckedChange={() => handleToggle('darkMode')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable message and activity notifications
              </p>
            </div>
            <Switch
              id="notifications"
              checked={preferences.notifications}
              onCheckedChange={() => handleToggle('notifications')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-effects">Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for messages and notifications
              </p>
            </div>
            <Switch
              id="sound-effects"
              checked={preferences.soundEffects}
              onCheckedChange={() => handleToggle('soundEffects')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-suggest">Auto-Suggest</Label>
              <p className="text-sm text-muted-foreground">
                Show conversation topic suggestions
              </p>
            </div>
            <Switch
              id="auto-suggest"
              checked={preferences.autoSuggest}
              onCheckedChange={() => handleToggle('autoSuggest')}
            />
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !isDirty}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 