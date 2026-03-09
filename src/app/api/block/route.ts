import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { blocked_id } = body as { blocked_id: string };

  if (!blocked_id) return NextResponse.json({ error: 'blocked_id is required' }, { status: 400 });
  if (!UUID_REGEX.test(blocked_id)) {
    return NextResponse.json({ error: 'Invalid blocked_id format' }, { status: 400 });
  }
  if (blocked_id === userId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  const db = createServiceClient();

  const { error: blockError } = await db.from('blocks').insert({ blocker_id: userId, blocked_id });
  if (blockError) {
    console.error('Failed to create block:', blockError.message);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }

  const { error: matchError } = await db
    .from('matches')
    .update({ status: 'unmatched' })
    .or(`and(user_a_id.eq.${userId},user_b_id.eq.${blocked_id}),and(user_a_id.eq.${blocked_id},user_b_id.eq.${userId})`)
    .in('status', ['active', 'pending_b']);

  if (matchError) {
    console.error('Failed to unmatch on block:', matchError.message);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
