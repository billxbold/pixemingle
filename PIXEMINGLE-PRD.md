# Pixemingle — Product Requirements Document (PRD)

**Version:** 1.1 — Launch Spec (Audited)  
**Date:** March 6, 2026  
**Launch Target:** Monday, March 9, 2026  
**Dev Setup:** Solo developer + Claude Code (superpower cli)  

---

## Product Overview

Pixemingle is an AI-powered social platform where users watch their customized pixel art agents hilariously interact with other users' agents. Starting with dating as the primary use case, the platform lets users create profiles, customize their agent's appearance and personality "soul," and then watch as their agent searches for compatible people, presents candidates, and performs multi-attempt flirting sequences with escalating comedy. The entire post-onboarding experience lives inside a pixel art world.

### One-Line Pitch

"Watch your AI agent hilariously try to mingle with others — it's The Sims meets social networking, powered by real AI."

### Core Differentiator

The entertainment of watching AI agents interact IS the product. Connection is a byproduct of comedy. No other platform visualizes social matchmaking as an interactive pixel art theater.

---

## AUDIT: Critical Gaps Found &amp; Fixed

**These items were missing or underspecified in v1.0. All now addressed in this document.**

### Missing Functions (Would Break Real Users)

1. **No notification system** — User B has no way to know User A's agent is flirting with them. Added: F10 Notification System.
2. **No consent flow for User B** — User A approves a candidate, but the PRD never specified how User B approves/rejects being approached. Added: Two-sided approval flow in F6.
3. **No rate limiting on LLM calls** — A free user spamming retries would burn API budget. Added: Rate limits per tier in API spec.
4. **No photo moderation** — Explicit/fake photos would slip through. Added: F11 Basic Moderation.
5. **No WebSocket spec for real-time chat** — Chat API was REST-only, which means polling. Added: WebSocket spec for chat + theater live updates.
6. **No state management spec** — PRD describes complex multi-scene pixel world but doesn't specify how frontend state flows. Added: State architecture.
7. **No error/empty states** — What shows when there are 0 candidates? When LLM fails? Added: Empty/error state specs per scene.
8. **No "not dating only" scope** — App name is Pixemingle and it's a social platform, not just dating. Added: Social mode mention in overview, but dating is launch focus.
9. **Missing role selection (Chaser/Gatekeeper)** — Listed as a design decision but never appeared in onboarding flow. Added to F1.
10. **No reporting/blocking** — Real social app needs this from day one. Added: F12.

### First-Principle MVP Speed Cuts

Things in v1.0 that are OVER-ENGINEERED for a 3-day build:

