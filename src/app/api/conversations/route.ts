import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return new NextResponse('Internal Server Error', { status: 500 })
    }

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error in GET /api/conversations:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { title } = await request.json()

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        title,
        user_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return new NextResponse('Internal Server Error', { status: 500 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error in POST /api/conversations:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 