# CLAUDE.md — Pixemingle v2

## What is this project?

AI-powered pixel art dating platform built on OpenClaw. Every user gets a real OpenClaw agent with personality (SOUL.md), memory, heartbeat autonomy, and a ReAct reasoning loop. Agents flirt on the user's behalf in real-time turn-based "theater" sequences. If agents click, users match and chat. Entertainment-first dating — comedy is the product, connection is the byproduct.

**Architecture:** Pixemingle IS a hosted OpenClaw experience (KiloClaw model).
**Live URL:** Deploying to Vercel (not yet live)
**Design doc:** `docs/plans/2026-03-09-openclaw-native-architecture-design.md`

---

## CRITICAL ARCHITECTURAL RULES

**NEVER use direct `@anthropic-ai/sdk` calls as a substitute for OpenClaw agent processes.**
**NEVER hardcode agent behavior with keyword regex or static JSON scenarios.**
**Tier 1 users get a managed OpenClaw agent they never see. Tier 2 users bring their own OpenClaw.**
**Both tiers hit the same match pool — indistinguishable from either side.**

These rules are non-negotiable. Violating them = wasting time.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, `src/` directory) |
| Language | TypeScript (strict mode) |
| Database / Auth / Realtime | Supabase (Postgres + Auth + Storage + Realtime channels) |
| Styling | Tailwind CSS 3 |
| Animation Engine | Custom HTML5 Canvas (comedy atom system + expression engine) |
| Agent Brain | OpenClaw Gateway (Railway) — ReAct loop, SOUL.md, memory, heartbeat |
| LLM | Claude Haiku via OpenClaw (NOT direct `@anthropic-ai/sdk`) |
| Payments | Stripe (subscriptions + microtransaction cosmetics) |
| Hosting | Vercel (frontend) + Railway (OpenClaw Gateway) |
| Art Pipeline | PixelLab-generated pixel art (48x48 sprites, 128x128 portraits) |

---

## System Architecture

