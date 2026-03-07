import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const ALEX_EMAIL = 'alex-dev@pixemingle.test'
const MAYA_EMAIL = 'maya-dev@pixemingle.test'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const results: Record<string, string> = {}

  // 1. Check venue columns (fresh client)
  const probe = createServiceClient()
  const { error: probeError } = await probe.from('matches').select('proposed_venue').limit(1)
  results.migration = probeError ? 'NEEDED — run migration 003_venue_columns.sql in Supabase dashboard' : 'OK'

  // 2. Look up Alex + Maya by email (fresh client)
  const db = createServiceClient()
  const { data: users, error: usersErr } = await db
    .from('users')
    .select('id, name, email, role')
    .in('email', [ALEX_EMAIL, MAYA_EMAIL])

  if (usersErr) {
    return NextResponse.json({ ...results, error: `users query failed: ${usersErr.message}` }, { status: 500 })
  }

  if (!users || users.length < 2) {
    return NextResponse.json({
      ...results,
      usersFound: users?.length ?? 0,
      error: 'Profiles not found — visit /dev-login?user=alex and /dev-login?user=maya first',
    }, { status: 400 })
  }

  const alex = users.find(u => u.email === ALEX_EMAIL)
  const maya = users.find(u => u.email === MAYA_EMAIL)
  results.alex_id = alex?.id ?? 'NOT FOUND'
  results.maya_id = maya?.id ?? 'NOT FOUND'

  if (!alex || !maya) {
    return NextResponse.json({ ...results, error: 'Could not find both users' }, { status: 400 })
  }

  // 3. Check for existing match
  const { data: existingMatch } = await db
    .from('matches')
    .select('id, status')
    .or(`and(user_a_id.eq.${alex.id},user_b_id.eq.${maya.id}),and(user_a_id.eq.${maya.id},user_b_id.eq.${alex.id})`)
    .limit(1)
    .maybeSingle()

  if (existingMatch) {
    results.match = `already exists: ${existingMatch.id} (${existingMatch.status})`
    return NextResponse.json(results)
  }

  // 4. Create match — Alex is chaser (user_a), Maya is gatekeeper (user_b)
  const { data: newMatch, error: matchError } = await db
    .from('matches')
    .insert({
      user_a_id: alex.id,
      user_b_id: maya.id,
      status: 'active',
      match_score: 85,
    })
    .select('id')
    .single()

  if (matchError) {
    results.match = `error: ${matchError.message} (${matchError.code})`
  } else {
    results.match = `created: ${newMatch.id}`
    results.match_id = newMatch.id
  }

  return NextResponse.json(results)
}
