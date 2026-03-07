# Full Journey Flow & Theater System Design

**Date:** March 8, 2026
**Status:** Approved

---

## Summary

Complete the Pixemingle user journey from agent spawn to post-match chat. Single-page `/world` experience — user never leaves the canvas. Agent AI chat via bottom input bar with speech bubble responses on canvas. Gender-aware theatrical animations for all chaser/gatekeeper combinations. Candidate browsing via fast slider (no slow walking). Gatekeeper can flip to chaser after timeout nudge.

---

## Architecture: Single Page Hub + Theater

- One canvas, always running at `/world`
- Two scene types: **Home** (persistent hub) + **Venue** (temporary theater)
- Home scene: LimeZu `6_Home_Designs/Generic_Home_Designs` (layer1 + layer2)
- 6 venue scenes: lounge, gallery, japanese, icecream, studio, museum (existing, layer1 + layer2 PNGs)
- Scene transitions via existing `SceneManager` fade

---

## Journey State Machine

```
HOME_IDLE -> RESEARCHING -> BROWSING -> PROPOSING -> WAITING -> THEATER -> POST_MATCH -> HOME_IDLE
```

| State | Scene | What Happens | User Controls |
|-------|-------|-------------|---------------|
| HOME_IDLE | Home | Agent wanders, idles, checks mirror | Chat with agent via bottom bar |
| RESEARCHING | Home | Agent at desk, montage plays (10s) | Watch, agent commentary via bubbles |
| BROWSING | Home | Candidate slider on wall, agent comments per candidate | Swipe/arrows through candidates, tap for ProfilePanel |
| PROPOSING | Home | Chaser picks venue via DateProposalCard | Select venue, confirm |
| WAITING | Home | Agent fidgets, checks phone (LimeZu phone action) | Wait for gatekeeper response |
| THEATER | Venue | Full FlirtScenario plays with gender-aware animations | Watch the show, agent comments in bottom bar |
| POST_MATCH | Lounge | Both agents in lounge, human chat in right panel | Chat with match, or "find another" -> soul_ghost_escape -> HOME_IDLE |

---

## UI Layout

```
+--------------------------------------------------+
|                                                  |
|              CANVAS (pixel world)                |
|          agent + speech bubbles + emotes         |
|                                                  |
|                          +---right side panel----+
|                          | Human match chat      |
|                          | (traditional style)   |
|                          | scrollable history    |
|                          | only visible post-    |
|                          | match, collapsible    |
|                          +----------------------+|
+--------------------------------------------------+
| [^] [ type message to your agent...    ] [send] |
+--------------------------------------------------+
```

### Bottom Input Bar
- Thin fixed bar at bottom
- Text input + send button
- Small "^" button expands to show last ~20 agent messages (scrollable log)
- Collapses back to thin input-only bar
- Agent responses appear as speech bubbles on canvas above agent, NOT in the bar

### Right Side Panel (Human Match Chat)
- Traditional chat app: full height, scrollable history, message bubbles, timestamps
- Slides in from right (like existing ProfilePanel)
- Toggle button / notification badge to open
- Auto-hides during THEATER state, minimizes to floating badge
- After theater -> slides in for post-match chat
- Distinct visual style from agent bubbles: match photo avatar, blue/green name color, lighter background

### Agent Speech Bubbles (Canvas)
- LimeZu `UI_48x48.png` bubble frames with actual text rendered inside
- Word wrap, pixel font, auto-size
- Auto-dismiss after a few seconds
- Queue if multiple lines
- Sequential bubbles for longer responses

---

## Date Invitation Arrival (Gatekeeper Side)

When a gatekeeper user is in HOME_IDLE or BROWSING:

1. Notification arrives: proposer's photo appears in a pixel frame on their home wall with glowing/pulsing border + heart emote
2. Agent reacts: speech bubble "Hey, someone wants to take you out!" + excited emote
3. Tapping the photo frame opens `DateInvitationCard` (already built) with invite text, venue, accept/counter/decline
4. If user is offline: browser push notification (already built) brings them back

---

## Gatekeeper Nudge (Role Flip)

- After ~30s of waiting, gatekeeper gets prompt via agent speech bubble: "Want to make the first move instead?"
- If yes: roles flip — gatekeeper becomes chaser, original chaser becomes gatekeeper
- Gender-appropriate animation set loads for NEW role assignments
- Claude regenerates scenario with flipped roles + correct gender theater style
- If no: continue waiting normally

---

## Gender-Aware Theater System

Gender from user profile: `'male' | 'female' | 'nonbinary'`
Looking_for: `'male' | 'female' | 'everyone'`

### Chaser Animation Sets (by gender)

