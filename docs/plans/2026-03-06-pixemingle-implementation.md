# Pixemingle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered pixel art dating platform where agents flirt on behalf of users, launching Monday March 9.

**Architecture:** Next.js 14 App Router single deploy on Vercel. Supabase for DB/auth/storage/realtime. Pixel engine extracted from pixel-agents (MIT). Claude API for scenario generation. Stripe for payments.

**Tech Stack:** Next.js 14, React 19, TypeScript, Tailwind CSS, Supabase, HTML5 Canvas, Anthropic SDK, Stripe SDK

**Reference docs:**
- `PIXEMINGLE-PRD.md` — full product spec
- `PIXEMINGLE-ADDITIONAL-CONTEXT.md` — decisions, matching algo, sharing strategy
- `docs/plans/2026-03-06-pixemingle-design.md` — approved design
- `/tmp/pixel-agents-ref/` — source engine to extract from

---

## DAY 1 — Saturday, March 7

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `.env.local`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run:
```bash
cd E:/pixemingle
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk stripe @stripe/stripe-js
npm install -D @types/node
```

**Step 3: Create .env.local**

Create `E:/pixemingle/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pub
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 4: Add pixemingle to .gitignore**

Append to `.gitignore`:
```
.env.local
.env*.local
```

**Step 5: Init git and commit**

Run:
```bash
cd E:/pixemingle
git init
git add -A
git commit -m "feat: initialize Next.js 14 project with dependencies"
```

**Step 6: Verify dev server starts**

Run: `npm run dev`
Expected: Next.js dev server on localhost:3000

---

### Task 2: Supabase Setup + Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`
- Create: `src/lib/supabase.ts` (client)
- Create: `src/lib/supabase-server.ts` (server client)
- Create: `src/types/database.ts` (generated types)

**Step 1: Create Supabase project**

Manual step: Go to supabase.com, create project "pixemingle". Copy URL + anon key + service role key into `.env.local`.

**Step 2: Write initial schema migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  bio TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'nonbinary')),
  looking_for TEXT NOT NULL CHECK (looking_for IN ('male', 'female', 'everyone')),
  location TEXT,
  horoscope TEXT,
  personality JSONB,
  soul_type TEXT NOT NULL CHECK (soul_type IN ('romantic', 'funny', 'bold', 'intellectual')),
  role TEXT NOT NULL DEFAULT 'chaser' CHECK (role IN ('chaser', 'gatekeeper')),
  agent_appearance JSONB,
  photos TEXT[],
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'wingman', 'rizzlord')),
  stripe_customer_id TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_b' CHECK (status IN ('pending_b', 'active', 'rejected', 'expired', 'unmatched')),
  match_score FLOAT,
  match_reasons JSONB,
  scenario_cache JSONB,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenarios
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  scenario_data JSONB NOT NULL,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'accepted', 'rejected', 'timeout')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('subscription', 'cosmetic', 'boost', 'gesture')),
  item_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cosmetics catalog
CREATE TABLE cosmetics (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('hair', 'top', 'bottom', 'accessory', 'special')),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  tier_required TEXT DEFAULT 'free',
  sprite_data JSONB
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result')),
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- OpenClaw agents
CREATE TABLE openclaw_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_chat_match ON chat_messages(match_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_scenarios_match ON scenarios(match_id);

-- Enable realtime for chat and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
```

**Step 3: Write RLS policies**

Create `supabase/migrations/002_rls_policies.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users: read own, read others for matching
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read other profiles for matching" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Matches: read own matches
CREATE POLICY "Users can read own matches" ON matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Users can insert matches" ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_a_id);
CREATE POLICY "Users can update own matches" ON matches FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Scenarios: read if part of match
CREATE POLICY "Users can read own scenarios" ON scenarios FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches WHERE matches.id = scenarios.match_id
    AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
  ));

-- Chat: read/write if part of match
CREATE POLICY "Users can read own chat" ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches WHERE matches.id = chat_messages.match_id
    AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
  ));
CREATE POLICY "Users can send chat" ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Notifications: own only
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Purchases: own only
CREATE POLICY "Users can read own purchases" ON purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Reports: can create
CREATE POLICY "Users can create reports" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Blocks: own only
CREATE POLICY "Users can read own blocks" ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create blocks" ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Cosmetics: public read
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cosmetics" ON cosmetics FOR SELECT USING (true);
```

**Step 4: Run migrations**

Run in Supabase SQL editor (Dashboard > SQL Editor), paste both migration files.

**Step 5: Create Supabase client libraries**

Create `src/lib/supabase.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase-server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

**Step 6: Create TypeScript types**

Create `src/types/database.ts`:
```typescript
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
```

**Step 7: Commit**

Run:
```bash
git add supabase/ src/lib/supabase.ts src/lib/supabase-server.ts src/types/database.ts
git commit -m "feat: add Supabase setup, database schema, RLS policies, and TypeScript types"
```

---

### Task 3: Extract Pixel-Agents Engine

**Files:**
- Create: `src/engine/` — all engine files extracted from pixel-agents
- Source: `/tmp/pixel-agents-ref/webview-ui/src/office/`

**Step 1: Copy engine core files**

Run:
```bash
mkdir -p E:/pixemingle/src/engine/{engine,sprites,layout}

# Engine core
cp /tmp/pixel-agents-ref/webview-ui/src/office/engine/gameLoop.ts E:/pixemingle/src/engine/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/engine/renderer.ts E:/pixemingle/src/engine/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/engine/characters.ts E:/pixemingle/src/engine/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/engine/officeState.ts E:/pixemingle/src/engine/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/engine/matrixEffect.ts E:/pixemingle/src/engine/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/engine/index.ts E:/pixemingle/src/engine/engine/

# Sprites
cp /tmp/pixel-agents-ref/webview-ui/src/office/sprites/spriteCache.ts E:/pixemingle/src/engine/sprites/
cp /tmp/pixel-agents-ref/webview-ui/src/office/sprites/spriteData.ts E:/pixemingle/src/engine/sprites/
cp /tmp/pixel-agents-ref/webview-ui/src/office/sprites/index.ts E:/pixemingle/src/engine/sprites/

# Layout
cp /tmp/pixel-agents-ref/webview-ui/src/office/layout/tileMap.ts E:/pixemingle/src/engine/layout/
cp /tmp/pixel-agents-ref/webview-ui/src/office/layout/layoutSerializer.ts E:/pixemingle/src/engine/layout/
cp /tmp/pixel-agents-ref/webview-ui/src/office/layout/furnitureCatalog.ts E:/pixemingle/src/engine/layout/
cp /tmp/pixel-agents-ref/webview-ui/src/office/layout/index.ts E:/pixemingle/src/engine/layout/

# Root-level files
cp /tmp/pixel-agents-ref/webview-ui/src/office/colorize.ts E:/pixemingle/src/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/floorTiles.ts E:/pixemingle/src/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/wallTiles.ts E:/pixemingle/src/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/types.ts E:/pixemingle/src/engine/
cp /tmp/pixel-agents-ref/webview-ui/src/office/constants.ts E:/pixemingle/src/engine/

# Canvas component (we'll refactor this)
cp /tmp/pixel-agents-ref/webview-ui/src/office/components/OfficeCanvas.tsx E:/pixemingle/src/engine/
```

**Step 2: Fix all import paths**

All imports in the copied files use relative paths like `../types`, `../constants`, etc. These need to be updated to match new directory structure. Go through each file and fix imports to be relative to `src/engine/`.

Key import fixes needed:
- `engine/*.ts` files: `../types` → `../types`, `../constants` → `../constants` (same level, likely already correct)
- `sprites/*.ts`: `../types` → `../types`
- `layout/*.ts`: `../types` → `../types`
- `OfficeCanvas.tsx`: fix all deep imports

**Step 3: Strip VS Code dependencies**

In `OfficeCanvas.tsx`:
- Remove the `vscode.postMessage({ type: 'saveAgentSeats', seats })` call (~line 604)
- Add an optional callback prop: `onSaveSeats?: (seats: Record<string, string>) => void`
- Remove all `isEditMode` / editor-related props and logic
- Remove imports: `editorState`, `editorActions`, `EditorToolbar`

