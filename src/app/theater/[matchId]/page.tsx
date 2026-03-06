import { createServiceClient } from '@/lib/supabase-server';
import { TheaterReplay } from '@/components/TheaterReplay';
import type { FlirtScenario, AgentAppearance } from '@/types/database';

export default async function TheaterReplayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = createServiceClient();

  // Fetch latest scenario for this match
  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .select('*')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .single();

  // Fetch match with user data
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
    .eq('id', matchId)
    .single();

  if (scenarioError || matchError || !scenario || !match) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 font-mono text-lg">Theater not found</p>
      </div>
    );
  }

  const userA = match.user_a as Record<string, unknown>;
  const userB = match.user_b as Record<string, unknown>;
  const scenarioData = (scenario.scenario_data ?? scenario) as FlirtScenario;

  return (
    <TheaterReplay
      scenario={scenarioData}
      chaserName={(userA.name as string) ?? 'Agent A'}
      gatekeeperName={(userB.name as string) ?? 'Agent B'}
      chaserAppearance={(userA.agent_appearance as AgentAppearance) ?? null}
      gatekeeperAppearance={(userB.agent_appearance as AgentAppearance) ?? null}
      chaserPhoto={((userA.photos as string[]) ?? [])[0] ?? null}
      gatekeeperPhoto={((userB.photos as string[]) ?? [])[0] ?? null}
    />
  );
}
