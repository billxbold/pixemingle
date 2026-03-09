import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { readSoulMd } from '../soulMdReader.js';
import { readMemory } from '../memoryManager.js';
import { decideTheaterTurn, postTurnToApi } from '../theaterBrain.js';
import { handleTurnNotification, type TurnNotificationPayload } from '../webhookHandler.js';
import { isValidUuid } from '../agentManager.js';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

/**
 * POST /theater/decide — Gateway decides an agent's theater turn.
 * Called by Pixemingle API or internally when it's an agent's turn.
 *
 * Body: {
 *   match_id, user_id, agent_role, venue, turn_number,
 *   turn_history, opponent_last_turn?, coaching_message?
 * }
 */
router.post('/theater/decide', asyncHandler(async (req: Request, res: Response) => {
  const {
    match_id,
    user_id,
    agent_role,
    venue,
    turn_number,
    turn_history,
    opponent_last_turn,
    coaching_message,
  } = req.body;

  // Validate required fields
  if (!match_id || !user_id || !agent_role || !venue || turn_number === undefined) {
    res.status(400).json({
      error: 'Missing required fields: match_id, user_id, agent_role, venue, turn_number',
    });
    return;
  }

  if (typeof match_id !== 'string' || !isValidUuid(match_id)) {
    res.status(400).json({ error: 'match_id must be a valid UUID' });
    return;
  }

  if (typeof user_id !== 'string' || !isValidUuid(user_id)) {
    res.status(400).json({ error: 'user_id must be a valid UUID' });
    return;
  }

  if (!['chaser', 'gatekeeper'].includes(agent_role)) {
    res.status(400).json({ error: 'agent_role must be "chaser" or "gatekeeper"' });
    return;
  }

  if (typeof turn_number !== 'number' || turn_number < 0 || !Number.isInteger(turn_number)) {
    res.status(400).json({ error: 'turn_number must be a non-negative integer' });
    return;
  }

  try {
    // Read agent state
    const soulMd = await readSoulMd(user_id);
    const memory = await readMemory(user_id);

    // Run the ReAct brain
    const decision = await decideTheaterTurn({
      matchId: match_id,
      userId: user_id,
      agentRole: agent_role,
      venue,
      turnNumber: turn_number,
      turnHistory: turn_history || [],
      opponentLastTurn: opponent_last_turn,
      soulMd,
      memory: memory || undefined,
      coachingMessage: coaching_message,
    });

    console.log(
      `[theaterTurn] Agent ${user_id} decided: [${decision.action}] "${decision.text || ''}" (${decision.emotion})`
    );

    // POST the decision to the Pixemingle API
    const apiResult = await postTurnToApi(
      match_id,
      user_id,
      agent_role,
      turn_number,
      decision
    );

    if (!apiResult.ok) {
      console.error(`[theaterTurn] Failed to submit turn to API: ${apiResult.error}`);
      // Still return the decision — the caller can retry the POST
      res.status(207).json({
        decision,
        api_submit: { ok: false, error: apiResult.error },
      });
      return;
    }

    res.json({
      decision,
      api_submit: { ok: true },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[theaterTurn] Error:`, msg);
    res.status(500).json({ error: 'Failed to decide theater turn' });
  }
}));

/**
 * POST /theater/webhook — Receive turn notification from Pixemingle API.
 * Triggered when the OTHER agent submits a turn. Our agent auto-responds.
 */
router.post('/theater/webhook', asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as TurnNotificationPayload;

  // Validate webhook payload fields
  if (!payload.match_id || typeof payload.match_id !== 'string' || !isValidUuid(payload.match_id)) {
    res.status(400).json({ error: 'match_id must be a valid UUID' });
    return;
  }
  if (!payload.user_id || typeof payload.user_id !== 'string' || !isValidUuid(payload.user_id)) {
    res.status(400).json({ error: 'user_id must be a valid UUID' });
    return;
  }
  if (payload.agent_role !== 'chaser' && payload.agent_role !== 'gatekeeper') {
    res.status(400).json({ error: 'agent_role must be "chaser" or "gatekeeper"' });
    return;
  }
  if (!payload.venue || typeof payload.venue !== 'string') {
    res.status(400).json({ error: 'venue must be a non-empty string' });
    return;
  }
  if (typeof payload.turn_number !== 'number' || !Number.isInteger(payload.turn_number) || payload.turn_number < 0) {
    res.status(400).json({ error: 'turn_number must be a non-negative integer' });
    return;
  }
  if (!Array.isArray(payload.turn_history)) {
    res.status(400).json({ error: 'turn_history must be an array' });
    return;
  }
  if (payload.opponent_last_turn !== undefined && payload.opponent_last_turn !== null && typeof payload.opponent_last_turn !== 'object') {
    res.status(400).json({ error: 'opponent_last_turn must be an object if present' });
    return;
  }

  // Handle asynchronously — respond immediately, process in background
  res.status(202).json({ status: 'accepted' });

  // Process the notification (this will decide and POST the responding turn)
  handleTurnNotification(payload).then((result) => {
    if (!result.success) {
      console.error(
        `[theaterTurn] Webhook processing failed for match ${payload.match_id}: ${result.error}`
      );
    }
  });
}));

export default router;
