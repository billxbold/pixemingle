import { createServiceClient, getAuthUserId } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateInviteText } from '@/lib/llm'
import type { VenueName } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { venue } = await request.json()
  if (!venue || !VALID_VENUES.includes(venue)) {
    return NextResponse.json({ error: 'Invalid venue' }, { status: 400 })
  }

  const db = createServiceClient()

  // Verify user is part of match
  const { data: match } = await db
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('status', 'active')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const { data: chaserProfile } = await db.from('users').select('*').eq('id', userId).single()
  if (!chaserProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const inviteText = await generateInviteText(chaserProfile, venue as VenueName)

  await db.from('matches').update({
    proposed_venue: venue,
    venue_proposal_text: inviteText,
    updated_at: new Date().toISOString(),
  }).eq('id', matchId)

  const otherUserId = match.user_a_id === userId ? match.user_b_id : match.user_a_id
  await db.from('notifications').insert({
    user_id: otherUserId,
    type: 'date_proposal',
    data: { match_id: matchId, venue, text: inviteText, from_user_id: userId },
  })

  return NextResponse.json({ text: inviteText, venue })
}
