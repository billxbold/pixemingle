import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Dev mode: allow /world access without auth for testing
  const devUserId = request.cookies.get('dev-user-id')?.value
  if (process.env.NODE_ENV === 'development' && devUserId) {
    return response
  }

  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/world')) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /world route
  if (request.nextUrl.pathname.startsWith('/world') && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect /api routes (except auth and payments webhook)
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/auth/') &&
    !request.nextUrl.pathname.startsWith('/api/payments/webhook') &&
    !user
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: ['/world/:path*', '/api/:path*'],
}
