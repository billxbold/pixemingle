import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_VEHICLES = ['walking', 'skateboard', 'helicopter']
const VALID_COMPLICATIONS = ['none', 'trip', 'trip_on_curb', 'slip', 'flower_too_big']

function isGatewayAuth(secret: string | null): boolean {
  if (!secret || !process.env.OPENCLAW_GATEWAY_SECRET) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(process.env.OPENCLAW_GATEWAY_SECRET)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 })
  }

  // Auth: gateway secret or user session
  let userId: string | null = null
  const gatewaySecret = request.headers.get('x-gateway-secret')
  const isGateway = isGatewayAuth(gatewaySecret)

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

  const rl = checkEndpointRateLimit(userId, 'theater_entrance', 5, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const db = createServiceClient()

  // Fetch match
  const { data: match, error: matchErr } = await db
    .from('matches')
    .select('id, user_a_id, user_b_id, status, theater_status, final_venue, proposed_venue')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Only chaser (user_a) can start entrance
  if (match.user_a_id !== userId) {
    return NextResponse.json({ error: 'Only chaser can start entrance' }, { status: 403 })
  }

  // Check theater hasn't started
  if (match.theater_status) {
    return NextResponse.json({ error: 'Theater already started' }, { status: 409 })
  }

  // Read entrance config or use defaults
  const { data: entranceConfig } = await db
    .from('entrance_configs')
    .select('vehicle, complication, recovery, confidence')
    .eq('user_id', userId)
    .maybeSingle()

  const vehicle = (body.vehicle as string) ?? entranceConfig?.vehicle ?? 'walking'
  const complication = (body.complication as string) ?? entranceConfig?.complication ?? 'none'
  const recovery = (body.recovery as string) ?? entranceConfig?.recovery ?? 'brush_off'
  const confidence = typeof body.confidence === 'number' ? body.confidence : (entranceConfig?.confidence ?? 5)

  // Validate vehicle
  if (!VALID_VEHICLES.includes(vehicle)) {
    return NextResponse.json({ error: `Invalid vehicle. Must be one of: ${VALID_VEHICLES.join(', ')}` }, { status: 400 })
  }

  // Validate complication
  if (!VALID_COMPLICATIONS.includes(complication)) {
    return NextResponse.json({ error: `Invalid complication. Must be one of: ${VALID_COMPLICATIONS.join(', ')}` }, { status: 400 })
  }

  // Validate confidence (return 400 instead of silently clamping)
  if (typeof body.confidence !== 'undefined' && (typeof body.confidence !== 'number' || confidence < 0 || confidence > 10)) {
    return NextResponse.json({ error: 'Confidence must be 0-10' }, { status: 400 })
  }

  // Validate custom_detail length
  if (body.custom_detail && typeof body.custom_detail === 'string' && (body.custom_detail as string).length > 500) {
    return NextResponse.json({ error: 'custom_detail too long (max 500)' }, { status: 400 })
  }

  // Map vehicle to entrance atom
  const vehicleAtomMap: Record<string, string> = {
    walking: 'entrance_walking',
    skateboard: 'entrance_skateboard',
    helicopter: 'entrance_helicopter',
  }
  const entranceAtom = vehicleAtomMap[vehicle] ?? 'entrance_walking'

  // Build comedy atoms for entrance
  const comedyAtoms: string[] = [entranceAtom]
  if (complication !== 'none') {
    // Map complication to a physical comedy atom
    const complicationAtomMap: Record<string, string> = {
      trip: 'trip_and_recover',
      trip_on_curb: 'trip_and_recover',
      slip: 'slip_on_floor',
      flower_too_big: 'flower_too_big',
    }
    const compAtom = complicationAtomMap[complication]
    if (compAtom) comedyAtoms.push(compAtom)
  }

  // Insert entrance turn (turn 0)
  const turnData = {
    match_id: matchId,
    turn_number: 0,
    agent_role: 'chaser',
    user_id: userId,
    action: 'entrance',
    comedy_atoms: comedyAtoms,
    text: (body.custom_detail as string) ?? null,
    emotion: 'nervous' as const,
    confidence,
    comedy_intent: 'physical' as const,
    target: null,
    prop: null,
    brain_reasoning: isGateway ? `Entrance: ${vehicle} with ${complication}, recovery: ${recovery}` : null,
  }

  const { data: insertedTurn, error: insertErr } = await db
    .from('theater_turns')
    .insert(turnData)
    .select()
    .single()

  if (insertErr) {
    console.error('Failed to insert entrance turn:', insertErr)
    return NextResponse.json({ error: 'Failed to start entrance' }, { status: 500 })
  }

  // Update match
  await db.from('matches').update({
    theater_status: 'entrance',
    theater_turn_count: 1,
    theater_started_at: new Date().toISOString(),
  }).eq('id', matchId)

  // Notify gatekeeper
  await db.from('notifications').insert({
    user_id: match.user_b_id,
    type: 'theater_entrance',
    data: {
      match_id: matchId,
      vehicle,
      complication,
      chaser_id: userId,
    },
  })

  return NextResponse.json({
    turn: insertedTurn,
    theater_status: 'entrance',
  })
}
