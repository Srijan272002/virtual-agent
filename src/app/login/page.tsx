'use client'

import { createClientSupabase } from '@/lib/supabase'
import { useState } from 'react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientSupabase()

  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (error) {
      console.error('Error signing in with Google:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">AI Girlfriend</h1>
          <p className="mt-2 text-gray-600">Sign in to continue</p>
        </div>
        
        <button
          onClick={handleSignInWithGoogle}
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isLoading ? (
            <span className="mr-2 h-4 w-4 animate-spin">●</span>
          ) : (
            <svg
              className="mr-2 h-5 w-5"
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M15.545 6.558a9.42 9.42 0 0 0-1.33-1.752 8.505 8.505 0 0 0-2.016-1.47 8.95 8.95 0 0 0-2.419-.794 9.03 9.03 0 0 0-2.47-.143 8.707 8.707 0 0 0-2.39.467 8.301 8.301 0 0 0-2.12 1.115 8.32 8.32 0 0 0-1.689 1.663 8.301 8.301 0 0 0-1.115 2.12 8.707 8.707 0 0 0-.467 2.39c-.084.83-.043 1.653.143 2.47.23.85.561 1.658.994 2.42a8.505 8.505 0 0 0 1.47 2.015 9.42 9.42 0 0 0 1.752 1.33c.577.362 1.198.67 1.85.914a9.45 9.45 0 0 0 2.012.417 9.403 9.403 0 0 0 2.134-.006c.683-.085 1.343-.247 1.97-.484a8.289 8.289 0 0 0 1.753-.904 8.36 8.36 0 0 0 1.456-1.236 8.306 8.306 0 0 0 1.095-1.562 8.69 8.69 0 0 0 .686-1.835c.166-.647.252-1.31.263-1.975a9.75 9.75 0 0 0-.142-1.64 9.64 9.64 0 0 0-.48-1.73 10.163 10.163 0 0 0-.904-1.696zM9.997 14.985a4.998 4.998 0 0 1-4.998-4.998c0-2.76 2.238-4.998 4.998-4.998 2.76 0 4.998 2.238 4.998 4.998 0 2.76-2.238 4.998-4.998 4.998z"
              ></path>
            </svg>
          )}
          Sign in with Google
        </button>
      </div>
    </div>
  )
} 