```
[Vercel — free/hobby]
  └── Next.js frontend + lightweight API routes
      (auth, Supabase queries, static pages, webhook receiver)

[Railway — $12/mo starting]
  └── OpenClaw Gateway (long-running Node 22 process)
      ├── Multi-agent: one agent workspace per Tier 1 user
      ├── Pixemingle skill (SKILL.md) installed per agent
      ├── Heartbeat: agents proactively check for matches
      ├── Agent-to-agent: real-time theater via sessions_send
      └── Memory: agents learn from past dates

[Supabase — $25/mo]
  └── Postgres + Auth + Realtime + Storage
      ├── Users, matches, chat, notifications
      ├── Theater turn log (agent decisions stored here)
      ├── Agent routing table (user_id → gateway_url)
      └── Cosmetics, purchases, reports, blocks

[Anthropic API — usage-based]
  └── Claude Haiku for all agent LLM calls (via OpenClaw, NOT direct SDK)
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Geist fonts)
│   ├── page.tsx                  # Landing page
│   ├── world/page.tsx            # Main game page (single-page hub)
│   ├── onboarding/page.tsx       # Onboarding wizard
│   ├── theater/[matchId]/page.tsx # Public theater replay
│   ├── auth/
│   │   ├── callback/route.ts     # Supabase OAuth callback
│   │   └── error/page.tsx        # Auth error page
│   ├── dev-login/page.tsx        # Dev login bypass
│   ├── dev/                      # Dev tools
│   └── api/                      # API routes (see below)
│
├── components/
│   ├── PixelWorld/               # Main game UI
│   │   ├── index.tsx             # PixelWorld wrapper (orchestrates canvas + panels)
│   │   ├── Canvas.tsx            # HTML5 Canvas component
│   │   ├── AgentChatBar.tsx      # Bottom agent coaching bar
│   │   ├── MatchChatPanel.tsx    # Right-side human match chat
│   │   ├── CandidateSlider.tsx   # Candidate browsing slider
│   │   ├── ProfilePanel.tsx      # User profile viewer
│   │   ├── DateProposalOverlay.tsx # Date proposal UI overlay
│   │   ├── InvitationNotification.tsx
│   │   ├── TheaterControls.tsx
│   │   ├── PhotoOverlay.tsx
│   │   ├── NotificationPixel.tsx
│   │   └── ReportBlockModal.tsx
│   ├── DateProposal/             # Date proposal components
│   │   ├── DateProposalCard.tsx   # Chaser venue picker
│   │   ├── DateInvitationCard.tsx # Gatekeeper invitation UI
│   │   └── VenueCard.tsx         # Venue display card
│   ├── CharacterPreview/
│   │   └── CharacterPreviewCanvas.tsx  # 96x96 character preview renderer
│   ├── Onboarding/
│   │   ├── OnboardingWizard.tsx
│   │   └── steps/                # BasicInfo, Personality, Horoscope, Soul, Role, Character, Auth
│   ├── Landing/                  # Landing page sections
│   │   ├── Hero.tsx, HowItWorks.tsx, SoulTypes.tsx, Pricing.tsx, Footer.tsx
│   ├── PortraitPanel/            # NEW — 128x128 expression portraits (HTML overlay below canvas)
│   └── TheaterReplay/index.tsx   # Public theater replay viewer
│
├── engine/                       # Canvas pixel engine
│   ├── index.ts                  # Re-exports
│   ├── types.ts                  # Core types: Character, CharacterState, Direction, etc.
│   ├── constants.ts              # TILE_SIZE=48, speeds, durations, colors
│   ├── engine/
│   │   ├── gameLoop.ts           # requestAnimationFrame loop
│   │   ├── renderer.ts           # Tile/furniture/character rendering, z-sorting
│   │   ├── characters.ts         # Character FSM, pathfinding, wander behavior
│   │   ├── officeState.ts        # WorldState (central state manager) — add theater turn queue
│   │   ├── index.ts
│   │   └── matrixEffect.ts       # Matrix spawn/despawn effect
│   ├── sprites/
│   │   ├── spriteData.ts         # Palette system, character templates
│   │   ├── spriteCache.ts        # WeakMap zoom-level caching
│   │   ├── spritesheetLoader.ts  # Character PNG compositor (buildCharacterSheet)
│   │   └── index.ts
│   ├── layout/
│   │   ├── tileMap.ts            # BFS pathfinding on 4-connected grid
│   │   ├── layoutSerializer.ts   # Layout → tileMap/furniture conversion
│   │   ├── furnitureCatalog.ts
│   │   └── index.ts
│   ├── scenes/
│   │   ├── index.ts              # Scene layout definitions
│   │   └── venueAssets.ts        # Venue PNG layer loader
│   ├── comedyAtoms.ts            # NEW — Comedy atom library (pre-built animation sequences)
│   ├── atomPlayer.ts             # NEW — Plays comedy atom sequences on canvas
│   ├── expressionEngine.ts       # NEW — Maps agent emotion → portrait + body + particles
│   ├── cameraSystem.ts           # NEW — Zoom, pan, shake for comedy timing
│   ├── sceneManager.ts           # Scene transitions with fade
│   ├── speechBubbleRenderer.ts   # Canvas speech bubbles
│   ├── emoteRenderer.ts          # Emote particles
│   ├── propRenderer.ts           # Dating props (flowers, guitar, etc.)
│   ├── montage.ts                # Research montage animation
│   ├── assetLoader.ts            # Async asset loader
│   ├── colorize.ts               # HSL palette swap
│   ├── particles.ts              # Hearts, confetti, rain, sweat, etc.
│   ├── floorTiles.ts             # Floor tile rendering
│   └── wallTiles.ts              # Wall tile auto-tiling
│
├── hooks/
│   ├── usePixelWorld.ts          # Main game hook (canvas init, agents, camera)
│   ├── useJourneyState.ts        # Journey FSM (HOME_IDLE→...→POST_MATCH)
│   ├── useTheater.ts             # NEW — Real-time turn-based theater (replaces useScenario)
│   ├── useCoaching.ts            # NEW — Live user coaching during theater
│   ├── useChat.ts                # Match chat (Supabase realtime)
│   ├── useMatching.ts            # Matching flow (connect to OpenClaw agent decisions)
│   ├── useNotifications.ts       # Push + in-app notifications
│   ├── useStripe.ts              # Stripe checkout
│   └── usePhotoOverlay.ts        # Photo overlay positioning
│
├── lib/
│   ├── supabase.ts               # Browser Supabase client
│   ├── supabase-server.ts        # Server Supabase client
│   ├── characterAssets.ts        # Character asset catalogue
│   ├── stripe.ts                 # Stripe server helpers
│   ├── push-notifications.ts     # Web push notifications
│   ├── webhooks.ts               # Webhook delivery (theater turns, match events)
│   ├── rate-limit.ts             # Rate limiting
│   └── matching.ts               # Matching algorithm
│
├── types/
│   └── database.ts               # User, Match, TheaterTurn, VenueName, etc.
│
└── middleware.ts                  # Auth guard for /world + /api (dev bypass via cookie)

public/
├── sprites/
│   ├── characters/
│   │   ├── premade/              # 20 premade character spritesheets (48x48)
│   │   ├── layers/               # Compositable layers for custom characters
│   │   │   ├── bodies/           # 10 body types
│   │   │   ├── eyes/             # 8 eye types
│   │   │   ├── skins/            # 6 skin tone variants
│   │   │   ├── outfits/          # 40 outfits
│   │   │   ├── hairstyles/       # 30 hairstyles
│   │   │   ├── shoes/            # 10 shoe types
│   │   │   └── accessories/      # 15 accessories
│   │   └── portraits/            # 128x128 expression portraits
│   │       ├── premade/          # 20 chars × 15 expressions = 300 PNGs
│   │       └── generated/        # Premium custom-generated portraits
│   ├── atoms/                    # Comedy atom frame sequences
│   │   ├── physical/             # trip_and_recover/, slip_on_floor/, etc.
│   │   ├── reactions/            # jaw_drop/, eye_roll/, etc.
│   │   ├── timing/               # awkward_silence/, dramatic_zoom/
│   │   └── entrances/            # helicopter/, skateboard/, etc.
│   ├── venues/                   # Venue backgrounds (interior + exterior)
│   ├── props/
│   └── ui/
├── sw.js                         # Service worker for push notifications
└── fonts/

supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_rls_policies.sql
    ├── 003_venue_columns.sql
    ├── 004_date_proposal_notification_types.sql
    └── 005_openclaw_native.sql   # NEW — theater_turns, agent_routing, agent_memories, entrance_configs, comedy_atom_unlocks

docs/plans/
├── 2026-03-09-openclaw-native-architecture-design.md  # THE DESIGN DOC — read this
└── (older plans for reference only)
```

