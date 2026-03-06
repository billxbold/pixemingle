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
  created_at: string;
  updated_at: string;
}

export type SoulType = 'romantic' | 'funny' | 'bold' | 'intellectual';

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
  body: number;
  skinTone: number;
  hair: number;
  hairColor: number;
  top: number;
  bottom: number;
  accessories: string[];
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'pending_b' | 'active' | 'rejected' | 'expired' | 'unmatched';
  match_score: number | null;
  match_reasons: MatchReasons | null;
  scenario_cache: FlirtScenario | null;
  attempt_count: number;
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

export interface FlirtScenario {
  match_id: string;
  attempt_number: number;
  soul_type_a: SoulType;
  soul_type_b: SoulType;
  steps: FlirtStep[];
  result: 'pending' | 'accepted' | 'rejected';
}

export interface FlirtStep {
  agent: 'chaser' | 'gatekeeper' | 'both';
  action: AnimationAction;
  text?: string;
  duration_ms: number;
  props?: string[];
  emotion?: Emotion;
}

export type AnimationAction =
  | 'idle' | 'nervous_walk' | 'confident_walk' | 'walk_away'
  | 'pickup_line' | 'eye_roll' | 'phone_check' | 'blush'
  | 'sad_slump' | 'angry_kick' | 'rejected_shock'
  | 'flower_offer' | 'flower_accept' | 'flower_throw'
  | 'dramatic_entrance' | 'victory_dance' | 'walk_together'
  | 'thinking' | 'determined_face' | 'irritated_foot_tap'
  | 'put_up_sign' | 'call_security';

export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'nervous' | 'excited' | 'bored' | 'irritated';

export interface SoulConfig {
  type: SoulType;
  persistence: number;
  drama_level: number;
  romance_style: number;
  humor_type: 'dry' | 'slapstick' | 'wordplay' | 'self-deprecating';
}

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'match_request' | 'theater_ready' | 'chat_message' | 'match_expired' | 'match_result';
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}
