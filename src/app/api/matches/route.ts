import { createServiceClient, getAuthUserId } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();

  // Get active and pending matches with partner info
  const { data: matches, error } = await db
    .from('matches')
    .select('*, user_a:users!user_a_id(id, name, photos, agent_appearance, soul_type), user_b:users!user_b_id(id, name, photos, agent_appearance, soul_type)')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .in('status', ['active', 'pending_b'])
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const annotated = (matches || []).map((match) => {
    const isUserA = match.user_a_id === userId;
    return {
      ...match,
      partner: isUserA ? match.user_b : match.user_a,
      role: isUserA ? 'initiator' : 'responder',
    };
  });

  return NextResponse.json({ matches: annotated });
}
