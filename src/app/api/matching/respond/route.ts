import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { match_id, response } = await request.json()
  if (!match_id || !['approve', 'decline'].includes(response)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify this user is user_b of the match
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .eq('user_b_id', user.id)
    .eq('status', 'pending_b')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (response === 'approve') {
    // Activate match
    await supabase
      .from('matches')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', match_id)

    // Notify User A that theater is ready
    await supabase.from('notifications').insert({
      user_id: match.user_a_id,
      type: 'theater_ready',
      data: {
        match_id: match.id,
        partner_id: user.id,
      },
    })

    return NextResponse.json({ status: 'active' })
  } else {
    // Reject match
    await supabase
      .from('matches')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', match_id)

    return NextResponse.json({ status: 'rejected' })
  }
}
