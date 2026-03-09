import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  gatewaySecret: requireEnv('GATEWAY_SECRET'),
  appUrl: requireEnv('APP_URL'),
  port: (() => {
    const parsed = parseInt(process.env.PORT || '3001', 10);
    return isNaN(parsed) ? 3001 : parsed;
  })(),
  dataDir: process.env.DATA_DIR || '/data/agents',
} as const;
