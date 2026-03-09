export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  bio: string | null;
  gender: 'male' | 'female' | 'nonbinary';
  looking_for: 'male' | 'female' | 'everyone';
  location: string | null;
  horoscope: string | null;
  personality: PersonalityAnswers | null;
  soul_type: SoulType;
  role: 'chaser' | 'gatekeeper';
  agent_appearance: AgentAppearance | null;
  photos: string[];
  tier: 'free' | 'wingman' | 'rizzlord';
  stripe_customer_id: string | null;
  is_demo: boolean;
  has_soul_md: boolean;
  agent_tier: 1 | 2;
  created_at: string;
  updated_at: string;
}

export type SoulType = 'romantic' | 'funny' | 'bold' | 'intellectual';

export type VenueName = 'lounge' | 'gallery' | 'japanese' | 'icecream' | 'studio' | 'museum';

export const VENUE_INFO: Record<VenueName, { label: string; vibe: string; description: string }> = {
  lounge: { label: 'Rooftop Lounge', vibe: 'Chill & Classy', description: 'Upscale rooftop with ambient lighting and plush sofas' },
  gallery: { label: 'Art Gallery', vibe: 'Creative Date', description: 'White-walled gallery with paintings and sculptures' },
  japanese: { label: 'Japanese Restaurant', vibe: 'Romantic Evening', description: 'Intimate spot with low tables, lanterns, and ramen' },
  icecream: { label: 'Ice Cream Shop', vibe: 'Sweet & Casual', description: 'Colorful shop with sundaes and window seats' },
  studio: { label: 'Film Studio', vibe: 'Quirky Adventure', description: 'Behind-the-scenes set with cameras and spotlights' },
  museum: { label: 'The Museum', vibe: 'Intellectual Vibes', description: 'Grand halls with exhibits and quiet corners' },
};

export interface PersonalityAnswers {
  friday_night: string;
  argue_style: string;
  love_language: string;
  social_energy: string;
  adventure_level: string;
  communication: string;
  humor_style: string;
  relationship_pace: string;
}

export interface AgentAppearance {
  body: number        // 1-9 (skin tone/body type)
  eyes: number        // 1-7
  outfit: string      // e.g. 'Outfit_01_48x48_01'
  hairstyle: string   // e.g. 'Hairstyle_01_48x48_01'
  accessory?: string
  premadeIndex?: number // if set, use premade PNG directly
}

// ============================================================
// Theater System Types (v2 — OpenClaw Native)
// ============================================================

export type EmotionState =
  | 'neutral' | 'nervous' | 'confident' | 'embarrassed' | 'excited'
  | 'dejected' | 'amused' | 'annoyed' | 'hopeful' | 'devastated'
  | 'smug' | 'shy' | 'trying_too_hard' | 'genuinely_happy' | 'cringing';

export type ActionType =
  | 'deliver_line' | 'react' | 'use_prop' | 'physical_comedy'
  | 'environment_interact' | 'signature_move' | 'entrance' | 'exit';

export type ComedyIntent =
  | 'self_deprecating' | 'witty' | 'physical' | 'observational'
  | 'deadpan' | 'absurdist' | 'romantic_sincere' | 'teasing' | 'callback';

export type TheaterStatus =
  | 'entrance' | 'active' | 'completed_accepted' | 'completed_rejected';

export interface TheaterTurn {
  id: string;
  match_id: string;
  turn_number: number;
  agent_role: 'chaser' | 'gatekeeper';
  user_id: string;

  action: ActionType;
  comedy_atoms: string[];
  text?: string;
  emotion: EmotionState;
  confidence: number;
  comedy_intent: ComedyIntent;
  target?: string;
  prop?: string;

  brain_reasoning?: string;
  created_at: string;
}

export interface TheaterTurnInput {
  match_id: string;
  turn_number: number;
  venue: VenueName;
  other_agent_last_turn: TheaterTurn | null;
  turn_history: TheaterTurn[];
  soul_md: string;
  memory: string;
  user_coaching: string | null;
}

export interface TheaterState {
  venue: VenueName;
  status: TheaterStatus;
  turn_count: number;
  current_turn_role: 'chaser' | 'gatekeeper';
  turns: TheaterTurn[];
  outcome: 'accepted' | 'rejected' | null;
  chaser: { user_id: string; name: string };
  gatekeeper: { user_id: string; name: string };
}

// ============================================================
// Agent Routing & Memory Types
// ============================================================

export interface AgentRouting {
  user_id: string;
  gateway_url: string;
  tier: 1 | 2;
  webhook_url: string | null;
  agent_workspace_path: string | null;
  heartbeat_interval_minutes: number;
  last_heartbeat: string | null;
  is_active: boolean;
  created_at: string;
}

export type AgentMemoryType = 'soul' | 'entrance' | 'heartbeat' | 'daily' | 'longterm';

export interface AgentMemory {
  id: string;
  user_id: string;
  memory_type: AgentMemoryType;
  content: string;
  memory_date: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Entrance & Comedy Atom Types
// ============================================================

export interface EntranceConditional {
  condition: 'won_last_date' | 'lost_last_date' | 'first_date';
  override_vehicle?: string;
  override_complication?: string;
}

export interface EntranceConfig {
  user_id: string;
  vehicle: string;
  complication: string;
  recovery: string;
  confidence: number;
  custom_detail: string | null;
  conditionals: EntranceConditional[];
  updated_at: string;
}

export interface ComedyAtomUnlock {
  id: string;
  user_id: string;
  atom_id: string;
  source: 'purchase' | 'achievement' | 'gift' | 'default';
  unlocked_at: string;
}

// ============================================================
// Match (updated with theater fields)
// ============================================================

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'pending_b' | 'active' | 'rejected' | 'expired' | 'unmatched';
  match_score: number | null;
  match_reasons: MatchReasons | null;
  attempt_count: number;
  proposed_venue: VenueName | null;
  final_venue: VenueName | null;
  venue_proposal_text: string | null;
  theater_status: TheaterStatus | null;
  theater_turn_count: number;
  theater_started_at: string | null;
  theater_ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchReasons {
  personality: string;
  horoscope: string;
  shared: string[];
  explanation: string;
}

export interface Candidate {
  user: User;
  score: number;
  reasons: MatchReasons;
}

// ============================================================
// Notification Data Payloads
// ============================================================

export interface TheaterTurnNotificationData {
  match_id: string;
  turn_number: number;
  action: ActionType;
  emotion: EmotionState;
  outcome: 'accepted' | 'rejected' | null;
}

// ============================================================
// Chat & Notifications
// ============================================================

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export type NotificationType =
  | 'match_request' | 'theater_ready' | 'chat_message' | 'match_expired' | 'match_result'
  | 'date_proposal' | 'date_proposal_sent' | 'venue_accepted' | 'venue_countered' | 'date_declined'
  | 'theater_turn' | 'theater_entrance' | 'theater_outcome'
  | 'agent_coaching_response' | 'heartbeat_suggestion';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ============================================================
// Purchases
// ============================================================

export interface Purchase {
  id: string;
  user_id: string;
  cosmetic_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}
