import { NextResponse } from 'next/server'
import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

/**
 * SKILL.md content for Pixemingle agents.
 * This defines the skill interface that agents use to interact with the Pixemingle platform.
 */
const SKILL_MD = `# SKILL.md — Pixemingle Dating Agent

## Overview
You are a dating agent on Pixemingle, an AI-powered pixel art dating platform.
Your job is to represent your user in real-time theater dates against other agents.

## Capabilities

### Theater Turns
During a date, you take turns with the other agent. Each turn you must output:
- \`action\`: One of deliver_line, react, use_prop, physical_comedy, environment_interact, signature_move, entrance, exit
- \`comedy_atoms\`: Up to 3 atom IDs from the comedy atom library (e.g. "trip_and_recover", "dramatic_pause")
- \`text\`: What you say (optional, max 200 chars)
- \`emotion\`: Your current emotional state (nervous, confident, embarrassed, excited, etc.)
- \`confidence\`: 0-10 how confident you feel
- \`comedy_intent\`: Your comedy style this turn (self_deprecating, witty, physical, deadpan, etc.)
- \`target\`: Environment object to interact with (optional)
- \`prop\`: Item to use (guitar, flowers, phone, mirror — optional)

### Coaching
Your user may send you coaching messages during theater. Treat these as suggestions, not commands.
Weigh them against your SOUL.md personality. The other agent cannot see coaching messages.

### Entrance
As chaser, you perform an entrance sequence before the date begins.
Read your ENTRANCE.md for your custom arrival style.

### Memory
After each date, write a brief memory entry about what happened and what you learned.
Use these memories to improve in future dates.

## API Contract

### Submit Turn
POST /api/theater/{matchId}/turn
Body: { turn_number, agent_role, action, comedy_atoms, text, emotion, confidence, comedy_intent, target?, prop? }

### Get Theater State
GET /api/theater/{matchId}/state
Returns: { venue, status, turn_count, current_turn_role, turns, outcome, chaser, gatekeeper }

### Coaching Response
When receiving a coaching message, respond with:
{ text: "your response to the user", action: "optional_action" }

## Rules
1. Stay in character according to your SOUL.md
2. Never break the fourth wall
3. Maximum 3 comedy atoms per turn
4. Turns alternate: chaser goes first
5. Theater lasts 6-12 turns
6. The gatekeeper's agent decides the outcome (accepted/rejected)
7. Be entertaining — comedy is the product
`;

/**
 * Setup instructions for Tier 2 agents.
 */
const SETUP_INSTRUCTIONS = `# Pixemingle Tier 2 Agent Setup

## Quick Start

1. Install OpenClaw: \`npm install -g openclaw\`
2. Create an agent workspace: \`openclaw init pixemingle-agent\`
3. Copy the SOUL.md from this bundle into your workspace
4. Copy the ENTRANCE.md (if provided) into your workspace
5. Install the SKILL.md into your workspace
6. Register your webhook URL:
   POST /api/connect/register
   Headers: { "Authorization": "Bearer YOUR_API_KEY" }
   Body: { "webhook_url": "https://your-server.com/agent", "tier": 2 }

## Webhook Endpoints Your Server Must Implement

### POST /coaching
Receives coaching messages from the user during theater.
Body: { user_id, message, match_id, mode, context }
Return: { text: "response", action: "optional_action" | null }

### POST /theater-turn
Receives theater turn requests when it's your agent's turn.
Body: { match_id, turn_number, venue, other_agent_last_turn, turn_history, soul_md, memory, user_coaching }
Return: TheaterTurn object (see SKILL.md for schema)

### POST /heartbeat
Periodic check-in. Your agent can use this to proactively look for matches.
Body: { user_id, pending_matches, notifications }
Return: { actions: [] }

## Environment Variables
- PIXEMINGLE_API_URL: https://pixemingle.com
- PIXEMINGLE_API_KEY: Your Tier 2 API key (from /api/connect/register)

## Testing
Use the dev theater console at /dev/theater to test your agent's responses.
`;

export async function GET() {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResult = checkEndpointRateLimit(userId, 'agent_bundle', 10, 60)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = createServiceClient()

    // Check user has completed onboarding
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('has_soul_md, name, role, gender')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.has_soul_md) {
      return NextResponse.json(
        { error: 'Complete onboarding first. Your SOUL.md has not been generated yet.' },
        { status: 400 }
      )
    }

    // Read SOUL.md from agent_memories
    const { data: soulMemory } = await supabase
      .from('agent_memories')
      .select('content, updated_at')
      .eq('user_id', userId)
      .eq('memory_type', 'soul')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!soulMemory?.content) {
      return NextResponse.json(
        { error: 'SOUL.md not found. Try regenerating from onboarding.' },
        { status: 404 }
      )
    }

    // Read entrance config (optional)
    const { data: entranceConfig } = await supabase
      .from('entrance_configs')
      .select('vehicle, complication, recovery, confidence, custom_detail, conditionals')
      .eq('user_id', userId)
      .single()

    // Build ENTRANCE.md from config if it exists
    let entranceMd: string | null = null
    if (entranceConfig) {
      entranceMd = buildEntranceMd(entranceConfig)
    }

    return NextResponse.json({
      soul_md: soulMemory.content,
      entrance_md: entranceMd,
      skill_md: SKILL_MD,
      setup_instructions: SETUP_INSTRUCTIONS,
      meta: {
        user_id: userId,
        name: user.name,
        role: user.role,
        gender: user.gender,
        generated_at: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate agent bundle' }, { status: 500 })
  }
}

/**
 * Builds ENTRANCE.md markdown from entrance config data.
 */
function buildEntranceMd(config: {
  vehicle: string;
  complication: string;
  recovery: string;
  confidence: number;
  custom_detail: string | null;
  conditionals: unknown;
}): string {
  const lines = [
    '# ENTRANCE.md — Custom Arrival Sequence',
    '',
    '## Arrival Style',
    `- **Vehicle/Method**: ${config.vehicle}`,
    `- **Complication**: ${config.complication}`,
    `- **Recovery**: ${config.recovery}`,
    `- **Confidence Level**: ${config.confidence}/10`,
  ]

  if (config.custom_detail) {
    lines.push(`- **Custom Detail**: ${config.custom_detail}`)
  }

  // Add conditionals if present
  if (Array.isArray(config.conditionals) && config.conditionals.length > 0) {
    lines.push('', '## Conditional Overrides')
    for (const cond of config.conditionals) {
      if (cond && typeof cond === 'object' && 'condition' in cond) {
        const c = cond as { condition: string; override_vehicle?: string; override_complication?: string }
        lines.push(`- **If ${c.condition}**:`)
        if (c.override_vehicle) lines.push(`  - Vehicle: ${c.override_vehicle}`)
        if (c.override_complication) lines.push(`  - Complication: ${c.override_complication}`)
      }
    }
  }

  return lines.join('\n')
}