1. **Monorepo with apps/ and packages/shared/** — KILL IT. Single Next.js app with API routes. One repo, one deploy. Saves 2+ hours of build tooling config.
2. **Drizzle ORM** — KILL IT. Use Supabase client directly. Auto-generated types from schema. Saves 1 hour.
3. **Separate Vercel + Railway deploys** — KILL IT. Single Vercel deploy with Next.js API routes (or single Railway deploy with Hono serving static). Saves 1 hour of infra wiring.
4. **Personality embedding vectors** — KILL IT for MVP. Use simple rule-based scoring (shared answers = points). Embeddings are Week 2. Saves 2+ hours.
5. **4 separate scene tilesets** — KILL IT. One multipurpose background with prop overlays to define "rooms." The canvas background can be a simple color/pattern with furniture sprites placed on it. Saves 2+ hours of tileset work.
6. **Cosmetics DB table with Stripe per-item purchase flow** — SIMPLIFY. Hardcode cosmetics in frontend config. Stripe only for subscriptions on Day 1. One-time purchases are Week 2. Saves 1-2 hours.

**Total time saved: ~9-11 hours.** This is the difference between shipping Monday and not.

---

## Technical Architecture (MVP-Simplified)

### Stack

| Layer | Technology | Why This Over Alternative |
|-------|------------|--------------------------|
| Full Stack | Next.js 14 (App Router) | Single deploy, API routes built in, no monorepo overhead |
| Database + Auth + Storage | Supabase (Postgres + Auth + Storage) | One service for DB, auth, photo uploads, real-time subscriptions |
| Styling | Tailwind CSS | Pixel art overrides via CSS variables |
| Animation Engine | HTML5 Canvas API | Extracted from pixel-agents (MIT), no extra deps |
| LLM | Anthropic Claude API (claude-sonnet-4-20250514) | Structured JSON, fast, cheap |
| Payments | Stripe (subscriptions only for MVP) | One-time purchases hardcoded, Stripe for recurring |
| Hosting | Vercel (single deploy) | Next.js native, edge functions for API |
| Real-time | Supabase Realtime (WebSocket) | Chat messages + theater state sync, no custom WS server |
| Sprites | Free itch.io 16x16 + pixel-agents colorization | Fiverr commission for custom emotions post-launch |

### Repository Structure (SIMPLIFIED — Single App)

```
pixemingle/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Landing page
│   │   ├── onboarding/page.tsx   # Onboarding wizard
│   │   ├── world/page.tsx        # Main pixel world (protected)
│   │   └── api/                  # API routes
│   │       ├── matching/route.ts
│   │       ├── scenarios/route.ts
│   │       ├── chat/route.ts
│   │       ├── profile/route.ts
│   │       └── payments/route.ts
│   ├── components/
│   │   ├── Onboarding/           # Profile wizard steps
│   │   ├── PixelWorld/           # Main canvas container
│   │   ├── CharacterCreator/     # Appearance picker
│   │   ├── Gallery/              # Candidate wall
│   │   ├── Theater/              # Flirt animation player
│   │   ├── Cafe/                 # Post-match chat scene
│   │   └── UI/                   # Shared overlays, buttons
│   ├── engine/                   # Extracted from pixel-agents
│   │   ├── canvas.ts             # Render loop (requestAnimationFrame)
│   │   ├── sprites.ts            # Load, colorize, composite
│   │   ├── character.ts          # FSM: idle → walk → action → emotion
│   │   ├── pathfinding.ts        # BFS on grid
│   │   ├── scene.ts              # Scene manager + transitions
│   │   └── sequencePlayer.ts     # Plays FlirtScenario JSON step-by-step
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   ├── matching.ts           # Rule-based scoring (MVP, no embeddings)
│   │   ├── llm.ts                # Claude API wrapper
│   │   ├── souls.ts              # 4 preset SoulConfigs
│   │   └── constants.ts          # Cosmetics catalog, horoscope matrix, etc.
│   ├── hooks/
│   │   ├── usePixelWorld.ts      # Canvas lifecycle + scene state
│   │   ├── useScenario.ts        # Fetch/play scenarios
│   │   └── useChat.ts            # Supabase Realtime subscription
│   └── types/
│       ├── scenario.ts
│       ├── soul.ts
│       └── profile.ts
├── public/
│   └── sprites/                  # All PNG sprite sheets
├── supabase/
│   └── migrations/               # SQL migration files
└── next.config.js
```

---

## Database Schema

### Tables

```
users
  id              UUID PRIMARY KEY
  email           TEXT UNIQUE NOT NULL
  name            TEXT NOT NULL
  age             INTEGER NOT NULL
  bio             TEXT
  gender          TEXT NOT NULL  -- "male" | "female" | "nonbinary"
  looking_for     TEXT NOT NULL  -- "male" | "female" | "everyone"
  location        TEXT
  horoscope       TEXT           -- zodiac sign
  personality     JSONB          -- MBTI, interests, lifestyle answers
  soul_type       TEXT NOT NULL  -- "romantic" | "funny" | "bold" | "intellectual"
  agent_appearance JSONB         -- { body, skinTone, hair, hairColor, top, bottom, accessories }
  photos          TEXT[]         -- array of photo URLs
  tier            TEXT DEFAULT 'free'  -- "free" | "wingman" | "rizzlord"
  stripe_customer_id TEXT
  created_at      TIMESTAMP DEFAULT NOW()

matches
  id              UUID PRIMARY KEY
  user_a_id       UUID REFERENCES users(id)
  user_b_id       UUID REFERENCES users(id)
  status          TEXT NOT NULL   -- "pending_a" | "pending_b" | "active" | "rejected" | "expired" | "unmatched"
  match_score     FLOAT
  match_reasons   JSONB          -- { personality: "...", horoscope: "...", shared: [...] }
  scenario_cache  JSONB          -- pre-generated flirt scenario
  attempt_count   INTEGER DEFAULT 0
  created_at      TIMESTAMP DEFAULT NOW()
  updated_at      TIMESTAMP DEFAULT NOW()

scenarios
  id              UUID PRIMARY KEY
  match_id        UUID REFERENCES matches(id)
  attempt_number  INTEGER NOT NULL
  scenario_data   JSONB NOT NULL  -- full animation sequence JSON
  result          TEXT            -- "pending" | "accepted" | "rejected" | "timeout"
  created_at      TIMESTAMP DEFAULT NOW()

purchases
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  item_type       TEXT NOT NULL   -- "subscription" | "cosmetic" | "boost" | "gesture"
  item_id         TEXT NOT NULL   -- specific item identifier
  amount_cents    INTEGER NOT NULL
  stripe_payment_id TEXT
  created_at      TIMESTAMP DEFAULT NOW()

cosmetics
  id              TEXT PRIMARY KEY  -- "outfit_tuxedo", "hair_rainbow", etc.
  category        TEXT NOT NULL     -- "hair" | "top" | "bottom" | "accessory" | "special"
  name            TEXT NOT NULL
  price_cents     INTEGER NOT NULL  -- 0 for free items
  tier_required   TEXT DEFAULT 'free'
  sprite_data     JSONB            -- palette swap config or sprite sheet reference
```

---

## Feature Specifications

### F1: Onboarding Flow

**Trigger:** New user visits pixemingle.com or opens Telegram bot.  
**This is the ONLY non-pixel UI in the entire app.**

**Steps:**

1. **Auth** — Sign in with Google or email (Supabase Auth).
2. **Basic Info** — Name, age, gender, looking for, location.
3. **Photos** — Upload 1-6 photos. First photo is primary. Stored in Supabase Storage. Real photos appear throughout the pixel world in pixel frames.
4. **Personality Quiz** — 8-10 quick questions. Multiple choice. Determines personality vector for matching.
   - "Friday night ideal?" → Adventurous / Homebody / Social / Creative
   - "Argue style?" → Avoid conflict / Talk it out / Passionate debate / Humor defuses
   - "Love language?" → Words / Touch / Gifts / Quality time / Acts of service
   - etc.
5. **Horoscope** — Select zodiac sign. Used in compatibility matrix and displayed on gallery cards.
6. **Soul Selection** — Pick your agent's flirting style. 4 options with preview animations:
   - **Romantic** — "Your agent brings flowers first, writes poetry, and never gives up on love"
   - **Funny** — "Your agent trips over things, uses terrible puns, and makes everyone laugh"
   - **Bold** — "Your agent walks in confidently, says what they mean, and goes big or goes home"
   - **Intellectual** — "Your agent quotes philosophy, plays chess as foreplay, and wins with wit"
7. **Character Creator** — See F2 below.
8. **Role Selection** — Pick your agent's social role:
   - **Chaser** — "Your agent makes the first move, pursues with creativity and persistence"
   - **Gatekeeper** — "Your agent plays it cool, tests suitors, and makes them earn it"
   - User picks regardless of gender. Shown with preview animation of each role.
9. **Transition** — Form fades out. Pixel bedroom fades in. Agent "wakes up," gets dressed in chosen outfit, walks out the door. User enters the pixel world permanently.

### F2: Character Customization

**Where:** Step 7 of onboarding. Also accessible later via agent's pixel "home."

**Live preview** of the pixel agent animating idle on screen while user adjusts:

| Layer | Free Options | Premium Options |
|-------|-------------|-----------------|
| Body type | 3 base types (slim, medium, broad) | — |
| Skin tone | 8 palette swaps | — |
| Hair style | 5 styles | 5+ premium ($0.99 each) |
| Hair color | 10 palette colors | Rainbow, galaxy, fire ($0.99 each) |
| Top clothing | 5 tops (t-shirt, hoodie, blouse, sweater, tank) | Tuxedo, dress, leather jacket, etc. ($1.99 each) |
| Bottom clothing | 4 bottoms (jeans, skirt, shorts, slacks) | Formal, themed ($1.49 each) |
| Accessories | None free | Glasses, hat, crown, wings, lightsaber ($0.99-2.99 each) |

**Technical implementation:** Uses pixel-agents' sprite colorization system. One base sprite sheet per body type. Palette swap arrays define skin/hair/clothing colors. Cosmetic layers composited at render time. All rendering is LOCAL — zero network calls. This means character appearance never causes latency.

### F3: The Pixel World (Main Container)

**After onboarding, the user NEVER leaves the pixel world.** Every feature is a scene within it.

**Scenes:**

| Scene | Purpose | Key Elements |
|-------|---------|-------------|
| Bedroom | Agent spawn point, access settings | Bed, wardrobe (customization), mirror |
| Research Office | Matching in progress | Desk, laptop, papers, coffee cup |
| Gallery Wall | Candidate presentation | Large wall with photo frames, agent guide |
| Flirt Stage | Flirting theater | Open area with props, entrances, exits |
| Café | Post-match chat | Two seats, table, ambient romantic animations |
| Park | Alternative post-match scene | Bench, trees, pixel flowers |

**Navigation:** Agent walks between scenes automatically based on app state. No manual navigation needed. User can tap scene areas to jump (agent pathfinds there).

**Real photos in the pixel world:** Actual user photos rendered as `<img>` elements positioned over the canvas at correct coordinates, wrapped in pixel-art CSS borders (sharp corners, 2px solid border, pixel shadow). Photos appear in gallery frames, in agent's "presentation card," as small badges above agents during flirting, and in match results.

### F4: The Research Montage (Matching Phase)

**Trigger:** Agent enters Research Office scene after completing onboarding or requesting new matches.

**Frontend animation (pre-baked, 10 seconds, no LLM):**
1. Agent sits at pixel desk, opens tiny laptop (screen glows on face)
2. Papers fly around desk (personality analysis visual)
3. Chart icons appear and disappear (compatibility scoring)
4. Horoscope symbols flash (zodiac matching)
5. Brain icon pulses (psychological fit)
6. Agent writes furiously on notepad
7. Coffee cup level decreases (working hard!)
8. Agent leans back, strokes chin (deep thought)
9. Lightbulb appears! Agent jumps up excited
10. Transition to Gallery scene

**Backend (runs in parallel during animation):**
1. Load user's personality vector and preferences.
2. Query all eligible candidates (gender preference, age range, location radius).
3. For each candidate, compute composite match score:
   - Personality embedding cosine similarity (40% weight)
   - Horoscope compatibility matrix lookup (15% weight)
   - Lifestyle preference overlap (25% weight)
   - Interest intersection score (20% weight)
4. Rank by composite score descending.
5. Return top 10-20 candidates with scores and match_reasons.
6. Pre-generate flirt scenario for top 3 candidates (background LLM calls).

**Result:** By the time the 10-second animation finishes, candidates are ready AND top scenarios are cached. Zero perceived latency.

### F5: Gallery Wall (Candidate Selection)

**Trigger:** Research montage completes.

**Display:** Large pixel bulletin board wall. ALL candidates appear simultaneously. Each candidate shown as:

- Real photo in a pixel frame (small thumbnail, ~48x48px area)
- Match percentage badge (e.g., "94%") — color coded green >80%, yellow 60-80%, orange <60%
- Horoscope symbol icon
- 1-2 word personality tag (generated from profile: "Adventurer", "Bookworm", "Night Owl")

**Interaction:**

1. User taps any photo frame.
2. Agent walks to that frame (BFS pathfinding).
3. Profile panel slides in from right side:
   - Full-size photos (swipeable carousel within the panel)
   - Name, age, bio
   - Agent's explanation: "I picked Maya because: You're both ENFJ — great communicators. Scorpio + Pisces = deep emotional connection. You both love hiking and cooking. Match score: 94%"
   - Two buttons: 💚 "Send My Agent!" (approve) and 👋 "Keep Looking" (pass)
4. On approve: agent does fist pump, runs off toward Flirt Stage.
5. On pass: agent shrugs, tosses card over shoulder, returns to waiting position.

**No swipe gestures. No card stacks. No "swipe left/right" terminology anywhere.** This is tap-to-select in a pixel gallery with agent as intermediary. Fundamentally different from Tinder's UI patent.

### F6: The Flirting Theater

**Trigger:** User approves a candidate from the Gallery.

**Pre-condition:** A flirt scenario has been pre-generated (during Research Montage) or is generated now with a "thinking" animation covering the 2-5s LLM call.

#### Scenario JSON Schema

```typescript
interface FlirtScenario {
  match_id: string;
  attempt_number: number;
  soul_type_a: "romantic" | "funny" | "bold" | "intellectual";
  soul_type_b: "romantic" | "funny" | "bold" | "intellectual";
  steps: FlirtStep[];
  result: "pending_approval" | "accepted" | "rejected";
}

interface FlirtStep {
  agent: "chaser" | "gatekeeper" | "both";
  action: AnimationAction;
  text?: string;          // speech bubble content
  duration_ms: number;
  props?: string[];       // "flowers", "guitar", "helicopter"
  emotion?: Emotion;      // override default emotion for this step
}

type AnimationAction =
  | "idle" | "nervous_walk" | "confident_walk" | "walk_away"
  | "pickup_line" | "eye_roll" | "phone_check" | "blush"
  | "sad_slump" | "angry_kick" | "rejected_shock"
  | "flower_offer" | "flower_accept" | "flower_throw"
  | "dramatic_entrance" | "victory_dance" | "walk_together"
  | "thinking" | "determined_face" | "irritated_foot_tap"
  | "put_up_sign" | "call_security";

type Emotion = "neutral" | "happy" | "sad" | "angry" | "nervous" | "excited" | "bored" | "irritated";
```

#### Multi-Attempt Escalation

**Attempt 1 — The Nervous Approach:**
- Chaser walks nervously toward Gatekeeper (sweating, adjusting tie/hair)
- Delivers pickup line (speech bubble, text generated by LLM based on both profiles)
- Gatekeeper reacts based on THEIR soul: eye roll (funny), polite decline (romantic), dismissive walk away (bold), thoughtful pause (intellectual)
- If rejected: Chaser plays sad_slump, rain cloud particle effect, sits on bench

**Attempt 2 — The Creative Return (if user approves retry):**
- Chaser returns with flowers (or guitar or fancy gesture based on soul)
- Gatekeeper is slightly impressed but still declines
- NEW: Gatekeeper starts showing irritation (foot tap, "not again" expression)
- Chaser drops flowers, kicks them

**Attempt 3 — The Grand Gesture:**
- Chaser arrives via dramatic_entrance (helicopter, motorcycle, or marching band based on soul + random)
- Gatekeeper actually pauses. Considers.
- Branch: accept (confetti, fireworks, walk_together) OR reject with full irritation (DO NOT DISTURB sign, calls pixel security)
- If both rejected: both agents now irritated. Comedy peak.

**Attempt 4+ (premium feature):**
- Over-the-top escalation. Skywriting. Flash mob. Both agents' irritation creates mutual respect/comedy.

#### Between Attempts

After each rejection, user sees: "Your agent is regrouping... Try again?" with [Yes, send them back!] and [No, find someone else]. If yes, next attempt generates (covered by "thinking" animation). If no, agent returns to Gallery.

#### Soul Integration With Current Animations

The soul does NOT require additional animation frames. It controls THREE parameters on the existing ~15 animation set:

1. **Selection order** — Which animations play and in what sequence. "Romantic" picks nervous_walk → flower_offer → sad_slump. "Funny" picks nervous_walk → (trips) → angry_kick → determined_face. "Bold" picks confident_walk → pickup_line → dramatic_entrance. Same sprites, different story.

2. **Timing** — Duration each animation holds. "Dramatic" soul holds sad_slump for 5 seconds. "Chill" soul holds it for 2. "Persistent" soul retries 4 times. "Proud" soul quits after 1.

3. **Speech bubble text** — LLM generates different text per soul. "Intellectual" gets witty wordplay. "Bold" gets direct compliments. "Funny" gets terrible puns. Same speech bubble animation, different content.

**Implementation:** Soul is a config object passed to the LLM as part of the system prompt when generating scenarios. The LLM references the soul when selecting animation sequences and writing dialogue.

```typescript
interface SoulConfig {
  type: "romantic" | "funny" | "bold" | "intellectual";
  persistence: number;     // 1-5, how many attempts before giving up
  drama_level: number;     // 1-5, how exaggerated reactions are
  romance_style: number;   // 1-5, subtle hints (1) to grand gestures (5)
  humor_type: "dry" | "slapstick" | "wordplay" | "self-deprecating";
  // Phase 2 additions (post-launch):
  // custom_prompt?: string;
  // animation_preferences?: Record<AnimationAction, number>;
}
```

The 4 preset soul types map to fixed SoulConfig values at launch. Users pick a type, system fills in the numbers. Phase 2 adds sliders. Phase 3 adds custom prompts.

### F7: Post-Match (Café Scene)

**Trigger:** Both users' agents successfully complete flirting (mutual acceptance).

**Display:** Pixel café scene. Both agents sit at a table. Ambient romantic animations loop:
- Agents fidget, look at each other, look away shyly
- One agent picks up pixel coffee, sips nervously
- Small heart particles occasionally float up
- Variations: pixel park bench, pixel movie theater, pixel rooftop

**Chat interface:** Real text input field positioned BELOW the pixel scene. Messages appear as speech bubbles between the agents in the pixel world AND in a traditional chat log below. The pixel scene is atmosphere — the chat is functional.

**Each active match has the same base café animation but with:**
- Different agent appearances (customized by each user)
- Randomized ambient animation variations
- The same pre-made romantic scene loops — no LLM needed

#### Leaving a Match (Soul Escape)

**When User A wants to find new matches while still matched with User B:**

**What User A sees:**
- Their agent's "soul" (a semi-transparent glowing ghost version of their character) floats up and out of their agent's body
- The ghost soul looks disappointed/wistful for a moment
- The physical agent body at the café freezes/goes dim
- The ghost soul reforms into a solid agent in the Gallery scene
- Agent shakes it off, looks determined, restarts the search (Research Montage → Gallery)
- User A can still switch back to view the café scene with User B — their physical agent is still there, just "on autopilot" (idle animation, not soul-driven)

**What User B sees:**
- NOTHING changes immediately. The café scene continues.
- User A's agent gradually shifts to less engaged animations (checking phone, looking around, shorter responses)
- Eventually if User A fully unmatches: User A's agent simply isn't there next time User B opens the café scene. No notification. No explanation. Like Tinder — they just disappear.

**User B NEVER sees the soul escape animation.** It's private to User A.

### F8: Latency Elimination

**Strategy 1 — Pre-generation (handles 80% of cases):**
When a match is identified during the Research Montage, immediately fire background LLM calls to generate scenarios for the top 3 candidates. Cache as JSON in the `matches.scenario_cache` column. When user opens Theater, play instantly from cache.

**Strategy 2 — Buffered pipeline:**
While animation Step N plays (8-15 seconds each), generate Step N+1 in background. Animation duration always exceeds LLM generation time. Steps are always ready before needed.

**Strategy 3 — "Thinking" animation (covers remaining 5%):**
When user makes a real-time choice requiring new generation (e.g., approves retry), play local "thinking" animation: agent taps chin, pulls out notebook, practices line in mirror, paces nervously. This loops for 2-10 seconds. When LLM responds, agent snaps to attention (lightbulb animation) and proceeds. The thinking animation is FUNNIER than instant action — it looks like the agent is genuinely planning.

**Strategy 4 — Hybrid architecture:**
Pre-made animations (instant, local): all movement, emotions, physical actions, entrances, props. LLM generates (dynamic, 2-5s): which sequence to play, speech bubble text, branching logic. The LLM outputs a SCRIPT referencing pre-built animation atoms. It never generates animation data.

### F9: Two-Tier Hosting

**Tier 1 — Pixemingle Hosted (non-technical users, primary growth):**
- User visits pixemingle.com or Telegram bot
- Completes onboarding, never sees OpenClaw/terminals/API keys
- Backend runs a managed agent process per user
- LLM costs included in subscription price
- This is the default and the growth engine

**Tier 2 — Pixemingle Connect (OpenClaw users, early adopters):**
- User installs Pixemingle skill into existing OpenClaw
- `curl -s https://pixemingle.com/skill.md > ~/.openclaw/skills/pixemingle/SKILL.md`
- Agent registers via Pixemingle matchmaking API
- Notifications via existing Telegram/Discord
- User pays their own LLM costs
- Free or $2.99/month API access

**Both tiers hit the same match pool.** A hosted user can match with an OpenClaw user — indistinguishable from either side.

**MVP launch (Monday): Tier 1 only.** Tier 2 is Week 2-3 post-launch.

---

## Monetization

### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 matches/week, basic customization (5 hair + 5 outfits), standard animations, 1 retry per match |
| Wingman | $9.99/mo | Unlimited matches, full free customization, priority matching, match % scores with explanations, unlimited retries, animation replays |
| Rizz Lord | $19.99/mo | Everything in Wingman + premium animation unlocks (helicopter, skywriting), custom pickup line style tuning, GIF export of flirt scenes, premium cosmetics included |

### Microtransactions

| Item | Price | Type |
|------|-------|------|
| Premium hair styles | $0.99 each | Cosmetic |
| Premium outfits | $1.49-1.99 each | Cosmetic |
| Accessories (glasses, crown, wings) | $0.99-2.99 each | Cosmetic |
| Special hair colors (rainbow, galaxy) | $0.99 each | Cosmetic |
| Grand Gesture unlock (helicopter) | $3.99 | Animation |
| Second Chance (retry failed match) | $2.99 | Boost |
| Spotlight (appear first in galleries) | $3.99 | Boost |
| Fast Track (skip research montage) | $1.99 | Boost |

### Payment Implementation

- Stripe Checkout for subscriptions (monthly recurring)
- Stripe Payment Intents for one-time cosmetic/boost purchases
- Webhook handler for subscription status changes
- Tier gating middleware on API routes

---

## Sprite Requirements

### Launch Set (~15 animation states, 2 character bases)

**Character bases:** 1 masculine-presenting, 1 feminine-presenting. 16x16 pixels. Top-down 3/4 perspective (matching pixel-agents style). 4-directional walk cycles (4 frames each direction).

**Required animation states per character:**

| State | Frames | Used In |
|-------|--------|---------|
| idle_standing | 2 | Everywhere |
| nervous_walk | 4x4 (directional) | Approach, research |
| confident_walk | 4x4 | Bold soul approach |
| walk_away | 4x4 | Rejection, leaving |
| pickup_line (speech bubble) | 2 | Flirting |
| eye_roll | 2 | Gatekeeper rejection |
| phone_check | 2 | Gatekeeper ignoring |
| blush_impressed | 2 | Gatekeeper warming |
| sad_slump | 3 | Post-rejection |
| angry_kick | 3 | Frustrated reaction |
| flower_offer | 2 | Attempt 2 |
| flower_accept | 2 | Acceptance |
| victory_dance | 3 | Match success |
| walk_together | 4 | Match confirmed |
| thinking (chin tap) | 2 | Latency cover |
| soul_ghost_escape | 4 | Leaving a match |

**Scene tilesets:** Gallery wall background, café interior, park bench, bedroom, office desk. Source from free itch.io packs (Modern Interiors tileset is ideal, 16x16).

**Props (static sprites):** Flowers, guitar, helicopter (side view), coffee cup, laptop, notepad, magnifying glass, DO NOT DISTURB sign, hearts particle, rain cloud particle, lightbulb, confetti particles.

### Asset Strategy

1. **Day 1:** Use free itch.io character bases + pixel-agents colorization for variants
2. **Day 1 evening:** Commission Fiverr artist (riklaionel, $20-40, 2-day rush) for custom emotion sprites
3. **Day 2-3:** Launch with free bases, swap in Fiverr delivery when it arrives
4. **Post-launch:** Commission full custom character set with all dating animations

---

## LLM Integration

### Scenario Generation Prompt

```
System: You are the Pixemingle Flirt Director. Generate structured flirt scenarios 
between two dating agents. Output ONLY valid JSON matching the FlirtScenario schema.

The chaser agent has soul type: {soul_type_a}
The gatekeeper agent has soul type: {soul_type_b}

Chaser profile: {profile_a_summary}
Gatekeeper profile: {profile_b_summary}

This is attempt #{attempt_number}.
Previous attempts resulted in: {previous_results}

Rules:
- Use ONLY these animation actions: [list of AnimationAction values]
- Pickup lines should reference real profile details (hobbies, interests)
- Humor should match the soul types
- Each step needs a duration_ms (range: 1000-5000)
- Attempt 1: nervous, testing the waters
- Attempt 2: more creative, brings props
- Attempt 3: grand gesture, all-or-nothing
- Gatekeeper irritation increases with each attempt
- Keep it PG-13, funny, and shareable

Output the FlirtScenario JSON:
```

### Model Selection

- **Scenario generation:** claude-sonnet-4-20250514 (fast, cheap, good at structured output)
- **Match explanation text:** claude-sonnet-4-20250514 (brief, one paragraph per candidate)
- **Cost estimate:** ~$0.01-0.05 per scenario generation, ~$0.005 per explanation

---

## API Routes

```
POST   /api/auth/signup          # Create account
POST   /api/auth/login           # Login
GET    /api/profile              # Get current user profile
PUT    /api/profile              # Update profile
POST   /api/profile/photos       # Upload photos

POST   /api/matching/search      # Trigger matching algorithm, return candidates
GET    /api/matching/candidates   # Get cached candidates list
POST   /api/matching/approve     # Approve a candidate → triggers scenario generation
POST   /api/matching/pass        # Pass on a candidate

GET    /api/scenarios/:match_id  # Get cached scenario for a match
POST   /api/scenarios/:match_id/retry  # Generate next attempt scenario
POST   /api/scenarios/:match_id/result # Record attempt result (accepted/rejected)

GET    /api/matches              # List active matches
POST   /api/matches/:id/unmatch  # Leave a match (triggers soul escape on client)

GET    /api/chat/:match_id       # Get chat history
POST   /api/chat/:match_id       # Send message

GET    /api/cosmetics            # List available cosmetics
POST   /api/cosmetics/purchase   # Buy a cosmetic item
GET    /api/cosmetics/owned      # List owned cosmetics

POST   /api/payments/subscribe   # Create Stripe checkout session
POST   /api/payments/webhook     # Stripe webhook handler
GET    /api/payments/status      # Get subscription status
```

---

## Build Schedule

### Day 1 — Saturday, March 7 (12-14 hours)

| Priority | Task | Hours | Details |
|----------|------|-------|---------|
| P0 | Extract pixel-agents engine → standalone React | 3-4h | Remove VS Code deps, standalone canvas renderer with sprite system, FSM, pathfinding |
| P0 | Character Creator component | 2-3h | Layer system UI, palette swap preview, save to profile |
| P0 | Pixel world scene framework | 2h | Scene manager, bedroom/office/gallery/cafe, transitions |
| P0 | Backend API + DB schema | 2h | Hono routes, Turso/Supabase setup, Drizzle ORM |
| P1 | Deploy infrastructure | 1h | Vercel + Railway, env vars, Supabase project |
| P1 | Auth + onboarding flow | 1-2h | Supabase Auth, profile creation wizard |

### Day 2 — Sunday, March 8 (12-14 hours)

| Priority | Task | Hours | Details |
|----------|------|-------|---------|
| P0 | Matching algorithm | 2h | Personality vectors, horoscope matrix, composite scoring |
| P0 | Research montage animation | 1h | Pre-baked 10-second sequence |
| P0 | Gallery wall with real photos | 2-3h | Photo frames on canvas, tap interaction, profile panel |
| P0 | Flirt Engine (LLM integration) | 2-3h | Claude API, structured JSON output, caching |
| P0 | Theater animation player | 3-4h | Canvas sequence player, speech bubbles, step transitions |
| P1 | Stripe integration | 1h | Subscriptions + one-time purchases |
| P1 | Wire full flow end-to-end | 1-2h | Onboarding → search → gallery → approve → theater → result |

### Day 3 — Monday, March 9 (8-10 hours)

| Priority | Task | Hours | Details |
|----------|------|-------|---------|
| P0 | Landing page | 2h | Viral-optimized, embedded demo GIF/video |
| P0 | Bug fixes + mobile responsive | 3-4h | iOS Safari, Android Chrome, touch interactions |
| P1 | Seed demo profiles | 1h | 50-100 profiles with photos for cold start, flagged as demos |
| P1 | Soul escape animation | 1h | Ghost sprite + transition logic |
| P2 | Telegram bot (stretch) | 2h | Profile creation + match notifications via grammY |
| P2 | Launch posts | 1h | ProductHunt, X/Twitter, Reddit — pre-written with demo GIFs |

---

## Post-Launch Roadmap

| When | Feature |
|------|---------|
| Week 2 | Telegram bot full integration |
| Week 2 | Soul Studio v1 — behavior sliders (persistence, drama, romance, humor) |
| Week 3 | OpenClaw skill (Tier 2 — Pixemingle Connect) |
| Week 3 | GIF/video export of flirt scenes (shareable) |
| Month 2 | Custom soul prompts for power users |
| Month 2 | Community soul templates (like souls.directory) |
| Month 2 | Multi-day story arcs (retention — "your agent spotted them at the café") |
| Month 2 | Additional animation sets (guitar, skywriting, security guard) |
| Month 3 | WhatsApp Business API integration |
| Month 3 | KiloClaw-style managed hosting for Tier 2 |
| Month 4 | React Native mobile app (reuse canvas engine) |
| Month 4 | Voice mode — pixel agents speak during flirting (ElevenLabs) |
| Month 6 | Anonymized behavioral research data reports (B2B revenue) |

---

## Key Design Decisions (Locked In)

1. **Full pixel world after onboarding** — user never leaves the pixel environment once the form is done.
2. **Soul at launch = 4 presets, not custom** — Romantic/Funny/Bold/Intellectual. Soul controls selection order, timing, and text of existing animations. No new sprites needed. Expand to sliders (Week 2) then custom prompts (Month 2).
3. **Soul escape is private** — only the leaving user sees the ghost animation. The other user sees nothing change, then gradual disengagement, then disappearance. Like Tinder unmatch.
4. **Gallery not swipe** — all candidates at once on a wall. Tap to inspect. Agent mediates. No card stack. No "swipe" terminology.
5. **Pre-generate scenarios** — cache during research montage. Zero perceived latency in 95% of cases.
6. **Chaser/Gatekeeper are role labels, not gender** — any user can pick either role.
7. **Real photos in pixel frames** — HTML img elements overlaid on canvas at precise coordinates. Not pixelated. Real faces in pixel borders.
8. **Tier 1 only for Monday** — hosted users only. OpenClaw integration is Week 2-3.
9. **Character customization is P0** — it creates attachment, eliminates animation latency (local rendering), and generates day-one revenue.
10. **Comedy is the product** — every animation choice, every scenario template, every soul config should optimize for "would someone screenshot this and share it?"

---

## F10: Two-Sided Approval Flow (CRITICAL — Was Missing)

The v1.0 PRD had a fatal gap: User A approves a candidate, but User B was never asked. Here's the full flow:

```
User A approves User B from Gallery
  → Match record created: status = "pending_b"
  → User B gets a notification (see F11)
  
User B's notification experience:
  → In their pixel world, a pixel envelope/letter arrives at their door
  → Agent picks it up, opens it — shows User A's photo in a pixel frame
  → Agent speech bubble: "Someone's interested! Want to see who?"
  → User B taps to view: sees User A's profile (photos, bio, match %)
  → Two options: "Let them try!" (approve) or "Not interested" (decline)
  
If User B approves:
  → Match status = "active"
  → Flirt scenario generates (both see the theater)
  → User A is the Chaser, User B is the Gatekeeper
  → The theater result determines if they actually match (comedy layer on top of consent)
  
If User B declines:
  → Match status = "rejected"  
  → User A's agent gets a generic "they're not available" — no embarrassment
  → User B never appears in User A's gallery again

If User B ignores (timeout after 48 hours):
  → Match status = "expired"
  → User A notified: "They seem busy — your agent found new people!"
```

**This is the Tinder mutual opt-in but pixelified.** Both sides must approve before the flirting theater even begins.

---

## F11: Notification System (CRITICAL — Was Missing)

### In-App (Pixel World)

All notifications are pixel world events, not system alerts:

| Event | Pixel Animation |
|-------|----------------|
| Someone interested in you | Envelope arrives at agent's door |
| Match approved, theater ready | Agent jumps excitedly, runs to Flirt Stage |
| New chat message | Agent at café perks up, speech bubble appears |
| Match expired/rejected | Agent shrugs, returns to gallery |
| Daily: new candidates available | Agent wakes up, stretches, looks eager |

### Push Notifications (Browser/Mobile)

Simple browser push notifications with pixel-art-themed copy:

- "Your agent just received a love letter! 💌"
- "Someone let your agent try! Watch the flirting now 🎭"
- "Your match sent a message at the pixel café ☕"

**Implementation:** Web Push API (browser native). No third-party service needed for MVP. Request permission during onboarding.

---

## F12: Reporting &amp; Blocking (CRITICAL — Was Missing)

From Day 1, every profile panel (in Gallery and in Chat) has a small ⚑ flag icon:

- **Report** — "Fake photos", "Inappropriate content", "Spam/bot", "Other"
- **Block** — Immediately hides the user from your world. Mutual. Their agent never appears in your gallery again.

Reports go to a simple admin table. Manual review initially (you, the solo dev, check daily). Auto-hide after 3 reports from different users until reviewed.

```
reports
  id              UUID PRIMARY KEY
  reporter_id     UUID REFERENCES users(id)
  reported_id     UUID REFERENCES users(id)
  reason          TEXT NOT NULL
  details         TEXT
  status          TEXT DEFAULT 'pending'  -- "pending" | "reviewed" | "actioned"
  created_at      TIMESTAMP DEFAULT NOW()

blocks
  id              UUID PRIMARY KEY  
  blocker_id      UUID REFERENCES users(id)
  blocked_id      UUID REFERENCES users(id)
  created_at      TIMESTAMP DEFAULT NOW()
  UNIQUE(blocker_id, blocked_id)
```

Matching query always filters: `WHERE id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = current_user)`

---

## F13: Basic Photo Moderation (Was Missing)

**MVP approach (Day 1):** No automated moderation. Photos are user-uploaded to Supabase Storage. Rely on report system (F12).

**Week 2:** Add Supabase Edge Function that runs on photo upload:
- Check image dimensions (reject tiny/huge)
- Basic NSFW check via a lightweight API (Sightengine free tier: 500 checks/month)

**Month 2:** Photo verification (selfie match) to prevent catfishing.

---

## Frontend State Management

### Global State (React Context — no Redux, no Zustand for MVP)

```typescript
interface AppState {
  // Auth
  user: User | null;
  profile: Profile | null;
  
  // Pixel World
  currentScene: "bedroom" | "office" | "gallery" | "theater" | "cafe";
  sceneTransitioning: boolean;
  
  // Matching
  candidates: Candidate[] | null;        // null = not searched yet
  selectedCandidate: Candidate | null;
  
  // Theater
  activeScenario: FlirtScenario | null;
  scenarioStep: number;
  isGenerating: boolean;                 // true while LLM call in progress
  
  // Matches & Chat
  activeMatches: Match[];
  currentChatMatch: Match | null;
  
  // Agent
  agentAppearance: AgentAppearance;
  soulConfig: SoulConfig;
}
```

**State flows through scenes:**
- Onboarding → sets user, profile, agentAppearance, soulConfig
- Bedroom → transition to Office (triggers matching API)
- Office → candidates loaded → transition to Gallery
- Gallery → selectedCandidate set → approve → transition to Theater
- Theater → scenario plays → result → transition to Cafe (if matched) or back to Gallery
- Cafe → chat active, pixel scene loops

### Scene Transitions

Canvas fade-to-black (200ms) → load new scene props → fade-in (200ms). Agent walks off-screen in old scene, walks on-screen in new scene. Simple, no complex routing.

---

## Error &amp; Empty States

| Scenario | What User Sees |
|----------|---------------|
| 0 candidates found | Agent at desk, looks around confused, shrugs. Text overlay: "No one nearby yet — check back soon or invite friends!" Link to share. |
| LLM call fails | Agent's "thinking" animation plays indefinitely for 10s, then agent looks at camera, shrugs, speech bubble: "Having a brain freeze... trying again!" Auto-retry once. If second fail, show: "Your agent needs a coffee break. Try again in a moment." |
| Photo upload fails | Standard toast notification below pixel world. Retry button. |
| Stripe payment fails | Standard Stripe error handling. Redirect back with error message. |
| WebSocket disconnect | Reconnect silently. If >30s disconnect, show small "reconnecting..." badge. |
| Match expired while viewing | Agent at café stands up, stretches, walks away. "They seem to have left." |

---

## Rate Limits

| Action | Free Tier | Wingman | Rizz Lord |
|--------|-----------|---------|-----------|
| Matches per week | 3 | Unlimited | Unlimited |
| Retries per match | 1 | 3 | Unlimited |
| LLM scenario generations per day | 5 | 20 | 50 |
| Chat messages per day | 50 | Unlimited | Unlimited |
| Photo uploads | 3 max | 6 max | 6 max |

Rate limits enforced server-side. Frontend shows friendly pixel animation when limit hit: agent holds up a "closed" sign, speech bubble: "I need to rest! Upgrade for unlimited energy ⚡"

---

## Updated API Routes (v1.1)

```
# Auth (Supabase handles, minimal custom routes)
POST   /api/auth/callback         # Supabase auth callback

# Profile
GET    /api/profile               # Get current user
PUT    /api/profile               # Update profile + appearance + soul
POST   /api/profile/photos        # Upload photos (Supabase Storage)

# Matching  
POST   /api/matching/search       # Trigger matching, return candidates
GET    /api/matching/candidates    # Get cached candidates
POST   /api/matching/approve      # Approve candidate → creates pending match, notifies User B
POST   /api/matching/pass         # Pass on candidate
POST   /api/matching/respond      # User B responds to incoming interest (approve/decline)

# Scenarios
GET    /api/scenarios/:match_id            # Get cached scenario
POST   /api/scenarios/:match_id/generate   # Generate next attempt (rate limited)
POST   /api/scenarios/:match_id/result     # Record result

# Matches
GET    /api/matches               # List active + pending matches
POST   /api/matches/:id/unmatch   # Leave match (soul escape on client)

# Chat (REST for history, Supabase Realtime for live)
GET    /api/chat/:match_id        # Get message history
POST   /api/chat/:match_id        # Send message (also broadcasts via Supabase Realtime)

# Moderation
POST   /api/report                # Report a user
POST   /api/block                 # Block a user

# Payments
POST   /api/payments/checkout     # Create Stripe checkout session (subscription only for MVP)
POST   /api/payments/webhook      # Stripe webhook
GET    /api/payments/status       # Get current tier
```

---

## Updated Build Schedule (v1.1 — Realistic With Audit Fixes)

### Day 1 — Saturday, March 7 (12-14 hours)

| Priority | Task | Hours |
|----------|------|-------|
| P0 | `npx create-next-app` + Supabase project + DB schema (SQL migrations) | 1.5h |
| P0 | Supabase Auth (Google + email) + onboarding wizard (all form steps including role selection) | 2h |
| P0 | Extract pixel-agents canvas engine → single-file engine module (strip VS Code, keep: renderer, FSM, pathfinding, colorization) | 3h |
| P0 | Character Creator component (layer picker, live preview, palette swap) | 2h |
| P0 | Pixel world shell: scene manager, single background with prop placement, bedroom→office→gallery transitions | 2h |
| P1 | Photo upload to Supabase Storage | 0.5h |
| P1 | Deploy to Vercel, connect Supabase, env vars | 0.5h |

### Day 2 — Sunday, March 8 (12-14 hours)

| Priority | Task | Hours |
|----------|------|-------|
| P0 | Matching: rule-based scoring (shared answers = points, horoscope matrix, preference overlap). NO embeddings. | 1.5h |
| P0 | Research montage (pre-baked 10s canvas animation) + Gallery wall (real photos in pixel frames, tap to inspect, profile panel with explanation) | 3h |
| P0 | Two-sided approval flow: approve API → pending match → notification to User B → User B respond API | 1.5h |
| P0 | LLM integration: Claude API call with scenario prompt, structured JSON parsing, caching to matches.scenario_cache | 2h |
| P0 | Theater: sequencePlayer.ts reads FlirtScenario JSON, plays step-by-step on canvas (movement, speech bubbles, emotions, transitions between steps) | 3h |
| P0 | Cafe scene: ambient pixel animation + Supabase Realtime chat (messages as speech bubbles + text log below) | 2h |
| P1 | Stripe subscription checkout (Wingman + Rizz Lord tiers, webhook for tier update) | 1h |

### Day 3 — Monday, March 9 (8-10 hours)

| Priority | Task | Hours |
|----------|------|-------|
| P0 | End-to-end flow test + bug fixes: onboard → customize → search → gallery → approve → wait for B → theater → cafe → chat | 3h |
| P0 | Mobile responsive: touch events on canvas, viewport scaling, iOS Safari quirks | 2h |
| P0 | Landing page: demo GIF embedded, sign-up CTA, "How it works" in 3 pixel frames | 1.5h |
| P1 | Seed 50 demo profiles (flag as demos, mix of genders/types, stock photos with attribution) | 1h |
| P1 | Report + block flow (flag icon, modal, API, DB filter) | 1h |
| P1 | Browser push notifications (request permission, send on match events) | 0.5h |
| P2 | Soul escape animation (ghost sprite overlay, transition logic) | 0.5h |
| P2 | Empty/error state animations per scene | 0.5h |

**Total: ~35 hours across 3 days. Tight but achievable with Claude Code.**

---

## Post-Launch Roadmap

| When | Feature |
|------|---------|
| Week 2 | Telegram bot integration |
| Week 2 | Soul Studio v1 — behavior sliders |
| Week 2 | Microtransaction purchases (cosmetics, boosts) via Stripe one-time payments |
| Week 2 | Photo moderation (Sightengine integration) |
| Week 3 | OpenClaw skill (Tier 2 — Pixemingle Connect) |
| Week 3 | GIF/video export of flirt scenes |
| Month 2 | Custom soul prompts + community templates |
| Month 2 | Multi-day story arcs for retention |
| Month 2 | Social modes beyond dating (friend-finding, networking) |
| Month 2 | Additional animation sets |
| Month 3 | WhatsApp Business API |
| Month 3 | KiloClaw-style managed hosting |
| Month 4 | React Native mobile app |
| Month 6 | Behavioral research data reports (B2B) |

---

## Key Design Decisions (Locked In — v1.1)

1. **Full pixel world after onboarding** — user never leaves the pixel environment once the form is done.
2. **Soul at launch = 4 presets, not custom** — Romantic/Funny/Bold/Intellectual. Soul controls selection order, timing, and text of existing animations. No new sprites needed.
3. **Soul escape is private** — only the leaving user sees the ghost animation. Other user sees gradual disengagement then disappearance.
4. **Gallery not swipe** — all candidates at once on a wall. Tap to inspect. Agent mediates. No "swipe" terminology.
5. **Pre-generate scenarios** — cache during research montage. Zero perceived latency in 95% of cases.
6. **Chaser/Gatekeeper are role labels, not gender** — any user can pick either role.
7. **Real photos in pixel frames** — HTML img elements overlaid on canvas. Real faces in pixel borders.
8. **Tier 1 only for Monday** — hosted users only. OpenClaw integration is Week 2-3.
9. **Character customization is P0** — creates attachment, eliminates latency, generates revenue.
10. **Comedy is the product** — optimize every choice for "would someone screenshot and share this?"
11. **Two-sided consent always** — both users must approve before flirting theater begins. No autonomous agent actions.
12. **Single deploy (Next.js on Vercel)** — no monorepo, no separate backend, no ORM. Ship fast.
13. **Rule-based matching for MVP** — shared answers = points. Embeddings are Week 2 optimization.
14. **Report + block from Day 1** — non-negotiable for any social platform.