In `engine/officeState.ts`:
- Remove `isSubagent`, `parentAgentId`, `subagentIdMap`, `subagentMeta` properties
- Remove `addSubagent()`, `removeSubagent()` methods
- Remove tool-based state logic (references to `currentTool` for VS Code tools)
- Rename class from `OfficeState` to `WorldState`

In `engine/characters.ts`:
- Remove `isReadingTool()` function
- Remove `currentTool` based animation selection (typing vs reading)
- Keep core FSM: IDLE, WALK, TYPE (we'll add new states next)

**Step 4: Strip editor rendering from renderer.ts**

Remove these functions from `engine/renderer.ts`:
- `renderGridOverlay()`
- `renderGhostBorder()`
- `renderGhostPreview()`
- `renderSelectionHighlight()`
- `renderDeleteButton()`
- `renderRotateButton()`
- Remove `EditorRenderState`, `SelectionRenderState` types
- Remove editor-related parameters from `renderFrame()`

**Step 5: Create engine barrel export**

Create `src/engine/index.ts`:
```typescript
export * from './engine';
export * from './sprites';
export * from './layout';
export * from './colorize';
export * from './floorTiles';
export * from './wallTiles';
export * from './types';
export * from './constants';
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (fix any remaining import issues)

**Step 7: Commit**

Run:
```bash
git add src/engine/
git commit -m "feat: extract pixel-agents engine, strip VS Code deps, rename to WorldState"
```

---

### Task 4: Add Dating FSM States + Scene Manager

**Files:**
- Modify: `src/engine/engine/characters.ts` — add 6 new states
- Modify: `src/engine/types.ts` — add new state enum values
- Create: `src/engine/sceneManager.ts`
- Create: `src/engine/scenes/` — 6 scene layout definitions

**Step 1: Extend CharacterState enum**

In `src/engine/types.ts`, add to CharacterState:
```typescript
export const CharacterState = {
  IDLE: 0,
  WALK: 1,
  TYPE: 2,
  // New dating states
  APPROACH: 3,      // walk toward target with emotion modifier
  DELIVER_LINE: 4,  // stop, face target, speech bubble
  REACT_EMOTION: 5, // play emotion animation
  USE_PROP: 6,      // hold/use prop sprite
  CELEBRATE: 7,     // victory dance + particles
  DESPAIR: 8,       // sad slump + particles
} as const;
```

**Step 2: Add state handlers in characters.ts**

In `src/engine/engine/characters.ts`, add update handlers for each new state:
- APPROACH: like WALK but with configurable speed (nervous=slow, confident=fast)
- DELIVER_LINE: face target direction, hold for duration, trigger speech bubble callback
- REACT_EMOTION: play emotion-specific frame sequence, hold
- USE_PROP: hold prop frame, play prop animation
- CELEBRATE: play victory frames + trigger confetti callback
- DESPAIR: play sad frames + trigger rain callback

Each state transitions back to IDLE when its duration expires.

**Step 3: Create scene manager**

Create `src/engine/sceneManager.ts`:
```typescript
import { WorldState } from './engine/officeState';

export type SceneName = 'bedroom' | 'office' | 'gallery' | 'theater' | 'cafe' | 'park';

export interface SceneTransition {
  from: SceneName;
  to: SceneName;
  fadeOutMs: number;
  fadeInMs: number;
}

export class SceneManager {
  currentScene: SceneName = 'bedroom';
  transitioning = false;
  fadeAlpha = 1; // 1 = fully visible, 0 = black
  private targetScene: SceneName | null = null;
  private fadePhase: 'out' | 'in' | null = null;
  private fadeTimer = 0;
  private readonly FADE_DURATION = 200; // ms
  private worldState: WorldState;
  private layouts: Record<SceneName, unknown>; // OfficeLayout type

  constructor(worldState: WorldState, layouts: Record<SceneName, unknown>) {
    this.worldState = worldState;
    this.layouts = layouts;
  }

  transitionTo(scene: SceneName) {
    if (this.transitioning || scene === this.currentScene) return;
    this.transitioning = true;
    this.targetScene = scene;
    this.fadePhase = 'out';
    this.fadeTimer = 0;
  }

  update(dt: number) {
    if (!this.fadePhase) return;

    this.fadeTimer += dt * 1000;

    if (this.fadePhase === 'out') {
      this.fadeAlpha = 1 - Math.min(this.fadeTimer / this.FADE_DURATION, 1);
      if (this.fadeTimer >= this.FADE_DURATION) {
        // Swap scene at black
        this.currentScene = this.targetScene!;
        this.worldState.rebuildFromLayout(this.layouts[this.currentScene]);
        this.fadePhase = 'in';
        this.fadeTimer = 0;
      }
    } else if (this.fadePhase === 'in') {
      this.fadeAlpha = Math.min(this.fadeTimer / this.FADE_DURATION, 1);
      if (this.fadeTimer >= this.FADE_DURATION) {
        this.fadeAlpha = 1;
        this.fadePhase = null;
        this.targetScene = null;
        this.transitioning = false;
      }
    }
  }
}
```

**Step 4: Create scene layout definitions**

Create `src/engine/scenes/index.ts` with layout definitions for all 6 scenes. Each layout uses the `OfficeLayout` type from pixel-agents (grid dimensions, tile types, furniture placement). Use placeholder layouts initially — exact tile/furniture placement will be refined when LimeZu tileset is integrated.

```typescript
import { SceneName } from '../sceneManager';

// Placeholder layouts — will be populated with LimeZu tiles in Task 5
export function createSceneLayouts(): Record<SceneName, unknown> {
  return {
    bedroom: createBedroomLayout(),
    office: createOfficeLayout(),
    gallery: createGalleryLayout(),
    theater: createTheaterLayout(),
    cafe: createCafeLayout(),
    park: createParkLayout(),
  };
}

function createBedroomLayout() {
  // 8x6 grid: bed, wardrobe, mirror, door
  return {
    version: 1,
    cols: 8,
    rows: 6,
    tiles: Array(48).fill(1), // all floor
    furniture: [],
  };
}

function createOfficeLayout() {
  // 10x8 grid: desk, laptop, papers, coffee
  return {
    version: 1,
    cols: 10,
    rows: 8,
    tiles: Array(80).fill(1),
    furniture: [],
  };
}

function createGalleryLayout() {
  // 12x8 grid: large wall with photo frame positions
  return {
    version: 1,
    cols: 12,
    rows: 8,
    tiles: Array(96).fill(1),
    furniture: [],
  };
}

function createTheaterLayout() {
  // 14x10 grid: open area with entrance points
  return {
    version: 1,
    cols: 14,
    rows: 10,
    tiles: Array(140).fill(1),
    furniture: [],
  };
}

function createCafeLayout() {
  // 10x8 grid: table, two chairs, ambient items
  return {
    version: 1,
    cols: 10,
    rows: 8,
    tiles: Array(80).fill(1),
    furniture: [],
  };
}

function createParkLayout() {
  // 12x8 grid: bench, trees, flowers
  return {
    version: 1,
    cols: 12,
    rows: 8,
    tiles: Array(96).fill(1),
    furniture: [],
  };
}
```

**Step 5: Verify compilation**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/engine/
git commit -m "feat: add 6 dating FSM states, scene manager with fade transitions, scene layouts"
```

---

### Task 5: LimeZu Tileset Integration

**Files:**
- Create: `public/sprites/` — tileset PNGs
- Modify: `src/engine/scenes/index.ts` — real tile/furniture layouts
- Modify: `src/engine/layout/furnitureCatalog.ts` — add dating furniture entries

**Step 1: Download Modern Interiors tileset**

Manual step: Download "Modern Interiors" by LimeZu from itch.io (free). Extract to `public/sprites/tilesets/`. Key files needed:
- Room builder tiles (floors, walls)
- Bedroom furniture (bed, wardrobe, mirror)
- Office furniture (desk, chair, laptop, bookshelf)
- Cafe furniture (table, chairs, counter, plants)
- Park elements (trees, bench, flowers, path)

**Step 2: Create sprite loader**

Create `src/engine/assetLoader.ts`:
```typescript
export async function loadSpriteSheet(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function extractTile(
  sheet: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): string[][] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const sprite: string[][] = [];
  for (let row = 0; row < h; row++) {
    const line: string[] = [];
    for (let col = 0; col < w; col++) {
      const i = (row * w + col) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      if (a < 128) {
        line.push('');
      } else {
        line.push(
          '#' +
          r.toString(16).padStart(2, '0') +
          g.toString(16).padStart(2, '0') +
          b.toString(16).padStart(2, '0')
        );
      }
    }
    sprite.push(line);
  }
  return sprite;
}
```

**Step 3: Add dating furniture to catalog**

Add entries to `src/engine/layout/furnitureCatalog.ts` for dating-specific props:
- `cafe_table`, `cafe_chair`, `coffee_cup`
- `bed`, `wardrobe`, `mirror`
- `park_bench`, `tree`, `flower_pot`
- `photo_frame` (gallery wall)
- `stage_light` (theater)
- Props: `flowers`, `guitar`, `helicopter`, `do_not_disturb_sign`

**Step 4: Populate scene layouts with real furniture placement**

Update each scene in `src/engine/scenes/index.ts` with actual tile grids and furniture positions from the LimeZu tileset.

**Step 5: Commit**

```bash
git add public/sprites/ src/engine/
git commit -m "feat: integrate LimeZu tileset, add dating furniture, populate scene layouts"
```

---

### Task 6: PixelWorld Canvas Component

**Files:**
- Create: `src/components/PixelWorld/Canvas.tsx` — main canvas (refactored from OfficeCanvas)
- Create: `src/components/PixelWorld/index.tsx` — container
- Create: `src/hooks/usePixelWorld.ts`

**Step 1: Create usePixelWorld hook**

Create `src/hooks/usePixelWorld.ts`:
```typescript
import { useRef, useEffect, useState, useCallback } from 'react';
import { WorldState } from '@/engine/engine/officeState';
import { SceneManager, SceneName } from '@/engine/sceneManager';
import { createSceneLayouts } from '@/engine/scenes';

export function usePixelWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldStateRef = useRef<WorldState | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneName>('bedroom');
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    const layouts = createSceneLayouts();
    const worldState = new WorldState();
    worldState.rebuildFromLayout(layouts.bedroom);
    const sceneManager = new SceneManager(worldState, layouts);

    worldStateRef.current = worldState;
    sceneManagerRef.current = sceneManager;

    return () => {
      // cleanup
    };
  }, []);

  const transitionTo = useCallback((scene: SceneName) => {
    sceneManagerRef.current?.transitionTo(scene);
    setCurrentScene(scene);
  }, []);

  const addAgent = useCallback((id: number, palette?: number) => {
    worldStateRef.current?.addAgent(id, palette);
  }, []);

  return {
    canvasRef,
    worldStateRef,
    sceneManagerRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
    addAgent,
  };
}
```

**Step 2: Create Canvas component**

Create `src/components/PixelWorld/Canvas.tsx` — simplified from OfficeCanvas.tsx:
- Keep: game loop, rendering, mouse/touch input, zoom/pan, camera follow
- Remove: all editor mode logic
- Add: scene manager fade overlay rendering
- Add: click handlers for gallery photos, agent selection
- Export as React component with ref forwarding

**Step 3: Create PixelWorld container**

Create `src/components/PixelWorld/index.tsx`:
```typescript
'use client';

import { usePixelWorld } from '@/hooks/usePixelWorld';
import { Canvas } from './Canvas';

export function PixelWorld() {
  const {
    canvasRef,
    worldStateRef,
    sceneManagerRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
    addAgent,
  } = usePixelWorld();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Canvas
        canvasRef={canvasRef}
        worldStateRef={worldStateRef}
        sceneManagerRef={sceneManagerRef}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      {/* PhotoOverlay, SpeechBubbles, UI panels will be added here */}
    </div>
  );
}
```

**Step 4: Add world page route**

Create `src/app/world/page.tsx`:
```typescript
import { PixelWorld } from '@/components/PixelWorld';

export default function WorldPage() {
  return <PixelWorld />;
}
```

**Step 5: Verify canvas renders**

Run: `npm run dev`, navigate to `/world`
Expected: Canvas renders with bedroom scene (basic tiles), game loop running

**Step 6: Commit**

```bash
git add src/components/PixelWorld/ src/hooks/usePixelWorld.ts src/app/world/
git commit -m "feat: add PixelWorld canvas component with game loop and scene manager"
```

---

### Task 7: Auth + Onboarding Wizard

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/Onboarding/` — wizard steps
- Create: `src/lib/constants.ts` — personality questions, horoscope matrix, soul configs
- Create: `src/components/CharacterCreator/index.tsx`
- Modify: `src/app/layout.tsx` — add AuthProvider

**Step 1: Auth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL('/auth/error', request.url));
}
```

**Step 2: Create constants**

Create `src/lib/constants.ts`:
```typescript
import { SoulConfig, SoulType } from '@/types/database';

export const PERSONALITY_QUESTIONS = [
  {
    id: 'friday_night',
    question: 'Friday night ideal?',
    options: ['Adventurous outing', 'Cozy night in', 'Social gathering', 'Creative project'],
  },
  {
    id: 'argue_style',
    question: 'How do you handle disagreements?',
    options: ['Avoid conflict', 'Talk it out', 'Passionate debate', 'Humor defuses'],
  },
  {
    id: 'love_language',
    question: 'Your love language?',
    options: ['Words of affirmation', 'Physical touch', 'Gifts', 'Quality time', 'Acts of service'],
  },
  {
    id: 'social_energy',
    question: 'At a party, you...',
    options: ['Work the room', 'Find one person to talk to deeply', 'Leave early', 'Start dancing'],
  },
  {
    id: 'adventure_level',
    question: 'Spontaneous trip tomorrow?',
    options: ['Already packing', 'Need a week to plan', 'Only if someone else plans', 'Hard pass'],
  },
  {
    id: 'communication',
    question: 'Texting style?',
    options: ['Paragraphs', 'One-liners', 'Voice notes', 'Memes only'],
  },
  {
    id: 'humor_style',
    question: 'What makes you laugh hardest?',
    options: ['Dry wit', 'Slapstick', 'Dark humor', 'Puns and wordplay'],
  },
  {
    id: 'relationship_pace',
    question: 'Ideal relationship pace?',
    options: ['Slow burn', 'Jump right in', 'Let it happen naturally', 'Define everything upfront'],
  },
];

export const HOROSCOPE_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

// 12x12 compatibility matrix (0.0-1.0)
// Rows and columns indexed by HOROSCOPE_SIGNS order
export const HOROSCOPE_MATRIX: number[][] = [
  // Ari  Tau  Gem  Can  Leo  Vir  Lib  Sco  Sag  Cap  Aqu  Pis
  [0.50, 0.40, 0.75, 0.35, 0.90, 0.45, 0.70, 0.50, 0.95, 0.40, 0.80, 0.55], // Aries
  [0.40, 0.50, 0.35, 0.85, 0.45, 0.90, 0.55, 0.80, 0.40, 0.95, 0.45, 0.75], // Taurus
  [0.75, 0.35, 0.50, 0.45, 0.80, 0.40, 0.90, 0.35, 0.70, 0.45, 0.95, 0.50], // Gemini
  [0.35, 0.85, 0.45, 0.50, 0.40, 0.70, 0.45, 0.95, 0.35, 0.60, 0.40, 0.90], // Cancer
  [0.90, 0.45, 0.80, 0.40, 0.50, 0.45, 0.85, 0.55, 0.90, 0.35, 0.70, 0.40], // Leo
  [0.45, 0.90, 0.40, 0.70, 0.45, 0.50, 0.55, 0.75, 0.40, 0.90, 0.50, 0.65], // Virgo
  [0.70, 0.55, 0.90, 0.45, 0.85, 0.55, 0.50, 0.50, 0.75, 0.55, 0.85, 0.60], // Libra
  [0.50, 0.80, 0.35, 0.95, 0.55, 0.75, 0.50, 0.50, 0.45, 0.70, 0.55, 0.95], // Scorpio
  [0.95, 0.40, 0.70, 0.35, 0.90, 0.40, 0.75, 0.45, 0.50, 0.40, 0.80, 0.55], // Sagittarius
  [0.40, 0.95, 0.45, 0.60, 0.35, 0.90, 0.55, 0.70, 0.40, 0.50, 0.50, 0.70], // Capricorn
  [0.80, 0.45, 0.95, 0.40, 0.70, 0.50, 0.85, 0.55, 0.80, 0.50, 0.50, 0.55], // Aquarius
  [0.55, 0.75, 0.50, 0.90, 0.40, 0.65, 0.60, 0.95, 0.55, 0.70, 0.55, 0.50], // Pisces
];

export const SOUL_CONFIGS: Record<SoulType, SoulConfig> = {
  romantic: {
    type: 'romantic',
    persistence: 4,
    drama_level: 4,
    romance_style: 5,
    humor_type: 'self-deprecating',
  },
  funny: {
    type: 'funny',
    persistence: 3,
    drama_level: 3,
    romance_style: 2,
    humor_type: 'slapstick',
  },
  bold: {
    type: 'bold',
    persistence: 2,
    drama_level: 5,
    romance_style: 4,
    humor_type: 'dry',
  },
  intellectual: {
    type: 'intellectual',
    persistence: 3,
    drama_level: 2,
    romance_style: 3,
    humor_type: 'wordplay',
  },
};

export const RATE_LIMITS = {
  free: {
    matches_per_week: 3,
    retries_per_match: 1,
    scenarios_per_day: 5,
    chat_messages_per_day: 50,
    max_photos: 3,
  },
  wingman: {
    matches_per_week: Infinity,
    retries_per_match: 3,
    scenarios_per_day: 20,
    chat_messages_per_day: Infinity,
    max_photos: 6,
  },
  rizzlord: {
    matches_per_week: Infinity,
    retries_per_match: Infinity,
    scenarios_per_day: 50,
    chat_messages_per_day: Infinity,
    max_photos: 6,
  },
};

export const COSMETICS_CATALOG = {
  hair: [
    { id: 'hair_default_1', name: 'Classic', price_cents: 0, tier: 'free' },
    { id: 'hair_default_2', name: 'Wavy', price_cents: 0, tier: 'free' },
    { id: 'hair_default_3', name: 'Short', price_cents: 0, tier: 'free' },
    { id: 'hair_default_4', name: 'Long', price_cents: 0, tier: 'free' },
    { id: 'hair_default_5', name: 'Curly', price_cents: 0, tier: 'free' },
    { id: 'hair_premium_1', name: 'Rainbow', price_cents: 99, tier: 'free' },
    { id: 'hair_premium_2', name: 'Galaxy', price_cents: 99, tier: 'free' },
    { id: 'hair_premium_3', name: 'Fire', price_cents: 99, tier: 'free' },
  ],
  top: [
    { id: 'top_tshirt', name: 'T-Shirt', price_cents: 0, tier: 'free' },
    { id: 'top_hoodie', name: 'Hoodie', price_cents: 0, tier: 'free' },
    { id: 'top_blouse', name: 'Blouse', price_cents: 0, tier: 'free' },
    { id: 'top_sweater', name: 'Sweater', price_cents: 0, tier: 'free' },
    { id: 'top_tank', name: 'Tank Top', price_cents: 0, tier: 'free' },
    { id: 'top_tuxedo', name: 'Tuxedo', price_cents: 199, tier: 'free' },
    { id: 'top_leather', name: 'Leather Jacket', price_cents: 199, tier: 'free' },
  ],
  bottom: [
    { id: 'bottom_jeans', name: 'Jeans', price_cents: 0, tier: 'free' },
    { id: 'bottom_skirt', name: 'Skirt', price_cents: 0, tier: 'free' },
    { id: 'bottom_shorts', name: 'Shorts', price_cents: 0, tier: 'free' },
    { id: 'bottom_slacks', name: 'Slacks', price_cents: 0, tier: 'free' },
  ],
  accessory: [
    { id: 'acc_glasses', name: 'Glasses', price_cents: 99, tier: 'free' },
    { id: 'acc_hat', name: 'Hat', price_cents: 99, tier: 'free' },
    { id: 'acc_crown', name: 'Crown', price_cents: 299, tier: 'free' },
    { id: 'acc_wings', name: 'Wings', price_cents: 299, tier: 'free' },
  ],
};
```

**Step 3: Create onboarding wizard**

Create `src/components/Onboarding/OnboardingWizard.tsx` — a multi-step form component:
- Step 1: AuthStep (Google/email sign-in buttons)
- Step 2: BasicInfoStep (name, age, gender, looking_for, location)
- Step 3: PhotosStep (upload 1-6 photos to Supabase Storage)
- Step 4: PersonalityStep (8 multiple choice questions)
- Step 5: HoroscopeStep (zodiac wheel picker)
- Step 6: SoulStep (4 soul type cards with descriptions + preview)
- Step 7: CharacterCreatorStep (see Task 7 Step 4)
- Step 8: RoleStep (Chaser/Gatekeeper with descriptions)
- Step 9: TransitionStep (fade form out, pixel bedroom fades in)

Each step is a separate component. Wizard tracks `currentStep` and aggregates data. On final submit, POST to `/api/profile`.

**Step 4: Create Character Creator**

Create `src/components/CharacterCreator/index.tsx`:
- Live pixel preview canvas (small, renders single character with selected options)
- Layer pickers: body type (3), skin tone (8), hair style (5+), hair color (10+), top (5+), bottom (4+), accessories
- Uses pixel-agents palette swap system for live preview
- Saves `AgentAppearance` object

**Step 5: Create onboarding page**

Create `src/app/onboarding/page.tsx`:
```typescript
import { OnboardingWizard } from '@/components/Onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

**Step 6: Create profile API route**

Create `src/app/api/profile/route.ts`:
```typescript
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: user.id, ...body, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

Create `src/app/api/profile/photos/route.ts`:
```typescript
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('photo') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(path);

  // Append to user's photos array
  const { data: userData } = await supabase
    .from('users')
    .select('photos')
    .eq('id', user.id)
    .single();

  const photos = [...(userData?.photos || []), publicUrl];
  await supabase.from('users').update({ photos }).eq('id', user.id);

  return NextResponse.json({ url: publicUrl });
}
```

**Step 7: Create auth middleware**

Create `src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /world route
  if (request.nextUrl.pathname.startsWith('/world') && !user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect /api routes (except auth, payments webhook, connect, theater)
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/auth/') &&
    !request.nextUrl.pathname.startsWith('/api/payments/webhook') &&
    !request.nextUrl.pathname.startsWith('/api/connect/') &&
    !user
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: ['/world/:path*', '/api/:path*'],
};
```

**Step 8: Commit**

```bash
git add src/app/ src/components/ src/lib/constants.ts src/middleware.ts
git commit -m "feat: add auth, onboarding wizard with all 9 steps, character creator, profile API"
```

---

### Task 8: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
gh repo create pixemingle --private --source=. --push
```

**Step 2: Connect to Vercel**

Manual: Go to vercel.com, import GitHub repo, add all env vars from `.env.local`.

**Step 3: Verify deployment**

Run: `vercel --prod` or check Vercel dashboard
Expected: Site loads at assigned URL

**Step 4: Commit any config changes**

```bash
git add vercel.json next.config.js
git commit -m "chore: configure Vercel deployment"
```

---

## DAY 2 — Sunday, March 8

---

### Task 9: Animation Sprites (15 States)

**Files:**
- Create: `public/sprites/characters/` — new animation sprite sheets
- Modify: `src/engine/sprites/spriteData.ts` — add new animation definitions

**Step 1: Create new animation sprite frames**

For each of the 15 animation states, create pixel art frames at 16x16. Use Piskel (free, browser-based) or Aseprite. Each state needs 2-4 frames per relevant direction.

Priority order (theater-critical first):
1. nervous_walk, confident_walk (4 frames x 4 dirs)
2. pickup_line, thinking (2 frames, front-facing)
3. sad_slump, angry_kick (3 frames)
4. flower_offer, flower_accept (2 frames)
5. victory_dance (3 frames)
6. eye_roll, phone_check, blush_impressed (2 frames each)
7. walk_together (4 frames)
8. walk_away (reuse walk, just flip)
9. soul_ghost_escape (4 frames)

Export as PNG sprite sheets. Place in `public/sprites/characters/`.

**Step 2: Add animation definitions to spriteData.ts**

Add new animation state mappings to the character sprite system, keyed by the new CharacterState values. Each maps to frame indices in the sprite sheet.

**Step 3: Integrate with FSM**

Update `src/engine/engine/characters.ts` to select correct sprites for each new state via `getCharacterSprite()`.

**Step 4: Test each animation**

Create a debug page at `/dev/animations` that cycles through all 15 states on a test character.

**Step 5: Commit**

```bash
git add public/sprites/characters/ src/engine/
git commit -m "feat: add 15 dating animation states with sprite frames"
```

---

### Task 10: Particle System + Props

**Files:**
- Create: `src/engine/particles.ts`
- Create: `public/sprites/props/` — prop sprite PNGs
- Modify: `src/engine/engine/renderer.ts` — render particles

**Step 1: Create particle system**

Create `src/engine/particles.ts`:
```typescript
export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  frame: number;
  frameTimer: number;
}

