import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CookieOptions } from '@supabase/ssr'
import { createProfileIfNotExists } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set both in the cookie store and response
            cookieStore.set({
              name,
              value,
              ...options,
              // Ensure secure cookie settings
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true
            })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              // Ensure secure cookie settings
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
              maxAge: 0
            })
          },
        },
      }
    )

    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // If there's an error, redirect to login with error parameter
      return NextResponse.redirect(new URL(`/login?error=${error.message}`, request.url))
    }

    // Create profile if it doesn't exist
    if (session) {
      try {
        await createProfileIfNotExists(session.user.id, session.user.email)
      } catch (error) {
        console.error('Error creating profile:', error)
        // Continue even if profile creation fails - we can try again later
      }
    }
  }

  // Successful authentication - redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
} 