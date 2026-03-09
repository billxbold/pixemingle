import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const TEST_USERS = {
  alex: {
    email: 'alex-dev@pixemingle.test',
    password: process.env.DEV_USER_PASSWORD_1 || 'dev-password-change-me',
    profile: {
      name: 'Alex',
      age: 27,
      gender: 'male',
      looking_for: 'everyone',
      bio: 'Adventure seeker, coffee addict, terrible at cooking.',
      location: 'Bangkok, Thailand',
      horoscope: 'aries',
      soul_type: 'bold',
      role: 'chaser',
      agent_appearance: { premadeIndex: 1 },
      personality: {
        friday_night: 'Adventurous outing',
        argue_style: 'Talk it out',
        love_language: 'Quality time',
        social_energy: 'Work the room',
        adventure_level: 'Always say yes',
        communication: 'Direct and honest',
        humor_style: 'Sarcastic wit',
        relationship_pace: 'Jump right in',
      },
    },
  },
  maya: {
    email: 'maya-dev@pixemingle.test',
    password: process.env.DEV_USER_PASSWORD_2 || 'dev-password-change-me',
    profile: {
      name: 'Maya',
      age: 25,
      gender: 'female',
      looking_for: 'everyone',
      bio: 'Bookworm by day, overthinker by night.',
      location: 'Chiang Mai, Thailand',
      horoscope: 'libra',
      soul_type: 'intellectual',
      role: 'gatekeeper',
      agent_appearance: { premadeIndex: 12 },
      personality: {
        friday_night: 'Cozy night in',
        argue_style: 'Passionate debate',
        love_language: 'Words of affirmation',
        social_energy: 'Find one person to talk to deeply',
        adventure_level: 'Plan it carefully',
        communication: 'Need time to process',
        humor_style: 'Clever wordplay',
        relationship_pace: 'Take it slow',
      },
    },
  },
} as const

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const url = new URL(request.url)
  const userId = url.searchParams.get('user') as 'alex' | 'maya' | null

  if (!userId || !(userId in TEST_USERS)) {
    return NextResponse.json({ error: 'user must be "alex" or "maya"' }, { status: 400 })
  }

  const testUser = TEST_USERS[userId]
  const service = createServiceClient()

  // 1. Ensure auth user exists
  const { data: listData } = await service.auth.admin.listUsers()
  let authUser = listData?.users?.find(u => u.email === testUser.email)

  if (!authUser) {
    const { data: created, error } = await service.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
    })
    if (error || !created.user) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create user' }, { status: 500 })
    }
    authUser = created.user
  } else {
    await service.auth.admin.updateUserById(authUser.id, {
      password: testUser.password,
      email_confirm: true,
    })
  }

  // 2. Upsert profile row
  const { error: upsertErr } = await service.from('users').upsert({
    id: authUser.id,
    email: authUser.email,
    ...testUser.profile,
    tier: 'free',
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    return NextResponse.json({ error: `Profile upsert failed: ${upsertErr.message}` }, { status: 500 })
  }

  // 3. Set a dev identity cookie server-side, then redirect to /world
  // Middleware and API routes check this cookie in dev mode (bypasses Supabase auth)
  const response = NextResponse.redirect(new URL('/world', request.url))
  response.cookies.set('dev-user-id', authUser.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // dev-only route, never runs in production
    maxAge: 60 * 60 * 24,
  })
  return response
}
