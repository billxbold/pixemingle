import crypto from 'node:crypto';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { heartbeatScheduler } from './heartbeat.js';
import { getWorkspace } from './agentManager.js';
import healthRouter from './routes/health.js';
import agentProvisionRouter from './routes/agentProvision.js';
import theaterTurnRouter from './routes/theaterTurn.js';
import coachingRouter from './routes/coaching.js';

const app = express();

// --- Middleware ---

// JSON body parser (limit 1MB)
app.use(express.json({ limit: '1mb' }));

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigin = req.path === '/health' ? '*' : config.appUrl;
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Auth middleware: all routes except /health require Bearer token
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  // Timing-safe comparison to prevent timing attacks
  if (token.length !== config.gatewaySecret.length) {
    res.status(403).json({ error: 'Invalid authorization token' });
    return;
  }
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(config.gatewaySecret);
  if (!crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    res.status(403).json({ error: 'Invalid authorization token' });
    return;
  }

  next();
});

// --- Routes ---

app.use(healthRouter);
app.use(agentProvisionRouter);
app.use(theaterTurnRouter);
app.use(coachingRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Startup ---

async function loadActiveAgents(): Promise<void> {
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    // Query agent_routing for all Tier 1 agents hosted on this gateway
    const { data: agents, error } = await supabase
      .from('agent_routing')
      .select('user_id')
      .eq('tier', 1)
      .eq('status', 'active');

    if (error) {
      console.warn('[startup] Failed to load agents from Supabase:', error.message);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('[startup] No active agents found in agent_routing');
      return;
    }

    console.log(`[startup] Found ${agents.length} active agents, restarting heartbeats...`);

    let loaded = 0;
    for (const agent of agents) {
      const workspace = await getWorkspace(agent.user_id);
      if (workspace) {
        heartbeatScheduler.start(agent.user_id);
        loaded++;
      } else {
        console.warn(
          `[startup] Agent ${agent.user_id} in routing table but no workspace on disk`
        );
      }
    }

    console.log(`[startup] Loaded ${loaded}/${agents.length} agent heartbeats`);
  } catch (err) {
    console.warn(
      '[startup] Could not load active agents:',
      err instanceof Error ? err.message : err
    );
  }
}

const server = app.listen(config.port, async () => {
  console.log(`[server] Pixemingle Gateway running on port ${config.port}`);
  console.log(`[server] Data directory: ${config.dataDir}`);
  console.log(`[server] App URL: ${config.appUrl}`);

  // Load active agents and restart heartbeats
  await loadActiveAgents();
});

// --- Graceful Shutdown ---

function shutdown(signal: string): void {
  console.log(`[server] Received ${signal}, shutting down...`);

  // Stop all heartbeats
  heartbeatScheduler.stopAll();

  // Close HTTP server
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error('[server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
