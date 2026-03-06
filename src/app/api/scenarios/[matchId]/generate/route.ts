import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { generateScenario } from '@/lib/llm';
import { checkRateLimit } from '@/lib/rate-limit';
import type { User } from '@/types/database';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load match with both user profiles
  const { data: match } = await supabase
    .from('matches')
    .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
    .eq('id', matchId)
    .eq('status', 'active')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Active match not found' }, { status: 404 });

  // Rate limit check
  const userProfile = match.user_a_id === user.id ? match.user_a : match.user_b;
  const rateCheck = checkRateLimit(user.id, 'scenarios', userProfile.tier);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', remaining: rateCheck.remaining },
      { status: 429 }
    );
  }

  // Determine attempt number
  const attemptNumber = match.attempt_count + 1;

  // Get previous results
  const { data: previousScenarios } = await supabase
    .from('scenarios')
    .select('scenario_data')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: true });

  const previousResults = (previousScenarios || [])
    .map((s: { scenario_data: { result: string } }) => s.scenario_data?.result)
    .filter(Boolean);

  // Determine chaser/gatekeeper
  const chaser = (match.user_a as User).role === 'chaser' ? match.user_a as User : match.user_b as User;
  const gatekeeper = (match.user_a as User).role === 'gatekeeper' ? match.user_a as User : match.user_b as User;

  try {
    const scenario = await generateScenario(
      matchId,
      attemptNumber,
      chaser,
      gatekeeper,
      previousResults
    );

    // Save scenario to scenarios table
    await supabase.from('scenarios').insert({
      match_id: matchId,
      attempt_number: attemptNumber,
      scenario_data: scenario,
    });

    // Update match attempt count and cache
    await supabase
      .from('matches')
      .update({
        attempt_count: attemptNumber,
        scenario_cache: scenario,
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
