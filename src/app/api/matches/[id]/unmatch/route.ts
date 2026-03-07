import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
