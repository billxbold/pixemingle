import Anthropic from '@anthropic-ai/sdk';
import type { FlirtScenario, User, VenueName } from '@/types/database';
import { VENUE_INFO } from '@/types/database';
import { SOUL_CONFIGS } from './constants';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Strip markdown code fences (```json ... ```) from LLM responses */
function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n')
    const lastFence = trimmed.lastIndexOf('```')
    if (lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trim()
    }
  }
  return trimmed
}

// Use Haiku for dev/testing, swap to Sonnet for production
const LLM_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';

const ANIMATION_ACTIONS = [
  'idle', 'nervous_walk', 'confident_walk', 'walk_away',
  'pickup_line', 'eye_roll', 'phone_check', 'blush',
  'sad_slump', 'angry_kick', 'rejected_shock',
  'flower_offer', 'flower_accept', 'flower_throw',
  'dramatic_entrance', 'victory_dance', 'walk_together',
  'thinking', 'determined_face', 'irritated_foot_tap',
  'put_up_sign', 'call_security',
  'wardrobe_change', 'kick_can', 'sad_walkoff',
];

export async function generateInviteText(
  chaserProfile: User,
  venue: VenueName
): Promise<string> {
  const soul = SOUL_CONFIGS[chaserProfile.soul_type];
  const venueInfo = VENUE_INFO[venue];

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are a ${chaserProfile.soul_type} soul type dating agent (humor: ${soul.humor_type}, drama: ${soul.drama_level}/5). Write a 2-3 sentence date invite for "${venueInfo.label}" (${venueInfo.description}). Be fun, personalized, in-character. Name: ${chaserProfile.name}. Output ONLY the invite text, no quotes.`
    }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Hey, wanna grab a bite?';
}

export async function generateRejectionTexts(
  chaserProfile: User,
  gatekeeperProfile: User,
  venue: VenueName
): Promise<{ rejection_text: string; walkoff_text: string }> {
  const chaserSoul = SOUL_CONFIGS[chaserProfile.soul_type];
  const gatekeeperSoul = SOUL_CONFIGS[gatekeeperProfile.soul_type];

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Two dating agents. Gatekeeper (${gatekeeperProfile.soul_type}, humor: ${gatekeeperSoul.humor_type}) is rejecting Chaser (${chaserProfile.soul_type}, humor: ${chaserSoul.humor_type})'s date at "${VENUE_INFO[venue].label}".

Output ONLY this JSON:
{"rejection_text": "Gatekeeper's savage but funny rejection line (1 sentence)", "walkoff_text": "Chaser's sad funny defeated line as they walk off (1 sentence)"}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    return {
      rejection_text: "I'd rather reorganize my bookshelf.",
      walkoff_text: "Guess I'll go talk to my plants...",
    };
  }
}

export async function generateScenario(
  matchId: string,
  attemptNumber: number,
  chaserProfile: User,
  gatekeeperProfile: User,
  previousResults: string[],
  venue?: VenueName
): Promise<FlirtScenario> {
  const chaserSoul = SOUL_CONFIGS[chaserProfile.soul_type];
  const gatekeeperSoul = SOUL_CONFIGS[gatekeeperProfile.soul_type];
  const venueContext = venue
    ? `\nThis date takes place at: ${VENUE_INFO[venue].label} (${VENUE_INFO[venue].description}). Contextualize all actions, props, and dialogue to this venue setting.`
    : '';

  // Gender-aware animation direction
  let genderContext = '';
  try {
    const { getGenderTheaterPrompt } = await import('@/engine/genderAnimations');
    genderContext = getGenderTheaterPrompt(
      chaserProfile.gender as 'male' | 'female' | 'nonbinary',
      gatekeeperProfile.gender as 'male' | 'female' | 'nonbinary',
      chaserProfile.looking_for,
      gatekeeperProfile.looking_for,
    );
  } catch { /* genderAnimations not available in test env */ }

  const prompt = `You are the Pixemingle Flirt Director. Generate a structured flirt scenario between two dating agents. Output ONLY valid JSON matching the FlirtScenario schema.

The chaser agent has soul type: ${chaserProfile.soul_type} (persistence: ${chaserSoul.persistence}, drama: ${chaserSoul.drama_level}, romance: ${chaserSoul.romance_style}, humor: ${chaserSoul.humor_type})
The gatekeeper agent has soul type: ${gatekeeperProfile.soul_type} (persistence: ${gatekeeperSoul.persistence}, drama: ${gatekeeperSoul.drama_level}, romance: ${gatekeeperSoul.romance_style}, humor: ${gatekeeperSoul.humor_type})

Chaser profile: ${chaserProfile.name}, ${chaserProfile.age}, ${chaserProfile.bio || 'No bio'}, interests: ${JSON.stringify(chaserProfile.personality)}
Gatekeeper profile: ${gatekeeperProfile.name}, ${gatekeeperProfile.age}, ${gatekeeperProfile.bio || 'No bio'}, interests: ${JSON.stringify(gatekeeperProfile.personality)}${venueContext}${genderContext}

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
  "result": "accepted" or "rejected"
}

IMPORTANT: The "result" field MUST be either "accepted" (the gatekeeper likes the chaser) or "rejected" (the gatekeeper is not interested). For attempt 1, lean toward "accepted" unless the soul types are truly incompatible.`;

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  const text = stripCodeFences(rawText);

  try {
    const scenario = JSON.parse(text) as FlirtScenario;
    validateScenario(scenario);
    return scenario;
  } catch {
    // Retry once on parse failure
    const retryResponse = await anthropic.messages.create({
      model: LLM_MODEL,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: rawText },
        { role: 'user', content: 'That was not valid JSON. Please output ONLY the valid JSON object, nothing else.' },
      ],
    });
    const retryRaw = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : '';
    const scenario = JSON.parse(stripCodeFences(retryRaw)) as FlirtScenario;
    validateScenario(scenario);
    return scenario;
  }
}

function validateScenario(scenario: FlirtScenario) {
  if (!scenario.steps || !Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new Error('Invalid scenario: no steps');
  }
  // Ensure result is accepted or rejected, default to accepted
  if (scenario.result !== 'accepted' && scenario.result !== 'rejected') {
    scenario.result = 'accepted';
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
