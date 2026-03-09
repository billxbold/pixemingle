import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db.from('users').select('id, name, age, gender, bio, photos, looking_for, soul_type, role, agent_appearance, tier, is_demo, has_soul_md, agent_tier, created_at, updated_at').eq('id', userId).single()
  if (error) {
    console.error('Failed to fetch profile:', error.message)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimitResult = checkEndpointRateLimit(userId, 'profile-put', 20, 60)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Input validation (fix #11)
  if ('age' in body) {
    if (typeof body.age !== 'number' || body.age < 18 || body.age > 120) {
      return NextResponse.json({ error: 'Age must be a number between 18 and 120' }, { status: 400 })
    }
  }
  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.length > 100) {
      return NextResponse.json({ error: 'Name must be a string of max 100 characters' }, { status: 400 })
    }
  }
  if ('bio' in body) {
    if (body.bio !== null && (typeof body.bio !== 'string' || body.bio.length > 500)) {
      return NextResponse.json({ error: 'Bio must be a string of max 500 characters or null' }, { status: 400 })
    }
  }
  if ('photos' in body) {
    if (!Array.isArray(body.photos) || !body.photos.every((p: unknown) => typeof p === 'string')) {
      return NextResponse.json({ error: 'Photos must be an array of strings' }, { status: 400 })
    }
  }

  const allowed: Record<string, unknown> = {}
  const ALLOWED_FIELDS = [
    'name', 'age', 'gender', 'looking_for', 'location', 'bio',
    'personality', 'horoscope', 'soul_type', 'role', 'agent_appearance', 'photos',
  ] as const
  for (const key of ALLOWED_FIELDS) {
    if (key in body) allowed[key] = body[key]
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('users')
    .upsert({ id: userId, ...allowed, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) {
    console.error('Failed to update profile:', error.message)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
  return NextResponse.json(data)
}
