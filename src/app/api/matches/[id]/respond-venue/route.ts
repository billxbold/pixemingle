import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { VenueName } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    .select('*')
    .eq('id', matchId)
    .eq('user_b_id', userId)
    .in('status', ['active', 'pending_b'])
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const m = match as Record<string, unknown>
  const cache = m.scenario_cache as Record<string, unknown> | null
  const proposal = cache?.proposal as Record<string, unknown> | undefined
  const proposedVenue = proposal?.venue as string | undefined
  if (!proposedVenue) {
    return NextResponse.json({ error: 'No venue proposal to respond to' }, { status: 400 })
  }

  if (action === 'accept') {
    await db.from('matches').update({
      scenario_cache: { ...cache, proposal: { ...proposal, response: 'accepted' } },
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    return NextResponse.json({ status: 'accepted', venue: proposedVenue })
  }

  if (action === 'counter') {
    await db.from('matches').update({
      scenario_cache: { ...cache, proposal: { ...proposal, response: 'countered', chosen: venue } },
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    return NextResponse.json({ status: 'countered', original: proposedVenue, chosen: venue })
  }

  // Decline — check attempt count for permanent rejection
  const attemptCount = ((m.attempt_count as number) ?? 0) + 1

  if (attemptCount >= 3) {
    // 3rd decline — permanently reject the match
    const rejectionTexts = {
      rejection_text: "I'd rather not, thanks.",
      walkoff_text: "Back to swiping...",
    }

    await db.from('matches').update({
      status: 'rejected',
      attempt_count: attemptCount,
      scenario_cache: { ...cache, proposal: { ...proposal, response: 'declined' } },
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    return NextResponse.json({ status: 'declined', permanent: true, ...rejectionTexts })
  }

  // Not yet 3rd decline — reset so chaser can re-propose
  await db.from('matches').update({
    proposed_venue: null,
    attempt_count: attemptCount,
    scenario_cache: { ...cache, proposal: { ...proposal, response: 'declined' } },
    updated_at: new Date().toISOString(),
  }).eq('id', matchId)

  return NextResponse.json({ status: 'declined', permanent: false, attempts_remaining: 3 - attemptCount })
}
