import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendWebhook } from '@/lib/webhooks'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimitResult = checkEndpointRateLimit(userId, 'matching_approve', 20, 60)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const db = createServiceClient()

    const { candidate_id, score, reasons } = await request.json()
    if (!candidate_id) return NextResponse.json({ error: 'Missing candidate_id' }, { status: 400 })
    if (!UUID_REGEX.test(candidate_id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Self-match prevention
    if (candidate_id === userId) {
      return NextResponse.json({ error: 'Cannot match with yourself' }, { status: 400 })
    }

    // Duplicate match prevention — check both directions
    const { data: existingMatch } = await db
      .from('matches')
      .select('id, status')
      .or(
        `and(user_a_id.eq.${userId},user_b_id.eq.${candidate_id}),and(user_a_id.eq.${candidate_id},user_b_id.eq.${userId})`
      )
      .neq('status', 'unmatched')
      .limit(1)
      .maybeSingle()

    if (existingMatch) {
      return NextResponse.json({ error: 'Match already exists' }, { status: 409 })
    }

    // Create match with pending_b status
    const { data: match, error } = await db
      .from('matches')
      .insert({
        user_a_id: userId,
        user_b_id: candidate_id,
        status: 'pending_b',
        match_score: score ?? null,
        match_reasons: reasons ?? null,
        attempt_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create match:', error.message)
      return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
    }

    // Create notification for User B
    await db.from('notifications').insert({
      user_id: candidate_id,
      type: 'match_request',
      data: {
        match_id: match.id,
        from_user_id: userId,
      },
    })

    // Send webhook if candidate is an OpenClaw agent
    const { data: agentRecord } = await db
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
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