export type ParticleType = 'heart' | 'confetti' | 'rain' | 'sweat' | 'lightbulb' | 'star' | 'music_note';

export class ParticleSystem {
  particles: Particle[] = [];

  spawn(type: ParticleType, x: number, y: number, count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(type, x, y));
    }
  }

  private createParticle(type: ParticleType, x: number, y: number): Particle {
    const configs: Record<ParticleType, { vx: number; vy: number; life: number }> = {
      heart:      { vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.5 },
      confetti:   { vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 30, life: 2.0 },
      rain:       { vx: -5, vy: 40 + Math.random() * 20, life: 1.0 },
      sweat:      { vx: (Math.random() - 0.5) * 10, vy: 15 + Math.random() * 10, life: 0.8 },
      lightbulb:  { vx: 0, vy: -15, life: 1.5 },
      star:       { vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 15, life: 1.0 },
      music_note: { vx: (Math.random() - 0.5) * 15, vy: -25 - Math.random() * 10, life: 1.2 },
    };
    const cfg = configs[type];
    return {
      type, x, y,
      vx: cfg.vx, vy: cfg.vy,
      life: cfg.life, maxLife: cfg.life,
      frame: 0, frameTimer: 0,
    };
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Gravity for confetti
      if (p.type === 'confetti') p.vy += 60 * dt;
      // Float for hearts
      if (p.type === 'heart') p.vy *= 0.98;
      // Frame animation
      p.frameTimer += dt;
      if (p.frameTimer > 0.15) {
        p.frame = (p.frame + 1) % 3;
        p.frameTimer = 0;
      }
    }
  }
}
```

**Step 2: Create prop sprites**

Draw or source 16x16 pixel sprites for: flowers, guitar, helicopter, coffee_cup, laptop, notepad, magnifying_glass, do_not_disturb_sign, polaroid_camera. Place in `public/sprites/props/`.

**Step 3: Add particle rendering to renderer.ts**

In `renderFrame()`, after character rendering and before UI, render all active particles using simple colored rectangles or small sprite frames.

**Step 4: Commit**

```bash
git add src/engine/particles.ts public/sprites/props/ src/engine/engine/renderer.ts
git commit -m "feat: add particle system (7 types) and prop sprites"
```

---

### Task 11: Matching Algorithm + Research Montage

**Files:**
- Create: `src/lib/matching.ts` — scoring algorithm
- Create: `src/app/api/matching/search/route.ts`
- Create: `src/app/api/matching/candidates/route.ts`
- Create: `src/app/api/matching/approve/route.ts`
- Create: `src/app/api/matching/pass/route.ts`
- Create: `src/app/api/matching/respond/route.ts`
- Create: `src/engine/montage.ts` — research animation sequence

**Step 1: Implement matching algorithm**

Create `src/lib/matching.ts`:
```typescript
import { User, Candidate, MatchReasons, PersonalityAnswers } from '@/types/database';
import { HOROSCOPE_MATRIX, HOROSCOPE_SIGNS } from './constants';

