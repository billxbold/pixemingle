import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { invalidateSoulMdCache } from './soulMdReader.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/** In-memory lock to prevent concurrent provisioning for the same userId. */
const provisioningLocks = new Set<string>();

export interface AgentWorkspace {
  userId: string;
  path: string;
  soulMd: string;
  entranceMd: string;
}

/**
 * Resolve a workspace path and verify it doesn't escape the data directory.
 * Throws if the resolved path is outside config.dataDir.
 */
function safeWorkspacePath(userId: string): string {
  const resolvedDataDir = path.resolve(config.dataDir);
  const workspacePath = path.resolve(path.join(config.dataDir, userId));
  if (!workspacePath.startsWith(resolvedDataDir + path.sep) && workspacePath !== resolvedDataDir) {
    throw new Error('Invalid workspace path: path traversal detected');
  }
  return workspacePath;
}

const TEMPLATES_DIR = path.resolve(
  process.env.TEMPLATES_DIR || path.join(process.cwd(), 'templates')
);

/**
 * Provision a new agent workspace on the filesystem.
 * Creates the directory, writes SOUL.md, ENTRANCE.md, HEARTBEAT.md, MEMORY.md,
 * and copies SKILL.md from templates.
 */
export async function provisionAgent(
  userId: string,
  soulMd: string,
  entranceMd?: string
): Promise<AgentWorkspace> {
  // Prevent concurrent provisioning for the same user
  if (provisioningLocks.has(userId)) {
    throw new Error('Provisioning already in progress for this user');
  }
  provisioningLocks.add(userId);

  const workspacePath = safeWorkspacePath(userId);

  let finalEntranceMd: string = '';

  try {
    // Create workspace directory
    await fs.mkdir(workspacePath, { recursive: true });

    try {
      // Write SOUL.md
      await fs.writeFile(path.join(workspacePath, 'SOUL.md'), soulMd, 'utf-8');
      invalidateSoulMdCache(userId);

      // Write ENTRANCE.md (use provided or default template)
      finalEntranceMd = entranceMd || await readTemplate('ENTRANCE.md');
      await fs.writeFile(path.join(workspacePath, 'ENTRANCE.md'), finalEntranceMd, 'utf-8');

      // Write HEARTBEAT.md from template
      const heartbeatMd = await readTemplate('HEARTBEAT.md');
      await fs.writeFile(path.join(workspacePath, 'HEARTBEAT.md'), heartbeatMd, 'utf-8');

      // Initialize empty MEMORY.md
      await fs.writeFile(
        path.join(workspacePath, 'MEMORY.md'),
        '# Agent Memory\n\nNo memories yet.\n',
        'utf-8'
      );

      // Copy SKILL.md from templates
      const skillMd = await readTemplate('SKILL.md');
      await fs.writeFile(path.join(workspacePath, 'SKILL.md'), skillMd, 'utf-8');

      // Create sessions and memory subdirectories
      await fs.mkdir(path.join(workspacePath, 'sessions'), { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'memory'), { recursive: true });
    } catch (fileErr) {
      // Clean up partial workspace on file write failure
      console.error(`[agentManager] File write failed, cleaning up partial workspace for ${userId}`);
      await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
      throw fileErr;
    }

    console.log(`[agentManager] Provisioned workspace for user ${userId} at ${workspacePath}`);

    return {
      userId,
      path: workspacePath,
      soulMd,
      entranceMd: finalEntranceMd,
    };
  } finally {
    provisioningLocks.delete(userId);
  }
}

/**
 * Get an existing agent workspace, or null if it doesn't exist.
 */
export async function getWorkspace(userId: string): Promise<AgentWorkspace | null> {
  const workspacePath = safeWorkspacePath(userId);

  try {
    await fs.access(workspacePath);
  } catch {
    return null;
  }

  try {
    const soulMd = await fs.readFile(path.join(workspacePath, 'SOUL.md'), 'utf-8');
    const entranceMd = await fs.readFile(path.join(workspacePath, 'ENTRANCE.md'), 'utf-8');

    return {
      userId,
      path: workspacePath,
      soulMd,
      entranceMd,
    };
  } catch (err) {
    console.error(`[agentManager] Workspace exists but files missing for user ${userId}:`, err);
    return null;
  }
}

/**
 * Delete an agent workspace and all its contents.
 */
export async function deleteWorkspace(userId: string): Promise<void> {
  const workspacePath = safeWorkspacePath(userId);

  try {
    await fs.rm(workspacePath, { recursive: true, force: true });
    invalidateSoulMdCache(userId);
    console.log(`[agentManager] Deleted workspace for user ${userId}`);
  } catch (err) {
    console.error(`[agentManager] Failed to delete workspace for user ${userId}:`, err);
    throw err;
  }
}

/**
 * List all provisioned agent user IDs.
 */
export async function listAgents(): Promise<string[]> {
  try {
    const entries = await fs.readdir(config.dataDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function readTemplate(filename: string): Promise<string> {
  const filePath = path.join(TEMPLATES_DIR, filename);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Template file not found: ${filePath}`);
  }
}
