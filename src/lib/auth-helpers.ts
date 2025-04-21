import { createServerSupabase } from './supabase'
import type { PersonalityTrait } from '../types/database'

export async function createProfileIfNotExists(userId: string, email: string | undefined) {
  const supabase = createServerSupabase()
  
  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()
  
  if (!profile) {
    // Create new profile
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      username: email?.split('@')[0] || null,
      full_name: null,
      avatar_url: null
    })
    
    if (error) {
      console.error('Error creating profile:', error)
      throw error
    }
    
    // Initialize default personality traits
    const defaultTraits: Omit<PersonalityTrait, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
      { trait_name: 'openness', trait_value: 70 },
      { trait_name: 'conscientiousness', trait_value: 65 },
      { trait_name: 'extraversion', trait_value: 75 },
      { trait_name: 'agreeableness', trait_value: 80 },
      { trait_name: 'neuroticism', trait_value: 40 },
      { trait_name: 'empathy', trait_value: 85 },
      { trait_name: 'creativity', trait_value: 75 },
      { trait_name: 'curiosity', trait_value: 80 }
    ]
    
    const { error: traitsError } = await supabase
      .from('personality_traits')
      .insert(defaultTraits.map(trait => ({
        user_id: userId,
        ...trait
      })))
    
    if (traitsError) {
      console.error('Error creating personality traits:', traitsError)
      throw traitsError
    }
  }
  
  return true
} 