export function computeMatchScore(userA: User, userB: User): { score: number; reasons: MatchReasons } {
  const personality = personalityMatch(userA.personality, userB.personality);
  const horoscope = horoscopeMatch(userA.horoscope, userB.horoscope);
  const lifestyle = lifestyleMatch(userA, userB);
  const interests = interestMatch(userA.personality, userB.personality);

  const score = personality * 0.40 + horoscope * 0.15 + lifestyle * 0.25 + interests * 0.20;

  const shared: string[] = [];
  if (userA.personality && userB.personality) {
    for (const [key, val] of Object.entries(userA.personality)) {
      if ((userB.personality as Record<string, string>)[key] === val) {
        shared.push(key);
      }
    }
  }

  return {
    score: Math.round(score * 100),
    reasons: {
      personality: `${Math.round(personality * 100)}% personality match`,
      horoscope: `${userA.horoscope} + ${userB.horoscope} = ${Math.round(horoscope * 100)}% compatible`,
      shared,
      explanation: '', // filled by LLM later
    },
  };
}

function personalityMatch(a: PersonalityAnswers | null, b: PersonalityAnswers | null): number {
  if (!a || !b) return 0.5;
  const keys = Object.keys(a) as (keyof PersonalityAnswers)[];
  let matches = 0;
  for (const key of keys) {
    if (a[key] === b[key]) matches++;
  }
  return keys.length > 0 ? matches / keys.length : 0.5;
}

