import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { generateScenario } from '@/lib/llm';
import { checkRateLimit } from '@/lib/rate-limit';
import type { User, VenueName } from '@/types/database';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();

  // Load match with both user profiles
  const { data: match } = await db
    .from('matches')
    .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
    .eq('id', matchId)
    .in('status', ['active', 'pending_b'])
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Active match not found' }, { status: 404 });

  // Rate limit check
  const userProfile = match.user_a_id === userId ? match.user_a : match.user_b;
  const rateCheck = checkRateLimit(userId, 'scenarios', userProfile.tier);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', remaining: rateCheck.remaining },
      { status: 429 }
    );
  }

  // Determine attempt number
  const attemptNumber = match.attempt_count + 1;

  // Get previous results
  const { data: previousScenarios } = await db
    .from('scenarios')
    .select('scenario_data')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: true });

  const previousResults = (previousScenarios || [])
    .map((s: { scenario_data: { result: string } }) => s.scenario_data?.result)
    .filter(Boolean);

  // Determine chaser/gatekeeper (user_a is the initiator, default to chaser if both have same role)
  const userA = match.user_a as User;
  const userB = match.user_b as User;
  const chaser = userA.role === 'chaser' ? userA : userB.role === 'chaser' ? userB : userA;
  const gatekeeper = chaser === userA ? userB : userA;

  try {
    // Read venue from scenario_cache (final_venue column may not exist)
    const cache = (match as Record<string, unknown>).scenario_cache as Record<string, unknown> | null
    const proposal = cache?.proposal as Record<string, unknown> | undefined
    const venue = (proposal?.chosen ?? proposal?.venue) as VenueName | undefined;
    const scenario = await generateScenario(
      matchId,
      attemptNumber,
      chaser,
      gatekeeper,
      previousResults,
      venue
    );

    // Save scenario to scenarios table
    await db.from('scenarios').insert({
      match_id: matchId,
      attempt_number: attemptNumber,
      scenario_data: scenario,
    });

    // Update match attempt count — merge scenario into cache, preserving proposal data
    const mergedCache = { ...cache, scenario };
    await db
      .from('matches')
      .update({
        attempt_count: attemptNumber,
        scenario_cache: mergedCache,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    return NextResponse.json({ scenario, remaining: rateCheck.remaining });
  } catch (error) {
    console.error('Scenario generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenario' },
      { status: 500 }
    );
  }
}
