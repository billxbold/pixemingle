# Pixemingle Design Document

**Date:** March 6, 2026
**Launch:** Monday, March 9, 2026
**Status:** Approved

---

## Summary

AI-powered social platform where pixel art agents flirt on behalf of users. Entertainment-first dating — comedy is the product, connection is the byproduct. Built by extracting pixel-agents (MIT) canvas engine into a Next.js app with Supabase backend.

---

## Locked-In Decisions

1. Extract pixel-agents engine, strip VS Code/office, keep rendering/FSM/pathfinding/sprites/colorization
2. Modern Interiors by LimeZu (free 16x16 tileset) for dating-themed scenes
3. Real photos in pixel frames — hybrid Canvas + DOM overlay with absolute positioning
4. Full Stripe Day 1 — 3 subscription tiers + microtransaction cosmetics
5. Real-time theater sync — both users watch simultaneously via Supabase Realtime channels
6. All 15 animation states — new sprite frames drawn for MVP
7. Web only, mobile-responsive — no Telegram for Monday
8. Public shareable theater replays — photos blurred for unauthenticated viewers
9. Lightweight OpenClaw API — register + webhook notifications with theater replay URLs
10. Chaser client drives theater timing, gatekeeper follows via Realtime broadcasts

---

## Stack

| Layer | Technology |
|-------|-----------|
| Full Stack | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase (Postgres + Auth + Storage + Realtime) |
| Styling | Tailwind CSS |
| Animation Engine | HTML5 Canvas API (extracted from pixel-agents) |
| LLM | Anthropic Claude API (claude-sonnet-4-20250514) |
| Payments | Stripe (subscriptions + microtransactions) |
| Hosting | Vercel (single deploy) |
| Real-time | Supabase Realtime channels |
| Tilesets | Modern Interiors by LimeZu (free, 16x16) |

---

## Engine Extraction Plan

### Keep from pixel-agents (webview-ui/src/office/)

- `engine/gameLoop.ts` — requestAnimationFrame loop, delta-time accumulation
- `engine/renderer.ts` — tile/furniture/character rendering, z-sorting (strip editor functions)
- `engine/characters.ts` — FSM, pathfinding integration, wander behavior
- `engine/officeState.ts` — central state manager (rename to WorldState)
- `sprites/spriteCache.ts` — WeakMap zoom-level caching
- `sprites/spriteData.ts` — palette system, character templates, hue shifting
- `colorize.ts` — HSL palette swap
- `layout/tileMap.ts` — BFS pathfinding on 4-connected grid
- `layout/layoutSerializer.ts` — layout to tileMap/furniture/seats conversion
- `layout/furnitureCatalog.ts` — furniture catalog
- `floorTiles.ts`, `wallTiles.ts` — tile rendering, auto-tiling
- `types.ts`, `constants.ts`

### Strip

- All VS Code extension code (src/ root)
- Editor mode in OfficeCanvas (isEditMode, editor props/handlers)
- `vscode.postMessage()` (1 location, replace with callback)
- Subagent tracking (isSubagent, parentAgentId)
- Tool-based state changes (JSONL transcript monitoring)

### Add

- 6 new FSM states: APPROACH, DELIVER_LINE, REACT_EMOTION, USE_PROP, CELEBRATE, DESPAIR
- `sequencePlayer.ts` — drives FlirtScenario JSON step-by-step
- `sceneManager.ts` — 6 scenes with fade transitions
- `photoOverlay.ts` — DOM img elements positioned at world coordinates
- `speechBubble.ts` — enhanced bubbles with LLM text
- `particles.ts` — hearts, confetti, rain, sweat, lightbulb, star, music_note
- Dating prop sprites in furniture catalog
- LimeZu tileset integration for scene backgrounds

---

## Scenes

| Scene | Grid | Key Props | Purpose |
|-------|------|-----------|---------|
| Bedroom | 8x6 | Bed, wardrobe, mirror, door | Spawn point, settings |
| Research Office | 10x8 | Desk, laptop, papers, coffee | Matching animation |
| Gallery Wall | 12x8 | Photo frame positions (DOM overlay) | Candidate browsing |
| Flirt Stage | 14x10 | Open area, entrance points, prop zones | Theater |
| Cafe | 10x8 | Table, two chairs, ambient items | Post-match chat |
| Park | 12x8 | Bench, trees, flowers | Alternative post-match |

---

## Real-Time Theater Sync

```
User A approves, User B approves -> match status = "active"
Both clients subscribe to Supabase channel: match:{match_id}
Server generates FlirtScenario JSON -> broadcasts scenario_ready
Chaser client drives step advancement -> broadcasts step transitions
Gatekeeper client follows chaser's step broadcasts (~50-100ms latency)
At pixel art frame rates, latency is imperceptible
```

Public replay: `/theater/[match_id]` — same engine, read-only, blurred photos, watermark.

---

## Component Architecture

