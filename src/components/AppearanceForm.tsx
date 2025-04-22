'use client'

import { useState, useEffect } from 'react'
import { useProfileStore } from '@/lib/stores/useProfileStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AppearanceForm() {
  const { updateAppearanceSetting, appearanceSettings, fetchAppearanceSettings } = useProfileStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [settings, setSettings] = useState({
    avatarStyle: 'photo',
    hairColor: 'brown',
    eyeColor: 'brown',
    skinTone: 'medium',
    outfitStyle: 'casual'
  })

  // Load settings on mount
  useEffect(() => {
    fetchAppearanceSettings()
  }, [fetchAppearanceSettings])

  // Update local state when store settings change
  useEffect(() => {
    if (appearanceSettings) {
      setSettings({
        avatarStyle: appearanceSettings.avatarStyle || 'photo',
        hairColor: appearanceSettings.hairColor || 'brown',
        eyeColor: appearanceSettings.eyeColor || 'brown',
        skinTone: appearanceSettings.skinTone || 'medium',
        outfitStyle: appearanceSettings.outfitStyle || 'casual'
      })
      setIsDirty(false)
    }
  }, [appearanceSettings])

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Update each setting one by one
      for (const [key, value] of Object.entries(settings)) {
        await updateAppearanceSetting(key, value)
      }

      toast.success('Appearance settings saved', {
        description: 'Your AI appearance preferences have been updated.'
      })
      
      setIsDirty(false)
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save appearance settings'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance Customization</CardTitle>
        <CardDescription>Customize how your AI companion looks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Avatar Style</Label>
            <RadioGroup
              value={settings.avatarStyle}
              onValueChange={(value: string) => handleChange('avatarStyle', value)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="photo" id="avatar-photo" />
                <Label htmlFor="avatar-photo">Photo-realistic</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="anime" id="avatar-anime" />
                <Label htmlFor="avatar-anime">Anime</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cartoon" id="avatar-cartoon" />
                <Label htmlFor="avatar-cartoon">Cartoon</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hair-color">Hair Color</Label>
            <Select
              value={settings.hairColor}
              onValueChange={(value: string) => handleChange('hairColor', value)}
            >
              <SelectTrigger id="hair-color">
                <SelectValue placeholder="Select hair color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black">Black</SelectItem>
                <SelectItem value="brown">Brown</SelectItem>
                <SelectItem value="blonde">Blonde</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="auburn">Auburn</SelectItem>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
                <SelectItem value="pink">Pink</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eye-color">Eye Color</Label>
            <Select
              value={settings.eyeColor}
              onValueChange={(value: string) => handleChange('eyeColor', value)}
            >
              <SelectTrigger id="eye-color">
                <SelectValue placeholder="Select eye color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brown">Brown</SelectItem>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="hazel">Hazel</SelectItem>
                <SelectItem value="amber">Amber</SelectItem>
                <SelectItem value="gray">Gray</SelectItem>
                <SelectItem value="violet">Violet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skin-tone">Skin Tone</Label>
            <Select
              value={settings.skinTone}
              onValueChange={(value: string) => handleChange('skinTone', value)}
            >
              <SelectTrigger id="skin-tone">
                <SelectValue placeholder="Select skin tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="olive">Olive</SelectItem>
                <SelectItem value="tan">Tan</SelectItem>
                <SelectItem value="brown">Brown</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outfit-style">Outfit Style</Label>
            <Select
              value={settings.outfitStyle}
              onValueChange={(value: string) => handleChange('outfitStyle', value)}
            >
              <SelectTrigger id="outfit-style">
                <SelectValue placeholder="Select outfit style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="sporty">Sporty</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
                <SelectItem value="punk">Punk</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="goth">Gothic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !isDirty}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Appearance Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 