import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { blocked_id } = body as { blocked_id: string };

  if (!blocked_id) return NextResponse.json({ error: 'blocked_id is required' }, { status: 400 });
  if (blocked_id === userId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  const db = createServiceClient();

  const { error: blockError } = await db.from('blocks').insert({ blocker_id: userId, blocked_id });
  if (blockError) return NextResponse.json({ error: blockError.message }, { status: 500 });

  const { error: matchError } = await db
    .from('matches')
    .update({ status: 'unmatched' })
    .or(`and(user_a_id.eq.${userId},user_b_id.eq.${blocked_id}),and(user_a_id.eq.${blocked_id},user_b_id.eq.${userId})`)
    .in('status', ['active', 'pending_b']);

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