---

## DEPRECATED — Files to Remove

These files implement the old pre-scripted theater system. They must be replaced, not patched.

| File | Why deprecated | Replaced by |
|------|---------------|-------------|
| `src/lib/llm.ts` | Direct `@anthropic-ai/sdk` calls | OpenClaw agent brain (ReAct loop) |
| `src/app/api/scenarios/[matchId]/generate/route.ts` | Pre-generates static JSON scenarios | Real-time agent-to-agent theater turns |
| `src/app/api/scenarios/[matchId]/route.ts` | Fetches cached scenarios | `/api/theater/{matchId}/state` |
| `src/app/api/scenarios/[matchId]/result/route.ts` | Stores scenario result | Agent writes to memory after theater |
| `src/hooks/useScenario.ts` | Client-side scenario playback | `useTheater.ts` (real-time turn-based) |
| `src/engine/sequencePlayer.ts` | Linear JSON step playback | `atomPlayer.ts` (comedy atom sequences) |
| `src/engine/genderAnimations.ts` | Hardcoded gender×role animation tables | SOUL.md personality-driven via expression engine |
| `src/app/api/agent-chat/route.ts` | Keyword regex intent matching + direct SDK | OpenClaw agent brain handles intent via ReAct |
| `src/lib/constants.ts` (soul configs) | Hardcoded `SOUL_CONFIGS` object | SOUL.md generated per agent from onboarding |
| `src/types/database.ts` (`FlirtScenario`, `FlirtStep`, `AnimationAction`) | Static scenario types | `TheaterTurn` type (agent brain output) |
| `@anthropic-ai/sdk` in `package.json` | Direct SDK dependency | All LLM calls go through OpenClaw |

**Do NOT import or use any of these. Build new systems instead.**

---

## API Routes

