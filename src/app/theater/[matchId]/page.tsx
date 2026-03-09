import { createServiceClient } from '@/lib/supabase-server';
import { TheaterReplay } from '@/components/TheaterReplay';
import type { AgentAppearance, TheaterTurn } from '@/types/database';

export default async function TheaterReplayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = createServiceClient();

  // Fetch theater turns for this match
  const { data: turns, error: turnsError } = await supabase
    .from('theater_turns')
    .select('*')
    .eq('match_id', matchId)
    .order('turn_number', { ascending: true });

  // Fetch match with user data
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 font-mono text-lg">Theater not found</p>
      </div>
    );
  }

  if (turnsError || !turns || turns.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-4">
        <p className="text-gray-400 font-mono text-lg">No theater turns recorded yet</p>
        <p className="text-gray-600 font-mono text-sm">The agents haven&apos;t started their date</p>
      </div>
    );
  }

  const userA = match.user_a as Record<string, unknown>;
  const userB = match.user_b as Record<string, unknown>;

  // Determine outcome from match theater_status
  const theaterStatus = (match as Record<string, unknown>).theater_status as string | null;
  const outcome: 'accepted' | 'rejected' | null =
    theaterStatus === 'completed_accepted' ? 'accepted' :
    theaterStatus === 'completed_rejected' ? 'rejected' :
    null;

  return (
    <TheaterReplay
      turns={turns as TheaterTurn[]}
      outcome={outcome}
      chaserName={(userA.name as string) ?? 'Agent A'}
      gatekeeperName={(userB.name as string) ?? 'Agent B'}
      chaserAppearance={(userA.agent_appearance as AgentAppearance) ?? null}
      gatekeeperAppearance={(userB.agent_appearance as AgentAppearance) ?? null}
      chaserPhoto={((userA.photos as string[]) ?? [])[0] ?? null}
      gatekeeperPhoto={((userB.photos as string[]) ?? [])[0] ?? null}
      chaserGender={((userA.gender as string) ?? 'male') as 'male' | 'female' | 'nonbinary'}
      gatekeeperGender={((userB.gender as string) ?? 'female') as 'male' | 'female' | 'nonbinary'}
    />
  );
}
