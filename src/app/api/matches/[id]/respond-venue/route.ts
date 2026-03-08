import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateRejectionTexts } from '@/lib/llm'
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

  const { action, venue } = await request.json()
  if (!['accept', 'counter', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'counter' && (!venue || !VALID_VENUES.includes(venue))) {
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
  const proposedVenue = proposal?.venue as string ?? 'lounge'

  if (action === 'accept') {
    // Store acceptance in scenario_cache
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

  // Decline
  const [chaserProfile, gatekeeperProfile] = await Promise.all([
    db.from('users').select('*').eq('id', m.user_a_id as string).single(),
    db.from('users').select('*').eq('id', userId).single(),
  ])

  let rejectionTexts = { rejection_text: "I'd rather not.", walkoff_text: "Back to swiping..." }
  if (chaserProfile.data && gatekeeperProfile.data) {
    rejectionTexts = await generateRejectionTexts(
      chaserProfile.data, gatekeeperProfile.data, proposedVenue as VenueName
    )
  }

  await db.from('matches').update({
    status: 'rejected',
    scenario_cache: { ...cache, proposal: { ...proposal, response: 'declined' } },
    updated_at: new Date().toISOString(),
  }).eq('id', matchId)

  return NextResponse.json({ status: 'declined', ...rejectionTexts })
}
