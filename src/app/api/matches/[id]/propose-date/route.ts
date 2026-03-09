import { createServiceClient, getAuthUserId } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { VenueName } from '@/types/database'
import { VENUE_INFO } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
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
      .in('status', ['active', 'pending_b'])
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .single()

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    // Only the chaser (user_a) can propose a date
    if (match.user_a_id !== userId) {
      return NextResponse.json({ error: 'Only the chaser can propose a date' }, { status: 403 })
    }

    const { data: chaserProfile } = await db.from('users').select('*').eq('id', userId).single()
    if (!chaserProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Generate invite text locally (stub — real text from OpenClaw agent in Phase 6)
    const venueInfo = VENUE_INFO[venue as VenueName]
    const inviteText = `Hey! Want to check out ${venueInfo.label}? ${venueInfo.description}. It'll be fun!`

    // Update match with proposed venue
    const { error: updateErr } = await db.from('matches').update({
      proposed_venue: venue,
      updated_at: new Date().toISOString(),
    }).eq('id', matchId)

    if (updateErr) {
      console.error('Failed to store venue proposal:', updateErr)
      return NextResponse.json({ error: 'Failed to store venue proposal' }, { status: 500 })
    }

    return NextResponse.json({ text: inviteText, venue })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
