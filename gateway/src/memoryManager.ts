import fs from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

/** Per-user write lock to ensure sequential appendFile operations. */
const memoryLocks = new Map<string, Promise<void>>();

/**
 * Read the MEMORY.md file for a user agent.
 */
export async function readMemory(userId: string): Promise<string> {
  const filePath = path.join(config.dataDir, userId, 'MEMORY.md');

  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

/**
 * Append a timestamped entry to MEMORY.md.
 * Uses a per-user write lock to ensure sequential writes.
 */
export async function appendMemory(userId: string, entry: string): Promise<void> {
  const doWrite = async (): Promise<void> => {
    const filePath = path.join(config.dataDir, userId, 'MEMORY.md');
    const timestamp = new Date().toISOString();
    const formatted = `\n## ${timestamp}\n${entry}\n`;

    try {
      await fs.appendFile(filePath, formatted, 'utf-8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        // Create file if it doesn't exist
        await fs.writeFile(filePath, `# Agent Memory\n${formatted}`, 'utf-8');
      } else {
        throw err;
      }
    }
  };

  // Queue writes sequentially per user
  const prev = memoryLocks.get(userId) ?? Promise.resolve();
  const next = prev.then(doWrite, doWrite); // run even if previous failed
  memoryLocks.set(userId, next);
  await next;
}

/**
 * Generate a summary of a date using Claude Haiku.
 * Called after theater concludes to create a memory entry.
 */
export async function generateDateSummary(
  soulMd: string,
  turns: Array<{
    turn_number: number;
    agent_role: string;
    action: string;
    text?: string;
    emotion: string;
    comedy_atoms: string[];
  }>,
  outcome: string
): Promise<string> {
  const turnLog = turns
    .map(
      (t) =>
        `Turn ${t.turn_number} (${t.agent_role}): [${t.action}] ${t.text || ''} (${t.emotion}) atoms: ${t.comedy_atoms.join(', ') || 'none'}`
    )
    .join('\n');

  const templateFallback = `Date ended with outcome: ${outcome}. ${turns.length} turns played.`;

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-haiku-4-20250414',
        max_tokens: 300,
        system:
          'You are a dating agent reflecting on a date. Write a brief, personal memory entry (2-4 sentences) about what happened, what you learned, and how you feel. Stay in character per your SOUL.md personality. Do not use markdown headings.',
        messages: [
          {
            role: 'user',
            content: `Your personality:\n${soulMd}\n\nDate transcript:\n${turnLog}\n\nOutcome: ${outcome}\n\nWrite your memory of this date.`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Date summary LLM timeout')), 10_000)
      ),
    ]);

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock?.text || 'Had a date. Details unclear.';
  } catch (err) {
    console.error('[memoryManager] Failed to generate date summary:', err instanceof Error ? err.message : err);
    return templateFallback;
  }
}

/**
 * Backup a memory file to the Supabase agent_memories table.
 * Returns success/failure status. Logs warnings on failure but does not throw.
 */
export async function backupToSupabase(
  userId: string,
  memoryType: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('agent_memories').upsert(
      {
        user_id: userId,
        memory_type: memoryType,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,memory_type' }
    );

    if (error) {
      console.warn('[memoryManager] Failed to backup to Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[memoryManager] Exception during Supabase backup:', msg);
    return { success: false, error: msg };
  }
}