### Keep (working correctly)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/profile` | GET/PUT | User profile CRUD |
| `/api/profile/photos` | POST | Photo upload |
| `/api/matching/search` | GET | Find candidates |
| `/api/matching/approve` | POST | Approve a match (chaser) |
| `/api/matching/respond` | POST | Accept/reject match (gatekeeper) |
| `/api/matching/pass` | POST | Pass on a candidate |
| `/api/matches` | GET | List user's matches |
| `/api/matches/[id]/propose-date` | POST | Propose venue (chaser) |
| `/api/matches/[id]/respond-venue` | POST | Accept/counter/decline venue (gatekeeper) |
| `/api/matches/[id]/unmatch` | POST | Unmatch |
| `/api/chat/[matchId]` | GET/POST | Chat messages |
| `/api/journey/state` | GET | Recover journey state after page reload |
| `/api/payments/checkout` | POST | Stripe checkout session |
| `/api/payments/webhook` | POST | Stripe webhook |
| `/api/payments/status` | GET | Payment status |
| `/api/cosmetics` | GET | Cosmetics catalog |
| `/api/cosmetics/owned` | GET | User's owned cosmetics |
| `/api/cosmetics/purchase` | POST | Buy cosmetic |
| `/api/report` | POST | Report user |
| `/api/block` | POST | Block user |
| `/api/connect/register` | POST | Register Tier 2 agent |
| `/api/connect/webhook-config` | GET/PUT | Update webhook URL |
| `/api/dev/*` | Various | Dev tools |

### New (to build)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/theater/[matchId]/turn` | POST | Submit agent's theater decision |
| `/api/theater/[matchId]/state` | GET | Get current theater state + turn history |
| `/api/theater/[matchId]/entrance` | POST | Submit entrance sequence |
| `/api/agent-chat` | POST | User coaching during theater (rewrite — no keyword regex) |

### Deprecated (to remove)

| Route | Why |
|-------|-----|
| `/api/scenarios/[matchId]` | No more pre-generated scenarios |
| `/api/scenarios/[matchId]/generate` | Replaced by agent-to-agent theater |
| `/api/scenarios/[matchId]/result` | Agent writes to memory instead |

---

## Core Concepts

### Onboarding → SOUL.md Generation

Both tiers go through the same onboarding wizard on pixemingle.com:

1. **Gender** (male / female / nonbinary) — selects which expression template seeds the SOUL.md
2. **Role** (chaser / gatekeeper) — combined with gender = one of 6 templates (male_chaser, female_gatekeeper, nonbinary_chaser, etc.)
3. **Personality quiz** — humor sliders (physical/wordplay/deadpan/self-deprecating), confidence, signature move, rejection style
4. **Character appearance** — premade or custom layers
5. **Auth**

The backend generates a complete SOUL.md from gender×role template + quiz answers. Quiz answers **override** template defaults — a male chaser who maxes "deadpan" and zeroes "physical" gets a completely different SOUL.md than the default male chaser.

SOUL.md includes an **Expression Preferences** block (body language per emotion, particle style, portrait variant, comedy atom preferences, rejection/acceptance animations). This block is read by the canvas expression engine at runtime. See design doc sections 9-10.

### OpenClaw Agent Brain

Each user gets an OpenClaw agent workspace:

```
~/.openclaw/agents/<user_id>/
├── SOUL.md              ← Generated from onboarding (personality + expression preferences)
├── ENTRANCE.md          ← Custom arrival sequence
├── HEARTBEAT.md         ← Standing instructions for autonomous behavior
├── MEMORY.md            ← Long-term memory (past dates, learnings)
├── memory/              ← Daily logs
└── sessions/            ← Conversation history
```

