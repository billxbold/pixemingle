import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkEndpointRateLimit } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = checkEndpointRateLimit(userId, 'unmatch', 10, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const db = createServiceClient();

  const { data: match } = await db
    .from('matches')
    .select('*')
    .eq('id', id)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.status === 'unmatched') return NextResponse.json({ error: 'Already unmatched' }, { status: 400 });

  await db.from('matches').update({ status: 'unmatched', updated_at: new Date().toISOString() }).eq('id', id);

  return NextResponse.json({ status: 'unmatched' });
}
