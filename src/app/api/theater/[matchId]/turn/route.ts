import crypto from 'crypto'
import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'
import { sendWebhook } from '@/lib/webhooks'
import { getAllAtomIds } from '@/engine/comedyAtoms'
import { NextRequest, NextResponse } from 'next/server'
import type { ActionType, ComedyIntent, EmotionState, TheaterTurn } from '@/types/database'

const VALID_ACTIONS: ActionType[] = [
  'deliver_line', 'react', 'use_prop', 'physical_comedy',
  'environment_interact', 'signature_move', 'entrance', 'exit',
]
const VALID_EMOTIONS: EmotionState[] = [
  'neutral', 'nervous', 'confident', 'embarrassed', 'excited',
  'dejected', 'amused', 'annoyed', 'hopeful', 'devastated',
  'smug', 'shy', 'trying_too_hard', 'genuinely_happy', 'cringing',
]
const VALID_INTENTS: ComedyIntent[] = [
  'self_deprecating', 'witty', 'physical', 'observational',
  'deadpan', 'absurdist', 'romantic_sincere', 'teasing', 'callback',
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_THEATER_TURNS = 20
const MIN_TURNS_BEFORE_EXIT = 4

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 })
  }

  // Auth: dev cookie, gateway secret, or user session
  let userId: string | null = null
  const gatewaySecret = request.headers.get('x-gateway-secret')
  let isGateway = false
  if (gatewaySecret && process.env.OPENCLAW_GATEWAY_SECRET) {
    const secretBuf = Buffer.from(process.env.OPENCLAW_GATEWAY_SECRET)
    const providedBuf = Buffer.from(gatewaySecret)
    if (secretBuf.length === providedBuf.length) {
      isGateway = crypto.timingSafeEqual(secretBuf, providedBuf)
    }
  }

  if (!isGateway) {
    userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Gateway can specify user_id in body
  if (isGateway && body.user_id && typeof body.user_id === 'string') {
    if (!UUID_RE.test(body.user_id)) {
      return NextResponse.json({ error: 'Invalid user_id format' }, { status: 400 })
    }
    userId = body.user_id
  }
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  // Rate limit
  const rl = checkEndpointRateLimit(userId, 'theater_turn', 30, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  // Validate fields
  const turnNumber = body.turn_number
  const agentRole = body.agent_role
  const action = body.action as string
  const emotion = body.emotion as string
  const comedyIntent = body.comedy_intent as string
  const comedyAtoms = body.comedy_atoms as string[] | undefined
  const text = body.text as string | undefined
  const target = body.target as string | undefined
  const prop = body.prop as string | undefined
  const brainReasoning = body.brain_reasoning as string | undefined

  if (typeof turnNumber !== 'number' || turnNumber < 0) {
    return NextResponse.json({ error: 'Invalid turn_number' }, { status: 400 })
  }
  if (agentRole !== 'chaser' && agentRole !== 'gatekeeper') {
    return NextResponse.json({ error: 'Invalid agent_role' }, { status: 400 })
  }
  if (!VALID_ACTIONS.includes(action as ActionType)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (!VALID_EMOTIONS.includes(emotion as EmotionState)) {
    return NextResponse.json({ error: 'Invalid emotion' }, { status: 400 })
  }
  if (!VALID_INTENTS.includes(comedyIntent as ComedyIntent)) {
    return NextResponse.json({ error: 'Invalid comedy_intent' }, { status: 400 })
  }
  if (comedyAtoms && (!Array.isArray(comedyAtoms) || comedyAtoms.length > 3)) {
    return NextResponse.json({ error: 'comedy_atoms must be array of max 3' }, { status: 400 })
  }
  if (comedyAtoms && comedyAtoms.length > 0) {
    const knownAtomIds = getAllAtomIds()
    const invalidAtoms = comedyAtoms.filter((id: string) => !knownAtomIds.includes(id))
    if (invalidAtoms.length > 0) {
      return NextResponse.json({ error: `Invalid comedy_atoms: ${invalidAtoms.join(', ')}` }, { status: 400 })
    }
  }
  if (text && typeof text === 'string' && text.length > 500) {
    return NextResponse.json({ error: 'Text too long (max 500)' }, { status: 400 })
  }
  let validatedConfidence = 5
  if (typeof body.confidence === 'number') {
    if (body.confidence < 0 || body.confidence > 10) {
      return NextResponse.json({ error: 'Confidence must be 0-10' }, { status: 400 })
    }
    validatedConfidence = body.confidence
  }
  if (typeof turnNumber === 'number' && turnNumber > MAX_THEATER_TURNS) {
    return NextResponse.json({ error: `Turn number exceeds maximum of ${MAX_THEATER_TURNS}` }, { status: 422 })
  }
  if (action === 'exit' && typeof turnNumber === 'number' && turnNumber < MIN_TURNS_BEFORE_EXIT) {
    return NextResponse.json({ error: 'Too early to exit' }, { status: 422 })
  }

  const db = createServiceClient()

  // Fetch match
  const { data: match, error: matchErr } = await db
    .from('matches')
    .select('id, user_a_id, user_b_id, status, theater_status, theater_turn_count, final_venue, proposed_venue, theater_started_at')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Verify user is participant
  const isUserA = match.user_a_id === userId
  const isUserB = match.user_b_id === userId
  if (!isUserA && !isUserB) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  // Verify role matches position (user_a = chaser, user_b = gatekeeper)
  const expectedRole = isUserA ? 'chaser' : 'gatekeeper'
  if (agentRole !== expectedRole) {
    return NextResponse.json({ error: `Role mismatch: you are ${expectedRole}` }, { status: 400 })
  }

  // Check theater is active
  const status = match.theater_status as string | null
  if (status && (status === 'completed_accepted' || status === 'completed_rejected')) {
    return NextResponse.json({ error: 'Theater already completed' }, { status: 422 })
  }

  // Entrance turn (turn 0) starts theater
  if (turnNumber === 0 && action === 'entrance') {
    if (status && status !== 'entrance') {
      return NextResponse.json({ error: 'Theater already started' }, { status: 409 })
    }
  } else if (!status || (status !== 'entrance' && status !== 'active')) {
    return NextResponse.json({ error: 'Theater not active' }, { status: 422 })
  }

  // Check turn sequence
  const expectedTurn = (match.theater_turn_count ?? 0)
  if (turnNumber !== expectedTurn) {
    return NextResponse.json({ error: `Expected turn_number ${expectedTurn}, got ${turnNumber}` }, { status: 409 })
  }

  // Alternating turns: check last turn was by the other role (skip for turn 0)
  if (turnNumber > 0) {
    const { data: lastTurn } = await db
      .from('theater_turns')
      .select('agent_role')
      .eq('match_id', matchId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single()

    if (lastTurn && lastTurn.agent_role === agentRole) {
      return NextResponse.json({ error: 'Not your turn — wait for other agent' }, { status: 409 })
    }
  }

  // Sanitize text: strip angle brackets to prevent injection
  const sanitizedText = text ? text.replace(/[<>]/g, '') : null

  // Insert turn
  const turnData = {
    match_id: matchId,
    turn_number: turnNumber,
    agent_role: agentRole,
    user_id: userId,
    action,
    comedy_atoms: comedyAtoms ?? [],
    text: sanitizedText,
    emotion,
    confidence: validatedConfidence,
    comedy_intent: comedyIntent,
    target: target ?? null,
    prop: prop ?? null,
    brain_reasoning: isGateway ? (brainReasoning ?? null) : null,
  }

  const { data: insertedTurn, error: insertErr } = await db
    .from('theater_turns')
    .insert(turnData)
    .select()
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'Duplicate turn' }, { status: 409 })
    }
    console.error('Failed to insert theater turn:', insertErr)
    return NextResponse.json({ error: 'Failed to submit turn' }, { status: 500 })
  }

  // Determine new theater status
  let newStatus: string = turnNumber === 0 ? 'entrance' : 'active'
  const isExitAction = action === 'exit'

  if (isExitAction) {
    // Both roles: determine outcome from emotion
    const positiveEmotions: EmotionState[] = ['genuinely_happy', 'excited', 'hopeful', 'amused', 'confident']
    newStatus = positiveEmotions.includes(emotion as EmotionState) ? 'completed_accepted' : 'completed_rejected'
  }

  // Update match
  const matchUpdate: Record<string, unknown> = {
    theater_turn_count: turnNumber + 1,
    theater_status: newStatus,
  }

  if (turnNumber === 0 && !match.theater_started_at) {
    matchUpdate.theater_started_at = new Date().toISOString()
  }

  if (newStatus.startsWith('completed_')) {
    matchUpdate.theater_ended_at = new Date().toISOString()
    if (newStatus === 'completed_accepted') {
      matchUpdate.status = 'active'
    }
  }

  const { error: matchUpdateErr } = await db.from('matches').update(matchUpdate).eq('id', matchId)
  if (matchUpdateErr) {
    console.error('Failed to update match after theater turn:', matchUpdateErr)
  }

  // Webhook to other agent's gateway (if cross-gateway)
  const otherUserId = isUserA ? match.user_b_id : match.user_a_id
  const { data: otherRouting } = await db
    .from('agent_routing')
    .select('webhook_url')
    .eq('user_id', otherUserId)
    .maybeSingle()

  if (otherRouting?.webhook_url) {
    sendWebhook(otherRouting.webhook_url, {
      event: 'theater_turn',
      match_id: matchId,
      turn: insertedTurn,
    }).catch(() => {})
  }

  // Create notification for other user
  try {
    const { error: notifErr } = await db.from('notifications').insert({
      user_id: otherUserId,
      type: newStatus.startsWith('completed_') ? 'theater_outcome' : 'theater_turn',
      data: {
        match_id: matchId,
        turn_number: turnNumber,
        action,
        emotion,
        outcome: newStatus === 'completed_accepted' ? 'accepted' : newStatus === 'completed_rejected' ? 'rejected' : null,
      },
    })
    if (notifErr) {
      console.error('Failed to insert theater notification:', notifErr)
    }
  } catch (notifCatchErr) {
    console.error('Exception inserting theater notification:', notifCatchErr)
  }

  return NextResponse.json({
    turn: insertedTurn as TheaterTurn,
    theater_status: newStatus,
  })
}
