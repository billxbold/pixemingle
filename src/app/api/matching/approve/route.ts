import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendWebhook } from '@/lib/webhooks'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidate_id, score, reasons } = await request.json()
  if (!candidate_id) return NextResponse.json({ error: 'Missing candidate_id' }, { status: 400 })

  // Create match with pending_b status
  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      user_a_id: user.id,
      user_b_id: candidate_id,
      status: 'pending_b',
      match_score: score ?? null,
      match_reasons: reasons ?? null,
      attempt_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create notification for User B
  await supabase.from('notifications').insert({
    user_id: candidate_id,
    type: 'match_request',
    data: {
      match_id: match.id,
      from_user_id: user.id,
    },
  })

  // Send webhook if candidate is an OpenClaw agent
  const { data: agentRecord } = await supabase
    .from('openclaw_agents')
    .select('webhook_url')
    .eq('user_id', candidate_id)
    .single()
  if (agentRecord?.webhook_url) {
    sendWebhook(agentRecord.webhook_url, {
      event: 'match_request',
      match_id: match.id,
      summary: 'Someone wants to match with your agent!',
    })
  }

  return NextResponse.json({ match })
}
