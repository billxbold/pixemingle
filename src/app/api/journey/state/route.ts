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

  // Check theater status from match columns (no scenario_cache)
  const theaterStatus = m.theater_status as string | null
  const proposedVenue = m.proposed_venue as string | null
  const finalVenue = m.final_venue as string | null

  // Theater in progress or completed
  if (theaterStatus === 'entrance' || theaterStatus === 'active') {
    const venue = (finalVenue ?? proposedVenue ?? 'lounge') as string
    return NextResponse.json({ state: 'THEATER', matchId: m.id, role, venue })
  }
  if (theaterStatus === 'completed_accepted') {
    return NextResponse.json({ state: 'POST_MATCH', matchId: m.id, role })
  }
  if (theaterStatus === 'completed_rejected') {
    return NextResponse.json({ state: 'HOME_IDLE', matchId: m.id, role })
  }

  // Venue proposed but no theater_status yet
  if (proposedVenue) {
    // Venue accepted (final_venue exists) — should be in theater
    if (finalVenue) {
      return NextResponse.json({ state: 'THEATER', matchId: m.id, role, venue: finalVenue })
    }
    // Venue proposed but not yet accepted — chaser waits, gatekeeper sees invitation
    if (isChaser) {
      return NextResponse.json({
        state: 'WAITING', matchId: m.id, role,
        dateStatus: 'proposed', venue: proposedVenue,
      })
    } else {
      return NextResponse.json({
        state: 'PROPOSING', matchId: m.id, role,
        dateStatus: 'proposed', venue: proposedVenue,
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
