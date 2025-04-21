'use client'

import { useEffect, useState } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabase()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
      } else {
        router.push('/login')
      }
      
      setLoading(false)
    }
    
    checkUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Sign Out
        </button>
      </header>
      
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">User Profile</h2>
        {user && (
          <div>
            <p className="mb-2">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="mb-2">
              <span className="font-medium">ID:</span> {user.id}
            </p>
            <p className="mb-2">
              <span className="font-medium">Last Sign In:</span>{' '}
              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 