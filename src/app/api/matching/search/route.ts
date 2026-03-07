import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { findCandidates } from '@/lib/matching'
import { NextResponse } from 'next/server'

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Get current user profile
  const { data: profile } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get blocked user IDs
  const { data: blocks } = await db
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)

  const blockedIds = (blocks || []).map((b: { blocked_id: string }) => b.blocked_id)

  // Get existing match partner IDs to exclude
  const { data: existingMatches } = await db
    .from('matches')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

  const matchedIds = (existingMatches || []).map((m: { user_a_id: string; user_b_id: string }) =>
    m.user_a_id === userId ? m.user_b_id : m.user_a_id
  )

  const excludeIds = [...new Set([...blockedIds, ...matchedIds])]

  // Get all potential matches
  const { data: allUsers } = await db
    .from('users')
    .select('*')
    .neq('id', userId)

  const candidates = findCandidates(profile, allUsers || [], excludeIds)

  return NextResponse.json({ candidates })
}