```
<App>
  <AuthProvider>
  <AppStateProvider>
    <Landing />
    <Onboarding />
    <PixelWorld>
      <Canvas />
      <PhotoOverlay />
      <SpeechBubbles />
      <Watermark />
      <NotificationPixel />
      <ProfilePanel />
      <ChatPanel />
      <TheaterControls />
      <RateLimitOverlay />
      <ReportBlockModal />
    </PixelWorld>
    <TheaterReplay />
  </AppStateProvider>
  </AuthProvider>
</App>
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| usePixelWorld | Canvas lifecycle, scene state, game loop |
| useScenario | Fetch/play scenarios, step advancement, Realtime sync |
| useChat | Supabase Realtime chat subscription |
| useMatching | Search, browse candidates, approve/pass |
| useNotifications | Incoming match requests, theater ready events |
| usePhotoOverlay | Camera pan/zoom tracking, DOM photo repositioning |
| useStripe | Checkout sessions, tier status, purchases |

---

## Database Schema

### Core Tables

- `users` — profile, appearance, soul, role, tier, stripe_customer_id
- `matches` — user_a, user_b, status (pending_a/pending_b/active/rejected/expired/unmatched), score, reasons, scenario_cache
- `scenarios` — match_id, attempt_number, scenario_data JSONB, result
- `chat_messages` — match_id, sender_id, content, created_at
- `purchases` — user_id, item_type, item_id, amount, stripe_payment_id
- `cosmetics` — id, category, name, price, tier_required, sprite_data
- `notifications` — user_id, type, data JSONB, read, created_at
- `reports` — reporter_id, reported_id, reason, details, status
- `blocks` — blocker_id, blocked_id (UNIQUE)
- `openclaw_agents` — user_id, webhook_url, api_key (hashed)

### Security

- Supabase RLS on all tables
- JWT session cookies
- API middleware checks auth (except /connect/* and /payments/webhook)
- OpenClaw auth via API key in Bearer header
- Rate limits per tier (server-side)
- Block filtering on all matching queries
- Stripe webhook signature verification
- LLM output validated against FlirtScenario schema

---

## Animation System

### 15 Animation States

| State | Frames | Notes |
|-------|--------|-------|
| idle_standing | 2 | Keep from pixel-agents |
| nervous_walk | 4x4 dir | Slower walk + sweat particle |
| confident_walk | 4x4 dir | Faster walk, wider stride |
| walk_away | 4x4 dir | Reuse walk, flip direction |
| pickup_line | 2 | Idle pose + speech bubble |
| eye_roll | 2 | Head tilt variant |
| phone_check | 2 | Arm-to-face pose |
| blush_impressed | 2 | Color tint + heart particle |
| sad_slump | 3 | Slouched + rain cloud |
| angry_kick | 3 | Leg-forward frames |
| flower_offer | 2 | Arm extended + flower prop |
| flower_accept | 2 | Receive pose |
| victory_dance | 3 | Jump + confetti |
| walk_together | 4 | Side-by-side synced walk |
| thinking | 2 | Chin tap + thought bubble |
| soul_ghost_escape | 4 | Semi-transparent float up |

### Particle Types

hearts, confetti, rain, sweat, lightbulb, star, music_note — 2-3 frame loops, simple physics.

### sequencePlayer Flow

```
For each FlirtStep in scenario:
  1. Set character state + direction
  2. Pathfind to target tile if movement needed
  3. Transition to action state on arrival
  4. Show speech bubble if step.text exists
  5. Spawn particles for step.emotion
  6. Hold for step.duration_ms
  7. Broadcast step completion via Realtime
  8. Advance to next step
```

---

## API Routes

```
POST   /api/auth/callback
GET    /api/profile
PUT    /api/profile
POST   /api/profile/photos
POST   /api/matching/search
GET    /api/matching/candidates
POST   /api/matching/approve
POST   /api/matching/pass
POST   /api/matching/respond
GET    /api/scenarios/[matchId]
POST   /api/scenarios/[matchId]/generate
POST   /api/scenarios/[matchId]/result
GET    /api/matches
POST   /api/matches/[id]/unmatch
GET    /api/chat/[matchId]
POST   /api/chat/[matchId]
POST   /api/report
POST   /api/block
POST   /api/payments/checkout
POST   /api/payments/webhook
GET    /api/payments/status
POST   /api/connect/register
PUT    /api/connect/webhook-config
GET    /api/cosmetics
POST   /api/cosmetics/purchase
GET    /api/cosmetics/owned
```

---

## OpenClaw Integration

- `POST /api/connect/register` — agent registers with profile data
- `PUT /api/connect/webhook-config` — set webhook URL
- Server sends webhook on match events with theater replay URLs
- Public `/theater/[match_id]` page — photos blurred, watermark visible
- Same match pool as hosted users

---

## Build Schedule

### Day 1 — Saturday (14-16h)

1. Project scaffold + Supabase setup (1.5h)
2. Extract pixel-agents engine (2.5h)
3. LimeZu tileset integration + 6 scene layouts (1.5h)
4. Scene manager + transitions (1.5h)
5. Character Creator component (2h)
6. Onboarding wizard — all 9 steps (2.5h)
7. Auth — Google + email (1h)
8. Deploy to Vercel (0.5h)

### Day 2 — Sunday (14-16h)

1. New animation sprites — 15 states (3h)
2. Particle system + props (1.5h)
3. Matching algorithm + Research montage (2h)
4. Gallery wall + photo overlay (2h)
5. Two-sided approval flow (1h)
6. LLM integration — scenario generation (1.5h)
7. sequencePlayer + Theater + Realtime sync (2.5h)
8. Cafe scene + chat (1.5h)

### Day 3 — Monday (10-12h)

1. Stripe integration — 3 tiers + cosmetics (2h)
2. Public theater replay page (1.5h)
3. OpenClaw connect API (1h)
4. End-to-end flow test + bug fixes (3h)
5. Mobile responsive (1.5h)
6. Landing page (1.5h)
7. Seed 50 demo profiles (0.5h)
8. Report + block flow (0.5h)
9. Browser push notifications (0.5h)

**Total: ~40-44 hours. Critical path: Day 2 (animations + theater + LLM).**
