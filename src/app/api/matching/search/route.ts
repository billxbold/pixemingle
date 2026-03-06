import { createServerSupabase } from '@/lib/supabase-server'
import { findCandidates } from '@/lib/matching'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get current user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get blocked user IDs
  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)

  const blockedIds = (blocks || []).map(b => b.blocked_id)

  // Get existing match partner IDs to exclude
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

  const matchedIds = (existingMatches || []).map(m =>
    m.user_a_id === user.id ? m.user_b_id : m.user_a_id
  )

  const excludeIds = [...new Set([...blockedIds, ...matchedIds])]

  // Get all potential matches
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .neq('id', user.id)

  const candidates = findCandidates(profile, allUsers || [], excludeIds)

  return NextResponse.json({ candidates })
}
