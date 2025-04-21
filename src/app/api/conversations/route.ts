import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-helpers'
import type { Database } from '@/types/database'
import { CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
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
            // Convert the options to a compatible format
            const { sameSite, ...otherOptions } = options
            // @ts-expect-error - Next.js types are not fully compatible with Supabase
            cookieStore.set({
              name,
              value,
              ...otherOptions,
              sameSite: sameSite
            })
          } catch {
            // Ignore set cookie errors in production
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Convert the options to a compatible format
            const { sameSite, ...otherOptions } = options
            // @ts-expect-error - Next.js types are not fully compatible with Supabase
            cookieStore.set({
              name,
              value: '',
              ...otherOptions,
              sameSite: sameSite
            })
          } catch {
            // Ignore set cookie errors in production
          }
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return unauthorizedResponse()
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*, messages!messages_conversation_id_fkey(count)')
    .order('last_message_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (error) {
    return errorResponse(error.message)
  }

  return successResponse(conversations)
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
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
            // Convert the options to a compatible format
            const { sameSite, ...otherOptions } = options
            // @ts-expect-error - Next.js types are not fully compatible with Supabase
            cookieStore.set({
              name,
              value,
              ...otherOptions,
              sameSite: sameSite
            })
          } catch {
            // Ignore set cookie errors in production
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Convert the options to a compatible format
            const { sameSite, ...otherOptions } = options
            // @ts-expect-error - Next.js types are not fully compatible with Supabase
            cookieStore.set({
              name,
              value: '',
              ...otherOptions,
              sameSite: sameSite
            })
          } catch {
            // Ignore set cookie errors in production
          }
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return unauthorizedResponse()
  }

  try {
    const json = await request.json()
    const { title } = json

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: session.user.id,
        title: title || 'New Conversation'
      })
      .select()
      .single()

    if (error) {
      return errorResponse(error.message)
    }

    return successResponse(conversation)
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message)
    }
    return errorResponse('Invalid request body')
  }
} 