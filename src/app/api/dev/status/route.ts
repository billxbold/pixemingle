import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const service = createServiceClient()

  // List all users in the users table
  const { data: users, error: usersErr } = await service
    .from('users')
    .select('id, name, email, role, soul_type')
    .limit(20)

  // List auth users
  const { data: authData } = await service.auth.admin.listUsers()
  const authUsers = authData?.users?.map(u => ({ id: u.id, email: u.email })) ?? []

  // List matches
  const { data: matches, error: matchErr } = await service
    .from('matches')
    .select('id, user_a_id, user_b_id, status, match_score')
    .limit(10)

  return NextResponse.json({
    users: users ?? [],
    usersError: usersErr?.message,
    authUsers,
    matches: matches ?? [],
    matchError: matchErr?.message,
  })
}
