// import Anthropic from '@anthropic-ai/sdk';
// import { config } from './config.js';
// import { readSoulMd } from './soulMdReader.js';
// import { readMemory } from './memoryManager.js';

// LLM heartbeat is disabled to avoid burning credits with no actionable output.
// Uncomment and wire up when agents have pending matches or recent activity to act on.
// const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

/**
 * Heartbeat scheduler — periodically wakes each agent to check state.
 * Currently just logs a tick; actual LLM-driven actions (check matches, update memory) are TODO.
 * LLM call infrastructure is preserved below but disabled to avoid burning credits.
 */
export class HeartbeatScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start heartbeat ticks for a user agent.
   * Default interval: 30 minutes (was 60s, changed to avoid excessive logging).
   */
  start(userId: string, intervalMs: number = 1_800_000): void {
    // Don't double-start
    if (this.intervals.has(userId)) {
      this.stop(userId);
    }

    console.log(
      `[heartbeat] Starting heartbeat for ${userId} (interval: ${intervalMs}ms)`
    );

    const timer = setInterval(() => {
      this.tick(userId).catch((err) => {
        console.error(`[heartbeat] Tick failed for ${userId}:`, err);
      });
    }, intervalMs);

    this.intervals.set(userId, timer);
  }

  /**
   * Stop heartbeat for a specific user.
   */
  stop(userId: string): void {
    const timer = this.intervals.get(userId);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(userId);
      console.log(`[heartbeat] Stopped heartbeat for ${userId}`);
    }
  }

  /**
   * Stop all heartbeats (for graceful shutdown).
   */
  stopAll(): void {
    for (const [userId, timer] of this.intervals) {
      clearInterval(timer);
      console.log(`[heartbeat] Stopped heartbeat for ${userId}`);
    }
    this.intervals.clear();
  }

  /**
   * Adjust the interval for a running heartbeat.
   */
  adjustInterval(userId: string, newIntervalMs: number): void {
    if (this.intervals.has(userId)) {
      this.stop(userId);
      this.start(userId, newIntervalMs);
    }
  }

  /**
   * Get the number of active heartbeats.
   */
  get activeCount(): number {
    return this.intervals.size;
  }

  /**
   * Single heartbeat tick.
   * LLM call is disabled to avoid burning credits — currently just logs a tick.
   * TODO: Enable LLM call when agent has pending matches or recent activity.
   */
  private async tick(userId: string): Promise<void> {
    // Just log a heartbeat tick — no LLM call until we have actionable work
    console.log(`[heartbeat] Tick for ${userId} (LLM disabled — no pending actions)`);

    // LLM heartbeat infrastructure (disabled):
    // Uncomment when agents have pending matches or recent activity to review.
    /*
    try {
      const soulMd = await readSoulMd(userId);
      const memory = await readMemory(userId);

      const response = await Promise.race([
        anthropic.messages.create({
          model: 'claude-haiku-4-20250414',
          max_tokens: 200,
          system: `You are a dating agent on Pixemingle. Review your current state briefly. Your personality is defined in your SOUL.md. Respond with a short status check (1-2 sentences) about how you're feeling and if you'd like to take any action.`,
          messages: [
            {
              role: 'user',
              content: `Your personality:\n${soulMd.slice(0, 500)}\n\nRecent memories:\n${memory.slice(-300) || 'None yet.'}\n\nHow are you doing? Any actions you want to take?`,
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Heartbeat LLM timeout')), 8_000)
        ),
      ]);

      const textBlock = response.content.find((b) => b.type === 'text');
      const statusText = textBlock?.text || '(no response)';

      console.log(`[heartbeat] ${userId}: ${statusText.slice(0, 120)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[heartbeat] Tick failed for ${userId}: ${msg}`);
    }
    */
  }
}

// Singleton instance
export const heartbeatScheduler = new HeartbeatScheduler();
