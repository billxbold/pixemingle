import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { readSoulMd } from '../soulMdReader.js';
import { setCoachingMessage } from '../webhookHandler.js';
import { isValidUuid } from '../agentManager.js';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
const router = Router();

/**
 * POST /coaching — User sends a coaching message to their agent.
 *
 * Body: {
 *   user_id: string,
 *   message: string,
 *   context: { match_id?: string, mode: 'theater' | 'idle' }
 * }
 *
 * In theater mode: stores coaching for next turn, responds acknowledging.
 * In idle mode: simple LLM conversation using personality.
 */
router.post('/coaching', asyncHandler(async (req: Request, res: Response) => {
  const { user_id, message, context } = req.body;

  // Validate
  if (!user_id || typeof user_id !== 'string') {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }
  if (!isValidUuid(user_id)) {
    res.status(400).json({ error: 'user_id must be a valid UUID' });
    return;
  }
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  if (message.length > 500) {
    res.status(400).json({ error: 'message exceeds 500 character limit' });
    return;
  }
  if (!context || !context.mode) {
    res.status(400).json({ error: 'context.mode is required ("theater" or "idle")' });
    return;
  }

  // Validate context.mode explicitly
  const mode: 'theater' | 'idle' = context.mode === 'theater' ? 'theater' : 'idle';

  try {
    const soulMd = await readSoulMd(user_id);

    if (mode === 'theater') {
      // Theater mode: store coaching for next turn, acknowledge quickly
      setCoachingMessage(user_id, message);

      // Quick LLM acknowledgment in character
      const response = await Promise.race([
        anthropic.messages.create({
          model: 'claude-haiku-4-20250414',
          max_tokens: 100,
          system: `You are a dating agent on Pixemingle. Your user just gave you coaching advice during a date. Respond briefly (1 sentence, under 80 chars) acknowledging their suggestion in character per your SOUL.md. Be playful. Do NOT use quotes around your response.`,
          messages: [
            {
              role: 'user',
              content: `Your personality (brief):\n${soulMd.slice(0, 300)}\n\nUser coaching: "${message}"`,
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Coaching LLM timeout')), 5_000)
        ),
      ]);

      const textBlock = response.content.find((b) => b.type === 'text');
      const ackText = textBlock?.text || 'Got it, I\'ll keep that in mind!';

      res.json({
        text: ackText.slice(0, 100),
        stored: true,
        action: null,
      });
    } else {
      // Idle mode: casual conversation using personality
      const response = await Promise.race([
        anthropic.messages.create({
          model: 'claude-haiku-4-20250414',
          max_tokens: 200,
          system: `You are a dating agent on Pixemingle chatting casually with your user (your "boss"). Stay in character per your SOUL.md personality. Be friendly, funny, and brief (1-3 sentences). You can suggest dating strategies or just banter.`,
          messages: [
            {
              role: 'user',
              content: `Your personality:\n${soulMd.slice(0, 500)}\n\nUser says: "${message}"`,
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Coaching LLM timeout')), 8_000)
        ),
      ]);

      const textBlock = response.content.find((b) => b.type === 'text');
      const replyText = textBlock?.text || 'Hmm, let me think about that...';

      res.json({
        text: replyText.slice(0, 300),
        stored: false,
        action: null,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coaching] Error:`, msg);

    // Return a graceful fallback
    if (mode === 'theater') {
      // Still store the coaching even if LLM fails
      setCoachingMessage(user_id, message);
      res.json({
        text: 'Got it, I\'ll factor that in!',
        stored: true,
        action: null,
      });
    } else {
      res.status(500).json({ error: 'Failed to process coaching message' });
    }
  }
}));

export default router;
