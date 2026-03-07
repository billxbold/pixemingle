import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db.from('users').select('*').eq('id', userId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
