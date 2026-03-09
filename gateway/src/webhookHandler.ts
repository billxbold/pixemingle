import { readSoulMd } from './soulMdReader.js';
import { readMemory } from './memoryManager.js';
import { decideTheaterTurn, postTurnToApi } from './theaterBrain.js';
import type { TheaterTurnInput } from './theaterBrain.js';

/**
 * Incoming webhook payload from Pixemingle API when the OTHER agent submits a turn.
 * This triggers our agent's ReAct loop to respond.
 */
export interface TurnNotificationPayload {
  match_id: string;
  user_id: string;
  agent_role: 'chaser' | 'gatekeeper';
  venue: string;
  turn_number: number;
  turn_history: Array<{
    turn_number: number;
    agent_role: string;
    action: string;
    text?: string;
    emotion: string;
    comedy_atoms: string[];
    comedy_intent?: string;
  }>;
  opponent_last_turn: {
    turn_number: number;
    agent_role: string;
    action: string;
    text?: string;
    emotion: string;
    comedy_atoms: string[];
    comedy_intent?: string;
  };
}

// Store coaching messages per user (cleared after use)
// Each entry has a timestamp to allow cleanup of stale entries.
const pendingCoaching = new Map<string, { message: string; timestamp: number }>();

const COACHING_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Remove coaching entries older than 5 minutes to prevent memory growth.
 */
function cleanupStaleCoaching(): void {
  const now = Date.now();
  for (const [userId, entry] of pendingCoaching) {
    if (now - entry.timestamp > COACHING_TTL_MS) {
      pendingCoaching.delete(userId);
    }
  }
}

/**
 * Store a coaching message to be used in the next turn.
 */
export function setCoachingMessage(userId: string, message: string): void {
  cleanupStaleCoaching();
  pendingCoaching.set(userId, { message, timestamp: Date.now() });
}

/**
 * Consume and clear the pending coaching message for a user.
 */
function consumeCoachingMessage(userId: string): string | undefined {
  const entry = pendingCoaching.get(userId);
  if (entry) {
    pendingCoaching.delete(userId);
    // Don't return stale messages
    if (Date.now() - entry.timestamp > COACHING_TTL_MS) {
      return undefined;
    }
    return entry.message;
  }
  return undefined;
}

/**
 * Handle an incoming turn notification webhook.
 * Reads agent state, runs the ReAct brain, and POSTs the response turn.
 */
export async function handleTurnNotification(
  payload: TurnNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  const { match_id, user_id, agent_role, venue, turn_number, turn_history, opponent_last_turn } =
    payload;

  console.log(
    `[webhook] Turn notification for user ${user_id} in match ${match_id} (turn ${turn_number})`
  );

  try {
    // Read agent state
    const soulMd = await readSoulMd(user_id);
    const memory = await readMemory(user_id);
    const coaching = consumeCoachingMessage(user_id);

    // Build brain input — our turn is the NEXT turn number
    const nextTurnNumber = turn_number + 1;

    const input: TheaterTurnInput = {
      matchId: match_id,
      userId: user_id,
      agentRole: agent_role,
      venue,
      turnNumber: nextTurnNumber,
      turnHistory: turn_history,
      opponentLastTurn: opponent_last_turn,
      soulMd,
      memory: memory || undefined,
      coachingMessage: coaching,
    };

    // Run ReAct brain
    const decision = await decideTheaterTurn(input);

    console.log(
      `[webhook] Agent ${user_id} decided: [${decision.action}] "${decision.text || ''}" (${decision.emotion})`
    );

    // POST decision to Pixemingle API
    const result = await postTurnToApi(
      match_id,
      user_id,
      agent_role,
      nextTurnNumber,
      decision
    );

    if (!result.ok) {
      console.error(`[webhook] Failed to submit turn: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Error handling turn notification:`, msg);
    return { success: false, error: msg };
  }
}
