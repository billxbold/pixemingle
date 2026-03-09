import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'
import type { VenueName } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 })
  }

  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimitResult = checkEndpointRateLimit(userId, 'respond-venue', 10, 60)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const db = createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { action, venue } = body as { action?: string; venue?: string }
  if (!action || !['accept', 'counter', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'counter' && (!venue || !VALID_VENUES.includes(venue as VenueName))) {
    return NextResponse.json({ error: 'Invalid venue for counter' }, { status: 400 })
  }

  // Verify user is gatekeeper (user_b) and match is active or pending
  const { data: match } = await db
    .from('matches')
    .select('id, user_a_id, user_b_id, status, proposed_venue, final_venue, attempt_count')
    .eq('id', matchId)
    .eq('user_b_id', userId)
    .in('status', ['active', 'pending_b'])
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Check that there is an active venue proposal
  if (!match.proposed_venue) {
    return NextResponse.json({ error: 'No venue proposal to respond to' }, { status: 400 })
  }

  if (action === 'accept') {
    await db.from('matches').update({
      final_venue: match.proposed_venue,
      status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    return NextResponse.json({ status: 'accepted', venue: match.proposed_venue })
  }

  if (action === 'counter') {
    // Update proposed_venue to the counter venue so chaser can see it
    await db.from('matches').update({
      proposed_venue: venue,
      final_venue: venue,
      status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    return NextResponse.json({ status: 'countered', original: match.proposed_venue, chosen: venue })
  }

  // Decline — check attempt count for permanent rejection
  const attemptCount = ((match.attempt_count as number) ?? 0) + 1

  if (attemptCount >= 3) {
    // 3rd decline — permanently reject the match
    const rejectionTexts = {
      rejection_text: "I'd rather not, thanks.",
      walkoff_text: "Back to swiping...",
    }

    await db.from('matches').update({
      status: 'rejected',
      attempt_count: attemptCount,
      proposed_venue: null,
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    return NextResponse.json({ status: 'declined', permanent: true, ...rejectionTexts })
  }

  // Not yet 3rd decline — clear proposed_venue so chaser can re-propose
  await db.from('matches').update({
    proposed_venue: null,
    attempt_count: attemptCount,
    updated_at: new Date().toISOString(),
  }).eq('id', matchId)

  return NextResponse.json({ status: 'declined', permanent: false, attempts_remaining: 3 - attemptCount })
}
