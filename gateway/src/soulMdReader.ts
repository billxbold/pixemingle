import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const MAX_CACHE_SIZE = 500;
const cache = new Map<string, { content: string; mtime: number }>();

/**
 * Read SOUL.md for a given user, with in-memory cache.
 * Cache invalidates when file mtime changes.
 */
export async function readSoulMd(userId: string): Promise<string> {
  const filePath = path.join(config.dataDir, userId, 'SOUL.md');

  try {
    const stat = await fs.stat(filePath);
    const mtime = stat.mtimeMs;

    const cached = cache.get(userId);
    if (cached && cached.mtime === mtime) {
      return cached.content;
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // Evict oldest entry if cache is full (Map preserves insertion order)
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(userId, { content, mtime });
    return content;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`SOUL.md not found for user ${userId}`);
    }
    throw err;
  }
}

/**
 * Invalidate the cache for a user (call after writing SOUL.md).
 */
export function invalidateSoulMdCache(userId: string): void {
  cache.delete(userId);
}

/**
 * Clear all cached entries.
 */
export function clearSoulMdCache(): void {
  cache.clear();
}
