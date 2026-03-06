import Anthropic from '@anthropic-ai/sdk';
import type { FlirtScenario, User } from '@/types/database';
import { SOUL_CONFIGS } from './constants';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANIMATION_ACTIONS = [
  'idle', 'nervous_walk', 'confident_walk', 'walk_away',
  'pickup_line', 'eye_roll', 'phone_check', 'blush',
  'sad_slump', 'angry_kick', 'rejected_shock',
  'flower_offer', 'flower_accept', 'flower_throw',
  'dramatic_entrance', 'victory_dance', 'walk_together',
  'thinking', 'determined_face', 'irritated_foot_tap',
  'put_up_sign', 'call_security',
];

export async function generateScenario(
  matchId: string,
  attemptNumber: number,
  chaserProfile: User,
  gatekeeperProfile: User,
  previousResults: string[]
): Promise<FlirtScenario> {
  const chaserSoul = SOUL_CONFIGS[chaserProfile.soul_type];
  const gatekeeperSoul = SOUL_CONFIGS[gatekeeperProfile.soul_type];

  const prompt = `You are the Pixemingle Flirt Director. Generate a structured flirt scenario between two dating agents. Output ONLY valid JSON matching the FlirtScenario schema.

The chaser agent has soul type: ${chaserProfile.soul_type} (persistence: ${chaserSoul.persistence}, drama: ${chaserSoul.drama_level}, romance: ${chaserSoul.romance_style}, humor: ${chaserSoul.humor_type})
The gatekeeper agent has soul type: ${gatekeeperProfile.soul_type} (persistence: ${gatekeeperSoul.persistence}, drama: ${gatekeeperSoul.drama_level}, romance: ${gatekeeperSoul.romance_style}, humor: ${gatekeeperSoul.humor_type})

Chaser profile: ${chaserProfile.name}, ${chaserProfile.age}, ${chaserProfile.bio || 'No bio'}, interests: ${JSON.stringify(chaserProfile.personality)}
Gatekeeper profile: ${gatekeeperProfile.name}, ${gatekeeperProfile.age}, ${gatekeeperProfile.bio || 'No bio'}, interests: ${JSON.stringify(gatekeeperProfile.personality)}

This is attempt #${attemptNumber}.
Previous attempts resulted in: ${previousResults.length > 0 ? previousResults.join(', ') : 'none'}

Rules:
- Use ONLY these animation actions: ${JSON.stringify(ANIMATION_ACTIONS)}
- Pickup lines should reference real profile details (hobbies, interests)
- Humor should match the soul types
- Each step needs a duration_ms (range: 1000-5000)
- Attempt 1: nervous, testing the waters (5-8 steps)
- Attempt 2: more creative, brings props (6-10 steps)
- Attempt 3: grand gesture, all-or-nothing (8-12 steps)
- Gatekeeper irritation increases with each attempt
- Keep it PG-13, funny, and shareable
- Emotions: neutral, happy, sad, angry, nervous, excited, bored, irritated

Output ONLY this JSON structure:
{
  "match_id": "${matchId}",
  "attempt_number": ${attemptNumber},
  "soul_type_a": "${chaserProfile.soul_type}",
  "soul_type_b": "${gatekeeperProfile.soul_type}",
  "steps": [
    {
      "agent": "chaser" | "gatekeeper" | "both",
      "action": "<animation_action>",
      "text": "optional speech bubble text",
      "duration_ms": 2000,
      "props": ["optional_prop"],
      "emotion": "nervous"
    }
  ],
  "result": "pending"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const scenario = JSON.parse(text) as FlirtScenario;
    validateScenario(scenario);
    return scenario;
  } catch {
    // Retry once on parse failure
    const retryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: text },
        { role: 'user', content: 'That was not valid JSON. Please output ONLY the valid JSON object, nothing else.' },
      ],
    });
    const retryText = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : '';
    const scenario = JSON.parse(retryText) as FlirtScenario;
    validateScenario(scenario);
    return scenario;
  }
}

function validateScenario(scenario: FlirtScenario) {
  if (!scenario.steps || !Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new Error('Invalid scenario: no steps');
  }
  for (const step of scenario.steps) {
    if (!ANIMATION_ACTIONS.includes(step.action)) {
      throw new Error(`Invalid action: ${step.action}`);
    }
    if (!step.duration_ms || step.duration_ms < 500 || step.duration_ms > 10000) {
      step.duration_ms = 2000;
    }
  }
}
