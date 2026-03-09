import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { findCandidates } from '@/lib/matching'
import { NextResponse } from 'next/server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'
import type { User } from '@/types/database'

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimitResult = checkEndpointRateLimit(userId, 'matching_search', 30, 60)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const db = createServiceClient()

  // Get current user profile
  const { data: profile } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get blocked user IDs — both directions (users I blocked + users who blocked me)
  const { data: blocksOutgoing } = await db
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)

  const { data: blocksIncoming } = await db
    .from('blocks')
    .select('blocker_id')
    .eq('blocked_id', userId)

  const blockedIds = [
    ...(blocksOutgoing || []).map((b: { blocked_id: string }) => b.blocked_id),
    ...(blocksIncoming || []).map((b: { blocker_id: string }) => b.blocker_id),
  ]

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

  const candidates = findCandidates(profile as User, (allUsers || []) as User[], excludeIds)

  return NextResponse.json({ candidates })
}