**Male Chaser:**
- Approach: confident walk, chest out
- Rejected: angry kick can, sad slump, defeated shuffle walkoff
- Venue countered: "oh man..." + wardrobe change
- Winning: flower offer, nervous sweat
- Victory: victory dance + confetti

**Female Chaser:**
- Approach: casual "oh fancy seeing you here"
- Rejected: dramatic tears OR evil grin + new scheme, "you'll regret this" storm-off
- Venue countered: eye roll + attitude outfit change
- Winning: cornering, playing with hair, trap set
- Victory: celebration + hair flip

**Nonbinary Chaser:**
- Mixes from both male and female pools
- Claude picks per soul type + scenario context
- A few unique animations: unbothered shrug + "their loss" energy

### Gatekeeper Animation Sets (by gender)

**Male Gatekeeper:**
- Plays cool, unbothered shrug
- Tries to escape, reluctant warming up
- Eventually caves with "I suppose" energy

**Female Gatekeeper:**
- Eye roll, playing hard to get, hair flip
- Dramatic "I suppose..." warming
- Classic hard-to-get arc

**Nonbinary Gatekeeper:**
- Mixed from both sets, soul type driven

### Claude Prompt Integration

Scenario generation prompt receives:
- Chaser gender + soul type
- Gatekeeper gender + soul type
- Both `looking_for` preferences (affects dialogue tone)
- Venue context
- Claude selects gender-appropriate actions in FlirtStep output

---

## Candidate Browsing (Slider)

- Horizontal slider/carousel on home scene wall
- Arrow keys, swipe, or click arrows to browse fast
- Agent reacts per candidate with speech bubble: similarity score, fun facts, compatibility (from existing `MatchReasons`: `reasons.personality`, `reasons.horoscope`, `reasons.shared`, `reasons.explanation`)
- Tap/click candidate -> `ProfilePanel` slides in (already built)
- "Send My Agent!" -> approve flow -> PROPOSING state
- "Keep Looking" -> next candidate
- "Find another" via chat -> soul_ghost_escape animation -> next candidate

---

## Soul Ghost Escape Animation

- When user says "next" / "find another" or passes on a candidate
- Agent's soul floats out semi-transparent with sad face (4 frames)
- From design doc: `soul_ghost_escape` — semi-transparent float up
- Then agent resets, loads next candidate, cheerful again

---

## In-World Speech Bubbles

- Parse LimeZu `UI_48x48.png` for bubble frame sprites (speech, thought, shout variants)
- Render actual text inside bubble on canvas above speaking character
- Replace current icon-only `renderBubbles()` in `renderer.ts` with text-capable version
- Pixel font rendering, word wrap, auto-size to text length
- Used for: agent AI responses, theater dialogue (DELIVER_LINE), emote reactions

---

## Emote System

- Load from LimeZu `UI_48x48.png`: heart, !, ?, anger, music, teardrop icons
- Load `UI_thinking_emotes_animation_48x48.png` for animated versions
- Map to character states:
  - REACT_EMOTION -> heart / anger / ? (based on emotion field)
  - CELEBRATE -> music / star / confetti
  - DESPAIR -> teardrop
- Render above character head, can coexist with speech bubbles (emote floats higher)

---

## Venue Layout Fix

- Current venue PNGs render with gaps / non-rectangular missing parts
- Fix walkable area masks to match actual room shapes from layer1 PNGs
- Ensure characters don't walk into transparent/missing areas

---

## Post-Match Chat in Lounge

- After successful theater -> fade to lounge scene
- Both user agents present, idle/wander in lounge
- Right side panel opens with human-to-human chat (existing ChatPanel logic, Supabase realtime)
- Agent occasionally reacts to chat messages with emotes/speech bubbles on canvas
- User can say "find me another" via bottom bar -> soul_ghost_escape -> HOME_IDLE

---

## Props System

- Theater props rendered attached to characters during FlirtScenario steps
- Existing: wardrobe (16x32), can (6x6) — already in spriteData.ts
- New props needed: flowers, guitar, coffee cup, notepad, magnifying glass
- Props spawn/despawn via SequencePlayer callbacks (already wired: `onPropSpawn`, `onPropDespawn`)
- Gender-specific prop usage: male chaser gets flowers, female chaser gets different props per soul type

---

## LimeZu Spritesheet Action Mapping

Available from character spritesheets (per LimeZu guide):
idle, walk, sleep, sit (2 types), phone (loop), idle_anim (breathing), push_cart, pick_up, gift, lift, throw, hit, punch, stab, grab_gun, gun_idle, shoot, hurt

### Mapping to our FSM states:

