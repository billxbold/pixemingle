import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();

  // Verify user is part of this match
  const { data: match } = await db
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  // Return cached scenario if exists
  if (match.scenario_cache) {
    return NextResponse.json({ scenario: match.scenario_cache });
  }

  // Check scenarios table for latest
  const { data: scenario } = await db
    .from('scenarios')
    .select('*')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .single();

  if (scenario) {
    return NextResponse.json({ scenario: scenario.scenario_data });
  }

  return NextResponse.json({ scenario: null });
}
