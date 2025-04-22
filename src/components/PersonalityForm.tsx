'use client'

import { useState, useEffect } from 'react'
import { useProfileStore } from '@/lib/stores/useProfileStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const personalityTraits = [
  {
    name: 'warmth',
    label: 'Warmth',
    description: 'How warm and affectionate the AI appears in conversations',
  },
  {
    name: 'humor',
    label: 'Humor',
    description: 'How often the AI uses humor and jokes in responses',
  },
  {
    name: 'assertiveness',
    label: 'Assertiveness',
    description: 'How direct and assertive the AI is in conversations',
  },
  {
    name: 'curiosity',
    label: 'Curiosity',
    description: 'How interested the AI is in learning about you',
  },
  {
    name: 'empathy',
    label: 'Empathy',
    description: 'How emotionally understanding the AI is to your feelings',
  },
]

export default function PersonalityForm() {
  const { personalityTraits: savedTraits, updatePersonalityTrait } = useProfileStore()
  const [traitValues, setTraitValues] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Initialize trait values from store
  useEffect(() => {
    const initialValues: Record<string, number> = {}
    
    personalityTraits.forEach(trait => {
      const savedTrait = savedTraits.find(t => t.trait_name === trait.name)
      initialValues[trait.name] = savedTrait ? savedTrait.trait_value : 50
    })
    
    setTraitValues(initialValues)
    setIsDirty(false)
  }, [savedTraits])

  const handleSliderChange = (name: string, value: number[]) => {
    setTraitValues(prev => ({ ...prev, [name]: value[0] }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Update each trait
      for (const traitName of Object.keys(traitValues)) {
        await updatePersonalityTrait(traitName, traitValues[traitName])
      }
      
      toast.success('Personality settings saved', {
        description: 'Your personality preferences have been updated successfully.',
      })
      
      setIsDirty(false)
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save personality settings',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personality Settings</CardTitle>
        <CardDescription>Customize how the AI interacts with you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {personalityTraits.map((trait) => (
          <div key={trait.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={trait.name}>{trait.label}</Label>
              <span className="text-sm text-muted-foreground">{traitValues[trait.name] || 0}</span>
            </div>
            <Slider
              id={trait.name}
              min={0}
              max={100}
              step={1}
              value={[traitValues[trait.name] || 0]}
              onValueChange={(value: number[]) => handleSliderChange(trait.name, value)}
            />
            <p className="text-sm text-muted-foreground">{trait.description}</p>
          </div>
        ))}
        
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !isDirty}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Personality Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 