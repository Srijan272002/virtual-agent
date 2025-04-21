'use client'

import { useEffect, useState } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabase()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        router.push('/dashboard')
      }
      
      setIsLoading(false)
    }
    
    checkSession()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-6 text-4xl font-bold">AI Girlfriend</h1>
        <p className="mb-8 text-xl text-gray-600">Your personal AI companion</p>
        
        <div className="flex justify-center gap-4">
          <Link 
            href="/login"
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
