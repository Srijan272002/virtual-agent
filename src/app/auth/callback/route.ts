import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // @ts-expect-error - Next.js types are not fully compatible with Supabase
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              // @ts-expect-error - Next.js types are not fully compatible with Supabase
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error('Failed to set cookie:', error)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              // @ts-expect-error - Next.js types are not fully compatible with Supabase
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              console.error('Failed to remove cookie:', error)
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/auth/auth-error', request.url))
} 