| Our State | LimeZu Action | Notes |
|-----------|--------------|-------|
| IDLE | idle / idle_anim | Breathing loop when standing |
| WALK | walk | 4 dirs, multi-frame |
| TYPE | sit (type 1) | At desk during research |
| APPROACH | walk (faster) | Increased speed constant |
| DELIVER_LINE | idle + speech bubble | Standing pose with text |
| REACT_EMOTION | hurt / idle_anim | + emote overlay |
| USE_PROP | gift / pick_up / throw | Depends on prop type |
| CELEBRATE | gift + jump offset | + confetti particles |
| DESPAIR | hurt | + rain/teardrop |
| WALK_AWAY | walk (reversed dir) | Sad walkoff |
| ANGRY_KICK | hit / punch | + can prop arc |
| BLUSH | idle_anim | + heart emote + color tint |
| THINK | phone / idle | + thought bubble emote |

### Gender-specific overrides:

| Action | Male | Female |
|--------|------|--------|
| Approach | walk (confident, fast) | walk (casual pace) |
| Rejection react | hit (angry kick) | hurt (dramatic tears) OR idle (scheming grin) |
| Walkoff | walk (defeated shuffle, slow) | walk (storm-off, fast) OR walk (dramatic exit) |
| Winning move | gift (flower offer) | idle_anim (hair play) + walk (cornering) |
| Victory | gift + jump | idle_anim + hair flip emote |

---

## Existing Code Inventory (Built, Needs Wiring)

| Component | Status | Needs |
|-----------|--------|-------|
| `MontagePlayer` + `createResearchMontage()` | Built, not wired | Connect to journey state HOME_IDLE -> RESEARCHING |
| `ProfilePanel` | Built | Already works, just needs slider trigger |
| `PhotoOverlay` + `usePhotoOverlay` | Built | Rework to slider instead of wall grid |
| `ChatPanel` | Built (sidebar) | Rework to right side panel for match chat |
| `useMatching` (search/approve/pass) | Built | Wire into journey state machine |
| `DateProposalCard` / `DateInvitationCard` | Built | Wire into PROPOSING state |
| `SequencePlayer` + reaction sequences | Built | Add gender-aware step variants |
| `SceneManager` with fade | Built | Add home scene |
| `venueAssets.ts` furniture mapping | Built | Keep, fix layouts |
| Venue layer1 + layer2 PNGs | Built (6 venues) | Fix gaps |
| Character spritesheet compositor | Built | Map more actions |
| Particle system | Built | Integrate with emotes |
| Realtime broadcast events | Built | Wire into journey state machine |
| Browser push notifications | Built | Already works |

---

## Phases

### Phase 1: Foundation & Home Scene (5 tasks)
1. Home scene (LimeZu Home_Designs layer PNGs + walkable area)
2. Agent AI input bar at bottom + speech bubble responses on canvas + expandable log
3. Wire research montage into home scene
4. Candidate photo slider + agent commentary from MatchReasons
5. Venue layout fix (non-rectangular gaps in all 6 venues)

### Phase 2: Theater & Gender System (6 tasks)
1. Gender-aware animation sets (male/female/nonbinary chaser + gatekeeper)
2. Gatekeeper nudge + role flip after 30s timeout
3. Full theater sequence wiring with gender-aware animations + Claude prompt
4. In-world speech bubbles with text (LimeZu UI_48x48 frames)
5. Emote system (LimeZu animated emotes mapped to states)
6. Soul ghost escape animation (4 frames, semi-transparent float up)

### Phase 3: Flow Integration & Chat (4 tasks)
1. Journey state machine (HOME_IDLE through POST_MATCH cycle)
2. Post-match chat in lounge (right side panel, traditional chat)
3. Date invitation arrival (photo frame notification on home wall + agent reaction)
4. Notification & realtime events wiring into journey state machine

### Phase 4: Animation & Props (4 tasks)
1. Map all FSM states to LimeZu spritesheet rows
2. Gender-specific animation frames (male/female/nonbinary variants)
3. Props system (flowers, guitar, coffee cup, can, wardrobe + render attached to characters)
4. Frame timer tuning (walking smoothness, idle breathing, transitions)

### Phase 5: Polish & Edge Cases (3 tasks)
1. Theater replay updates (gender-aware animations in public /theater/[matchId])
2. Mobile responsive (bottom bar, side panel, slider on touch/small screens)
3. Edge cases (offline during theater, timeout, reconnection, match expiry)

### Phase 6: Testing & Deploy (2 tasks)
1. Full E2E flow test (all journey states, all gender combos, all venue flows)
2. Build verification + deploy

**Total: 24 tasks across 6 phases**
