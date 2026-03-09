import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { provisionAgent, getWorkspace, deleteWorkspace, isValidUuid } from '../agentManager.js';
import { heartbeatScheduler } from '../heartbeat.js';
import { backupToSupabase } from '../memoryManager.js';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

/**
 * POST /agents — Provision a new agent workspace
 * Body: { user_id: string, soul_md: string, entrance_md?: string }
 */
router.post('/agents', asyncHandler(async (req: Request, res: Response) => {
  const { user_id, soul_md, entrance_md } = req.body;

  // Validate required fields
  if (!user_id || typeof user_id !== 'string') {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }
  if (!isValidUuid(user_id)) {
    res.status(400).json({ error: 'user_id must be a valid UUID' });
    return;
  }
  if (!soul_md || typeof soul_md !== 'string') {
    res.status(400).json({ error: 'soul_md is required' });
    return;
  }
  if (soul_md.length > 10_000) {
    res.status(400).json({ error: 'soul_md exceeds maximum length (10000 chars)' });
    return;
  }

  try {
    // Check if workspace already exists
    const existing = await getWorkspace(user_id);
    if (existing) {
      res.status(409).json({ error: 'Agent workspace already exists for this user' });
      return;
    }

    // Provision workspace
    const workspace = await provisionAgent(user_id, soul_md, entrance_md);

    // Backup SOUL.md to Supabase
    await backupToSupabase(user_id, 'soul', soul_md);
    if (entrance_md) {
      await backupToSupabase(user_id, 'entrance', entrance_md);
    }

    // Start heartbeat (30min interval)
    heartbeatScheduler.start(user_id);

    console.log(`[agentProvision] Provisioned agent for user ${user_id}`);

    res.status(201).json({
      user_id: workspace.userId,
      status: 'provisioned',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[agentProvision] Error provisioning agent:`, msg);
    res.status(500).json({ error: 'Failed to provision agent' });
  }
}));

/**
 * GET /agents/:userId — Get agent workspace status
 */
router.get('/agents/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!isValidUuid(userId)) {
    res.status(400).json({ error: 'userId must be a valid UUID' });
    return;
  }

  try {
    const workspace = await getWorkspace(userId);
    if (!workspace) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({
      user_id: workspace.userId,
      has_soul_md: !!workspace.soulMd,
      has_entrance_md: !!workspace.entranceMd,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[agentProvision] Error getting agent:`, msg);
    res.status(500).json({ error: 'Failed to get agent' });
  }
}));

/**
 * DELETE /agents/:userId — Delete agent workspace
 */
router.delete('/agents/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!isValidUuid(userId)) {
    res.status(400).json({ error: 'userId must be a valid UUID' });
    return;
  }

  try {
    heartbeatScheduler.stop(userId);
    await deleteWorkspace(userId);

    res.json({ status: 'deleted', user_id: userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[agentProvision] Error deleting agent:`, msg);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
}));

export default router;