function horoscopeMatch(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  const idxA = HOROSCOPE_SIGNS.indexOf(a as typeof HOROSCOPE_SIGNS[number]);
  const idxB = HOROSCOPE_SIGNS.indexOf(b as typeof HOROSCOPE_SIGNS[number]);
  if (idxA === -1 || idxB === -1) return 0.5;
  return HOROSCOPE_MATRIX[idxA][idxB];
}

function lifestyleMatch(a: User, b: User): number {
  let score = 0;
  let checks = 0;
  // Age range (within 10 years)
  checks++;
  if (Math.abs(a.age - b.age) <= 10) score++;
  // Gender preference match
  checks++;
  if (a.looking_for === 'everyone' || a.looking_for === b.gender) score++;
  checks++;
  if (b.looking_for === 'everyone' || b.looking_for === a.gender) score++;
  // Location (same location string for MVP)
  if (a.location && b.location) {
    checks++;
    if (a.location.toLowerCase() === b.location.toLowerCase()) score++;
  }
  return checks > 0 ? score / checks : 0.5;
}

function interestMatch(a: PersonalityAnswers | null, b: PersonalityAnswers | null): number {
  // For MVP, overlap of personality answers serves as interest proxy
  return personalityMatch(a, b);
}

export function findCandidates(user: User, allUsers: User[], blockedIds: string[]): Candidate[] {
  return allUsers
    .filter(u =>
      u.id !== user.id &&
      !blockedIds.includes(u.id) &&
      (user.looking_for === 'everyone' || user.looking_for === u.gender) &&
      (u.looking_for === 'everyone' || u.looking_for === user.gender)
    )
    .map(u => {
      const { score, reasons } = computeMatchScore(user, u);
      return { user: u, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
```

**Step 2: Create matching API routes**

Create the 5 matching API routes as specified in the design doc. Each uses `createServerSupabase()` for auth'd queries.

Key route: `POST /api/matching/approve` — creates match with `status: 'pending_b'`, creates notification for User B, fires background scenario pre-generation for top 3 candidates.

**Step 3: Create research montage animation**

Create `src/engine/montage.ts` — a pre-baked 10-second animation sequence:
1. Agent sits at desk, opens laptop
2. Papers fly around
3. Chart icons appear/disappear
4. Horoscope symbols flash
5. Brain icon pulses
6. Agent writes furiously
7. Coffee cup level decreases
8. Agent leans back, strokes chin
9. Lightbulb appears, agent jumps
10. Transition to gallery

This is a hardcoded sequence of character state changes + particle spawns on a timer.

**Step 4: Commit**

```bash
git add src/lib/matching.ts src/app/api/matching/ src/engine/montage.ts
git commit -m "feat: add matching algorithm, API routes, and research montage animation"
```

---

### Task 12: Gallery Wall + Photo Overlay

**Files:**
- Create: `src/components/PixelWorld/PhotoOverlay.tsx`
- Create: `src/components/PixelWorld/ProfilePanel.tsx`
- Create: `src/hooks/usePhotoOverlay.ts`
- Create: `src/hooks/useMatching.ts`

**Step 1: Create photo overlay system**

Create `src/hooks/usePhotoOverlay.ts` — tracks canvas pan/zoom, computes screen positions for world-coordinate photos. Returns array of `{ url, screenX, screenY, size }` for DOM rendering.

Create `src/components/PixelWorld/PhotoOverlay.tsx` — renders absolutely positioned `<img>` elements over the canvas, with pixel-art CSS borders (2px solid, sharp corners, pixel shadow). Updates positions on every pan/zoom change.

**Step 2: Create profile panel**

Create `src/components/PixelWorld/ProfilePanel.tsx` — slides in from right when user taps a gallery photo. Shows:
- Full photos (swipeable carousel)
- Name, age, bio
- Agent's match explanation
- Match % with color coding
- "Send My Agent!" and "Keep Looking" buttons
- Report/block flag icon

**Step 3: Create useMatching hook**

Create `src/hooks/useMatching.ts`:
```typescript
import { useState, useCallback } from 'react';
import { Candidate } from '@/types/database';

export function useMatching() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/matching/search', { method: 'POST' });
    const data = await res.json();
    setCandidates(data.candidates);
    setLoading(false);
  }, []);

  const approve = useCallback(async (candidateId: string) => {
    const res = await fetch('/api/matching/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    return res.json();
  }, []);

  const pass = useCallback(async (candidateId: string) => {
    await fetch('/api/matching/pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    setSelectedCandidate(null);
  }, []);

  return { candidates, selectedCandidate, setSelectedCandidate, loading, search, approve, pass };
}
```

**Step 4: Commit**

```bash
git add src/components/PixelWorld/PhotoOverlay.tsx src/components/PixelWorld/ProfilePanel.tsx src/hooks/
git commit -m "feat: add gallery photo overlay, profile panel, and matching hooks"
```

---

### Task 13: Two-Sided Approval Flow

**Files:**
- Modify: `src/app/api/matching/approve/route.ts` — create pending match + notify User B
- Already created: `src/app/api/matching/respond/route.ts`
- Create: `src/hooks/useNotifications.ts`
- Create: `src/components/PixelWorld/NotificationPixel.tsx`

**Step 1: Implement approval → notification flow**

In approve route: on User A approval, insert match with `status: 'pending_b'`, insert notification for User B (`type: 'match_request'`).

In respond route: User B calls with `approve` or `decline`. If approve → `status: 'active'`, create notification for User A (`type: 'theater_ready'`). If decline → `status: 'rejected'`.

**Step 2: Create notification hook**

Create `src/hooks/useNotifications.ts` — subscribes to Supabase Realtime on the `notifications` table filtered by `user_id`. On new notification, updates local state and triggers in-world animation.

**Step 3: Create in-world notification component**

Create `src/components/PixelWorld/NotificationPixel.tsx` — renders pixel envelope animation when match request arrives. Shows User A's photo in pixel frame, "Someone's interested!" speech bubble.

**Step 4: Commit**

```bash
git add src/app/api/matching/ src/hooks/useNotifications.ts src/components/PixelWorld/NotificationPixel.tsx
git commit -m "feat: add two-sided approval flow with real-time notifications"
```

---

### Task 14: LLM Integration (Scenario Generation)

**Files:**
- Create: `src/lib/llm.ts` — Claude API wrapper
- Create: `src/app/api/scenarios/[matchId]/route.ts`
- Create: `src/app/api/scenarios/[matchId]/generate/route.ts`
- Create: `src/app/api/scenarios/[matchId]/result/route.ts`
- Create: `src/lib/rate-limit.ts`

**Step 1: Create Claude API wrapper**

Create `src/lib/llm.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FlirtScenario, SoulType, User } from '@/types/database';
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
  } catch (e) {
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
      step.duration_ms = 2000; // default
    }
  }
}
```

**Step 2: Create rate limiter**

Create `src/lib/rate-limit.ts`:
```typescript
import { RATE_LIMITS } from './constants';

