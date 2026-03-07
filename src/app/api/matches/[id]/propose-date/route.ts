import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateInviteText } from '@/lib/llm'
import type { VenueName } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { venue } = await request.json()
  if (!venue || !VALID_VENUES.includes(venue)) {
    return NextResponse.json({ error: 'Invalid venue' }, { status: 400 })
  }

  // Verify user is chaser (user_a) and match is active
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('user_a_id', user.id)
    .eq('status', 'active')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Load chaser profile for invite text generation
  const { data: chaserProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!chaserProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Generate invite text via Claude
  const inviteText = await generateInviteText(chaserProfile, venue as VenueName)

  // Save to match
  await supabase
    .from('matches')
    .update({
      proposed_venue: venue,
      venue_proposal_text: inviteText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  // Notify gatekeeper
  await supabase.from('notifications').insert({
    user_id: match.user_b_id,
    type: 'date_proposal',
    data: { match_id: matchId, venue, text: inviteText, from_user_id: user.id },
  })

  return NextResponse.json({ text: inviteText, venue })
}
