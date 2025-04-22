'use client'

import { InteractionPatterns } from '@/components/InteractionPatterns'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function PatternsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container max-w-4xl py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Interaction Patterns</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Pattern
          </Button>
        </div>
        <p className="text-muted-foreground mb-8">
          Schedule daily and weekly interactions to maintain a consistent connection with your AI partner.
        </p>
        
        <InteractionPatterns />
      </main>
    </div>
  )
} 