import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const cookieStore = cookies()
  const headerStore = headers()
  const userId = cookieStore.get('dev-user-id')?.value || headerStore.get('x-dev-user-id') || null

  if (!userId) {
    return NextResponse.json({ error: 'No dev user. Visit /dev-login first.' }, { status: 401 })
  }

  const db = createServiceClient()

  // Find a random partner (prefer demo profiles)
  const { data: candidates } = await db
    .from('users')
    .select('id, name, agent_appearance, soul_type, photos')
    .neq('id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: 'No other users found. Run seed script first.' }, { status: 404 })
  }

  const partner = candidates[Math.floor(Math.random() * candidates.length)]

  // Create active match (skip pending_b for dev)
  const { data: match, error } = await db
    .from('matches')
    .insert({
      user_a_id: userId,
      user_b_id: partner.id,
      status: 'active',
      match_score: 85,
      match_reasons: { personality: 'Dev match', horoscope: 'Stars aligned', shared: ['testing'], explanation: 'Demo match for development' },
      attempt_count: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create demo match:', error.message)
    return NextResponse.json({ error: 'Failed to create demo match' }, { status: 500 })
  }

  return NextResponse.json({
    matchId: match.id,
    matchUser: {
      name: partner.name,
      appearance: partner.agent_appearance,
      soulType: partner.soul_type,
      photo: partner.photos?.[0] ?? null,
    },
  })
}