// In-memory rate limiting for MVP. Replace with Redis for production.
const limitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  action: string,
  tier: 'free' | 'wingman' | 'rizzlord'
): { allowed: boolean; remaining: number } {
  const limits = RATE_LIMITS[tier];
  const key = `${userId}:${action}`;
  const now = Date.now();

  let limit: number;
  let windowMs: number;

  switch (action) {
    case 'matches':
      limit = limits.matches_per_week;
      windowMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case 'scenarios':
      limit = limits.scenarios_per_day;
      windowMs = 24 * 60 * 60 * 1000;
      break;
    case 'chat':
      limit = limits.chat_messages_per_day;
      windowMs = 24 * 60 * 60 * 1000;
      break;
    default:
      return { allowed: true, remaining: Infinity };
  }

  if (limit === Infinity) return { allowed: true, remaining: Infinity };

  const entry = limitStore.get(key);
  if (!entry || now > entry.resetAt) {
    limitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}
```

**Step 3: Create scenario API routes**

Implement GET `/api/scenarios/[matchId]`, POST `.../generate`, POST `.../result` using the LLM wrapper and rate limiter.

**Step 4: Commit**

```bash
git add src/lib/llm.ts src/lib/rate-limit.ts src/app/api/scenarios/
git commit -m "feat: add Claude API scenario generation with rate limiting and validation"
```

---

### Task 15: sequencePlayer + Theater + Realtime Sync

**Files:**
- Create: `src/engine/sequencePlayer.ts`
- Create: `src/hooks/useScenario.ts`
- Create: `src/components/PixelWorld/TheaterControls.tsx`
- Modify: `src/components/PixelWorld/index.tsx` — integrate theater

**Step 1: Create sequence player**

Create `src/engine/sequencePlayer.ts`:
```typescript
import { FlirtScenario, FlirtStep } from '@/types/database';
import { WorldState } from './engine/officeState';
import { ParticleSystem } from './particles';

export type SequencePlayerCallback = {
  onStepStart: (stepIndex: number, step: FlirtStep) => void;
  onStepEnd: (stepIndex: number) => void;
  onComplete: (result: string) => void;
  onSpeechBubble: (agent: string, text: string) => void;
};

export class SequencePlayer {
  private scenario: FlirtScenario | null = null;
  private currentStep = 0;
  private stepTimer = 0;
  private playing = false;
  private worldState: WorldState;
  private particles: ParticleSystem;
  private callbacks: SequencePlayerCallback;

  // Character IDs for chaser and gatekeeper
  private chaserId = 1;
  private gatekeeperId = 2;

  constructor(
    worldState: WorldState,
    particles: ParticleSystem,
    callbacks: SequencePlayerCallback
  ) {
    this.worldState = worldState;
    this.particles = particles;
    this.callbacks = callbacks;
  }

  load(scenario: FlirtScenario) {
    this.scenario = scenario;
    this.currentStep = 0;
    this.stepTimer = 0;
    this.playing = false;
  }

  play() {
    if (!this.scenario) return;
    this.playing = true;
    this.startStep(0);
  }

  jumpToStep(index: number) {
    if (!this.scenario || index >= this.scenario.steps.length) return;
    this.currentStep = index;
    this.stepTimer = 0;
    this.startStep(index);
  }

  private startStep(index: number) {
    const step = this.scenario!.steps[index];
    this.callbacks.onStepStart(index, step);

    // Set character states based on step
    const agentId = step.agent === 'chaser' ? this.chaserId :
                    step.agent === 'gatekeeper' ? this.gatekeeperId : null;

    // Show speech bubble
    if (step.text) {
      this.callbacks.onSpeechBubble(step.agent, step.text);
    }

    // Spawn particles based on emotion
    if (step.emotion && agentId) {
      const ch = this.worldState.characters.get(agentId);
      if (ch) {
        switch (step.emotion) {
          case 'nervous': this.particles.spawn('sweat', ch.x, ch.y - 16, 3); break;
          case 'happy': this.particles.spawn('heart', ch.x, ch.y - 16, 2); break;
          case 'sad': this.particles.spawn('rain', ch.x, ch.y - 20, 5); break;
          case 'excited': this.particles.spawn('star', ch.x, ch.y - 16, 4); break;
          case 'angry': this.particles.spawn('confetti', ch.x, ch.y, 1); break; // kick debris
        }
      }
    }
  }

  update(dt: number) {
    if (!this.playing || !this.scenario) return;

    this.stepTimer += dt * 1000; // convert to ms

    const step = this.scenario.steps[this.currentStep];
    if (this.stepTimer >= step.duration_ms) {
      this.callbacks.onStepEnd(this.currentStep);
      this.currentStep++;
      this.stepTimer = 0;

      if (this.currentStep >= this.scenario.steps.length) {
        this.playing = false;
        this.callbacks.onComplete(this.scenario.result);
      } else {
        this.startStep(this.currentStep);
      }
    }
  }

  get isPlaying() { return this.playing; }
  get step() { return this.currentStep; }
}
```

**Step 2: Create useScenario hook with Realtime sync**

Create `src/hooks/useScenario.ts`:
```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { FlirtScenario } from '@/types/database';

export function useScenario(matchId: string | null, role: 'chaser' | 'gatekeeper') {
  const [scenario, setScenario] = useState<FlirtScenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to match channel for real-time sync
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(`match:${matchId}`);

    channel
      .on('broadcast', { event: 'scenario_ready' }, ({ payload }) => {
        setScenario(payload.scenario);
      })
      .on('broadcast', { event: 'step' }, ({ payload }) => {
        // Gatekeeper follows chaser's step advancement
        if (role === 'gatekeeper') {
          setCurrentStep(payload.step_index);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, role, supabase]);

  // Chaser broadcasts step advancement
  const advanceStep = useCallback((stepIndex: number) => {
    if (role !== 'chaser' || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'step',
      payload: { step_index: stepIndex },
    });
    setCurrentStep(stepIndex);
  }, [role]);

  const generate = useCallback(async () => {
    if (!matchId) return;
    setIsGenerating(true);
    const res = await fetch(`/api/scenarios/${matchId}/generate`, { method: 'POST' });
    const data = await res.json();
    setScenario(data.scenario);
    setIsGenerating(false);

    // Broadcast to gatekeeper
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'scenario_ready',
        payload: { scenario: data.scenario },
      });
    }
  }, [matchId]);

  const fetchCached = useCallback(async () => {
    if (!matchId) return;
    const res = await fetch(`/api/scenarios/${matchId}`);
    const data = await res.json();
    if (data.scenario) setScenario(data.scenario);
  }, [matchId]);

  return {
    scenario,
    currentStep,
    isGenerating,
    generate,
    fetchCached,
    advanceStep,
  };
}
```

**Step 3: Create theater controls**

Create `src/components/PixelWorld/TheaterControls.tsx` — shows between attempts:
- "Your agent is regrouping... Try again?"
- [Yes, send them back!] [No, find someone else]
- Rate limit display when hit

**Step 4: Commit**

```bash
git add src/engine/sequencePlayer.ts src/hooks/useScenario.ts src/components/PixelWorld/TheaterControls.tsx
git commit -m "feat: add sequence player, theater controls, and real-time sync via Supabase channels"
```

---

### Task 16: Cafe Scene + Chat

**Files:**
- Create: `src/hooks/useChat.ts`
- Create: `src/components/PixelWorld/ChatPanel.tsx`
- Create: `src/app/api/chat/[matchId]/route.ts`
- Create: `src/app/api/matches/route.ts`
- Create: `src/app/api/matches/[id]/unmatch/route.ts`

**Step 1: Create chat hook with Supabase Realtime**

Create `src/hooks/useChat.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { ChatMessage } from '@/types/database';

