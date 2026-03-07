import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendWebhook } from '@/lib/webhooks'

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { match_id, response } = await request.json()
  if (!match_id || !['approve', 'decline'].includes(response)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify this user is user_b of the match
  const { data: match } = await db
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .eq('user_b_id', userId)
    .eq('status', 'pending_b')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (response === 'approve') {
    // Activate match
    await db
      .from('matches')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', match_id)

    // Notify User A that theater is ready
    await db.from('notifications').insert({
      user_id: match.user_a_id,
      type: 'theater_ready',
      data: {
        match_id: match.id,
        partner_id: userId,
      },
    })

    // Send webhook if user_a is an OpenClaw agent
    const { data: agentRecord } = await db
      .from('openclaw_agents')
      .select('webhook_url')
      .eq('user_id', match.user_a_id)
      .single()
    if (agentRecord?.webhook_url) {
      sendWebhook(agentRecord.webhook_url, {
        event: 'match_approved',
        match_id: match.id,
        theater_url: `${process.env.NEXT_PUBLIC_APP_URL}/theater/${match.id}`,
        summary: 'Your match was approved! Watch the theater.',
      })
    }

    return NextResponse.json({ status: 'active' })
  } else {
    // Reject match
    await db
      .from('matches')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', match_id)

    return NextResponse.json({ status: 'rejected' })
  }
}
