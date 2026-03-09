import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { generateSoulMd } from '@/lib/soulMdGenerator'
import type { SoulMdGeneratorInput } from '@/lib/soulMdGenerator'
import type { PersonalityAnswers } from '@/types/database'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimitResult = checkEndpointRateLimit(userId, 'generate_soul', 5, 60)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate required fields
  const { name, age, gender, role, personality } = body
  if (!name || !age || !gender || !role || !personality) {
    return NextResponse.json(
      { error: 'Missing required fields: name, age, gender, role, personality' },
      { status: 400 },
    )
  }

  // Validate name
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
    return NextResponse.json({ error: 'Name must be a non-empty string of max 100 characters' }, { status: 400 })
  }

  // Validate age
  const ageNum = Number(age)
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
    return NextResponse.json({ error: 'Age must be between 18 and 120' }, { status: 400 })
  }

  if (!['male', 'female', 'nonbinary'].includes(gender as string)) {
    return NextResponse.json({ error: 'Invalid gender' }, { status: 400 })
  }
  if (!['chaser', 'gatekeeper'].includes(role as string)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const validGender = gender as string as 'male' | 'female' | 'nonbinary'
  const validRole = role as string as 'chaser' | 'gatekeeper'

  const input: SoulMdGeneratorInput = {
    name: name as string,
    age: Number(age),
    gender: validGender,
    role: validRole,
    personality: personality as PersonalityAnswers,
    humor_physical: clampSlider(body.humor_physical),
    humor_wordplay: clampSlider(body.humor_wordplay),
    humor_deadpan: clampSlider(body.humor_deadpan),
    humor_self_deprecating: clampSlider(body.humor_self_deprecating),
    confidence: clampSlider(body.confidence),
    signature_move: (body.signature_move as string | undefined) || undefined,
    rejection_style: (body.rejection_style as string | undefined) || undefined,
  }

  const soulMd = generateSoulMd(input)

  // Upsert into agent_memories (type='soul')
  const supabase = createServiceClient()

  const { error: memoryError } = await supabase
    .from('agent_memories')
    .upsert(
      {
        user_id: userId,
        memory_type: 'soul',
        content: soulMd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,memory_type' },
    )

  if (memoryError) {
    console.error('Failed to store SOUL.md:', memoryError.message)
    return NextResponse.json(
      { error: 'Failed to store SOUL.md' },
      { status: 500 },
    )
  }

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update({ has_soul_md: true })
    .eq('id', userId)

  if (userError) {
    console.error('Failed to update has_soul_md flag:', userError.message)
    // Non-fatal — the SOUL.md is stored, flag is a convenience
  }

  // Extract preview info for the response
  const variantMatch = soulMd.match(/### Portrait Variant:\s*(\w+)/)
  const portrait_variant = variantMatch?.[1] ?? 'neutral'

  return NextResponse.json({
    soul_md: soulMd,
    preview: {
      portrait_variant,
      archetype: `${gender}_${role}`,
    },
  })
}

function clampSlider(value: unknown): number {
  const n = Number(value)
  if (isNaN(n)) return 5
  return Math.max(0, Math.min(10, Math.round(n)))
}