export function useChat(matchId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const supabase = createClient();

  // Load history + subscribe to new messages
  useEffect(() => {
    if (!matchId) return;

    // Load history
    supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [matchId, supabase]);

  const sendMessage = useCallback(async (content: string) => {
    if (!matchId) return;
    await fetch(`/api/chat/${matchId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }, [matchId]);

  return { messages, sendMessage };
}
```

**Step 2: Create chat panel**

Create `src/components/PixelWorld/ChatPanel.tsx` — positioned below the canvas:
- Message list with timestamps
- Text input + send button
- Messages also trigger speech bubbles in café scene (via callback to PixelWorld)

**Step 3: Create chat + matches API routes**

Create `src/app/api/chat/[matchId]/route.ts` — GET for history, POST for sending (with rate limiting).

Create `src/app/api/matches/route.ts` — GET active + pending matches.

Create `src/app/api/matches/[id]/unmatch/route.ts` — POST to set status to 'unmatched'.

**Step 4: Commit**

```bash
git add src/hooks/useChat.ts src/components/PixelWorld/ChatPanel.tsx src/app/api/chat/ src/app/api/matches/
git commit -m "feat: add cafe chat with Supabase Realtime, matches API, unmatch flow"
```

---

## DAY 3 — Monday, March 9

---

### Task 17: Stripe Integration

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/app/api/payments/checkout/route.ts`
- Create: `src/app/api/payments/webhook/route.ts`
- Create: `src/app/api/payments/status/route.ts`
- Create: `src/app/api/cosmetics/route.ts`
- Create: `src/app/api/cosmetics/purchase/route.ts`
- Create: `src/app/api/cosmetics/owned/route.ts`
- Create: `src/hooks/useStripe.ts`

**Step 1: Create Stripe utilities**

Create `src/lib/stripe.ts` with:
- Stripe server client initialization
- Price IDs for Wingman ($9.99) and Rizz Lord ($19.99)
- Helper to create checkout sessions
- Helper to verify webhook signatures

**Step 2: Create payment API routes**

- `/api/payments/checkout` — creates Stripe checkout session for subscription tier
- `/api/payments/webhook` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` events, updates user tier in DB
- `/api/payments/status` — returns current user's tier

**Step 3: Create cosmetics API routes**

- `/api/cosmetics` — GET catalog from constants
- `/api/cosmetics/purchase` — creates Stripe PaymentIntent for one-time purchase
- `/api/cosmetics/owned` — GET user's purchased cosmetics from purchases table

**Step 4: Create useStripe hook**

Handles checkout redirect, tier display, cosmetic purchase flow.

**Step 5: Commit**

```bash
git add src/lib/stripe.ts src/app/api/payments/ src/app/api/cosmetics/ src/hooks/useStripe.ts
git commit -m "feat: add Stripe subscriptions, cosmetic purchases, and tier gating"
```

---

### Task 18: Public Theater Replay Page

**Files:**
- Create: `src/app/theater/[matchId]/page.tsx`
- Create: `src/components/TheaterReplay/index.tsx`

**Step 1: Create replay page**

Create `src/app/theater/[matchId]/page.tsx`:
```typescript
import { createServiceClient } from '@/lib/supabase-server';
import { TheaterReplay } from '@/components/TheaterReplay';

export default async function TheaterReplayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = createServiceClient();

  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('match_id', matchId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .single();

  const { data: match } = await supabase
    .from('matches')
    .select('*, user_a:users!user_a_id(*), user_b:users!user_b_id(*)')
    .eq('id', matchId)
    .single();

  if (!scenario || !match) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Theater not found</div>;
  }

  return (
    <TheaterReplay
      scenario={scenario.scenario_data}
      chaserName={match.user_a.name}
      gatekeeperName={match.user_b.name}
      chaserAppearance={match.user_a.agent_appearance}
      gatekeeperAppearance={match.user_b.agent_appearance}
      chaserPhoto={match.user_a.photos?.[0]}
      gatekeeperPhoto={match.user_b.photos?.[0]}
    />
  );
}
```

**Step 2: Create replay component**

Create `src/components/TheaterReplay/index.tsx`:
- Same Canvas engine, read-only
- SequencePlayer auto-plays the scenario
- Photos blurred: `<img className="blur-lg saturate-50" />`
- Watermark: "pixemingle.com" in corner
- "Create your own agent" CTA button at bottom
- Share buttons (copy link, Twitter, etc.)
- No auth required

**Step 3: Commit**

```bash
git add src/app/theater/ src/components/TheaterReplay/
git commit -m "feat: add public theater replay page with blurred photos and watermark"
```

---

### Task 19: OpenClaw Connect API

**Files:**
- Create: `src/app/api/connect/register/route.ts`
- Create: `src/app/api/connect/webhook-config/route.ts`
- Create: `src/lib/webhooks.ts`

**Step 1: Create register endpoint**

`POST /api/connect/register` — accepts profile data + webhook URL, creates user + openclaw_agents record, returns API key (generated, hashed in DB, plaintext returned once).

**Step 2: Create webhook config endpoint**

`PUT /api/connect/webhook-config` — authenticated via API key, updates webhook URL.

**Step 3: Create webhook sender**

Create `src/lib/webhooks.ts`:
```typescript
export async function sendWebhook(webhookUrl: string, payload: {
  event: string;
  match_id: string;
  theater_url?: string;
  summary: string;
}) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Webhook delivery failed:', webhookUrl, e);
  }
}
```

Integrate into matching approve/respond routes — when match events occur, check if either user has an openclaw_agents record and send webhook with theater replay URL.

**Step 4: Commit**

```bash
git add src/app/api/connect/ src/lib/webhooks.ts
git commit -m "feat: add OpenClaw connect API with webhook notifications"
```

---

### Task 20: End-to-End Flow Test + Bug Fixes

**Step 1: Test full user journey**

Manual walkthrough:
1. Visit landing page → sign up
2. Complete all 9 onboarding steps
3. See bedroom scene, agent wakes up
4. Agent walks to office → research montage plays
5. Gallery wall loads with candidates + real photos
6. Tap a candidate → profile panel slides in
7. Approve → pending match created, notification sent
8. (As User B) See notification, approve back
9. Both users see theater → scenario plays with sync
10. Match succeeds → café scene loads
11. Send chat messages → speech bubbles appear
12. Test unmatch (soul escape)

**Step 2: Fix bugs found**

Address any issues with:
- Canvas rendering at different zoom levels
- Photo overlay positioning during pan/zoom
- Realtime sync timing
- Mobile touch events
- Rate limiting edge cases
- Auth redirect flows

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: end-to-end flow bug fixes"
```

---

### Task 21: Mobile Responsive

**Files:**
- Modify: `src/components/PixelWorld/Canvas.tsx` — touch events
- Modify: `src/components/PixelWorld/index.tsx` — viewport scaling
- Modify: `src/app/globals.css` — mobile styles

**Step 1: Add touch event handling**

In Canvas.tsx, translate touch events to canvas coordinates:
- `touchstart` → mouse click (select agent, tap photo)
- `touchmove` → pan (single finger) or zoom (pinch)
- `touchend` → release

Account for zoom, pan offset, and devicePixelRatio.

**Step 2: Viewport scaling**

Set canvas to fill viewport. Adjust default zoom based on screen width:
- Desktop: zoom = 2-3
- Mobile: zoom = 1-2

**Step 3: Mobile layout adjustments**

- Profile panel: full-screen overlay on mobile (not side panel)
- Chat panel: fixed bottom with expandable input
- Theater controls: larger tap targets
- iOS Safari: handle viewport height (100dvh)

**Step 4: Commit**

```bash
git add src/components/ src/app/globals.css
git commit -m "feat: add mobile responsive layout with touch events"
```

---

### Task 22: Landing Page

**Files:**
- Modify: `src/app/page.tsx` — landing page
- Create: `src/components/Landing/` — sections

**Step 1: Build landing page**

Create a compelling landing page with:
- Hero: "Watch your AI agent hilariously try to mingle" + demo screenshot/GIF
- How it works: 3 pixel art frames (Create → Watch → Connect)
- Soul types showcase (4 cards with descriptions)
- Pricing table (Free / Wingman / Rizz Lord)
- Sign up CTA button
- Footer with links
- Watermark/branding consistent with pixel art theme
- Mobile-first responsive design

**Step 2: Commit**

```bash
git add src/app/page.tsx src/components/Landing/
git commit -m "feat: add landing page with demo, pricing, and sign-up CTA"
```

---

### Task 23: Seed Demo Profiles

**Files:**
- Create: `scripts/seed-profiles.ts`

**Step 1: Create seed script**

Create `scripts/seed-profiles.ts`:
- 50 demo profiles with diverse combinations
- Use Unsplash stock photos (free, with attribution)
- Mix of genders, ages, horoscope signs, soul types, roles
- All personality questions answered with varied combinations
- `is_demo: true` flag
- Agent appearances with different palette combinations

Run via: `npx tsx scripts/seed-profiles.ts`

**Step 2: Commit**

```bash
git add scripts/seed-profiles.ts
git commit -m "feat: add seed script for 50 demo profiles"
```

---

### Task 24: Report + Block Flow

**Files:**
- Create: `src/app/api/report/route.ts`
- Create: `src/app/api/block/route.ts`
- Create: `src/components/PixelWorld/ReportBlockModal.tsx`

**Step 1: Create API routes**

`POST /api/report` — inserts report record.
`POST /api/block` — inserts block record (mutual hide).

**Step 2: Create modal component**

Flag icon in ProfilePanel and ChatPanel. On tap:
- "Report" option → reason picker (Fake photos, Inappropriate, Spam, Other)
- "Block" option → confirmation dialog → immediate hide

**Step 3: Commit**

```bash
git add src/app/api/report/ src/app/api/block/ src/components/PixelWorld/ReportBlockModal.tsx
git commit -m "feat: add report and block flow with modal UI"
```

---

### Task 25: Browser Push Notifications

**Files:**
- Create: `src/lib/push-notifications.ts`
- Create: `public/sw.js` — service worker
- Modify: `src/hooks/useNotifications.ts` — trigger push

**Step 1: Create push notification handler**

Request permission during onboarding completion. Register service worker. On match events (from Supabase Realtime subscription), show browser notification with pixel-art-themed copy:
- "Your agent just received a love letter!"
- "Someone let your agent try! Watch the flirting now"
- "Your match sent a message at the pixel cafe"

**Step 2: Commit**

```bash
git add src/lib/push-notifications.ts public/sw.js src/hooks/useNotifications.ts
git commit -m "feat: add browser push notifications for match events"
```

---

### Task 26: Final Deploy + Verify

**Step 1: Build check**

Run: `npm run build`
Expected: No build errors

**Step 2: Push and deploy**

```bash
git push origin main
```

Vercel auto-deploys on push.

**Step 3: Production smoke test**

- Verify landing page loads
- Sign up flow works
- Canvas renders
- Matching returns results
- Theater plays
- Chat works
- Payments process
- Public replay page loads with blurred photos
- Mobile works

---

## Summary

| Day | Tasks | Key Deliverables |
|-----|-------|-----------------|
| Day 1 (Sat) | Tasks 1-8 | Scaffold, DB, engine extraction, scenes, character creator, onboarding, auth, deploy |
| Day 2 (Sun) | Tasks 9-16 | Animations, particles, matching, gallery, approval flow, LLM, theater sync, chat |
| Day 3 (Mon) | Tasks 17-26 | Stripe, replay page, OpenClaw API, E2E testing, mobile, landing, seed, report/block, push notifications, final deploy |
