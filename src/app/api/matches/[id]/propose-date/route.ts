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
    .in('status', ['active', 'pending_b'])
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const { data: chaserProfile } = await db.from('users').select('*').eq('id', userId).single()
  if (!chaserProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const inviteText = await generateInviteText(chaserProfile, venue as VenueName)

  // Store venue proposal in scenario_cache JSONB (always available, no migration needed)
  const { error: updateErr } = await db.from('matches').update({
    scenario_cache: { proposal: { venue, text: inviteText, from_user_id: userId, proposed_at: new Date().toISOString() } },
    updated_at: new Date().toISOString(),
  }).eq('id', matchId)

  if (updateErr) {
    console.error('Failed to store proposal in scenario_cache:', updateErr)
  }

  return NextResponse.json({ text: inviteText, venue })
}
