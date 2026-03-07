import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { result } = await request.json();
  if (!['accepted', 'rejected'].includes(result)) {
    return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: match } = await db
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const { data: latestScenario } = await db
    .from('scenarios')
    .select('*')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .single();

  if (latestScenario) {
    const updatedData = { ...latestScenario.scenario_data, result };
    await db.from('scenarios').update({ scenario_data: updatedData }).eq('id', latestScenario.id);
    await db.from('matches').update({ scenario_cache: updatedData, updated_at: new Date().toISOString() }).eq('id', matchId);
  }

  if (result === 'accepted') {
    const partnerId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;
    await db.from('notifications').insert([
      { user_id: userId, type: 'match_result', data: { match_id: matchId, result: 'accepted' } },
      { user_id: partnerId, type: 'match_result', data: { match_id: matchId, result: 'accepted' } },
    ]);
  }

  return NextResponse.json({ result });
}
