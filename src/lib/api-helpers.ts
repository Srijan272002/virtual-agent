import { NextResponse } from 'next/server'

export type ApiResponse<T> = {
  data?: T
  error?: string
}

export function successResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data })
}

export function errorResponse(message: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status })
}

export function unauthorizedResponse(): NextResponse<ApiResponse<never>> {
  return errorResponse('Unauthorized', 401)
}

export function notFoundResponse(resource = 'Resource'): NextResponse<ApiResponse<never>> {
  return errorResponse(`${resource} not found`, 404)
} 