import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

function sanitizeRedirect(next: string | null): string {
  if (!next) return '/onboarding'
  // Must be a relative path starting with /
  if (!next.startsWith('/')) return '/world'
  // Block protocol-relative URLs and embedded schemes
  if (next.startsWith('//') || next.includes('://')) return '/world'
  return next
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirect(searchParams.get('next'))

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }
  return NextResponse.redirect(new URL('/auth/error', request.url))
}
