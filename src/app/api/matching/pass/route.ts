import { getAuthUserId } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // For MVP, passing just removes the candidate from the UI.
  // No server-side state needed — candidates are re-fetched each search.
  return NextResponse.json({ ok: true })
}
