import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { result } = await request.json();
  if (!['accepted', 'rejected'].includes(result)) {
    return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
  }

  // Verify user is part of this match
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  // Update latest scenario result
  const { data: latestScenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .single();

  if (latestScenario) {
    const updatedData = { ...latestScenario.scenario_data, result };
    await supabase
      .from('scenarios')
      .update({ scenario_data: updatedData })
      .eq('id', latestScenario.id);

    // Also update cache on match
    await supabase
      .from('matches')
      .update({
        scenario_cache: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);
  }

  // If accepted, create notification for both users
  if (result === 'accepted') {
    const partnerId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
    await supabase.from('notifications').insert([
      {
        user_id: user.id,
        type: 'match_result',
        data: { match_id: matchId, result: 'accepted' },
      },
      {
        user_id: partnerId,
        type: 'match_result',
        data: { match_id: matchId, result: 'accepted' },
      },
    ]);
  }

  return NextResponse.json({ result });
}