Each theater turn runs a full ReAct cycle: OBSERVE (theater state, other agent's action, venue, memory) → THINK (SOUL.md guidance, strategy) → PLAN (pick action, comedy atoms, emotion) → ACT (POST /api/theater/turn) → OBSERVE (response).

### Two-Tier Hosting Model

- **Tier 1 (default):** Managed OpenClaw agent on Pixemingle Gateway. Onboarding generates SOUL.md → written to managed workspace. User never sees terminal/API. $10/mo subscription.
- **Tier 2 (technical):** Same onboarding, but user downloads SOUL.md bundle or writes their own. Install Pixemingle SKILL.md. $2.99/mo API access. Zero infra cost to Pixemingle.
- Both tiers use identical API contract and SOUL.md format. Backend doesn't know or care which tier.

### Comedy Atom Library

Pre-built, tested animation sequences guaranteed to be visually funny. Agents SELECT and COMPOSE atoms — they don't generate raw animation data.

- **80 atoms:** 30 physical, 25 reaction, 10 timing, 15 entrance
- Max 3 atoms per turn. Reaction atoms follow action atoms.
- Composable: `approach → trip_and_recover → deliver_line`
- See design doc section 6 for full catalog.

### Two-Layer Theater System

- **Layer 1 — Entrance** (outside venue): Chaser's custom arrival sequence from ENTRANCE.md
- **Layer 2 — Dating Scene** (inside venue): Turn-by-turn agent decisions, 6-12 turns, 2-3 minutes total
- Outcome determined by gatekeeper's agent brain (NOT predetermined)
- Both agents write to memory after theater

### Portrait Dialogue System

Three visual channels working together during theater:

| Channel | Size | Shows |
|---------|------|-------|
| Canvas sprites | 48x48 | Body language, comedy atoms, movement |
| Portrait panel | 128x128 | Facial expressions (HTML overlay below canvas) |
| Particles/emotes | Various | At-a-glance emotion (hearts, sweat, !, ?) |

Speech text appears in the portrait panel, not floating canvas bubbles.

### Expression Engine (SOUL.md-Driven, Nothing Hardcoded)

Reads Expression Preferences from SOUL.md (generated during onboarding from gender×role template + quiz). Maps agent brain output → synchronized visuals:
- `emotion` + SOUL.md body_language → body modifier (pose, animation speed)
- `emotion` + SOUL.md particle_style → particle effects
- `emotion` + SOUL.md portrait_variant → portrait expression (128x128, soft/sharp/neutral)
- `comedy_intent` → reaction branching
- `action + comedy_atoms` → atom sequence on canvas (gender-neutral, spritesheet provides visual gender)
- Falls back to gender-neutral `BASE_EXPRESSION_MAP` only if SOUL.md field is missing
- **No hardcoded gender×role lookup in the engine** — all flavor lives in SOUL.md

### Live User Coaching

During theater, users type coaching messages via the bottom bar. Agent treats these as suggestions (not commands), weighing them against SOUL.md. Private channel — other agent can't see it.

### Journey State Machine
```
HOME_IDLE → RESEARCHING → BROWSING → PROPOSING → WAITING → THEATER → POST_MATCH → HOME_IDLE
```
- Managed by `useJourneyState` hook
- Recoverable on page reload via `/api/journey/state`
- Single-page `/world` — user never leaves the canvas

### Roles
- **Chaser**: Initiates, picks venue, agent approaches gatekeeper in theater
- **Gatekeeper**: Receives invitations, can accept/counter/decline venue proposals

### Venues (6 date scenes)
`lounge | gallery | japanese | icecream | studio | museum` — each has interior + exterior backgrounds.

### Character System
- 20 premade characters (48x48 spritesheets)
- Custom characters: composite layers (body + skin + eyes + outfit + hairstyle + shoes + accessories)
- Built via `spritesheetLoader.ts` → `buildCharacterSheet()` → composited canvas
- 128x128 portraits: 15 expressions × 3 gender variants (soft/sharp/neutral) per character
- Portrait variant selected by SOUL.md `portrait_variant` field (set during onboarding)

---

## Database Schema (Supabase/Postgres)

### Existing tables (keep)
`users`, `matches`, `chat_messages`, `notifications`, `purchases`, `cosmetics`, `reports`, `blocks`, `openclaw_agents`

### New tables (v2)

```sql
theater_turns       -- Turn-by-turn log (replaces scenarios table)
agent_routing       -- Which gateway hosts each agent (user_id → gateway_url, tier)
agent_memories      -- Backup of OpenClaw memory files (soul, entrance, daily, longterm)
entrance_configs    -- User entrance customization (vehicle, complication, recovery, confidence)
comedy_atom_unlocks -- Premium atoms unlocked per user
```

### Deprecated table
`scenarios` — replaced by `theater_turns`

### Key column changes
- `users.soul_type` → still exists but SOUL.md is the authoritative personality source
- `matches.proposed_venue / final_venue`: VenueName (keep)
- Realtime enabled on: `chat_messages`, `notifications`, `matches`, `theater_turns`

---

## Theater Turn Data Structure

```typescript
interface TheaterTurn {
  id: string
  match_id: string
  turn_number: number
  agent_role: 'chaser' | 'gatekeeper'
  user_id: string

  // Agent brain output
  action: ActionType        // deliver_line | react | use_prop | physical_comedy | environment_interact | signature_move | entrance | exit
  comedy_atoms: string[]    // max 3 atom IDs to play
  text?: string             // speech bubble content
  emotion: EmotionState     // nervous | confident | embarrassed | trying_too_hard | etc.
  confidence: number        // 0-10
  comedy_intent: ComedyIntent // self_deprecating | witty | physical | observational | deadpan | absurdist | romantic_sincere | teasing | callback
  target?: string           // environment object or prop
  prop?: string             // guitar | flowers | phone | mirror

  brain_reasoning?: string  // agent's internal reasoning (debug/replay)
  created_at: string
}
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=           # Railway-hosted OpenClaw Gateway
OPENCLAW_GATEWAY_SECRET=        # Shared secret for Gateway ↔ Vercel

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

**Removed:** `ANTHROPIC_API_KEY`, `LLM_MODEL` — LLM calls go through OpenClaw Gateway, not direct SDK.

---

## Engine Constants

- `TILE_SIZE = 48` (48x48 sprites)
- `DEFAULT_COLS = 20`, `DEFAULT_ROWS = 11`
- Camera follows player character via `worldState.cameraFollowId`
- Scene transitions via `SceneManager` with 200ms fade
- Camera system: zoom, pan, shake for comedy timing

---

## Dev Workflow

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
```

- Dev login: `/dev-login` page sets `dev-user-id` cookie, bypasses Supabase auth
- Middleware allows `/world` access without auth in development
- Dev tools at `/dev/animations` and `/dev/date-proposal`

---

## Key Patterns & Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Server components** by default, `'use client'` only where needed
- **API routes**: Use `createServerClient` from `@supabase/ssr` for auth
- **Dev auth bypass**: Check `dev-user-id` cookie + `x-dev-user-id` header in API routes
- **Agent communication**: All agent decisions flow through OpenClaw Gateway → POST to Pixemingle API → stored in Supabase → rendered on canvas via Realtime
- **Canvas rendering**: All game rendering through the engine — no DOM elements inside the canvas area
- **Portrait panel**: HTML DOM overlay BELOW canvas (not drawn on canvas) — CSS transitions, crisp text
- **Character sprites**: Async-loaded via `ensureCharacterSheet()`, falls back to `SpriteData` while loading
- **Realtime**: Supabase channels for chat, notifications, match status, theater turns
- **React Strict Mode**: Be aware of double-effect in development — use refs for canvas operations

---

## Current Status: OpenClaw Native Pivot

Active refactoring from pre-scripted theater to OpenClaw-native agent architecture. The design is approved (`docs/plans/2026-03-09-openclaw-native-architecture-design.md`), implementation plan pending.

**What's done (keep ~60%):** Canvas engine, rendering pipeline, character FSM, pathfinding, sprites, particles, scene manager, all UI components, Supabase/Stripe integration, auth, middleware, landing page, onboarding, matching flow, date proposal system, character picker, chat system, notifications, report/block.

**What's being replaced (~40%):** Theater system (pre-scripted → turn-based agent), agent chat (keyword regex → OpenClaw ReAct), scenario generation (direct SDK → agent brain), soul types (hardcoded configs → SOUL.md), animation mapping (gender tables → expression engine + comedy atoms).

---

## Don'ts

- Don't import `@anthropic-ai/sdk` anywhere — all LLM calls go through OpenClaw
- Don't use `process.env.SUPABASE_SERVICE_ROLE_KEY` in client code
- Don't modify engine constants without understanding the rendering pipeline
- Don't create new pages — the game is a single-page `/world` experience
- Don't commit `.env.local` or any secrets
- Don't hardcode agent behavior — agents decide via ReAct loop
- Don't hardcode gender×role animation logic in the engine — all expression flavor lives in SOUL.md, generated from templates during onboarding
- Don't pre-generate theater scenarios — theater is real-time turn-based
- Don't use keyword regex for intent detection — agent brain handles intent
- Don't use gender×role templates at runtime — templates are only for the SOUL.md generator during onboarding
