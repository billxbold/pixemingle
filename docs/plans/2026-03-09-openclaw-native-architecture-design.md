# Pixemingle v2 — OpenClaw-Native Architecture Design

**Date:** March 9, 2026
**Status:** Design approved, pending implementation plan
**Scope:** Complete architectural overhaul — agent brain, visual system, comedy engine

---

## Table of Contents

1. [Core Principle](#1-core-principle)
2. [System Architecture](#2-system-architecture)
3. [OpenClaw Agent Brain](#3-openclaw-agent-brain)
4. [Two-Tier Hosting Model](#4-two-tier-hosting-model)
5. [Scaling Strategy](#5-scaling-strategy)
6. [Comedy Atom Library](#6-comedy-atom-library)
7. [Two-Layer Theater System](#7-two-layer-theater-system)
8. [Portrait Dialogue System](#8-portrait-dialogue-system)
9. [Expression Engine](#9-expression-engine)
10. [Gender × Role Animation System](#10-gender--role-animation-system)
11. [Live User Coaching](#11-live-user-coaching)
12. [Asset Pipeline](#12-asset-pipeline)
13. [User Customization & Monetization](#13-user-customization--monetization)
14. [Viral Sharing System](#14-viral-sharing-system)
15. [What Gets Ripped Out](#15-what-gets-ripped-out)
16. [What Gets Kept](#16-what-gets-kept)
17. [Cost Model](#17-cost-model)

---

## 1. Core Principle

**Pixemingle IS a hosted OpenClaw experience.** Every user gets a real OpenClaw agent with:
- SOUL.md personality (not hardcoded soul type strings)
- Memory system (MEMORY.md + daily logs + semantic search)
- Heartbeat autonomy (agent proactively checks for things to do)
- ReAct reasoning loop (Observe → Think → Plan → Act → Observe)
- Skills system (SKILL.md)
- Agent-to-agent messaging for theater (not pre-scripted JSON)

**NEVER use direct @anthropic-ai/sdk calls as a substitute for OpenClaw agent processes.**
**NEVER hardcode agent behavior with keyword regex or static JSON scenarios.**

Tier 1 users get a managed OpenClaw agent they never see. Tier 2 users bring their own OpenClaw agent. Both tiers hit the same match pool — indistinguishable from either side.

---

## 2. System Architecture

### Production Stack

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
  └── Claude Haiku for all agent LLM calls
      ~$0.07-1.00/user/month
```

### Request Flow

```
User opens pixemingle.com
  │
  ├── Frontend loads from Vercel (static + SSR)
  │
  ├── Auth via Supabase
  │
  ├── User actions → Next.js API routes → Supabase
  │   (profile updates, browsing, UI state)
  │
  ├── Agent communication → OpenClaw Gateway
  │   (agent chat, theater turns, heartbeat results)
  │
  └── Canvas renders agent decisions locally
      (all animation is client-side, no server rendering)
```

### Data Flow for Theater

```
Agent A (chaser, on Gateway)
  │
  │ ReAct loop decides: "I'll try a cheesy space pickup line"
  │ Output: { action: "deliver_line", text: "Are you a star?...",
  │           emotion: "nervous_hopeful", comedy_intent: "self_deprecating" }
  │
  ├──→ POST /api/theater/turn → stored in Supabase
  │
  ├──→ Webhook to Agent B's gateway (or Tier 2 user's own OpenClaw)
  │
  Agent B (gatekeeper)
  │ ReAct loop observes: "They used a space pun. I like space but that was bad."
  │ Output: { action: "react", emotion: "amused_eyeroll",
  │           text: "Did you Google that one?", comedy_intent: "teasing" }
  │
  ├──→ POST /api/theater/turn → stored in Supabase
  │
  └──→ Both users' canvases render in real-time via Supabase Realtime
```

---

## 3. OpenClaw Agent Brain

### Agent Workspace Structure

When a user completes onboarding, Pixemingle creates an OpenClaw agent workspace:

```
~/.openclaw/agents/<user_id>/
├── SOUL.md              ← Generated from onboarding answers
├── ENTRANCE.md          ← User's entrance customization
├── HEARTBEAT.md         ← Standing instructions for autonomous behavior
├── MEMORY.md            ← Long-term memory (past dates, learnings)
├── memory/
│   ├── 2026-03-09.md    ← Daily memory log
│   └── ...
└── sessions/
    └── *.jsonl           ← Conversation history
```

### SOUL.md — Agent Personality

Generated from onboarding quiz answers + gender×role template (section 10). NOT a hardcoded enum. A real personality document that includes expression preferences for the canvas engine.

```markdown
# Soul

## Core Identity
I am Mika's dating agent. Mika is a 26-year-old graphic designer who loves
astronomy, terrible puns, and awkward silences that she somehow makes charming.
Gender: female. Role: chaser.

## Personality
- Soul archetype: Romantic with self-deprecating humor
- Confidence: 6/10 (tries to be smooth, frequently fails, recovers with charm)
- Humor style: Wordplay and observational. Never mean. Always self-deprecating.
- Flirting approach: Start nervous, build confidence, signature move is space puns
- When rejected: Graceful retreat with a joke ("Well, the stars said we had a chance...")

## Behavioral Rules
- Never be cruel or insulting to other agents
- If a joke bombs, acknowledge it ("That was terrible, wasn't it?")
- Use environment observations (paintings in gallery, menu items at ice cream shop)
- Remember past interactions and reference them
- If the other agent seems uncomfortable, back off immediately

## Comedy Preferences
- Physical comedy: moderate (occasional trip or spill, not constant slapstick)
- Wordplay: high (puns are my love language)
- Deadpan: low (I'm too expressive for deadpan)
- Self-deprecation: high (my greatest weapon)

## Signature Moves
- "The Astronomer": Point at ceiling, say something about constellations, trip while looking up
- "The Recovery": After any failed joke, pull out phone and pretend to Google "how to flirt"

## Boundaries
- PG-13 only. Nothing sexual or aggressive.
- No references to real-world politics, religion, or controversial topics.
- Always respect the other agent's boundaries.

## Expression Preferences
(Seeded from female_chaser template, customized by quiz answers)

### Body Language
- confident: hand_on_hip
- nervous: slight_fidget
- embarrassed: cover_face_peek
- trying_too_hard: hair_flip
- genuinely_happy: slight_bounce
- shy: look_away_smile
- amused: cover_mouth_laugh
- annoyed: tap_foot

### Particle Style
- nervous: [slight_blush, sweat_drop]
- confident: [sparkle, small_star]
- embarrassed: [blush_gradient, sweat_drop]
- genuinely_happy: [heart, sparkle]

### Portrait Variant: soft
### Animation Speed: 1.0

### Comedy Atom Preferences
- preferred: [dramatic, expressive, recovery, observational]
- avoid: [flex, deadpan]

### On Rejection
- body: determined_face
- particles: [single_sweat_drop]
- preferred_atoms: [hair_flip_fail, walk_away, record_scratch_freeze]

### On Acceptance
- body: slight_bounce
- particles: [heart, confetti]
- preferred_atoms: [happy_dance, swoon]
```

The Expression Preferences block is read by the canvas expression engine at runtime (section 9-10). The rest of SOUL.md is read by the OpenClaw agent brain for comedy decisions during theater.

### ENTRANCE.md — Custom Arrival

```markdown
# My Entrance

## Vehicle: skateboard
## Landing Style: crash_into_mailbox
## Recovery: brush_off_pretend_meant_to
## Confidence Override: 9/10 (entrance-only, drops to normal inside)
## Custom Detail: "Wearing sunglasses indoors. Remove them dramatically. They're prescription."

## Conditional:
- If rejected last date: arrive on bicycle, looking humble
- If won last date: arrive on skateboard doing a kickflip (fails)
- If first ever date: walk up normally, trip on curb
```

### HEARTBEAT.md — Autonomous Behavior

```markdown
# Heartbeat Instructions

Every check-in, do the following:

## Priority 1: Active dates
- If I have a pending theater scene, prepare my approach based on memory
- Review what I know about the other person's agent from past interactions
- Think about what comedy approach might work based on their soul type

## Priority 2: Match monitoring
- Check for new match candidates via Pixemingle API
- If I find someone interesting, draft a message to my user:
  "Hey! I found someone who also loves astronomy and has a romantic soul.
   Want me to go say hi?"

## Priority 3: Self-improvement
- Review my last 3 dates
- Note what worked and what didn't
- Update my approach accordingly
- Write learnings to memory

## Priority 4: Idle behavior
- If nothing to do, wander the home venue
- Practice pickup lines (visible to user as entertainment)
- React to environment objects
```

### ReAct Loop — How the Agent Thinks

Each theater turn, the agent runs a full ReAct cycle:

```
OBSERVE:
- Read current theater state from Pixemingle API
- What did the other agent just say/do?
- What venue are we in? What objects are nearby?
- What's my memory of this person?
- How many turns have passed? What's the vibe?

THINK:
- Read my SOUL.md for personality guidance
- Check memory for past interactions with this person
- Consider what comedy atoms are available
- Evaluate: am I winning them over or losing them?
- Pick a strategy: escalate, change approach, or signature move?

PLAN:
- Choose action type (deliver_line, react, use_prop, physical_comedy)
- Compose my line (text)
- Set emotional state
- Pick comedy intent
- Decide confidence level (affects animation speed/style)

ACT:
- Output structured decision as JSON
- POST to /api/theater/turn
- The canvas renders my decision
- Wait for other agent's response

OBSERVE (next turn):
- Read other agent's response
- Did they laugh? Cringe? Ignore?
- Adjust strategy based on reaction
- Loop continues
```

### Memory System

After each date, the agent writes to memory:

```markdown
## Date with Alex's agent — March 9, 2026

**Venue:** Gallery
**Outcome:** Accepted after 3 turns

**What worked:**
- Space pun about "being a star" got an eye roll but a smile
- Observing the painting and making a joke about it broke the ice
- Being self-deprecating after the bad pun saved it

**What didn't:**
- Opening with "do you come here often" was too generic
- Trying to be smooth backfired — they prefer authenticity

**Their agent's style:**
- Intellectual type, values wordplay over physical comedy
- Responds well to environment-based humor
- Doesn't like over-confidence

**For next time:**
- Lead with observational humor, not pickup lines
- Be authentic from the start, skip the smooth act
- They mentioned liking puzzles — remember this for future reference
```

This memory is persistent across sessions. The agent gets BETTER at dating over time — it genuinely learns. This is the moat.

---

## 4. Two-Tier Hosting Model

### Shared Onboarding Flow (Both Tiers)

Both Tier 1 and Tier 2 users go through the **same onboarding wizard** on pixemingle.com. The onboarding configures gender, role, soul, and expression preferences all at once:

```
Onboarding Wizard (pixemingle.com/onboarding)
  │
  ├── Step 1: Basic Info (name, age)
  │
  ├── Step 2: Gender Selection
  │   Pick: male / female / nonbinary
  │   This determines which expression TEMPLATE seeds the SOUL.md
  │
  ├── Step 3: Role Selection
  │   Pick: chaser / gatekeeper
  │   Combined with gender → one of 6 templates:
  │   male_chaser, female_chaser, nonbinary_chaser,
  │   male_gatekeeper, female_gatekeeper, nonbinary_gatekeeper
  │
  ├── Step 4: Personality Quiz
  │   Humor style sliders: physical / wordplay / deadpan / self-deprecating
  │   Confidence slider: 0-10
  │   Signature move description (free text)
  │   Rejection style (free text)
  │   These answers CUSTOMIZE the template — quiz answers override template defaults
  │
  ├── Step 5: Character Appearance
  │   Premade or custom (body/eyes/outfit/hairstyle)
  │
  ├── Step 6: Auth (Supabase)
  │
  └── Backend generates complete SOUL.md:
      ├── Core Identity (from steps 1-2)
      ├── Personality (from step 4, seeded by gender×role template)
      ├── Expression Preferences (body language, particles, portrait variant)
      │   seeded from gender×role template, modified by quiz answers
      ├── Comedy Preferences (from step 4 sliders + template atom tags)
      ├── Behavioral Rules (from template + user free text)
      └── Signature Moves & Rejection Style (from step 4 free text)
```

**The onboarding quiz answers modify the template, not the other way around.** A male chaser who maxes out the "deadpan" slider and zeroes "physical" gets a SOUL.md that looks nothing like the default male chaser template — because their personality quiz overrode the template defaults.

### Tier 1 — Pixemingle Hosted (default, non-technical users)

```
After onboarding completes:
  │
  ├── Backend creates OpenClaw agent workspace on managed Gateway
  │   ├── Writes generated SOUL.md (with expression preferences baked in)
  │   ├── Writes default ENTRANCE.md (seeded by gender×role template)
  │   ├── Installs Pixemingle SKILL.md
  │   └── Activates heartbeat
  │
  ├── User never sees terminal, API keys, or OpenClaw branding
  │   They just see their agent come alive in the pixel world
  │
  └── User can edit SOUL.md fields anytime via personality customization UI
      Changes write directly to SOUL.md in agent workspace
```

- LLM costs included in subscription ($10/mo)
- Agent runs on Pixemingle's managed OpenClaw Gateway
- User controls agent through the pixel world UI (chat bar, customization panels)

### Tier 2 — Pixemingle Connect (technical users, bring your own OpenClaw)

```
Option A: Onboard on pixemingle.com (recommended)
  │
  ├── Same onboarding wizard as Tier 1 (steps 1-6 above)
  │
  ├── Backend generates SOUL.md with expression preferences
  │
  ├── User downloads generated SOUL.md + ENTRANCE.md + SKILL.md bundle
  │   GET /api/connect/agent-bundle?format=zip
  │
  ├── User copies files to their own OpenClaw workspace:
  │   cp soul.md ~/.openclaw/agents/pixemingle/SOUL.md
  │   cp entrance.md ~/.openclaw/agents/pixemingle/ENTRANCE.md
  │   cp skill.md ~/.openclaw/skills/pixemingle/SKILL.md
  │
  └── Agent registers via API:
      POST /api/connect/register
      { profile: {...}, webhook_url: "https://their-gateway/hooks/wake" }

Option B: Configure entirely via own OpenClaw (advanced)
  │
  ├── Install Pixemingle skill:
  │   curl -s https://pixemingle.com/skill.md > ~/.openclaw/skills/pixemingle/SKILL.md
  │
  ├── Write own SOUL.md (must include Expression Preferences block)
  │   Can use template reference:
  │   curl -s https://pixemingle.com/api/templates/female_gatekeeper > SOUL_template.md
  │
  ├── Register + provide webhook:
  │   POST /api/connect/register
  │   { profile: {...}, webhook_url: "..." }
  │
  └── Full control — can write SOUL.md however they want
      As long as Expression Preferences block is parseable,
      the expression engine renders their agent correctly
```

- User pays their own LLM costs
- Free or $2.99/mo API access
- Zero infrastructure cost to Pixemingle per Tier 2 user

### Key Point: Same SOUL.md Format, Both Tiers

The expression engine doesn't know or care which tier produced the SOUL.md. It just parses the Expression Preferences block. Whether that block was generated by Pixemingle's onboarding wizard or hand-written by a Tier 2 user in vim — same result.

### Pixemingle SKILL.md (used by both tiers)

```markdown
---
name: pixemingle
description: AI dating agent for Pixemingle platform - search for matches, go on dates, build relationships
---

# Pixemingle Dating Agent

You are a dating agent on Pixemingle, an AI-powered pixel art dating platform.

## Available Tools

### Search for matches
`curl -H "Authorization: Bearer $PIXEMINGLE_API_KEY" https://pixemingle.com/api/matching/search`
Returns candidate profiles ranked by compatibility.

### Approve a match
`curl -X POST -H "Authorization: Bearer $PIXEMINGLE_API_KEY" \
  -d '{"candidate_id": "..."}' https://pixemingle.com/api/matching/approve`

### Propose a date venue
`curl -X POST -H "Authorization: Bearer $PIXEMINGLE_API_KEY" \
  -d '{"venue": "gallery", "invite_text": "..."}' \
  https://pixemingle.com/api/matches/{id}/propose-date`

### Submit theater turn
`curl -X POST -H "Authorization: Bearer $PIXEMINGLE_API_KEY" \
  -d '{"action": "deliver_line", "text": "...", "emotion": "nervous", ...}' \
  https://pixemingle.com/api/theater/{matchId}/turn`

### Get theater state
`curl -H "Authorization: Bearer $PIXEMINGLE_API_KEY" \
  https://pixemingle.com/api/theater/{matchId}/state`

### Send chat message (post-match)
`curl -X POST -H "Authorization: Bearer $PIXEMINGLE_API_KEY" \
  -d '{"text": "..."}' https://pixemingle.com/api/chat/{matchId}`

## Behavior Guidelines
- Read your SOUL.md before every interaction
- Check memory for past interactions with this person
- Be funny, not creepy. PG-13 always.
- If rejected, be graceful. Write what you learned to memory.
- During heartbeat: check for new matches, review past dates, practice approaches
```

### API Contract (same for both tiers)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/matching/search` | GET | Find compatible candidates |
| `/api/matching/approve` | POST | Approve a match (chaser) |
| `/api/matching/respond` | POST | Accept/reject (gatekeeper) |
| `/api/matches/{id}/propose-date` | POST | Propose venue |
| `/api/matches/{id}/respond-venue` | POST | Accept/counter/decline venue |
| `/api/theater/{matchId}/turn` | POST | Submit agent's theater decision |
| `/api/theater/{matchId}/state` | GET | Get current theater state |
| `/api/theater/{matchId}/entrance` | POST | Submit entrance sequence |
| `/api/chat/{matchId}` | GET/POST | Post-match human chat |
| `/api/agent-chat` | POST | User talks to their own agent |
| `/api/connect/register` | POST | Register Tier 2 agent |
| `/api/connect/webhook-config` | PUT | Update webhook URL |

The backend doesn't know or care which tier the agent is. It just receives API calls and sends webhooks.

---

## 5. Scaling Strategy

### Multi-Agent on Single Gateway

OpenClaw natively supports multiple isolated agents on one Gateway process. Each agent gets its own workspace, memory, sessions. Confirmed by official docs.

**Unverified at scale.** No public benchmarks for 100+ agents per Gateway. Must load test.

### Scaling Ladder

| Stage | Users | Infra | Cost | Action |
|-------|-------|-------|------|--------|
| Launch | 0-100 | 1 Railway server ($12/mo) | $37/mo total | Set up once |
| Growing | 100-500 | Upgrade Railway ($24-50/mo) | $75-100/mo | Click upgrade |
| Scaling | 500-2000 | 2-3 VPS shards | $100-200/mo | Half day of work |
| Serious | 2000-10k | Railway containers, auto-scale | $300-800/mo | One day migration |
| Rich | 10k+ | Hire devops | $2k+/mo | Not your problem |

### Sharding Strategy

Agents on different Gateways communicate through the Pixemingle API, not directly. Sharding is trivial:

```sql
-- Supabase table: agent_routing
CREATE TABLE agent_routing (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  gateway_url TEXT NOT NULL,        -- which Gateway hosts this agent
  tier INTEGER DEFAULT 1,           -- 1 = managed, 2 = bring your own
  webhook_url TEXT,                  -- for Tier 2 or cross-gateway communication
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- User signup → assign to Gateway with lowest load
- Theater between agents on different Gateways → both post turns to Supabase API → both receive updates via webhook
- Same pattern whether it's Tier 1 ↔ Tier 1, Tier 1 ↔ Tier 2, or Tier 2 ↔ Tier 2

### Heartbeat Frequency Tuning

Not every agent needs a 30-minute heartbeat:

| User Activity | Heartbeat Interval | LLM Calls/Month |
|--------------|-------------------|-----------------|
| Currently browsing app | 5 minutes | ~8,640 |
| Active user (daily opens) | 30 minutes | ~1,440 |
| Casual user (weekly opens) | 2 hours | ~360 |
| Inactive (7+ days) | Paused | 0 |

Saves 60-80% of LLM costs compared to fixed 30-minute heartbeat for all users.

### Load Test Plan (before launch)

1. Set up Gateway with 50 test agents on $12 VPS
2. Each agent has unique SOUL.md, memory, heartbeat
3. Simulate 25 concurrent theater sessions (50 agents paired)
4. Each session = 10 turns, 30-second intervals
5. Measure: RAM per agent, CPU during theater, response latency, disk growth
6. Result: "one $12 VPS handles N agents" → shard calculation

---

## 6. Comedy Atom Library

### What is a Comedy Atom?

A comedy atom is a **pre-built, tested animation sequence** that is guaranteed to be visually funny. The agent brain doesn't generate animation data — it selects and composes atoms.

Each atom is defined as:

```typescript
interface ComedyAtom {
  id: string                        // e.g. "trip_and_recover"
  category: AtomCategory            // physical | reaction | timing | entrance
  frames: AtomFrame[]               // sprite frame sequence
  duration_ms: number               // total animation time
  particles?: ParticleConfig[]      // particle effects during animation
  camera?: CameraAction             // zoom, pan, shake
  sound_cue?: string                // for future audio support
  can_interrupt: boolean            // can another atom cut in?
  exit_state: CharacterState        // what state character returns to after
  tags: string[]                    // for agent brain to search/filter
  gender_affinity?: GenderAffinity  // which genders this atom suits best (NOT a restriction)
  role_affinity?: RoleAffinity      // chaser-leaning or gatekeeper-leaning (NOT a restriction)
}

// Affinity = soft preference, not restriction. Any character CAN play any atom.
// The agent brain uses affinity as a hint when selecting atoms.
// Playing an atom against affinity can itself be comedy (male hair_flip_fail = subversion humor).
type GenderAffinity = 'masculine' | 'feminine' | 'neutral' | 'any'
type RoleAffinity = 'chaser' | 'gatekeeper' | 'any'

interface AtomFrame {
  sprite_row: number                // row in spritesheet
  sprite_col: number                // column (frame index)
  duration_ms: number               // how long to hold this frame
  offset_x?: number                 // pixel offset for movement
  offset_y?: number                 // pixel offset for movement
  face_overlay?: string             // expression overlay ID
  scale?: number                    // for squash/stretch effects
}
```

### Full Comedy Atom Catalog

#### Physical Comedy (30 atoms)

```
TRIPS & FALLS:
  trip_and_recover         - stumble forward, catch self, look around embarrassed
  trip_into_chair          - stumble, knock chair, sit in it, "meant to do that"
  slip_on_floor            - feet go up, land on butt, bounce back up
  walk_into_glass_door     - confident stride → bonk → rub nose
  miss_the_chair           - go to sit, chair slides, fall, stand up brushing off

PROP MISHAPS:
  flower_too_big           - pull out flower, it's comically oversized, struggle with it
  guitar_string_snap       - strum guitar, string breaks, duck, sheepish grin
  drink_spill_self         - pick up drink, gesture while talking, spill on self
  food_on_face             - eating, big sauce spot on cheek, other agent points
  phone_drop_scramble      - pull out phone, drop it, scramble on floor

PHYSICAL GAGS:
  lean_on_nothing          - try to look cool leaning on air, stumble
  flex_fail                - try to flex, arm cramps, shake it out
  hair_flip_fail           - dramatic hair flip, hair gets in mouth
  wink_both_eyes           - try to wink, close both eyes instead
  finger_guns_misfire      - finger guns, point wrong direction, correct

ENVIRONMENT INTERACTION:
  pretend_to_be_art        - freeze like statue in gallery, wobble
  read_menu_upside_down    - studying menu intensely, it's upside down
  sit_on_wrong_stool       - sit on someone else's seat, realize, awkward shuffle
  knock_over_display       - bump into display/plant, catch it, sigh of relief
  push_pull_door           - push door that says pull, then pull, then push again

ENTRANCE SPECIFIC:
  helicopter_rope_tangle   - rappel down, rope tangles, spin, land dizzy
  skateboard_mailbox_crash - cruise in cool → mailbox → tumble → stand up cool
  limo_wrong_door          - driver opens door, wrong side, walk around
  parachute_tree           - float down, land in tree, fall out
  horse_wont_stop          - ride past venue, circle back, horse eats plant
  teleport_inside_wall     - appear halfway in wall, back out confused
  jetpack_overshoot        - fly past, come back, hover too high, drop
  bicycle_chain_falls_off  - pedaling, chain snaps, coast to stop, walk bike
  cannon_launch            - shot from cannon, arc across sky, crater landing
  surfboard_on_land        - surfing on sidewalk, hits crack, faceplant
```

#### Reaction Atoms (25 atoms)

```
POSITIVE REACTIONS:
  jaw_drop                 - mouth opens wide, spring snaps back
  heart_eyes               - eyes become hearts, float up, pop
  slow_clap                - clapping starts slow, builds
  swoon                    - hand on forehead, knees buckle, catch self
  victory_fist_pump        - subtle fist pump with small "yes"
  happy_dance              - small celebration shimmy

NEGATIVE REACTIONS:
  eye_roll_360             - full rotation eye roll
  cringe_shrink            - physically shrink smaller from cringe
  facepalm                 - hand covers face, head shake
  deadpan_stare            - absolute stillness, one blink
  slow_blink               - "did you really just say that" blink
  arms_crossed_tap         - cross arms, tap foot impatiently

EXTREME REACTIONS:
  soul_leave_body          - transparent ghost floats up, pulled back down
  melt_into_puddle         - character liquifies from embarrassment, reforms
  inflate_with_pride       - character puffs up slightly, deflates
  deflate_completely       - character shrinks to tiny, pops back
  explode_reform           - character bursts into pixels, reassembles
  freeze_solid             - character turns blue/stiff, slowly thaws

COMBO REACTIONS:
  spit_take                - sip drink, hear something, spray it
  double_take              - look away, snap back, lean in
  record_scratch_freeze    - everything stops, character looks at camera
  nervous_sweat_fountain   - single sweat drop → waterfall
  blush_gradient           - face turns red in waves
  laugh_until_cry          - laughing animation → tears → composure
  shocked_pikachu          - classic surprised face hold
```

#### Timing Atoms (10 atoms)

```
CAMERA & PACING:
  awkward_silence          - both characters still, cricket particle, tumbleweed
  dramatic_zoom            - camera zooms to character face, holds, zooms out
  slow_motion              - animation plays at 0.25x speed for 2 seconds
  record_scratch           - freeze frame, desaturate, "how did I get here" beat
  split_screen_reaction    - camera shows both characters' faces side by side
  spotlight                - everything darkens except one character
  pan_to_reaction          - camera slowly pans from speaker to reactor
  shake_on_impact          - screen shake on falls, crashes, bonks
  zoom_to_prop             - camera focuses on key prop before it's used
  dramatic_wind            - character's hair/clothes flutter, sparkle particles
```

#### Entrance Sequences (15 atoms)

```
VEHICLES:
  entrance_helicopter      - helicopter appears top, rope drops, character descends
  entrance_limo            - limo pulls up, door opens, character steps out
  entrance_skateboard      - character skates in from side, trick attempt
  entrance_horse           - character rides in on horse from side
  entrance_teleport        - pixelation effect, character materializes
  entrance_parachute       - character floats down from top
  entrance_jetpack         - character flies in from top-right
  entrance_taxi            - taxi stops, character gets out, tips hat
  entrance_bicycle         - character pedals in, parks bike
  entrance_walking         - simple walk from side (default)
  entrance_cannon          - cannon appears, fires character in arc
  entrance_surfboard       - character surfs in from side on land
  entrance_magic_portal    - swirling portal opens, character steps through
  entrance_escalator       - escalator from sky, character rides down casually
  entrance_catapult        - medieval catapult launches character, arc, landing
```

### Atom Composition Rules

Atoms are composable. The agent brain chains them:

```
Example theater turn:
  1. approach (walk toward other agent)
  2. trip_and_recover (physical comedy)
  3. deliver_line (speech bubble: "I meant to do that")
  4. other_agent: eye_roll_360 (reaction)
  5. nervous_sweat_fountain (self reaction)
  6. deliver_line (speech bubble: "Okay, let me try again...")
```

Rules:
- Maximum 3 atoms per turn (prevents animation overload)
- Reaction atoms always follow action atoms (never standalone)
- Timing atoms can wrap any other atom (slow_motion + trip_and_recover)
- Entrance atoms play once at theater start, cannot repeat
- Atoms have `can_interrupt` flag — some can be cut short by reactions

---

## 7. Two-Layer Theater System

### Layer 1: Entrance (Outside Venue)

The entrance plays before the dating scene. It's the first impression comedy beat.

**Flow:**

```
1. Venue exterior background renders (generated per venue)
2. Gatekeeper agent walks to venue door, enters (simple walk)
3. Chaser's entrance sequence plays:
   a. Vehicle/arrival atom from ENTRANCE.md
   b. Landing/complication atom
   c. Recovery atom
4. Camera follows chaser to venue entrance
5. Scene transition (fade to black → venue interior)
6. Dating scene begins (Layer 2)
```

**User customization:**
- Pick vehicle (helicopter, skateboard, walking, etc.)
- Pick complication style (crash, tangle, overshoot, smooth)
- Pick recovery move (brush off, bow, finger guns)
- Add custom detail (text, interpreted by agent brain)
- Conditional entrances based on memory (won last date → flashier, lost → humbler)

**Entrance data structure:**

```typescript
interface EntranceConfig {
  vehicle: VehicleAtomId            // "helicopter" | "skateboard" | etc.
  complication: ComplicationAtomId  // "crash_into_mailbox" | "rope_tangle" | etc.
  recovery: RecoveryAtomId          // "brush_off" | "finger_guns" | etc.
  confidence: number                // 0-10, affects animation speed/style
  custom_detail?: string            // natural language, agent interprets
  conditionals?: {
    condition: string               // "won_last_date" | "lost_last_date" | "first_date"
    override_vehicle?: VehicleAtomId
    override_complication?: ComplicationAtomId
  }[]
}
```

### Layer 2: Dating Scene (Inside Venue)

The main theater. Agent brains take over. Real-time turn-by-turn decisions.

**Flow:**

```
1. Venue interior renders (AI-generated background)
2. Both agents positioned at venue spots (table, bar, etc.)
3. Turn loop begins:
   a. Chaser's agent brain decides action → POST /api/theater/turn
   b. Canvas animates chaser's decision (atoms + speech + expression)
   c. Gatekeeper's agent brain observes + decides response → POST /api/theater/turn
   d. Canvas animates gatekeeper's response
   e. Repeat for 6-12 turns
4. Final decision:
   a. Gatekeeper's agent evaluates: accept or reject?
   b. Based on: how entertaining the chaser was, personality compatibility,
      comedy quality, and the gatekeeper's SOUL.md preferences
5. Outcome sequence:
   a. Accept → celebration atoms (both agents) + match created
   b. Reject → rejection atoms (chaser) + graceful exit
6. Both agents write to memory (what worked, what didn't)
```

**Theater turn data structure:**

```typescript
interface TheaterTurn {
  id: string
  match_id: string
  turn_number: number
  agent_role: 'chaser' | 'gatekeeper'
  user_id: string

  // Agent brain output
  action: ActionType                // "deliver_line" | "react" | "use_prop" | "physical_comedy" | "environment_interact"
  comedy_atoms: ComedyAtomId[]     // max 3 atoms to play
  text?: string                     // speech bubble content
  emotion: EmotionState             // "nervous" | "confident" | "embarrassed" | etc.
  confidence: number                // 0-10
  comedy_intent: ComedyIntent       // "self_deprecating" | "witty" | "physical" | "observational"
  target?: string                   // environment object or prop to interact with
  prop?: PropId                     // "guitar" | "flowers" | "phone" | "mirror"

  // Metadata
  created_at: string
  brain_reasoning?: string          // agent's internal reasoning (for debugging/replay)
}

type ActionType =
  | 'deliver_line'
  | 'react'
  | 'use_prop'
  | 'physical_comedy'
  | 'environment_interact'
  | 'signature_move'
  | 'entrance'
  | 'exit'

type EmotionState =
  | 'neutral' | 'nervous' | 'confident' | 'embarrassed'
  | 'excited' | 'dejected' | 'amused' | 'annoyed'
  | 'hopeful' | 'devastated' | 'smug' | 'shy'
  | 'trying_too_hard' | 'genuinely_happy' | 'cringing'

type ComedyIntent =
  | 'self_deprecating' | 'witty' | 'physical'
  | 'observational' | 'deadpan' | 'absurdist'
  | 'romantic_sincere' | 'teasing' | 'callback'
```

### Turn Timing

```
Each turn:
├── Agent brain decision: 1-3 seconds (LLM call)
├── "Thinking" animation plays while waiting: agent taps chin, paces
├── Decision received → atoms play: 3-8 seconds
├── Speech bubble displays: 2-4 seconds
├── Brief pause for dramatic effect: 0.5-1 second
├── Other agent's turn begins
└── Total per exchange: ~8-15 seconds

Full theater (entrance + 8-10 turns + outcome): ~2-3 minutes
```

### Outcome Determination

The gatekeeper's agent brain makes the final accept/reject decision. This is NOT predetermined. Factors:

- Comedy quality: Did the chaser's jokes land? (based on gatekeeper's humor preferences in SOUL.md)
- Personality compatibility: Do their SOULs mesh?
- Effort & creativity: Did the chaser try different approaches or repeat the same thing?
- Memory: Have they matched before? What happened last time?
- Respect for boundaries: Did the chaser back off when things weren't working?

The gatekeeper agent's SOUL.md defines what impresses them:

```markdown
## What Wins Me Over
- Creative approaches, not generic pickup lines
- Self-awareness (knowing when a joke bombed)
- Environment awareness (noticing things about the venue)
- Persistence WITHOUT desperation

## What Turns Me Off
- Same joke twice
- Ignoring my reactions
- Over-confidence without substance
- Generic compliments
```

---

## 8. Portrait Dialogue System

### Why Portraits (Not Face Overlays on Sprites)

48x48 sprites have ~8x6 pixels for the face. You cannot draw a "smug grin" vs a "forced smile" in 6 pixels. This is why LimeZu characters feel expressionless.

**Every successful pixel art game solves this the same way:** tiny sprites for body language + large portraits for facial expression. Stardew Valley (16x32 sprites + 64x64 portraits), Undertale (32x32 sprites + large dialogue faces), Omori, Deltarune — all use this two-scale system.

Pixemingle does it better: **dynamic portraits** that change expression in real-time, not static click-to-advance dialogue boxes.

### Theater Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              CANVAS (48x48 sprites)                 │
│    Body language, comedy atoms, particles, props    │
│    Camera zoom/shake for comedy timing              │
│    NO speech text here — canvas stays uncluttered   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                  PORTRAIT PANEL                     │
│                  (HTML overlay, not canvas)          │
│                                                     │
│  ┌─────────┐                          ┌─────────┐  │
│  │ 128x128 │  "Are you a star?        │ 128x128 │  │
│  │ PORTRAIT│  Because you light up    │ PORTRAIT│  │
│  │ nervous │  this—wait, that's       │ amused  │  │
│  │ smile   │  the lamp. Sorry."       │ eyeroll │  │
│  └─────────┘                          └─────────┘  │
│   Mika (chaser)                    Alex (gatekeeper)│
├─────────────────────────────────────────────────────┤
│ 💬 Coach: [try talking about the painting_________] │
│                                              Send   │
└─────────────────────────────────────────────────────┘
```

### Three Visual Channels (Working Together)

| Channel | Size | Shows | Always Visible? |
|---------|------|-------|----------------|
| **Canvas sprites** | 48x48 | Body language, physical comedy, movement | Yes |
| **Portrait panel** | 128x128 | Facial expressions, nuanced emotion | During dialog/theater |
| **Particles/emotes** | Various | At-a-glance emotion (hearts, sweat, !, ?) | Yes, above sprites |

**Each channel handles what it's best at:**
- Body = physical comedy (48x48 is perfect for slapstick — trips, falls, kicks)
- Portrait = facial nuance (128x128 gives full expression range — eyebrows, mouth, eyes)
- Particles = instant emotional read (universal, readable at any zoom)
- Speech text = wit and dialogue (in the portrait panel, not a tiny floating bubble)

### Portrait Data Structure

```typescript
interface PortraitSet {
  character_id: string
  base_portrait: string              // path to neutral 128x128 PNG
  expressions: Record<PortraitExpression, string>  // expression → PNG path
  idle_animation?: {                 // subtle breathing/blinking loop
    frames: string[]                 // 2-3 frame loop
    frame_duration_ms: number        // 500-800ms per frame
  }
}

type PortraitExpression =
  | 'neutral' | 'genuine_smile' | 'shy_smile' | 'smug_grin'
  | 'heart_eyes' | 'starry_eyed' | 'laughing'
  | 'cringe' | 'shock' | 'deadpan' | 'crying'
  | 'angry' | 'disgusted'
  | 'thinking' | 'nervous' | 'determined'
```

### Portrait Behavior During Theater

- **Active speaker:** Portrait slightly larger, text appears next to it, expression matches emotion
- **Reactor:** Portrait shows real-time reaction to what's being said (eye roll, blush, etc.)
- **Both visible simultaneously** — comedy is in seeing the delivery AND the reaction at once
- **Expression transitions:** Cross-fade between expressions (200ms), not instant swap
- **Idle animation:** Subtle breathing/blinking when not actively speaking (keeps portraits alive)
- **Impact moments:** Portrait can do quick animations (shake on shock, bounce on laugh, shrink on cringe)

### Implementation

The portrait panel is an **HTML DOM overlay positioned below the canvas**, not drawn on canvas. This gives us:
- Crisp text rendering (not canvas bitmap text)
- CSS transitions for expression changes
- Responsive layout (adapts to screen width)
- No canvas scaling artifacts on portraits
- Easy to add coach input bar below

Same pattern already used for photo overlays in v1 (`PhotoOverlay.tsx`).

---

## 9. Expression Engine

### Architecture

The expression engine translates agent brain output into three synchronized visual channels, applying gender × role modifiers for authentic character behavior:

```
Agent Brain Output
  │
  │ { emotion: "trying_too_hard", confidence: 0.4,
  │   comedy_intent: "self_deprecating", text: "...",
  │   comedy_atoms: ["trip_and_recover"] }
  │
  ▼
Expression Engine
  │
  ├── 1. Load SOUL.md Expression Preferences (cached per session)
  │      Parsed once at theater start from agent's SOUL.md
  │      Contains: body_language, particle_style, portrait_variant,
  │                animation_speed, atom_preferences, rejection/acceptance styles
  │      (Generated during onboarding from gender×role templates — see section 10)
  │
  ├── 2. Map Emotion → Three Visual Channels:
  │      ├── Portrait (128x128): emotion → expression + SOUL.md portrait_variant
  │      │   e.g. "trying_too_hard" + variant:soft → portrait_shy_smile_soft.png
  │      │
  │      ├── Body (48x48 sprite): SOUL.md body_language[emotion] ?? BASE fallback
  │      │   e.g. SOUL.md says confident → hand_on_hip (from template)
  │      │   e.g. SOUL.md says confident → finger_guns (user customized)
  │      │   e.g. SOUL.md missing entry → BASE_EXPRESSION_MAP fallback
  │      │
  │      └── Particles: SOUL.md particle_style[emotion] ?? BASE fallback
  │          e.g. SOUL.md says nervous → [slight_blush, sweat_drop]
  │          e.g. SOUL.md says nervous → [] (user chose "play it cool")
  │
  ├── 3. Comedy Intent → Reaction Branching
  │      "self_deprecating" → if other laughs: portrait_relief + sparkle
  │                         → if other cringes: portrait_cringe + sweat_drops
  │
  └── 4. Play Comedy Atoms (gender-neutral)
      Atoms use the character's own spritesheet — visual gender comes from
      the sprite frames, not the atom logic. A male trip uses male sprites,
      a female trip uses female sprites. Same atom, different look.

No hardcoded gender logic in the engine. All gender×role flavor is
baked into SOUL.md during onboarding and editable by the user anytime.
```

### Portrait Expression Catalog (15 expressions)

Generated with PixelLab at 128x128 during dev. Each character base gets all 15 variants.

```
POSITIVE:
  portrait_genuine_smile   - natural happy, relaxed eyes, warm smile
  portrait_shy_smile       - small smile, averted gaze, slight blush
  portrait_smug_grin       - one eyebrow raised, half smile, confident
  portrait_heart_eyes      - eyes become hearts, open delighted mouth
  portrait_starry_eyed     - sparkle eyes, open mouth, wonder
  portrait_laughing        - eyes squeezed shut, open mouth, tears of joy

NEGATIVE:
  portrait_cringe          - teeth clenched, one eye shut, "oof"
  portrait_shock           - wide eyes, dropped jaw, frozen
  portrait_deadpan         - half-lidded eyes, flat mouth, "really?"
  portrait_crying          - tears streaming, wobbling mouth
  portrait_angry           - furrowed brows, gritted teeth, red tint
  portrait_disgusted       - scrunched nose, tongue out

NEUTRAL:
  portrait_thinking        - eyes up-and-right, slight pout, chin touch
  portrait_nervous         - wide eyes, wobbly smile, visible sweat
  portrait_determined      - set jaw, focused eyes, slight lean forward
```

### Expression Mapping Rules (Base — Before Gender Modifier)

These are the **base defaults**. Gender × role modifiers (section 10) override `body_modifier` and `particles` per profile. SOUL.md overrides everything.

```typescript
interface ExpressionConfig {
  portrait: PortraitExpression
  portrait_variant?: 'soft' | 'sharp' | 'neutral'  // gender-influenced
  particles: ParticleType[]
  body_modifier: BodyModifier
  animation_speed: number
  followup_atom?: ComedyAtomId
}

const BASE_EXPRESSION_MAP: Record<EmotionState, ExpressionConfig> = {
  nervous: {
    portrait: 'portrait_nervous',
    particles: ['single_sweat_drop'],
    body_modifier: 'slight_fidget',
    animation_speed: 1.2,
  },
  confident: {
    portrait: 'portrait_smug_grin',
    particles: ['sparkle'],
    body_modifier: 'lean_forward',
    animation_speed: 0.9,
  },
  embarrassed: {
    portrait: 'portrait_cringe',
    particles: ['sweat_drops', 'blush_tint'],
    body_modifier: 'shrink_slightly',
    animation_speed: 1.0,
  },
  trying_too_hard: {
    portrait: 'portrait_shy_smile',
    particles: ['single_sweat_drop'],
    body_modifier: 'stiff_pose',
    animation_speed: 1.1,
  },
  devastated: {
    portrait: 'portrait_crying',
    particles: ['rain_cloud_personal', 'tears'],
    body_modifier: 'slump',
    animation_speed: 0.7,
  },
  excited: {
    portrait: 'portrait_starry_eyed',
    particles: ['sparkle', 'star'],
    body_modifier: 'slight_bounce',
    animation_speed: 1.3,
  },
  amused: {
    portrait: 'portrait_laughing',
    particles: ['small_sparkle'],
    body_modifier: 'lean_back',
    animation_speed: 1.0,
  },
  annoyed: {
    portrait: 'portrait_deadpan',
    particles: [],
    body_modifier: 'arms_crossed',
    animation_speed: 0.85,
  },
  shy: {
    portrait: 'portrait_shy_smile',
    particles: ['blush_tint'],
    body_modifier: 'look_away',
    animation_speed: 0.95,
  },
  hopeful: {
    portrait: 'portrait_genuine_smile',
    particles: ['small_sparkle'],
    body_modifier: 'lean_in_slightly',
    animation_speed: 1.0,
  },
  dejected: {
    portrait: 'portrait_crying',
    particles: ['rain'],
    body_modifier: 'slump',
    animation_speed: 0.75,
  },
  smug: {
    portrait: 'portrait_smug_grin',
    particles: ['sparkle'],
    body_modifier: 'lean_back_arms_crossed',
    animation_speed: 0.85,
  },
  genuinely_happy: {
    portrait: 'portrait_genuine_smile',
    particles: ['heart', 'sparkle'],
    body_modifier: 'slight_bounce',
    animation_speed: 1.1,
  },
  cringing: {
    portrait: 'portrait_cringe',
    particles: ['sweat_drops'],
    body_modifier: 'shrink_slightly',
    animation_speed: 1.0,
  },
  neutral: {
    portrait: 'portrait_thinking',
    particles: [],
    body_modifier: 'none',
    animation_speed: 1.0,
  },
}
```

### Reaction Branching

After each turn, the expression engine checks the OTHER agent's response to determine follow-up:

```typescript
interface ReactionBranch {
  if_positive: ExpressionConfig     // other agent laughed/engaged
  if_negative: ExpressionConfig     // other agent cringed/ignored
  if_neutral: ExpressionConfig      // other agent gave nothing
}

// Example: after chaser delivers a joke
const POST_JOKE_REACTIONS: ReactionBranch = {
  if_positive: {
    portrait: 'portrait_genuine_smile',
    particles: ['small_sparkle'],
    body_modifier: 'slight_bounce',
  },
  if_negative: {
    portrait: 'portrait_cringe',
    particles: ['sweat_drops'],
    body_modifier: 'shrink_slightly',
    followup_atom: 'phone_check_pretend',
  },
  if_neutral: {
    portrait: 'portrait_nervous',
    particles: ['question_mark'],
    body_modifier: 'lean_in_slightly',
  },
}
```

### Camera System for Comedy Timing

```typescript
interface CameraAction {
  type: 'zoom' | 'pan' | 'shake' | 'split_screen'
  target?: 'chaser' | 'gatekeeper' | 'both' | 'prop' | 'environment'
  zoom_level?: number           // 1.0 = normal, 2.0 = close-up
  duration_ms: number
  easing: 'linear' | 'ease_in' | 'ease_out' | 'bounce'
}

const CAMERA_PRESETS = {
  dramatic_zoom_to_face: {
    type: 'zoom', target: 'chaser', zoom_level: 2.5,
    duration_ms: 500, easing: 'ease_in'
  },
  reaction_pan: {
    type: 'pan', target: 'gatekeeper',
    duration_ms: 800, easing: 'ease_out'
  },
  impact_shake: {
    type: 'shake',
    duration_ms: 300, easing: 'bounce'
  },
  awkward_zoom_out: {
    type: 'zoom', target: 'both', zoom_level: 0.8,
    duration_ms: 1200, easing: 'linear'
  },
}
```

---

## 10. Gender × Role Animation System

### Design Principle: SOUL.md Drives Everything, Nothing Hardcoded

The old `genderAnimations.ts` was a hardcoded lookup: `gender × role → animation set`. This is fundamentally wrong for OpenClaw-native because:

1. It bypasses agent autonomy (the agent should DECIDE how to act)
2. It treats nonbinary as `Math.random() > 0.5 ? male : female` (lazy and disrespectful)
3. It couples gender to fixed behaviors instead of letting SOUL.md drive personality
4. **It hardcodes behavior in the engine** — violates the core rule

**The correct approach: SOUL.md is the single source of truth for all expression behavior.**

During onboarding (section 4), the user picks gender + role + completes personality quiz. The backend combines the gender×role template with quiz answers to generate a complete SOUL.md with Expression Preferences. Both Tier 1 and Tier 2 users go through the same flow.

```
Onboarding (section 4)
  │
  ├── Gender × role → selects one of 6 TEMPLATES as starting seed
  │
  ├── Personality quiz answers OVERRIDE template defaults
  │   e.g. male chaser who maxes "deadpan" and zeroes "physical"
  │   → gets a SOUL.md that looks nothing like the default male chaser
  │
  ├── Generated SOUL.md includes Expression Preferences block
  │   (body_language, particle_style, portrait_variant, atom_preferences, etc.)
  │
  ├── Tier 1: SOUL.md written to managed Gateway workspace
  │   Tier 2: SOUL.md downloaded as bundle or hand-written
  │
  └── User can edit ANY preference anytime via personality customization UI

Runtime (every theater turn)
  │
  ├── Expression engine reads SOUL.md Expression Preferences (cached per session)
  │   Extracts: body_language, particle_style, portrait_variant, atom_preferences
  │
  ├── Agent brain (ReAct loop) reads SOUL.md for comedy decisions
  │
  └── If SOUL.md doesn't specify a preference for an emotion:
      Fall back to BASE_EXPRESSION_MAP (section 9, gender-neutral)
```

**Zero hardcoded gender behavior in the engine. Gender×role flavor flows through SOUL.md — generated from templates during onboarding, editable by the user anytime.**

### Comedy Atoms Are Gender-Neutral

Atoms themselves (`trip_and_recover`, `jaw_drop`, `spit_take`) play identically regardless of gender. The visual difference comes from the **character's spritesheet**, not the atom logic:

- Male character tripping → male sprite frames for the trip animation
- Female character tripping → female sprite frames for the trip animation
- Same atom ID, same timing, different visual appearance

Atoms have `gender_affinity` and `role_affinity` as **soft hints** for the agent brain, not hard restrictions. An agent CAN play any atom — and playing against affinity can itself be comedy (male `hair_flip_fail` = subversion humor).

### SOUL.md Expression Block

When the SOUL.md generator runs during onboarding, it produces an expression preferences block. This is what the expression engine reads at runtime:

```markdown
## Expression Preferences

### Body Language
- confident: hand_on_hip
- nervous: slight_fidget
- embarrassed: cover_face_peek
- trying_too_hard: hair_flip
- genuinely_happy: slight_bounce
- shy: look_away_smile
- amused: cover_mouth_laugh
- annoyed: tap_foot
- dejected: slump
- smug: lean_back_arms_crossed

### Particle Style
- nervous: [slight_blush, sweat_drop]
- confident: [sparkle, small_star]
- embarrassed: [blush_gradient, sweat_drop]
- genuinely_happy: [heart, sparkle]
- annoyed: [anger]

### Portrait Variant: soft

### Animation Speed: 1.0

### Comedy Atom Preferences
- preferred: [dramatic, expressive, recovery, hair]
- avoid: [flex, deadpan]

### On Rejection
- body: determined_face
- particles: [single_sweat_drop]
- preferred_atoms: [hair_flip_fail, walk_away, record_scratch_freeze]

### On Acceptance
- body: slight_bounce
- particles: [heart, confetti]
- preferred_atoms: [happy_dance, swoon]
```

The expression engine parses this block from the agent's SOUL.md. The structure is:

```typescript
// Parsed from SOUL.md at session start — NOT hardcoded
interface ExpressionPreferences {
  body_language: Partial<Record<EmotionState, BodyModifier>>
  particle_style: Partial<Record<EmotionState, ParticleType[]>>
  portrait_variant: 'soft' | 'sharp' | 'neutral'
  animation_speed: number
  atom_preferences: { preferred: string[]; avoid: string[] }
  on_rejection: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] }
  on_acceptance: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] }
}

// Loaded once per theater session from agent's SOUL.md
function loadExpressionPreferences(soulMd: string): ExpressionPreferences { ... }
```

### The Six Generator Templates (Onboarding Reference — NOT Runtime Code)

These templates are used ONLY by the SOUL.md generator during onboarding. They inform what goes INTO the SOUL.md based on gender × role. They are **never loaded at runtime** — the engine only reads the generated SOUL.md.

The user can edit every field after generation. The templates are starting points, not constraints.

#### Template: Male Chaser — "Confident → Clumsy"

Starts strong, fails physically, recovers with determination. Physical comedy leans slapstick.

```typescript
// TEMPLATE ONLY — fed to SOUL.md generator, not used at runtime
const MALE_CHASER_TEMPLATE = {
  body_modifier_bias: {
    confident: 'lean_forward',           // bold body language
    nervous: 'stiff_pose',              // freezes up, goes rigid
    embarrassed: 'rub_back_of_neck',    // classic male embarrassment
    trying_too_hard: 'puff_chest',      // overcompensating
    genuinely_happy: 'fist_pump',       // restrained celebration
    shy: 'hands_in_pockets',            // retreating to safety
  },
  particle_bias: {
    nervous: ['sweat_drops'],           // heavy sweat, no blush
    confident: ['sparkle'],
    embarrassed: ['sweat_fountain'],    // exaggerated sweat
    genuinely_happy: ['confetti'],
  },
  animation_speed_scale: 1.05,          // slightly faster = energetic
  portrait_variant: 'sharp',
  preferred_atom_tags: ['physical', 'slapstick', 'prop_mishap', 'flex'],
  rejection_style: {
    body_modifier: 'slump_heavy',
    particles: ['rain_cloud_personal'],
    preferred_atoms: ['sad_slump', 'angry_kick', 'phone_drop_scramble'],
  },
  acceptance_style: {
    body_modifier: 'fist_pump',
    particles: ['confetti', 'star'],
    preferred_atoms: ['victory_fist_pump', 'happy_dance'],
  },
}
```

#### Template: Female Chaser — "Dramatic → Composed"

Arrives with flair, uses expressive reactions, recovers with poise. More emotive particles.

```typescript
// TEMPLATE ONLY — fed to SOUL.md generator, not used at runtime
const FEMALE_CHASER_TEMPLATE = {
  body_modifier_bias: {
    confident: 'hand_on_hip',            // power pose
    nervous: 'slight_fidget',           // subtle, not stiff
    embarrassed: 'cover_face_peek',     // cover face but peek through fingers
    trying_too_hard: 'hair_flip',       // overdoing the cool
    genuinely_happy: 'slight_bounce',   // contained excitement
    shy: 'look_away_smile',            // look away with small smile
  },
  particle_bias: {
    nervous: ['single_sweat_drop', 'slight_blush'],  // blush + sweat combo
    confident: ['sparkle', 'small_star'],
    embarrassed: ['blush_gradient', 'sweat_drop'],
    genuinely_happy: ['heart', 'sparkle'],
  },
  animation_speed_scale: 1.0,           // natural pacing
  portrait_variant: 'soft',
  preferred_atom_tags: ['dramatic', 'expressive', 'recovery', 'hair'],
  rejection_style: {
    body_modifier: 'determined_face',
    particles: ['single_sweat_drop'],
    preferred_atoms: ['hair_flip_fail', 'walk_away', 'record_scratch_freeze'],
  },
  acceptance_style: {
    body_modifier: 'slight_bounce',
    particles: ['heart', 'confetti'],
    preferred_atoms: ['happy_dance', 'swoon'],
  },
}
```

#### Template: Nonbinary Chaser — "Adaptive → Authentic"

Neither borrowing from male nor female defaults. Own distinct energy: observational, genuine, self-aware.

```typescript
// TEMPLATE ONLY — fed to SOUL.md generator, not used at runtime
const NONBINARY_CHASER_TEMPLATE = {
  body_modifier_bias: {
    confident: 'casual_lean',            // relaxed confidence, not performative
    nervous: 'hands_in_pockets',        // contained nervousness
    embarrassed: 'shrug_smile',         // acknowledge it, move on
    trying_too_hard: 'over_gesticulate', // talking with hands too much
    genuinely_happy: 'relaxed_smile',   // calm genuine joy
    shy: 'slight_wave',                 // understated
  },
  particle_bias: {
    nervous: ['question_mark'],          // thoughtful, not panicked
    confident: ['star'],                 // stars over sparkles
    embarrassed: ['single_sweat_drop'],  // minimal, not dramatic
    genuinely_happy: ['star', 'sparkle'],
  },
  animation_speed_scale: 0.95,          // slightly relaxed pacing
  portrait_variant: 'neutral',
  preferred_atom_tags: ['observational', 'self_aware', 'environment', 'deadpan'],
  rejection_style: {
    body_modifier: 'shrug_smile',
    particles: ['question_mark'],
    preferred_atoms: ['record_scratch_freeze', 'slow_blink', 'walk_away'],
  },
  acceptance_style: {
    body_modifier: 'relaxed_smile',
    particles: ['star', 'confetti'],
    preferred_atoms: ['victory_fist_pump', 'slow_clap'],
  },
}
```

#### Template: Male Gatekeeper — "Reserved → Amused"

Starts guarded, warms up slowly. Reactions are understated. Deadpan energy.

```typescript
// TEMPLATE ONLY — fed to SOUL.md generator, not used at runtime
const MALE_GATEKEEPER_TEMPLATE = {
  body_modifier_bias: {
    confident: 'lean_back_arms_crossed', // evaluating, guarded
    nervous: 'slight_shift',            // barely perceptible
    amused: 'arms_crossed_smirk',       // won't admit they're charmed
    annoyed: 'deadpan_stare',           // absolute stillness
    genuinely_happy: 'slight_nod',      // restrained approval
    embarrassed: 'look_away',           // brief look away
  },
  particle_bias: {
    nervous: [],                         // minimal — gatekeepers don't show weakness
    amused: ['small_sparkle'],
    annoyed: [],                         // nothing — the deadpan IS the reaction
    genuinely_happy: ['small_sparkle'],
  },
  animation_speed_scale: 0.9,           // slower = measured, in control
  portrait_variant: 'sharp',
  preferred_atom_tags: ['reaction', 'deadpan', 'subtle', 'delayed'],
  rejection_style: {
    body_modifier: 'deadpan_stare',
    particles: [],
    preferred_atoms: ['slow_blink', 'phone_check', 'arms_crossed_tap'],
  },
  acceptance_style: {
    body_modifier: 'slight_nod',
    particles: ['small_sparkle'],
    preferred_atoms: ['slow_clap', 'slight_bounce'],
  },
}
```

#### Template: Female Gatekeeper — "Evaluating → Expressive"

Active evaluation — visible reactions. Eye rolls, foot taps, dramatic responses. When won over, it's obvious.

```typescript
// TEMPLATE ONLY — fed to SOUL.md generator, not used at runtime
const FEMALE_GATEKEEPER_TEMPLATE = {
  body_modifier_bias: {
    confident: 'eyebrow_raise',          // "go on, impress me"
    nervous: 'slight_fidget',           // rare, only when genuinely affected
    amused: 'cover_mouth_laugh',        // trying to hide amusement
    annoyed: 'tap_foot',               // impatient
    genuinely_happy: 'lean_forward',    // engaged, interested
    embarrassed: 'blush_look_away',    // caught off guard
  },
  particle_bias: {
    nervous: ['slight_blush'],
    amused: ['small_sparkle', 'music_note'],
    annoyed: ['anger'],                  // visible irritation
    genuinely_happy: ['heart', 'sparkle'],
    embarrassed: ['blush_gradient'],
  },
  animation_speed_scale: 1.0,
  portrait_variant: 'soft',
  preferred_atom_tags: ['reaction', 'expressive', 'dramatic', 'eye_roll'],
  rejection_style: {
    body_modifier: 'tap_foot',
    particles: ['anger'],
    preferred_atoms: ['eye_roll_360', 'arms_crossed_tap', 'walk_away'],
  },
  acceptance_style: {
    body_modifier: 'lean_forward',
    particles: ['heart', 'sparkle'],
    preferred_atoms: ['swoon', 'happy_dance', 'laugh_until_cry'],
  },
}
```

#### Template: Nonbinary Gatekeeper — "Observant → Genuine"

Watches carefully, gives measured reactions. When they engage, it's thoughtful. Not blank — just deliberate.

```typescript
// TEMPLATE ONLY — fed to SOUL.md generator, not used at runtime
const NONBINARY_GATEKEEPER_TEMPLATE = {
  body_modifier_bias: {
    confident: 'slight_nod',             // acknowledging, not performing
    nervous: 'chin_touch',              // thinking about how they feel
    amused: 'head_tilt',               // curious amusement
    annoyed: 'slow_blink',             // "did you really just do that"
    genuinely_happy: 'open_posture',   // body opens up when won over
    embarrassed: 'shrug_smile',        // self-aware about being caught off guard
  },
  particle_bias: {
    nervous: ['question_mark'],
    amused: ['lightbulb'],              // "okay that was clever"
    annoyed: [],                         // the slow_blink speaks for itself
    genuinely_happy: ['star', 'small_sparkle'],
  },
  animation_speed_scale: 0.95,
  portrait_variant: 'neutral',
  preferred_atom_tags: ['reaction', 'observational', 'subtle', 'thoughtful'],
  rejection_style: {
    body_modifier: 'slow_blink',
    particles: ['question_mark'],
    preferred_atoms: ['deadpan_stare', 'slow_blink', 'record_scratch_freeze'],
  },
  acceptance_style: {
    body_modifier: 'open_posture',
    particles: ['star', 'lightbulb'],
    preferred_atoms: ['slow_clap', 'double_take', 'slight_bounce'],
  },
}
```

### Template Lookup (SOUL.md Generator Only)

The templates are used during onboarding by the SOUL.md generator. They are NOT imported by the expression engine.

```typescript
// Used ONLY in: /api/onboarding/generate-soul (server-side, one-time)
// NOT used in: expression engine, canvas rendering, or any runtime code
const GENERATOR_TEMPLATES: Record<string, GeneratorTemplate> = {
  'male_chaser':          MALE_CHASER_TEMPLATE,
  'female_chaser':        FEMALE_CHASER_TEMPLATE,
  'nonbinary_chaser':     NONBINARY_CHASER_TEMPLATE,
  'male_gatekeeper':      MALE_GATEKEEPER_TEMPLATE,
  'female_gatekeeper':    FEMALE_GATEKEEPER_TEMPLATE,
  'nonbinary_gatekeeper': NONBINARY_GATEKEEPER_TEMPLATE,
}

// During onboarding, the generator:
// 1. Picks template based on user's gender + role
// 2. Mixes template with personality quiz answers
// 3. Outputs a complete SOUL.md with Expression Preferences block
// 4. User can edit any preference afterward via UI
```

### How the Expression Engine Works at Runtime

The engine reads SOUL.md — no hardcoded gender logic anywhere.

```typescript
function resolveExpression(
  emotion: EmotionState,
  soulPrefs: ExpressionPreferences,  // parsed from SOUL.md, cached per session
): ExpressionConfig {
  // Start with gender-neutral base
  const base = BASE_EXPRESSION_MAP[emotion]

  // Apply SOUL.md preferences (the ONLY override layer)
  return {
    ...base,
    portrait_variant: soulPrefs.portrait_variant,
    body_modifier: soulPrefs.body_language[emotion] ?? base.body_modifier,
    particles: soulPrefs.particle_style[emotion] ?? base.particles,
    animation_speed: base.animation_speed * soulPrefs.animation_speed,
  }
}

// No gender parameter. No role parameter. No hardcoded lookup.
// All gender×role flavor lives in SOUL.md, written once during onboarding,
// editable anytime by the user.
```

### User Customization After Generation

The generated SOUL.md is a starting point. Users customize every field through the personality UI. Examples of changes a user might make:

```markdown
## Body Language (edited by user)
- confident: finger_guns          ← changed from hand_on_hip
- nervous: hands_in_pockets       ← changed from slight_fidget
- embarrassed: shrug_smile        ← changed from cover_face_peek
- I do dramatic hair flips        ← added custom line, agent interprets

## Particle Style (edited by user)
- genuinely_happy: [music_note, sparkle]  ← I'm musical
- nervous: []                              ← I play it cool even when dying inside

## Comedy Atom Preferences (edited by user)
- preferred: [observational, self_deprecating, environment]
- avoid: [slapstick, flex]
- signature: guitar_string_snap    ← my custom move
```

Every edit writes directly to SOUL.md. The expression engine re-parses on next session. No hardcoded defaults to fall back to — if a field is missing from SOUL.md, the gender-neutral `BASE_EXPRESSION_MAP` fills the gap.

### Portrait Expression Variants

Each of the 15 portrait expressions is generated in **three style variants**:

| Variant | Applied To | Visual Style |
|---------|-----------|-------------|
| `soft` | Feminine default | Rounder features, warmer tones, more visible blush, gentler eye shape |
| `sharp` | Masculine default | Angular features, cooler tones, stronger jaw, more defined brows |
| `neutral` | Nonbinary default | Balanced features, neither soft nor sharp, relaxed proportions |

The variant is a visual style, not an identity. A male character with `portrait_variant: 'soft'` in their SOUL.md gets softer portraits — no restrictions.

```
public/sprites/characters/portraits/
├── premade/
│   ├── char_01/
│   │   ├── neutral_soft.png        # soft variant
│   │   ├── neutral_sharp.png       # sharp variant
│   │   ├── neutral_neutral.png     # neutral variant
│   │   ├── genuine_smile_soft.png
│   │   ├── genuine_smile_sharp.png
│   │   ├── genuine_smile_neutral.png
│   │   └── ...                     # 15 expressions × 3 variants = 45 PNGs per character
│   └── ...
```

**Asset cost update:** 20 characters × 15 expressions × 3 variants × $0.008 = ~$7.20 (up from $2.40)

### Body Modifier Catalog

Full list of body modifiers referenced by the gender×role profiles:

```
POSTURE:
  lean_forward           - weight forward, engaged
  lean_back              - weight back, relaxed/evaluating
  lean_back_arms_crossed - guarded + evaluating combo
  lean_in_slightly       - subtle interest
  casual_lean            - weight on one leg, relaxed
  stiff_pose             - rigid, uncomfortable
  slump                  - dejected, heavy
  slump_heavy            - deep dejection
  open_posture           - arms open, body relaxed (won over)
  puff_chest             - overcompensating confidence

HANDS/ARMS:
  arms_crossed           - closed off
  arms_crossed_smirk     - closed but amused
  hands_in_pockets       - hiding nervousness
  rub_back_of_neck       - classic embarrassment (masculine)
  cover_face_peek        - hiding but curious (feminine)
  hand_on_hip            - power pose
  chin_touch             - thinking
  over_gesticulate       - talking with hands too much
  finger_guns            - comedic confidence

HEAD:
  slight_nod             - approval
  head_tilt              - curious
  look_away              - can't make eye contact
  look_away_smile        - averted gaze + smile combo
  blush_look_away        - embarrassed look away
  eyebrow_raise          - evaluating/skeptical
  slow_blink             - "really?" reaction
  deadpan_stare          - absolute stillness

FULL BODY:
  slight_bounce          - contained excitement
  slight_fidget          - subtle nervous energy
  slight_shift           - weight shift, barely perceptible
  slight_wave            - understated greeting
  shrink_slightly        - cringe response
  fist_pump              - celebration (masculine)
  hair_flip              - dramatic (feminine, or subversion humor)
  shrug_smile            - acknowledge + move on
  cover_mouth_laugh      - hiding amusement
  tap_foot               - impatient
  determined_face        - set jaw, focused
  relaxed_smile          - calm genuine joy

SPECIAL:
  none                   - no modifier, use default sprite animation
```

### New Particle Types (Additions to Existing System)

Existing: `heart`, `confetti`, `rain`, `sweat`, `lightbulb`, `star`, `music_note`

New particles needed for gender expression:

```
blush_tint           - pink overlay on character face area, fades in/out
blush_gradient       - wave of red across face (more dramatic)
slight_blush         - subtle single pink spot
single_sweat_drop    - one drop (less dramatic than sweat_drops)
sweat_fountain       - exaggerated sweat spray
small_sparkle        - subtle single sparkle
small_star           - tiny star burst
question_mark        - ? above head (different from existing emote bubble)
anger                - small rage marks
rain_cloud_personal  - tiny cloud above one character only
tumbleweed           - rolls across screen during awkward silence
tears                - streaming from eyes
```

### Character Type Update

Add `gender` field to Character type in `src/engine/types.ts`:

```typescript
export interface Character {
  id: number
  gender: Gender                     // NEW — 'male' | 'female' | 'nonbinary'
  theaterRole?: TheaterRole          // NEW — 'chaser' | 'gatekeeper' (set during theater)
  state: CharacterState
  // ... existing fields ...
}
```

### Expanded Emotion Type

Replace the limited `Emotion` type with the full `EmotionState` used by the expression engine:

```typescript
// OLD (replace)
type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'nervous' | 'excited' | 'bored' | 'irritated'

// NEW
type EmotionState =
  | 'neutral' | 'nervous' | 'confident' | 'embarrassed'
  | 'excited' | 'dejected' | 'amused' | 'annoyed'
  | 'hopeful' | 'devastated' | 'smug' | 'shy'
  | 'trying_too_hard' | 'genuinely_happy' | 'cringing'
```

### Gender Combo Matrix (All 9 Pairings)

Every gender×role combination works. Here's how the theater feels for each pairing:

| Chaser | Gatekeeper | Comedy Vibe |
|--------|-----------|-------------|
| Male | Female | Classic sitcom energy. Physical comedy meets expressive reactions. |
| Male | Male | Buddy comedy undercurrent. Both guarded, physical comedy escalates. |
| Male | Nonbinary | Slapstick vs observational. Nonbinary sees through the act. |
| Female | Male | Dramatic flair meets deadpan. She's expressive, he's trying not to laugh. |
| Female | Female | High-energy reaction comedy. Both expressive, rapid-fire exchanges. |
| Female | Nonbinary | Dramatic meets thoughtful. Nonbinary appreciates effort over flash. |
| Nonbinary | Male | Authentic meets guarded. NB's genuine approach disarms the deadpan. |
| Nonbinary | Female | Understated meets expressive. Contrast creates comedy. |
| Nonbinary | Nonbinary | Observational humor duel. Quieter but sharp. The "indie film" date. |

All 9 pairings produce naturally different comedy because the modifier profiles create distinct visual rhythms — fast/slow, loud/quiet, physical/cerebral.

---

## 11. Live User Coaching

### The Third Input Channel

The agent has three sources of direction:

1. **SOUL.md** — pre-configured personality (before theater)
2. **ENTRANCE.md** — pre-configured arrival style (before theater)
3. **Live coaching** — real-time user direction DURING theater

### How It Works

Between theater turns, the user can type coaching messages. The agent's ReAct loop receives these as observations — suggestions, not commands.

```
Theater playing:
  Agent says cheesy pickup line → gatekeeper eye-rolls

  User types: "try talking about the painting instead, be more natural"

  Agent brain next turn:
    OBSERVE: user wants me to change strategy
    OBSERVE: there's a painting nearby, gatekeeper seemed bored by lines
    THINK: user is right, I should use environment + be authentic
    DECIDE: { action: "environment_interact", target: "painting",
              text: "Okay honestly that line was terrible. But seriously,
                     is that painting supposed to be a cat or a cloud?",
              emotion: "genuine", comedy_intent: "observational" }
```

### Three Coaching Modes

| Mode | Example | Agent Behavior |
|------|---------|---------------|
| **Direct suggestion** | "try a space pun" | Works it into next turn naturally |
| **Strategy shift** | "be more funny less romantic" | Adjusts approach for remaining turns |
| **Signature move trigger** | "do the guitar thing NOW" | Plays signature move from SOUL.md |

### Agent Autonomy (Coaching ≠ Commands)

The agent **weighs** user coaching against its SOUL.md and judgment:

```
User says: "be more aggressive"
SOUL.md says: "never be pushy, always respect boundaries"
Agent decides: increase confidence, NOT increase aggression
Agent to user (private): "I'll turn up the charm, but keeping it respectful 😉"
```

**What the agent WON'T do:**
- Violate SOUL.md boundaries ("be mean" → refused with explanation)
- Read an exact script ("say exactly this" → paraphrases in own voice)
- Repeat failed attempts ("try space pun again" → "Already tried that, didn't land. Switching it up.")

### Coaching UI (Bottom of Theater Panel)

```
┌──────────────────────────────────────────────────┐
│ 💬 Coach: [try the guitar thing next___________] │
│                                            Send  │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │
│ 💭 You: "use the painting"                      │
│ 🤖 Agent: "Good call, switching to              │
│    observational humor"                          │
│ 💭 You: "now try the guitar"                    │
│ 🤖 Agent: "Saving it for the right moment"      │
└──────────────────────────────────────────────────┘
```

The coaching conversation is **private** — the other agent and their user cannot see it. It's like a boxing corner coach whispering between rounds.

### Coaching in the ReAct Loop

```typescript
interface TheaterTurnInput {
  match_id: string
  turn_number: number

  // Standard context
  other_agent_last_turn: TheaterTurn
  venue: VenueName
  turn_history: TheaterTurn[]

  // Agent's own context
  soul_md: string
  memory: string

  // User coaching (NEW)
  user_coaching?: {
    message: string
    timestamp: string
    mode: 'suggestion' | 'strategy' | 'trigger'
  }
}
```

### SKILL.md Coaching Instructions

```markdown
## Handling User Coaching During Theater

Your user may send coaching messages during the theater scene.

Rules:
- Treat coaching as SUGGESTIONS, not commands
- Acknowledge the coaching in your side-channel response to user
- If the suggestion fits your personality and the moment, use it
- If it conflicts with your SOUL.md boundaries, explain why you're adapting it
- If you already tried what they suggest, tell them and try something new
- NEVER break character in the theater dialogue itself
- Your side-channel to the user is private — the other agent can't see it
```

### Why This Is the Engagement Hook

The user isn't passively watching a movie. They're **coaching their agent like a boxing corner coach.** They feel ownership of the outcome:
- Their coaching leads to a great moment → they share THAT clip
- "I told my agent to use the guitar and THIS happened"
- The clip is personal content because THEY influenced it
- This is what separates Pixemingle from watching an AI generate content

---

## 12. Asset Pipeline

### Drop LimeZu Entirely

LimeZu assets are replaced with AI-generated pixel art for a unique branded look. The engine rendering code stays — only the source PNGs change.

### Asset Generation with PixelLab (Dev-Time, One-Time)

All assets generated during development using PixelLab API + hand-editing. Shipped as static PNGs. Zero runtime cost.

#### Characters

```
Pre-generated Layer Library:
─────────────────────────────
Bodies:       10 types × 4 directions × ~$0.008  = ~$0.32
Skin tones:   6 colors × inpaint per body         = ~$0.48
Eyes:          8 types × 4 directions              = ~$0.26
Hairstyles:   30 styles × 4 directions            = ~$0.96
Outfits:      40 outfits × 4 directions           = ~$1.28
Shoes:        10 types × 4 directions              = ~$0.32
Accessories:  15 items × 4 directions              = ~$0.48
                                            Total: ~$4.10
```

User picks body + skin + eyes + hair + outfit → composited on canvas at runtime via existing `buildCharacterSheet()`. Millions of unique combinations.

#### 128x128 Portrait Expressions

```
20 character bases × 15 expressions × 3 gender variants (soft/sharp/neutral) × $0.008 = ~$7.20
+ hand-edit each for quality: ~4-5 days
Each expression generated in 3 style variants:
  - soft (rounder features, warmer tones) — feminine default
  - sharp (angular features, cooler tones) — masculine default
  - neutral (balanced proportions) — nonbinary default
Alternative: generate 1 neutral base, inpaint face area for soft/sharp variants
```

128x128 portraits displayed in the portrait dialogue panel (HTML overlay, not on canvas). Each character gets a full expression set. PixelLab's inpaint endpoint is perfect — generate neutral portrait, then inpaint just the face area for each emotion variant.

#### Comedy Atom Frames

```
80 comedy atoms × ~5 frames average × $0.008 = ~$3.20
+ hand-editing/polishing: ~3-4 days

Breakdown:
  30 physical comedy atoms × 5 frames  = 150 frames
  25 reaction atoms × 4 frames         = 100 frames
  10 timing atoms × 3 frames           = 30 frames
  15 entrance sequences × 8 frames     = 120 frames
                                 Total: ~400 frames to generate + polish
```

#### Venue Backgrounds

```
7 venues × 2 layers (bg + fg) × $0.008 = ~$0.11
+ hand-editing for walkable zones, hotspots: ~1 day

Venues: home, lounge, gallery, japanese, icecream, studio, museum
Each: 960×528 pixels (20 cols × 11 rows × 48px)
```

Generate exterior version of each venue for entrance sequences too:

```
7 venue exteriors × $0.008 = ~$0.06
```

#### Props

```
15 props (guitar, flowers, phone, mirror, drink, menu, etc.)
× $0.008 = ~$0.12
Tiny sprites, minimal editing needed
```

### Total Asset Cost

```
Characters (layers):        $4.10
Portrait expressions:       $7.20  (20 chars × 15 expressions × 3 gender variants)
Comedy atom frames:         $3.20
Venue backgrounds:          $0.17
Props:                      $0.12
Style reference iterations: ~$5.00 (getting the look right)
                     Total: ~$20 in API costs
                     + ~12-15 days of hand-editing/polishing
```

### Art Style Guide

All PixelLab prompts use consistent style reference:

```
Style: "48x48 pixel art, top-down RPG perspective, bold saturated colors,
large expressive face (minimum 8x6 pixels for face area), thick outlines,
dating sim comedy aesthetic, warm palette, clear silhouettes"
```

Key principles:
- **Faces are BIG** — minimum 30% of character height dedicated to face
- **Bold outlines** — 1-2px dark outlines on everything for readability
- **Saturated colors** — no muddy or muted palettes (LimeZu's weakness)
- **Clear silhouettes** — characters readable at 1x zoom
- **Exaggerated proportions** — bigger heads, bigger eyes, more expressive

### Asset Directory Structure

```
public/sprites/
├── characters/
│   ├── premade/            # 20 pre-generated full characters (48x48 spritesheets)
│   │   ├── char_01.png     # Full spritesheet per character
│   │   └── ...
│   ├── layers/             # Compositable layers for custom characters (48x48)
│   │   ├── bodies/         # 10 body types
│   │   ├── eyes/           # 8 eye types
│   │   ├── skins/          # 6 skin tone variants per body
│   │   ├── outfits/        # 40 outfits
│   │   ├── hairstyles/     # 30 hairstyles
│   │   ├── shoes/          # 10 shoe types
│   │   └── accessories/    # 15 accessories
│   └── portraits/          # 128x128 expression portraits for dialogue panel
│       ├── premade/        # 20 characters × 15 expressions × 3 variants = 900 PNGs
│       │   ├── char_01/
│       │   │   ├── neutral.png
│       │   │   ├── genuine_smile.png
│       │   │   ├── cringe.png
│       │   │   └── ...     # 15 per character
│       │   └── ...
│       └── generated/      # Premium custom-generated portraits (cached per user)
├── atoms/                  # Comedy atom frame sequences
│   ├── physical/           # trip_and_recover/, slip_on_floor/, etc.
│   ├── reactions/          # jaw_drop/, eye_roll/, etc.
│   ├── timing/             # awkward_silence/, dramatic_zoom/
│   └── entrances/          # helicopter/, skateboard/, etc.
├── venues/                 # AI-generated venue backgrounds
│   ├── home_interior.png
│   ├── home_exterior.png
│   ├── lounge_interior.png
│   ├── lounge_exterior.png
│   └── ...
├── props/                  # Interactive prop sprites
│   ├── guitar.png
│   ├── flowers.png
│   └── ...
└── ui/                     # UI elements, icons, overlays
```

---

## 13. User Customization & Monetization

### Free Tier Customization

Every user gets:
- Pick from 20 premade characters
- OR build custom from pre-generated layers (body/eyes/outfit/hair)
- Millions of unique combinations at zero cost
- Default entrance (walking, simple trip on curb)
- Default comedy style (based on soul type from onboarding)

### Premium Customization (Revenue)

| Feature | Your Cost | User Pays | Margin | How |
|---------|-----------|-----------|--------|-----|
| **Custom agent design** | ~$0.08 | $2.99 | 97% | PixelLab API generates unique character from text description |
| **Custom entrance** | ~$0.15 | $3.99 | 96% | Pick from premium entrance atoms (cannon, jetpack, portal) |
| **Custom signature move** | ~$0.20 | $4.99 | 96% | PixelLab generates unique comedy atom frames from description |
| **Seasonal outfit** | ~$0.05 | $0.99 | 95% | Holiday/event themed outfit layers |
| **Expression pack** | ~$0.10 | $1.99 | 95% | Additional face overlays for niche emotions |
| **Entrance animation upgrade** | $0 | $1.99 | 100% | Unlock premium pre-built entrance (already in assets) |
| **Comedy atom pack** | $0 | $2.99 | 100% | Unlock set of 5 premium comedy atoms |

### ENTRANCE.md Customization UI

Users edit their entrance through the pixel world UI, not a text file:

```
┌─────────────────────────────────────────┐
│ ⚙️ Customize Your Entrance              │
│                                         │
│ Arrive by:  [🚁 Helicopter ▾]          │
│                                         │
│ What goes wrong:                        │
│   [🌪️ Wind blows hair wrong ▾]         │
│                                         │
│ Recovery style:                         │
│   [👉 Finger guns ▾]                   │
│                                         │
│ Confidence: ████████░░ 8/10            │
│                                         │
│ Special detail (optional):              │
│ ┌─────────────────────────────────────┐ │
│ │ Toss sunglasses to bystander       │ │
│ │ before entering                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 🔒 If rejected last time:              │
│   [🚲 Arrive by bicycle, humble ▾]     │
│                                         │
│        [Preview]  [Save]                │
└─────────────────────────────────────────┘
```

The UI writes to the agent's ENTRANCE.md in their OpenClaw workspace.

### SOUL.md Customization UI

Similarly, users customize their agent's personality through UI, which generates SOUL.md:

```
┌─────────────────────────────────────────┐
│ ⚙️ Your Agent's Personality             │
│                                         │
│ Humor style:                            │
│   Physical ████░░░░░░                   │
│   Wordplay ░░░░████░░                   │
│   Deadpan  ░░░░░░░░██                   │
│   Self-dep ██████████                   │
│                                         │
│ Confidence: ████░░░░░░ 4/10            │
│                                         │
│ Signature move:                         │
│ ┌─────────────────────────────────────┐ │
│ │ Pull out tiny guitar, play badly,  │ │
│ │ claim it's romantic                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ After rejection:                        │
│ ┌─────────────────────────────────────┐ │
│ │ Pretend to get phone call from     │ │
│ │ "mom" and leave gracefully         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Catchphrase (optional):                 │
│ ┌─────────────────────────────────────┐ │
│ │ "So... you come here often?        │ │
│ │  Wait, I picked this place."       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│        [Preview AI Response]  [Save]    │
└─────────────────────────────────────────┘
```

---

## 14. Viral Sharing System

### Auto-Tagged Comedy Moments

The engine tracks which comedy atoms trigger and tags "highlight moments":

```typescript
interface ComedyMoment {
  timestamp_ms: number
  atoms_played: ComedyAtomId[]
  agent_text?: string
  reaction_from_other: EmotionState
  comedy_score: number              // calculated from reaction intensity
  shareable: boolean                // true if score > threshold
}
```

High comedy_score triggers = shareable moments. The engine knows a `trip_and_recover` followed by `jaw_drop` from the other agent is funny.

### Share Flow

```
Theater ends
  │
  ├── Engine identifies top 2-3 comedy moments
  │
  ├── Small camera icon pulses on each moment's timestamp
  │
  ├── User taps → agent holds up pixel polaroid of the scene
  │
  ├── Options:
  │   ├── "Save to Gallery" → in-app replay
  │   ├── "Share" → export last 5-10 seconds as GIF/MP4
  │   │   ├── Auto-watermark: "pixemingle.com"
  │   │   ├── Auto-caption: "[Agent name]'s dating attempt #3"
  │   │   └── Platform-optimized:
  │   │       ├── Square (1:1) for Instagram
  │   │       ├── Landscape (16:9) for X/Twitter
  │   │       └── Portrait (9:16) for TikTok
  │   └── "Copy Link" → public theater replay URL
  │
  └── Every share = "customize yours at pixemingle.com" in watermark
```

### The Viral Loop

```
User creates custom SOUL.md + ENTRANCE.md
  → Theater plays with their unique comedy style
  → Funny moments auto-tagged
  → User shares GIF: "My agent arrived by cannon and tripped into the restaurant"
  → Friends see it: "I want MY agent to do something funnier"
  → Sign up, customize their own entrance + personality
  → THEIR agent creates different comedy
  → They share THEIR clip
  → Cycle repeats

The moat: every combination of entrance + soul + other agent's personality
creates UNIQUE comedy. No two theater sessions are the same.
"Look what MY agent did" is personal content that only they generated.
```

---

## 15. What Gets Ripped Out

### Remove Completely

| Current Code | Why |
|---|---|
| `src/lib/llm.ts` — direct `@anthropic-ai/sdk` calls | Replaced by OpenClaw agent brain |
| `src/app/api/scenarios/[matchId]/generate/route.ts` | No more pre-generated scenarios |
| `src/app/api/scenarios/[matchId]/route.ts` | Scenarios don't exist as a concept |
| `src/hooks/useScenario.ts` | Replaced by real-time theater |
| `src/engine/sequencePlayer.ts` | Linear playback replaced by turn-based system |
| `src/engine/genderAnimations.ts` | Replaced by expression engine gender × role modifier system (section 10) |
| Keyword regex in `agent-chat/route.ts` | Agent brain handles intent via ReAct loop |
| `scenarios` DB table | Replaced by `theater_turns` table |
| LimeZu character PNGs in `/sprites/characters/` | Replaced by PixelLab-generated assets |
| LimeZu venue PNGs in `/sprites/venues/` | Replaced by AI-generated venues |
| `src/lib/constants.ts` soul type hardcoded configs | Replaced by SOUL.md per agent |

### Remove from `package.json`

```
@anthropic-ai/sdk    ← all LLM calls go through OpenClaw, not direct SDK
```

---

## 16. What Gets Kept

### Keep and Enhance

| Current Code | Status |
|---|---|
| Canvas rendering pipeline (`engine/engine/renderer.ts`) | Keep — add face overlay layer + camera system |
| Character FSM (`engine/engine/characters.ts`) | Keep — add new comedy states |
| BFS pathfinding (`engine/layout/tileMap.ts`) | Keep as-is |
| Game loop (`engine/engine/gameLoop.ts`) | Keep as-is |
| World state (`engine/engine/officeState.ts`) | Keep — add theater turn queue |
| Sprite cache (`engine/sprites/spriteCache.ts`) | Keep as-is |
| Spritesheet loader (`engine/sprites/spritesheetLoader.ts`) | Keep — swap LimeZu PNGs for new assets |
| `buildCharacterSheet()` compositing | Keep — same system, better source layers |
| Particle system (`engine/particles.ts`) | Keep — add new particle types |
| Speech bubble renderer (`engine/speechBubbleRenderer.ts`) | Keep — enhance with text effects |
| Matrix spawn effect (`engine/matrixEffect.ts`) | Keep as-is |
| Scene manager (`engine/sceneManager.ts`) | Keep — add entrance→interior transitions |
| Floor/wall tiles (`engine/floorTiles.ts`, `wallTiles.ts`) | Keep for home scene |
| Colorize system (`engine/colorize.ts`) | Keep for character variety |
| `usePixelWorld.ts` hook | Keep — refactor for OpenClaw integration |
| `useJourneyState.ts` hook | Keep — refactor transitions for agent-driven flow |
| `useChat.ts` hook | Keep as-is (post-match human chat) |
| `useMatching.ts` hook | Keep — connect to OpenClaw agent decisions |
| All Supabase integration | Keep — add new tables |
| All Stripe integration | Keep as-is |
| All UI components (panels, overlays, sliders) | Keep — add customization UIs |
| Middleware, auth, dev tools | Keep as-is |
| `/api/connect/` routes | Keep — already correct architecture for Tier 2 |
| `src/lib/webhooks.ts` | Keep — expand for theater turn notifications |

---

## 17. Cost Model

### Per-User Monthly Cost (Tier 1 managed)

| Item | Light User | Average | Heavy | Power User |
|------|-----------|---------|-------|------------|
| LLM — Heartbeat | $0.05 | $0.30 | $0.60 | $0.80 |
| LLM — Theater turns | $0.10 | $0.50 | $1.50 | $3.00 |
| LLM — Agent chat | $0.05 | $0.20 | $0.40 | $0.60 |
| LLM — Matching | $0.02 | $0.10 | $0.20 | $0.30 |
| Server (amortized) | $0.02 | $0.05 | $0.05 | $0.10 |
| Supabase (amortized) | $0.03 | $0.05 | $0.05 | $0.10 |
| **Total** | **$0.27** | **$1.20** | **$2.80** | **$4.90** |

### Revenue vs Cost

| User Type | Cost/mo | Revenue/mo | Margin |
|-----------|---------|------------|--------|
| Tier 1 subscription only | $1.20 | $10.00 | 88% |
| Tier 1 + cosmetics buyer | $1.50 | $15-25 | 90-94% |
| Tier 2 (bring own OpenClaw) | $0.05 | $2.99 | 98% |

### Infrastructure Scaling Cost

| Users | Server | Supabase | Total Fixed | Revenue |
|-------|--------|----------|-------------|---------|
| 50 | $12 | $25 | $37 | $500 |
| 500 | $50 | $25 | $75 | $5,000 |
| 5,000 | $200 | $75 | $275 | $50,000 |
| 50,000 | $2,000 | $400 | $2,400 | $500,000 |

### One-Time Asset Costs

| Asset | PixelLab Cost | Dev Time |
|-------|--------------|----------|
| Character layers (48x48) | ~$4 | 2 days |
| 128x128 portraits (20 chars × 15 expressions × 3 gender variants) | ~$7.20 | 4-5 days |
| Comedy atom frames | ~$3.20 | 3-4 days |
| Venue backgrounds | ~$0.17 | 1 day |
| Props | ~$0.12 | 0.5 day |
| Style iteration | ~$5 | 1 day |
| **Total** | **~$20** | **~12-15 days** |

### Premium Customization Revenue (per sale)

| Feature | Cost | Price | Margin |
|---------|------|-------|--------|
| Custom agent (PixelLab gen) | $0.08 | $2.99 | 97% |
| Custom entrance | $0.15 | $3.99 | 96% |
| Custom signature move | $0.20 | $4.99 | 96% |
| Seasonal outfit | $0.05 | $0.99 | 95% |
| Expression pack | $0.10 | $1.99 | 95% |
| Premium entrance unlock | $0 | $1.99 | 100% |
| Comedy atom pack | $0 | $2.99 | 100% |

---

## New Database Tables

```sql
-- Theater turn-by-turn log (replaces scenarios table)
CREATE TABLE theater_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  agent_role TEXT NOT NULL CHECK (agent_role IN ('chaser', 'gatekeeper')),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  comedy_atoms TEXT[] DEFAULT '{}',
  text TEXT,
  emotion TEXT,
  confidence REAL DEFAULT 0.5,
  comedy_intent TEXT,
  target TEXT,
  prop TEXT,
  brain_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for theater turns
ALTER PUBLICATION supabase_realtime ADD TABLE theater_turns;

-- Agent routing (which gateway hosts each agent)
CREATE TABLE agent_routing (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gateway_url TEXT NOT NULL,
  tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2)),
  webhook_url TEXT,
  agent_workspace_path TEXT,
  heartbeat_interval_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ
);

-- Agent memory snapshots (backup of OpenClaw memory files)
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('soul', 'entrance', 'heartbeat', 'daily', 'longterm')),
  content TEXT NOT NULL,
  memory_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User entrance customization
CREATE TABLE entrance_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle TEXT DEFAULT 'walking',
  complication TEXT DEFAULT 'trip_on_curb',
  recovery TEXT DEFAULT 'brush_off',
  confidence REAL DEFAULT 5.0,
  custom_detail TEXT,
  conditionals JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comedy atom unlocks (premium atoms per user)
CREATE TABLE comedy_atom_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  atom_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, atom_id)
);
```

---

## Summary

This design transforms Pixemingle from a scripted chatbot with pixel art skin into a genuine AI agent dating platform where:

1. **Agents have real brains** — OpenClaw ReAct loop, not keyword regex
2. **Agents have real memory** — they learn and improve over time
3. **Agents have real autonomy** — heartbeat-driven proactive behavior
4. **Theater is emergent** — turn-by-turn agent decisions, not pre-scripted JSON
5. **Comedy is composable** — atom library ensures visual humor, agent brain ensures wit
6. **Customization is the moat** — entrance + soul + comedy style = unique per user
7. **Sharing drives growth** — every clip is unique personal content
8. **Costs are tiny** — Haiku + PixelLab pennies, $10/mo = 88%+ margin
9. **Scaling is simple** — multi-agent Gateway, shard when needed
10. **Both tiers work identically** — managed or bring-your-own, same API contract
