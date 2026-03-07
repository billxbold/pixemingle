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

  // Verify user is gatekeeper (user_b) and match is active
  const { data: match } = await db
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('user_b_id', userId)
    .eq('status', 'active')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (action === 'accept') {
    await db
      .from('matches')
      .update({ final_venue: match.proposed_venue, updated_at: new Date().toISOString() })
      .eq('id', matchId)

    await db.from('notifications').insert({
      user_id: match.user_a_id,
      type: 'venue_accepted',
      data: { match_id: matchId, venue: match.proposed_venue },
    })

    return NextResponse.json({ status: 'accepted', venue: match.proposed_venue })
  }

  if (action === 'counter') {
    await db
      .from('matches')
      .update({ final_venue: venue, updated_at: new Date().toISOString() })
      .eq('id', matchId)

    await db.from('notifications').insert({
      user_id: match.user_a_id,
      type: 'venue_countered',
      data: { match_id: matchId, original: match.proposed_venue, chosen: venue },
    })

    return NextResponse.json({ status: 'countered', original: match.proposed_venue, chosen: venue })
  }

  // Decline
  const [chaserProfile, gatekeeperProfile] = await Promise.all([
    db.from('users').select('*').eq('id', match.user_a_id).single(),
    db.from('users').select('*').eq('id', userId).single(),
  ])

  let rejectionTexts = { rejection_text: "I'd rather not.", walkoff_text: "Back to swiping..." }
  if (chaserProfile.data && gatekeeperProfile.data) {
    rejectionTexts = await generateRejectionTexts(
      chaserProfile.data, gatekeeperProfile.data, match.proposed_venue as VenueName
    )
  }

  await db
    .from('matches')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', matchId)

  await db.from('notifications').insert({
    user_id: match.user_a_id,
    type: 'date_declined',
    data: { match_id: matchId, ...rejectionTexts },
  })

  return NextResponse.json({ status: 'declined', ...rejectionTexts })
}
