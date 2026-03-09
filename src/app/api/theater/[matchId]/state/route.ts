import crypto from 'crypto'
import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { TheaterTurn, TheaterState, VenueName } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isGatewayRequest(request: NextRequest): boolean {
  const secret = process.env.OPENCLAW_GATEWAY_SECRET
  if (!secret) return false

  const provided = request.headers.get('x-gateway-secret')
  if (!provided) return false

  try {
    const secretBuf = Buffer.from(secret, 'utf8')
    const providedBuf = Buffer.from(provided, 'utf8')
    if (secretBuf.length !== providedBuf.length) return false
    return crypto.timingSafeEqual(secretBuf, providedBuf)
  } catch {
    return false
  }
}

const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400, headers: CACHE_HEADERS })
  }

  const isGateway = isGatewayRequest(request)
  let userId: string | null = null

  if (isGateway) {
    // Gateway can optionally pass user_id as query param
    userId = request.nextUrl.searchParams.get('user_id') ?? null
  } else {
    userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CACHE_HEADERS })
    }
  }

  const db = createServiceClient()

  // Fetch match
  const { data: match, error: matchErr } = await db
    .from('matches')
    .select('id, user_a_id, user_b_id, status, theater_status, theater_turn_count, final_venue, proposed_venue, theater_started_at, theater_ended_at')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404, headers: CACHE_HEADERS })
  }

  // Verify participant (gateway skips this check)
  if (!isGateway && match.user_a_id !== userId && match.user_b_id !== userId) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403, headers: CACHE_HEADERS })
  }

  // Fetch both users (name only)
  const { data: users } = await db
    .from('users')
    .select('id, name')
    .in('id', [match.user_a_id, match.user_b_id])

  const userA = users?.find(u => u.id === match.user_a_id)
  const userB = users?.find(u => u.id === match.user_b_id)

  // Fetch all turns
  const { data: turns } = await db
    .from('theater_turns')
    .select('*')
    .eq('match_id', matchId)
    .order('turn_number', { ascending: true })

  // Strip brain_reasoning from non-gateway responses to prevent info disclosure
  const turnList = ((turns ?? []) as TheaterTurn[]).map(turn => {
    if (!isGateway) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { brain_reasoning: _removed, ...rest } = turn
      return rest as TheaterTurn
    }
    return turn
  })
  const turnCount = turnList.length

  // Determine current turn role
  const lastTurn = turnList[turnList.length - 1]
  const currentTurnRole: 'chaser' | 'gatekeeper' = lastTurn
    ? (lastTurn.agent_role === 'chaser' ? 'gatekeeper' : 'chaser')
    : 'chaser'

  // Determine outcome
  const theaterStatus = match.theater_status as string | null
  let outcome: 'accepted' | 'rejected' | null = null
  if (theaterStatus === 'completed_accepted') outcome = 'accepted'
  if (theaterStatus === 'completed_rejected') outcome = 'rejected'

  const venue = (match.final_venue ?? match.proposed_venue ?? 'lounge') as VenueName

  const state: TheaterState = {
    venue,
    status: (theaterStatus ?? 'entrance') as TheaterState['status'],
    turn_count: turnCount,
    current_turn_role: currentTurnRole,
    turns: turnList,
    outcome,
    chaser: { user_id: match.user_a_id, name: userA?.name ?? 'Chaser' },
    gatekeeper: { user_id: match.user_b_id, name: userB?.name ?? 'Gatekeeper' },
  }

  return NextResponse.json(state, { headers: CACHE_HEADERS })
}
