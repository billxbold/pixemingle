import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Find active or pending match — use select('*') to safely include venue columns if they exist
  const { data: match } = await db
    .from('matches')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .in('status', ['active', 'pending_b'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!match) return NextResponse.json({ state: 'HOME_IDLE', matchId: null, role: 'chaser' })

  const m = match as Record<string, unknown>
  const isChaser = m.user_a_id === userId
  const role = isChaser ? 'chaser' : 'gatekeeper'

  // Check for existing scenario
  const { data: scenario } = await db
    .from('scenarios')
    .select('result')
    .eq('match_id', m.id as string)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (scenario?.result === 'accepted' || scenario?.result === 'rejected') {
    return NextResponse.json({ state: 'POST_MATCH', matchId: m.id, role })
  }
  if (scenario) {
    // Scenario exists but result is pending — theater should play
    // Try to recover venue from scenario_cache (may have been merged or overwritten)
    const cache2 = m.scenario_cache as Record<string, unknown> | null
    const proposal2 = cache2?.proposal as Record<string, unknown> | undefined
    let theaterVenue = (proposal2?.chosen ?? proposal2?.venue) as string | undefined
    // Fallback: if cache was overwritten by generate route, default to lounge
    if (!theaterVenue) theaterVenue = 'lounge'
    return NextResponse.json({ state: 'THEATER', matchId: m.id, role, venue: theaterVenue })
  }

  // Check for venue proposal stored in scenario_cache JSONB
  const cache = m.scenario_cache as Record<string, unknown> | null
  const proposal = cache?.proposal as Record<string, unknown> | undefined

  if (proposal?.venue) {
    const response = proposal.response as string | undefined
    const finalVenue = (response === 'countered' && proposal.chosen) ? proposal.chosen : proposal.venue

    // Already accepted/countered — both sides should enter theater
    if (response === 'accepted' || response === 'countered') {
      return NextResponse.json({ state: 'THEATER', matchId: m.id, role, venue: finalVenue })
    }
    // Declined — back to idle
    if (response === 'declined') {
      return NextResponse.json({ state: 'HOME_IDLE', matchId: m.id, role })
    }

    // Proposal pending response
    if (isChaser) {
      return NextResponse.json({
        state: 'WAITING', matchId: m.id, role,
        dateStatus: 'proposed', venue: proposal.venue,
      })
    } else {
      return NextResponse.json({
        state: 'HOME_IDLE', matchId: m.id, role,
        dateStatus: 'proposed', venue: proposal.venue, inviteText: (proposal.text as string) ?? '',
      })
    }
  }

  // Default: match exists but no proposal yet
  if (m.status === 'pending_b' && isChaser) {
    return NextResponse.json({ state: 'PROPOSING', matchId: m.id, role })
  }
  if (m.status === 'active') {
    return NextResponse.json({ state: 'PROPOSING', matchId: m.id, role })
  }

  return NextResponse.json({ state: 'HOME_IDLE', matchId: m.id, role })
}
