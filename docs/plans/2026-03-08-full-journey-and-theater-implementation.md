# Full Journey Flow & Theater System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the user journey from agent spawn through dating theater to post-match chat, with gender-aware animations, in-world speech bubbles, and a unified single-page experience.

**Architecture:** Single `/world` page with a journey state machine driving scene transitions. Home scene (new LimeZu room) is the persistent hub. Agent AI chat via Claude API through bottom input bar; responses render as canvas speech bubbles. Venues are temporary theaters for FlirtScenario playback. Gender-aware animation sets (male/female/nonbinary) for chaser and gatekeeper roles. Right side panel for human match chat post-theater.

**Tech Stack:** Next.js 14 App Router, Supabase (DB + Realtime), Claude API (Haiku for agent chat, scenario gen), HTML5 Canvas pixel engine, LimeZu 48x48 assets, TypeScript

---

## Phase 1: Foundation & Home Scene

### Task 1: Add Home Scene Layout + Assets

**Files:**
- Modify: `src/engine/sceneManager.ts:4` (add 'home' to SceneName)
- Modify: `src/engine/scenes/index.ts` (add home dims)
- Modify: `src/engine/assetLoader.ts` (load home PNGs)
- Copy: LimeZu `6_Home_Designs/Generic_Home_Designs/` layer PNGs to `public/sprites/venues/`

**Step 1: Copy home scene PNGs**

```bash
cp "limezu/moderninteriors-win/6_Home_Designs/Generic_Home_Designs/1/Generic_Home_Design_1_layer_1.png" public/sprites/venues/home_layer1.png
cp "limezu/moderninteriors-win/6_Home_Designs/Generic_Home_Designs/1/Generic_Home_Design_1_layer_2.png" public/sprites/venues/home_layer2.png
```

Open the PNG to check dimensions, then set VENUE_DIMS accordingly.

**Step 2: Add 'home' to SceneName**

In `src/engine/sceneManager.ts:4`, change:
```typescript
export type SceneName = 'home' | 'lounge' | 'gallery' | 'japanese' | 'icecream' | 'studio' | 'museum'
```

Update default scene in constructor:
```typescript
currentScene: SceneName = 'home'
```

**Step 3: Add home dimensions to scenes/index.ts**

In `src/engine/scenes/index.ts`, add to VENUE_DIMS (line 11-18). Measure the home PNG dimensions first:
```typescript
home: { cols: <measured>, rows: <measured> },
```

**Step 4: Update usePixelWorld to start in home scene**

In `src/hooks/usePixelWorld.ts:21`, change default:
```typescript
const [currentScene, setCurrentScene] = useState<SceneName>('home')
```

In `src/hooks/usePixelWorld.ts:30`, change layout init:
```typescript
const worldState = new WorldState(layouts.home)
```

In `src/hooks/usePixelWorld.ts:43`, change initial load:
```typescript
loadVenueForScene('home')
```

**Step 5: Verify home scene loads**

Run: `npx next dev`
Expected: Canvas shows home scene with LimeZu room art, agent standing inside

**Step 6: Commit**

```bash
git add public/sprites/venues/home_layer1.png public/sprites/venues/home_layer2.png src/engine/sceneManager.ts src/engine/scenes/index.ts src/hooks/usePixelWorld.ts
git commit -m "feat: add home scene as persistent hub with LimeZu room art"
```

---

### Task 2: Bottom Input Bar + Agent Chat API

**Files:**
- Create: `src/components/PixelWorld/AgentChatBar.tsx`
- Create: `src/app/api/agent-chat/route.ts`
- Modify: `src/components/PixelWorld/index.tsx` (add AgentChatBar)

**Step 1: Create agent chat API route**

Create `src/app/api/agent-chat/route.ts`:
```typescript
import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const LLM_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, context } = await request.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  // Load user profile for agent personality
  const { data: profile } = await supabase
    .from('users')
    .select('name, soul_type, gender, looking_for, bio, personality')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 150,
    system: `You are a pixel art dating agent for ${profile.name}. You are ${profile.soul_type} soul type. You are charming, helpful, and theatrical. Keep responses to 1-2 short sentences. You live in a pixel world and help your user find dates. You can be asked to search for matches, comment on candidates, or just chat.

Context: ${context || 'User is in their home scene, chatting with you.'}

Respond in character. Be entertaining. Never break character.`,
    messages: [{ role: 'user', content: message }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : "Hmm, let me think about that..."

  // Determine if message triggers an action
  let action: string | null = null
  const lower = message.toLowerCase()
  if (lower.includes('find') || lower.includes('search') || lower.includes('match')) action = 'search'
  if (lower.includes('next') || lower.includes('another') || lower.includes('pass') || lower.includes('skip')) action = 'next'
  if (lower.includes('send') || lower.includes('go for') || lower.includes('like')) action = 'approve'

  return NextResponse.json({ text, action })
}
```

**Step 2: Create AgentChatBar component**

Create `src/components/PixelWorld/AgentChatBar.tsx`:
```typescript
'use client'

import { useState, useRef, useCallback, type FormEvent } from 'react'

interface AgentMessage {
  role: 'user' | 'agent'
  text: string
  timestamp: number
}

interface AgentChatBarProps {
  onAgentResponse: (text: string, action: string | null) => void
  context?: string
}

export function AgentChatBar({ onAgentResponse, context }: AgentChatBarProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMsg = input.trim()
    setInput('')
    setSending(true)

    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }])

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'agent', text: data.text, timestamp: Date.now() }])
      onAgentResponse(data.text, data.action)
    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Oops, my pixel brain glitched...', timestamp: Date.now() }])
    } finally {
      setSending(false)
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }, [input, sending, context, onAgentResponse])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      {/* Expandable log */}
      {expanded && (
        <div
          ref={logRef}
          className="bg-gray-900/95 border-t border-gray-700 max-h-60 overflow-y-auto px-4 py-2 space-y-2"
        >
          {messages.slice(-20).map((msg, i) => (
            <div key={i} className={`text-sm font-mono ${msg.role === 'user' ? 'text-gray-400' : 'text-pink-300'}`}>
              <span className="opacity-50">{msg.role === 'user' ? 'You' : 'Agent'}:</span> {msg.text}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-sm text-gray-600 font-mono">No messages yet. Say something to your agent!</div>
          )}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900/95 border-t border-gray-700 flex items-center gap-2 px-3 py-2"
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-white text-lg min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label={expanded ? 'Collapse chat log' : 'Expand chat log'}
        >
          {expanded ? 'v' : '^'}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sending ? 'Agent is thinking...' : 'Talk to your agent...'}
          disabled={sending}
          className="flex-1 bg-gray-800 text-white text-sm font-mono rounded px-3 py-2 border border-gray-700 focus:border-pink-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-pink-500 text-white text-sm font-mono px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

**Step 3: Wire AgentChatBar into PixelWorld**

In `src/components/PixelWorld/index.tsx`, add import and render AgentChatBar inside the wrapper div, before the scene nav buttons:

```typescript
import { AgentChatBar } from './AgentChatBar'
// ... inside the component:
const handleAgentResponse = useCallback((text: string, action: string | null) => {
  // Set speech bubble on character 1
  const ch = worldStateRef.current?.characters.get(1)
  if (ch) {
    ch.speechText = text
    ch.speechTimer = Math.max(3, text.length * 0.05) // longer text = longer display
  }
  // TODO: Phase 3 will wire actions to journey state machine
}, [worldStateRef])

// In JSX:
<AgentChatBar onAgentResponse={handleAgentResponse} context={`User is viewing ${SCENE_LABELS[currentScene]}`} />
```

**Step 4: Add speechText and speechTimer to Character type**

In `src/engine/types.ts`, verify `Character` interface has (should already exist from sequencePlayer work):
```typescript
speechText: string | null
speechTimer: number
```

If missing, add them to Character interface and initialize in `createCharacter()`.

**Step 5: Verify agent chat works**

Run: `npx next dev`
Type a message in the bottom bar. Agent should respond. Check canvas for speech text field being set.

**Step 6: Commit**

```bash
git add src/components/PixelWorld/AgentChatBar.tsx src/app/api/agent-chat/route.ts src/components/PixelWorld/index.tsx
git commit -m "feat: add bottom input bar with Claude-powered agent chat"
```

---

### Task 3: Wire Research Montage into Home Scene

**Files:**
- Modify: `src/components/PixelWorld/index.tsx` (trigger montage from agent action)
- Modify: `src/hooks/usePixelWorld.ts` (expose particles + montage player)

**Step 1: Add montage support to usePixelWorld**

In `src/hooks/usePixelWorld.ts`, add imports:
```typescript
import { ParticleSystem } from '@/engine/particles'
import { MontagePlayer, createResearchMontage } from '@/engine/montage'
```

Add refs inside the hook:
```typescript
const particlesRef = useRef<ParticleSystem>(new ParticleSystem())
const montageRef = useRef<MontagePlayer | null>(null)
```

Add `playMontage` callback:
```typescript
const playMontage = useCallback((onComplete: () => void) => {
  const ch = worldStateRef.current?.characters.get(1)
  if (!ch) return
  const montage = new MontagePlayer(createResearchMontage(), particlesRef.current)
  montage.start(ch, onComplete)
  montageRef.current = montage
}, [])
```

Return: `particlesRef, montageRef, playMontage`

**Step 2: Wire montage trigger from agent chat action**

In `src/components/PixelWorld/index.tsx`, update `handleAgentResponse`:
```typescript
const handleAgentResponse = useCallback((text: string, action: string | null) => {
  const ch = worldStateRef.current?.characters.get(1)
  if (ch) {
    ch.speechText = text
    ch.speechTimer = Math.max(3, text.length * 0.05)
  }
  if (action === 'search') {
    playMontage(() => {
      // Montage done — will trigger BROWSING in Phase 3
      const ch2 = worldStateRef.current?.characters.get(1)
      if (ch2) {
        ch2.speechText = "Found some interesting people!"
        ch2.speechTimer = 3
      }
    })
  }
}, [worldStateRef, playMontage])
```

**Step 3: Ensure montageRef.update() is called in game loop**

Check `src/engine/engine/gameLoop.ts` — the montage needs updating each frame. If the game loop doesn't call montage update, add it via a callback or expose it through worldState.

**Step 4: Verify montage plays**

Run: `npx next dev`
Type "find me someone" in bottom bar. Agent should sit at desk, papers fly, lightbulb appears, etc.

**Step 5: Commit**

```bash
git add src/hooks/usePixelWorld.ts src/components/PixelWorld/index.tsx
git commit -m "feat: wire research montage into home scene via agent chat"
```

---

### Task 4: Candidate Photo Slider

**Files:**
- Create: `src/components/PixelWorld/CandidateSlider.tsx`
- Modify: `src/components/PixelWorld/index.tsx` (render slider, connect to matching)

**Step 1: Create CandidateSlider component**

Create `src/components/PixelWorld/CandidateSlider.tsx`:
```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Candidate } from '@/types/database'

interface CandidateSliderProps {
  candidates: Candidate[]
  onSelect: (candidate: Candidate) => void
  onPass: (candidate: Candidate) => void
  onAgentComment: (text: string) => void
}

export function CandidateSlider({ candidates, onSelect, onPass, onAgentComment }: CandidateSliderProps) {
  const [index, setIndex] = useState(0)
  const current = candidates[index]

  // Agent comments on each candidate
  useEffect(() => {
    if (!current) return
    const { reasons, score } = current
    const comments = [
      `${score}% match! ${reasons.personality}`,
      reasons.horoscope,
      reasons.explanation,
      reasons.shared.length > 0 ? `You both like: ${reasons.shared.join(', ')}` : null,
    ].filter(Boolean)
    const comment = comments[Math.floor(Math.random() * comments.length)] || `${score}% compatible!`
    onAgentComment(comment)
  }, [index, current, onAgentComment])

  const next = useCallback(() => {
    if (index < candidates.length - 1) {
      onPass(candidates[index])
      setIndex(i => i + 1)
    }
  }, [index, candidates, onPass])

  const prev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1)
  }, [index])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      if (e.key === 'Enter') onSelect(current)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, current, onSelect])

  if (!current) return null

  const photo = current.user.photos?.[0]
  const scoreColor = current.score >= 80 ? 'text-green-400' : current.score >= 60 ? 'text-yellow-400' : 'text-orange-400'

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
      <button
        onClick={prev}
        disabled={index === 0}
        className="bg-gray-800/80 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-gray-700"
      >
        &lt;
      </button>

      <button
        onClick={() => onSelect(current)}
        className="bg-gray-900/90 border-2 border-gray-600 hover:border-pink-500 rounded-xl p-3 flex items-center gap-3 transition-colors min-w-[280px]"
      >
        {photo ? (
          <img src={photo} alt={current.user.name} className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">?</div>
        )}
        <div className="text-left font-mono">
          <div className="text-white text-sm font-bold">{current.user.name}, {current.user.age}</div>
          <div className={`text-lg font-bold ${scoreColor}`}>{current.score}%</div>
          <div className="text-gray-400 text-xs">{current.user.soul_type} soul</div>
        </div>
      </button>

      <button
        onClick={next}
        disabled={index === candidates.length - 1}
        className="bg-gray-800/80 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-gray-700"
      >
        &gt;
      </button>

      <div className="text-gray-500 text-xs font-mono">{index + 1}/{candidates.length}</div>
    </div>
  )
}
```

**Step 2: Wire slider into PixelWorld**

In `src/components/PixelWorld/index.tsx`, add state for candidates and browsing mode:
```typescript
const [browsing, setBrowsing] = useState(false)
const { candidates, selectedCandidate, setSelectedCandidate, search, approve, pass } = useMatching()
```

After montage completes, call `search()` and set `setBrowsing(true)`.

Render `CandidateSlider` when `browsing && candidates`:
```typescript
{browsing && candidates && candidates.length > 0 && (
  <CandidateSlider
    candidates={candidates}
    onSelect={(c) => setSelectedCandidate(c)}
    onPass={(c) => pass(c.user.id)}
    onAgentComment={(text) => {
      const ch = worldStateRef.current?.characters.get(1)
      if (ch) { ch.speechText = text; ch.speechTimer = 4 }
    }}
  />
)}
```

Also render `ProfilePanel` when `selectedCandidate` is set (already built).

**Step 3: Verify slider works**

Run: `npx next dev`
Type "find someone" -> montage plays -> slider appears with candidates -> arrow keys browse -> click opens ProfilePanel

**Step 4: Commit**

```bash
git add src/components/PixelWorld/CandidateSlider.tsx src/components/PixelWorld/index.tsx
git commit -m "feat: add candidate photo slider with agent commentary"
```

---

### Task 5: Venue Layout Fix

**Files:**
- Modify: `src/engine/scenes/index.ts` (fix walkable area per venue)
- Possibly modify: `src/engine/engine/renderer.ts` (handle transparent areas)

**Step 1: Analyze each venue PNG**

Open each `public/sprites/venues/<venue>_layer1.png` in an image viewer. Note which areas are transparent (non-rectangular gaps). These need to be marked as non-walkable (TileType.VOID) in the tile map.

**Step 2: Define walkable masks per venue**

In `src/engine/scenes/index.ts`, replace the generic "all floor" approach with per-venue walkable masks. For each venue, create a Set of `"col,row"` strings that are walkable. Mark others as VOID.

```typescript
// Example for a venue with L-shaped walkable area:
const WALKABLE_MASKS: Partial<Record<SceneName, Set<string>>> = {
  // populated per venue after visual analysis
}

export function createSceneLayouts(): Record<SceneName, OfficeLayout> {
  const result = {} as Record<SceneName, OfficeLayout>
  for (const [name, { cols, rows }] of Object.entries(VENUE_DIMS) as [SceneName, { cols: number; rows: number }][]) {
    const mask = WALKABLE_MASKS[name]
    const tiles = Array(cols * rows).fill(0).map((_, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      if (mask) return mask.has(`${col},${row}`) ? 1 : 8 // 1=floor, 8=VOID
      return 1 // default: all walkable
    })
    result[name] = { version: 1, cols, rows, tiles, furniture: [] }
  }
  return result
}
```

**Step 3: Visually verify each venue**

Run: `npx next dev`
Navigate to each venue. Characters should not walk into transparent/gap areas.

**Step 4: Commit**

```bash
git add src/engine/scenes/index.ts
git commit -m "fix: add walkable area masks for venue layouts"
```

---

## Phase 2: Theater & Gender System

### Task 6: Gender-Aware Animation Sets

**Files:**
- Create: `src/engine/genderAnimations.ts`
- Modify: `src/types/database.ts` (add gender animation types)

**Step 1: Create gender animation mapping**

Create `src/engine/genderAnimations.ts`:
```typescript
import type { AnimationAction } from '@/types/database'

export type Gender = 'male' | 'female' | 'nonbinary'
export type TheaterRole = 'chaser' | 'gatekeeper'

export interface GenderAnimationSet {
  approach: AnimationAction
  rejected: AnimationAction[]
  venueCountered: AnimationAction[]
  winningMove: AnimationAction
  victory: AnimationAction
  walkoff: AnimationAction
}

const MALE_CHASER: GenderAnimationSet = {
  approach: 'confident_walk',
  rejected: ['angry_kick', 'sad_slump'],
  venueCountered: ['sad_slump', 'wardrobe_change', 'confident_walk'],
  winningMove: 'flower_offer',
  victory: 'victory_dance',
  walkoff: 'sad_walkoff',
}

const FEMALE_CHASER: GenderAnimationSet = {
  approach: 'dramatic_entrance',
  rejected: ['blush', 'determined_face'],  // dramatic tears or scheming
  venueCountered: ['eye_roll', 'wardrobe_change', 'dramatic_entrance'],
  winningMove: 'thinking',  // cornering/scheming
  victory: 'victory_dance',
  walkoff: 'walk_away',  // storm-off
}

const MALE_GATEKEEPER: GenderAnimationSet = {
  approach: 'idle',  // plays cool
  rejected: ['phone_check'],  // unbothered
  venueCountered: ['thinking'],  // reluctant
  winningMove: 'blush',  // finally caves
  victory: 'flower_accept',
  walkoff: 'walk_away',
}

const FEMALE_GATEKEEPER: GenderAnimationSet = {
  approach: 'eye_roll',  // playing hard to get
  rejected: ['irritated_foot_tap'],
  venueCountered: ['eye_roll', 'thinking'],
  winningMove: 'blush',  // warming up
  victory: 'flower_accept',
  walkoff: 'walk_away',
}

const ANIMATION_SETS: Record<string, GenderAnimationSet> = {
  'male_chaser': MALE_CHASER,
  'female_chaser': FEMALE_CHASER,
  'male_gatekeeper': MALE_GATEKEEPER,
  'female_gatekeeper': FEMALE_GATEKEEPER,
}

/**
 * Get animation set for a role+gender combo.
 * Nonbinary mixes from both male and female sets based on soul type randomization.
 */
export function getAnimationSet(gender: Gender, role: TheaterRole, soulType?: string): GenderAnimationSet {
  if (gender === 'nonbinary') {
    // Mix: pick randomly from male and female sets per field
    const male = ANIMATION_SETS[`male_${role}`]
    const female = ANIMATION_SETS[`female_${role}`]
    const pick = <T>(a: T, b: T): T => Math.random() > 0.5 ? a : b
    return {
      approach: pick(male.approach, female.approach),
      rejected: pick(male.rejected, female.rejected),
      venueCountered: pick(male.venueCountered, female.venueCountered),
      winningMove: pick(male.winningMove, female.winningMove),
      victory: pick(male.victory, female.victory),
      walkoff: pick(male.walkoff, female.walkoff),
    }
  }
  return ANIMATION_SETS[`${gender}_${role}`] ?? MALE_CHASER
}

/**
 * Get gender context string for Claude prompt.
 */
export function getGenderTheaterPrompt(
  chaserGender: Gender,
  gatekeeperGender: Gender,
  chaserLookingFor: string,
  gatekeeperLookingFor: string,
): string {
  const chaserSet = getAnimationSet(chaserGender, 'chaser')
  const gkSet = getAnimationSet(gatekeeperGender, 'gatekeeper')

  return `
GENDER THEATER DIRECTION:
- Chaser is ${chaserGender} (looking for ${chaserLookingFor}). Preferred approach: ${chaserSet.approach}. On rejection: use ${chaserSet.rejected.join(' or ')}. Winning move: ${chaserSet.winningMove}. Victory: ${chaserSet.victory}. Walkoff: ${chaserSet.walkoff}.
- Gatekeeper is ${gatekeeperGender} (looking for ${gatekeeperLookingFor}). Default pose: ${gkSet.approach}. Rejection style: ${gkSet.rejected.join(' or ')}. When won over: ${gkSet.winningMove}. Victory: ${gkSet.victory}.
- Match animation actions to these gender-specific behaviors. The theater should feel authentic to these gender dynamics.`
}
```

**Step 2: Commit**

```bash
git add src/engine/genderAnimations.ts
git commit -m "feat: add gender-aware animation sets for chaser and gatekeeper"
```

---

### Task 7: Gatekeeper Nudge + Role Flip

**Files:**
- Modify: `src/hooks/useScenario.ts` (add nudge timer, role flip broadcast)
- Modify: `src/app/api/matches/[id]/propose-date/route.ts` (allow gatekeeper to propose)

**Step 1: Add nudge timer to useScenario**

In `src/hooks/useScenario.ts`, add:
```typescript
const [nudgeShown, setNudgeShown] = useState(false)
const [rolesFlipped, setRolesFlipped] = useState(false)
const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// Start nudge timer when gatekeeper is waiting
useEffect(() => {
  if (role !== 'gatekeeper' || dateStatus !== 'pending') return

  nudgeTimerRef.current = setTimeout(() => {
    setNudgeShown(true)
  }, 30000) // 30 seconds

  return () => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current)
  }
}, [role, dateStatus])

const flipRoles = useCallback(() => {
  setRolesFlipped(true)
  channelRef.current?.send({
    type: 'broadcast',
    event: 'roles_flipped',
    payload: { new_chaser: 'gatekeeper', new_gatekeeper: 'chaser' },
  })
}, [])
```

Also listen for the `roles_flipped` event in the channel setup.

Add to return: `nudgeShown, rolesFlipped, flipRoles`

**Step 2: Update propose-date route to allow either role**

In `src/app/api/matches/[id]/propose-date/route.ts`, change the verification from checking only `user_a_id` to checking either side:

```typescript
// Verify user is part of match and match is active
const { data: match } = await supabase
  .from('matches')
  .select('*')
  .eq('id', matchId)
  .eq('status', 'active')
  .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
  .single()
```

**Step 3: Commit**

```bash
git add src/hooks/useScenario.ts src/app/api/matches/[id]/propose-date/route.ts
git commit -m "feat: add gatekeeper nudge timer and role flip mechanism"
```

---

### Task 8: Gender-Aware Theater Wiring + Claude Prompt

**Files:**
- Modify: `src/lib/llm.ts` (add gender context to scenario prompt)
- Modify: `src/engine/sequencePlayer.ts` (use gender animation sets)

**Step 1: Update generateScenario with gender context**

In `src/lib/llm.ts:72-92`, update function signature and prompt:
```typescript
export async function generateScenario(
  matchId: string,
  attemptNumber: number,
  chaserProfile: User,
  gatekeeperProfile: User,
  previousResults: string[],
  venue?: VenueName
): Promise<FlirtScenario> {
```

After line 92 (after venueContext), add:
```typescript
  const { getGenderTheaterPrompt } = await import('@/engine/genderAnimations')
  const genderContext = getGenderTheaterPrompt(
    chaserProfile.gender,
    gatekeeperProfile.gender,
    chaserProfile.looking_for,
    gatekeeperProfile.looking_for,
  )
```

Insert `${genderContext}` into the prompt string after the venue context line.

**Step 2: Update reaction sequences to use gender**

In `src/engine/sequencePlayer.ts`, update static methods to accept gender:
```typescript
static venueCounteredSteps(chaserGender: Gender): FlirtStep[] {
  const set = getAnimationSet(chaserGender, 'chaser')
  return [
    { agent: 'chaser', action: set.venueCountered[0] || 'sad_slump', text: 'oh man...', duration_ms: 1500, emotion: 'sad' },
    { agent: 'chaser', action: 'wardrobe_change', duration_ms: 1000, props: ['wardrobe'] },
    { agent: 'chaser', action: set.venueCountered[2] || 'confident_walk', text: "alright, let's go!", duration_ms: 1500, emotion: 'excited' },
  ]
}

static dateDeclinedSteps(rejectionText: string, walkoffText: string, chaserGender: Gender, gatekeeperGender: Gender): FlirtStep[] {
  const gkSet = getAnimationSet(gatekeeperGender, 'gatekeeper')
  const chSet = getAnimationSet(chaserGender, 'chaser')
  return [
    { agent: 'gatekeeper', action: gkSet.rejected[0] || 'eye_roll', text: rejectionText, duration_ms: 1500, emotion: 'irritated' },
    { agent: 'chaser', action: 'rejected_shock', text: '...', duration_ms: 1000, emotion: 'sad' },
    { agent: 'chaser', action: chSet.rejected[0] || 'angry_kick', duration_ms: 1000, props: ['can'] },
    { agent: 'chaser', action: chSet.walkoff, text: walkoffText, duration_ms: 1500, emotion: 'sad' },
  ]
}
```

**Step 3: Commit**

```bash
git add src/lib/llm.ts src/engine/sequencePlayer.ts
git commit -m "feat: wire gender-aware animations into Claude prompt and reaction sequences"
```

---

### Task 9: In-World Speech Bubbles with Text

**Files:**
- Create: `src/engine/speechBubbleRenderer.ts`
- Modify: `src/engine/engine/renderer.ts` (replace icon-only renderBubbles)

**Step 1: Create speech bubble renderer**

Create `src/engine/speechBubbleRenderer.ts`:
```typescript
import type { Character } from './types'
import { CharacterState, TILE_SIZE } from './types'

const BUBBLE_PADDING = 8
const BUBBLE_MAX_WIDTH = 200
const BUBBLE_FONT_SIZE = 10
const BUBBLE_FONT = `${BUBBLE_FONT_SIZE}px monospace`
const BUBBLE_BG = 'rgba(255, 255, 255, 0.95)'
const BUBBLE_BORDER = '#333'
const BUBBLE_TEXT_COLOR = '#111'
const BUBBLE_TAIL_SIZE = 6
const BUBBLE_RADIUS = 6

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export function renderSpeechBubbles(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  ctx.save()
  ctx.font = BUBBLE_FONT

  for (const ch of characters) {
    if (!ch.speechText || ch.speechTimer <= 0) continue

    const text = ch.speechText
    const lines = wrapText(ctx, text, BUBBLE_MAX_WIDTH)

    const lineHeight = BUBBLE_FONT_SIZE + 4
    const textWidth = Math.min(
      BUBBLE_MAX_WIDTH,
      Math.max(...lines.map(l => ctx.measureText(l).width))
    )
    const bubbleW = textWidth + BUBBLE_PADDING * 2
    const bubbleH = lines.length * lineHeight + BUBBLE_PADDING * 2

    // Position above character head
    const sittingOff = ch.state === CharacterState.TYPE ? -18 : 0
    const charScreenX = offsetX + ch.x * zoom
    const charScreenY = offsetY + (ch.y + sittingOff) * zoom

    const bubbleX = charScreenX - bubbleW / 2
    const bubbleY = charScreenY - (TILE_SIZE * zoom) - bubbleH - BUBBLE_TAIL_SIZE

    // Fade out in last 0.5s
    const alpha = ch.speechTimer < 0.5 ? ch.speechTimer / 0.5 : 1
    ctx.globalAlpha = alpha

    // Draw bubble background
    ctx.fillStyle = BUBBLE_BG
    ctx.strokeStyle = BUBBLE_BORDER
    ctx.lineWidth = 1.5

    // Rounded rect
    ctx.beginPath()
    ctx.moveTo(bubbleX + BUBBLE_RADIUS, bubbleY)
    ctx.lineTo(bubbleX + bubbleW - BUBBLE_RADIUS, bubbleY)
    ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + BUBBLE_RADIUS, BUBBLE_RADIUS)
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - BUBBLE_RADIUS)
    ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - BUBBLE_RADIUS, bubbleY + bubbleH, BUBBLE_RADIUS)
    ctx.lineTo(bubbleX + BUBBLE_RADIUS, bubbleY + bubbleH)
    ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - BUBBLE_RADIUS, BUBBLE_RADIUS)
    ctx.lineTo(bubbleX, bubbleY + BUBBLE_RADIUS)
    ctx.arcTo(bubbleX, bubbleY, bubbleX + BUBBLE_RADIUS, bubbleY, BUBBLE_RADIUS)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw tail
    const tailX = charScreenX
    const tailY = bubbleY + bubbleH
    ctx.beginPath()
    ctx.moveTo(tailX - BUBBLE_TAIL_SIZE, tailY)
    ctx.lineTo(tailX, tailY + BUBBLE_TAIL_SIZE)
    ctx.lineTo(tailX + BUBBLE_TAIL_SIZE, tailY)
    ctx.closePath()
    ctx.fillStyle = BUBBLE_BG
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(tailX - BUBBLE_TAIL_SIZE, tailY)
    ctx.lineTo(tailX, tailY + BUBBLE_TAIL_SIZE)
    ctx.lineTo(tailX + BUBBLE_TAIL_SIZE, tailY)
    ctx.strokeStyle = BUBBLE_BORDER
    ctx.stroke()

    // Draw text
    ctx.fillStyle = BUBBLE_TEXT_COLOR
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bubbleX + BUBBLE_PADDING, bubbleY + BUBBLE_PADDING + i * lineHeight)
    }
  }

  ctx.restore()
}
```

**Step 2: Wire into renderer**

In `src/engine/engine/renderer.ts`, import the new renderer:
```typescript
import { renderSpeechBubbles } from '../speechBubbleRenderer'
```

Find where `renderBubbles()` is called (line 641) and add after it:
```typescript
renderSpeechBubbles(ctx, Array.from(characters.values()), offsetX, offsetY, zoom)
```

**Step 3: Add speechTimer countdown in character update**

In `src/engine/engine/characters.ts`, at the top of `updateCharacter()` (line 93), add:
```typescript
if (ch.speechTimer > 0) {
  ch.speechTimer -= dt
  if (ch.speechTimer <= 0) {
    ch.speechText = null
    ch.speechTimer = 0
  }
}
```

**Step 4: Verify speech bubbles render**

Run: `npx next dev`
Chat with agent. Text should appear as white speech bubble above character on canvas.

**Step 5: Commit**

```bash
git add src/engine/speechBubbleRenderer.ts src/engine/engine/renderer.ts src/engine/engine/characters.ts
git commit -m "feat: add in-world speech bubbles with text rendering on canvas"
```

---

### Task 10: Emote System (LimeZu UI Sprites)

**Files:**
- Copy: LimeZu UI PNGs to `public/sprites/ui/`
- Create: `src/engine/emoteRenderer.ts`
- Modify: `src/engine/engine/renderer.ts` (call emote renderer)

**Step 1: Copy UI assets**

```bash
mkdir -p public/sprites/ui
cp "limezu/moderninteriors-win/4_User_Interface_Elements/UI_48x48.png" public/sprites/ui/UI_48x48.png
cp "limezu/moderninteriors-win/4_User_Interface_Elements/UI_thinking_emotes_animation_48x48.png" public/sprites/ui/UI_emotes_anim.png
```

**Step 2: Create emote renderer**

Create `src/engine/emoteRenderer.ts`:
```typescript
import type { Character } from './types'
import { CharacterState, TILE_SIZE } from './types'
import type { Emotion } from '@/types/database'
import { loadSpriteSheet } from './assetLoader'

let uiSheet: HTMLImageElement | null = null
let uiSheetLoading = false

// UI_48x48.png sprite positions (row, col at 48x48 grid)
// These need to be verified against the actual sprite sheet
const EMOTE_POSITIONS: Record<string, { col: number; row: number }> = {
  heart:    { col: 0, row: 0 },
  question: { col: 1, row: 0 },
  exclaim:  { col: 2, row: 0 },
  anger:    { col: 3, row: 0 },
  music:    { col: 4, row: 0 },
  teardrop: { col: 5, row: 0 },
  thinking: { col: 6, row: 0 },
  star:     { col: 7, row: 0 },
}

const EMOTION_TO_EMOTE: Record<string, string> = {
  happy: 'heart',
  sad: 'teardrop',
  angry: 'anger',
  nervous: 'question',
  excited: 'exclaim',
  bored: 'thinking',
  irritated: 'anger',
}

async function ensureUiSheet(): Promise<HTMLImageElement | null> {
  if (uiSheet) return uiSheet
  if (uiSheetLoading) return null
  uiSheetLoading = true
  try {
    uiSheet = await loadSpriteSheet('/sprites/ui/UI_48x48.png')
    return uiSheet
  } catch {
    return null
  }
}

export function renderEmotes(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  // Trigger async load
  ensureUiSheet()
  if (!uiSheet) return

  for (const ch of characters) {
    if (!ch.emotion || ch.emotion === 'neutral') continue

    const emoteName = EMOTION_TO_EMOTE[ch.emotion]
    if (!emoteName) continue

    const pos = EMOTE_POSITIONS[emoteName]
    if (!pos) continue

    const sittingOff = ch.state === CharacterState.TYPE ? -18 : 0
    const emoteX = offsetX + ch.x * zoom - 24 * zoom / TILE_SIZE * 24
    const emoteY = offsetY + (ch.y + sittingOff) * zoom - TILE_SIZE * zoom - 48

    const size = 24 * (zoom / 2) // scale emote with zoom

    ctx.drawImage(
      uiSheet,
      pos.col * 48, pos.row * 48, 48, 48,
      emoteX, emoteY, size, size,
    )
  }
}
```

Note: The exact sprite positions in UI_48x48.png need to be verified visually. The implementer should open the PNG and map the correct grid positions.

**Step 3: Wire into renderer**

In `src/engine/engine/renderer.ts`, import and call:
```typescript
import { renderEmotes } from '../emoteRenderer'
// After renderSpeechBubbles:
renderEmotes(ctx, Array.from(characters.values()), offsetX, offsetY, zoom)
```

**Step 4: Commit**

```bash
git add public/sprites/ui/ src/engine/emoteRenderer.ts src/engine/engine/renderer.ts
git commit -m "feat: add LimeZu emote system with emotion-to-sprite mapping"
```

---

### Task 11: Soul Ghost Escape Animation

**Files:**
- Modify: `src/engine/types.ts` (add SOUL_GHOST_ESCAPE state)
- Modify: `src/engine/engine/characters.ts` (handle ghost state)
- Modify: `src/engine/engine/renderer.ts` (render semi-transparent float up)

**Step 1: Add state to CharacterState**

In `src/engine/types.ts:31-47`, add to CharacterState:
```typescript
SOUL_GHOST_ESCAPE: 'soul_ghost_escape',
```

**Step 2: Add ghost animation update**

In `src/engine/engine/characters.ts`, add a case in the switch for the new state:
```typescript
case CharacterState.SOUL_GHOST_ESCAPE: {
  // Float upward + fade out over stateDuration
  ch.stateTimer += dt
  ch.y -= 30 * dt  // float up 30px per second
  ch.frameTimer += dt
  if (ch.frameTimer >= 0.15) {
    ch.frameTimer -= 0.15
    ch.frame = (ch.frame + 1) % 4
  }
  if (ch.stateTimer >= ch.stateDuration) {
    ch.onStateComplete?.()
    ch.state = CharacterState.IDLE
    ch.stateTimer = 0
    ch.frame = 0
  }
  break
}
```

**Step 3: Render ghost as semi-transparent**

In `src/engine/engine/renderer.ts`, where characters are drawn, check for ghost state and set alpha:
```typescript
if (ch.state === CharacterState.SOUL_GHOST_ESCAPE) {
  const progress = ch.stateTimer / (ch.stateDuration || 2)
  ctx.globalAlpha = 1 - progress  // fade from 1 to 0
}
```

Reset alpha after drawing the character.

**Step 4: Add trigger helper**

In `src/engine/engine/characters.ts`, export a helper:
```typescript
export function triggerSoulGhostEscape(ch: Character, onComplete: () => void) {
  ch.state = CharacterState.SOUL_GHOST_ESCAPE
  ch.stateDuration = 2
  ch.stateTimer = 0
  ch.frame = 0
  ch.emotion = 'sad'
  ch.speechText = "Nooo..."
  ch.speechTimer = 1.5
  ch.onStateComplete = () => {
    ch.emotion = 'neutral'
    ch.speechText = null
    onComplete()
  }
}
```

**Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/engine/characters.ts src/engine/engine/renderer.ts
git commit -m "feat: add soul ghost escape animation with float-up and fade-out"
```

---

## Phase 3: Flow Integration & Chat

### Task 12: Journey State Machine

**Files:**
- Create: `src/hooks/useJourneyState.ts`
- Modify: `src/components/PixelWorld/index.tsx` (use journey state)

**Step 1: Create journey state hook**

Create `src/hooks/useJourneyState.ts`:
```typescript
'use client'

import { useState, useCallback } from 'react'

export type JourneyState =
  | 'HOME_IDLE'
  | 'RESEARCHING'
  | 'BROWSING'
  | 'PROPOSING'
  | 'WAITING'
  | 'THEATER'
  | 'POST_MATCH'

export function useJourneyState() {
  const [state, setState] = useState<JourneyState>('HOME_IDLE')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [role, setRole] = useState<'chaser' | 'gatekeeper'>('chaser')

  const transition = useCallback((to: JourneyState, meta?: { matchId?: string; role?: 'chaser' | 'gatekeeper' }) => {
    setState(to)
    if (meta?.matchId !== undefined) setMatchId(meta.matchId)
    if (meta?.role !== undefined) setRole(meta.role)
  }, [])

  return { state, matchId, role, transition }
}
```

**Step 2: Integrate into PixelWorld**

In `src/components/PixelWorld/index.tsx`, replace ad-hoc state (browsing, etc.) with journey state. Use `state` to conditionally render:
- `HOME_IDLE`: just the canvas + agent chat bar
- `RESEARCHING`: canvas with montage playing
- `BROWSING`: canvas + CandidateSlider
- `PROPOSING`: canvas + DateProposalCard overlay
- `WAITING`: canvas (agent fidgets)
- `THEATER`: canvas with FlirtScenario playing in venue scene
- `POST_MATCH`: canvas in lounge + right side chat panel

Wire agent chat actions to transitions:
```typescript
if (action === 'search') transition('RESEARCHING')
if (action === 'next') { /* trigger soul ghost escape, stay in BROWSING */ }
if (action === 'approve') transition('PROPOSING')
```

**Step 3: Commit**

```bash
git add src/hooks/useJourneyState.ts src/components/PixelWorld/index.tsx
git commit -m "feat: add journey state machine driving the full user flow"
```

---

### Task 13: Post-Match Chat in Lounge (Right Side Panel)

**Files:**
- Create: `src/components/PixelWorld/MatchChatPanel.tsx`
- Modify: `src/components/PixelWorld/index.tsx` (show panel in POST_MATCH state)

**Step 1: Create MatchChatPanel**

Adapt existing `ChatPanel` logic into a right-side panel:
```typescript
'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import type { ChatMessage } from '@/types/database'

interface MatchChatPanelProps {
  messages: ChatMessage[]
  currentUserId: string
  partnerId: string
  partnerName: string
  partnerPhoto?: string
  isLoading: boolean
  onSendMessage: (content: string) => void
  onClose: () => void
  onFindAnother: () => void
}

export function MatchChatPanel({
  messages, currentUserId, partnerName, partnerPhoto,
  isLoading, onSendMessage, onClose, onFindAnother,
}: MatchChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input)
    setInput('')
  }

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-gray-900/95 border-l border-gray-700 flex flex-col z-50 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-800">
        {partnerPhoto ? (
          <img src={partnerPhoto} alt={partnerName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">?</div>
        )}
        <span className="font-bold text-blue-300 flex-1">{partnerName}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm font-mono p-2 rounded-lg max-w-[85%] ${
              msg.sender_id === currentUserId
                ? 'bg-blue-600/30 text-blue-200 ml-auto'
                : 'bg-gray-800 text-gray-200'
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-gray-800 text-white text-sm font-mono rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-blue-500 text-white text-sm px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {/* Find another */}
      <button
        onClick={onFindAnother}
        className="m-3 py-2 bg-gray-800 text-gray-400 text-sm font-mono rounded hover:bg-gray-700 hover:text-white transition-colors"
      >
        Find someone else...
      </button>
    </div>
  )
}
```

**Step 2: Wire into PixelWorld in POST_MATCH state**

Show `MatchChatPanel` when journey state is `POST_MATCH`. Use existing `useChat` hook for messages. Transition to lounge scene when entering POST_MATCH.

**Step 3: Commit**

```bash
git add src/components/PixelWorld/MatchChatPanel.tsx src/components/PixelWorld/index.tsx
git commit -m "feat: add right-side match chat panel for post-match lounge"
```

---

### Task 14: Date Invitation Arrival (Gatekeeper Notification)

**Files:**
- Create: `src/components/PixelWorld/InvitationNotification.tsx`
- Modify: `src/components/PixelWorld/index.tsx` (show notification on home wall)

**Step 1: Create invitation notification component**

Create `src/components/PixelWorld/InvitationNotification.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'

interface InvitationNotificationProps {
  chaserName: string
  chaserPhoto?: string
  venue: string
  inviteText: string
  onOpen: () => void
}

export function InvitationNotification({ chaserName, chaserPhoto, venue, inviteText, onOpen }: InvitationNotificationProps) {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <button
      onClick={onOpen}
      className={`absolute top-1/4 right-1/4 z-30 bg-gray-900/90 border-2 rounded-xl p-4 transition-all cursor-pointer hover:scale-105 ${
        pulse ? 'border-pink-500 shadow-lg shadow-pink-500/30' : 'border-pink-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {chaserPhoto ? (
          <img src={chaserPhoto} alt={chaserName} className="w-12 h-12 rounded-lg object-cover border-2 border-pink-500" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-xl border-2 border-pink-500">?</div>
        )}
        <div className="text-left font-mono">
          <div className="text-pink-300 text-sm font-bold">{chaserName} wants a date!</div>
          <div className="text-gray-400 text-xs">Tap to see invite</div>
        </div>
      </div>
    </button>
  )
}
```

**Step 2: Wire into PixelWorld**

When gatekeeper is in HOME_IDLE and receives `date_proposed` event (from `useScenario.venueProposal`), show `InvitationNotification`. On tap, show `DateInvitationCard` (already built).

Agent reacts with speech bubble: "Hey, someone wants to take you out!"

**Step 3: Commit**

```bash
git add src/components/PixelWorld/InvitationNotification.tsx src/components/PixelWorld/index.tsx
git commit -m "feat: add date invitation notification on gatekeeper home wall"
```

---

### Task 15: Wire Realtime Events into Journey State Machine

**Files:**
- Modify: `src/components/PixelWorld/index.tsx` (connect scenario events to journey transitions)

**Step 1: Map realtime events to journey transitions**

In the PixelWorld component, watch `dateStatus` from `useScenario` and trigger transitions:

```typescript
useEffect(() => {
  if (dateStatus === 'accepted' && journeyState === 'WAITING') {
    // Transition to venue scene + start theater
    const venue = venueProposal?.venue as SceneName
    if (venue) transitionTo(venue)
    transition('THEATER')
  }
  if (dateStatus === 'countered' && journeyState === 'WAITING') {
    // Play countered reaction, then transition
    // Use SequencePlayer.venueCounteredSteps()
  }
  if (dateStatus === 'declined') {
    // Play decline reaction, then back to HOME_IDLE
    // Use SequencePlayer.dateDeclinedSteps()
  }
}, [dateStatus])
```

When theater/scenario completes (from SequencePlayer `onComplete`):
```typescript
transition('POST_MATCH')
transitionTo('lounge')
```

**Step 2: Commit**

```bash
git add src/components/PixelWorld/index.tsx
git commit -m "feat: wire realtime events into journey state machine transitions"
```

---

## Phase 4: Animation & Props

### Task 16: Map FSM States to LimeZu Spritesheet Rows

**Files:**
- Modify: `src/engine/sprites/spritesheetLoader.ts` (expand ANIM_ROWS mapping)

**Step 1: Add remaining spritesheet row mappings**

In `src/engine/sprites/spritesheetLoader.ts:10-18`, verify and expand ANIM_ROWS. Reference the LimeZu Character Generator guide for exact row positions:

```typescript
const ANIM_ROWS = {
  idle:     2,   // 4 dirs x 1 frame
  walk:     6,   // 4 dirs x 4 frames
  sit:      12,  // 4 dirs x 2 frames
  sit2:     16,  // 4 dirs x 2 frames
  phone:    20,  // 4 dirs x 6 frames
  idleAnim: 24,  // 1 row x 6 frames
  pushCart: 25,  // 4 dirs x 4 frames
  pickUp:   29,  // 4 dirs x 2 frames
  gift:     33,  // 4 dirs x 2 frames
  lift:     37,  // need to verify
  throw:    37,  // need to verify
  hit:      38,  // need to verify
  hurt:     39,  // need to verify
} as const
```

Note: Exact row numbers need verification against the actual spritesheet. The implementer should open a premade character PNG and count rows.

**Step 2: Expand getFrameCoords**

Update the switch in `getFrameCoords()` to map all CharacterStates:
```typescript
case CharacterState.ANGRY_KICK:
  return { sx: (frame % (ANIM_FRAMES.hit ?? 2)) * fs, sy: ((ANIM_ROWS.hit ?? 38) + d) * fs }

case CharacterState.DESPAIR:
  return { sx: (frame % (ANIM_FRAMES.hurt ?? 2)) * fs, sy: ((ANIM_ROWS.hurt ?? 39) + d) * fs }

case CharacterState.SOUL_GHOST_ESCAPE:
  // Use idle frames, renderer handles alpha
  return { sx: (frame % ANIM_FRAMES.idle) * fs, sy: (ANIM_ROWS.idle + d) * fs }
```

**Step 3: Commit**

```bash
git add src/engine/sprites/spritesheetLoader.ts
git commit -m "feat: expand FSM state to LimeZu spritesheet row mapping"
```

---

### Task 17: Gender-Specific Animation Frames

**Files:**
- Modify: `src/engine/genderAnimations.ts` (add frame count data)
- Modify: `src/engine/sprites/spritesheetLoader.ts` (gender-aware frame selection)

**Step 1: Add duration/frame metadata per gender animation**

In `src/engine/genderAnimations.ts`, add frame timing data:
```typescript
export interface GenderAnimFrame {
  action: AnimationAction
  spritesheetAnim: string  // key into ANIM_ROWS
  frames: number
  frameDuration: number  // seconds per frame
  particleType?: string
}

export const GENDER_FRAME_MAP: Record<string, GenderAnimFrame> = {
  'confident_walk': { action: 'confident_walk', spritesheetAnim: 'walk', frames: 4, frameDuration: 0.12 },
  'dramatic_entrance': { action: 'dramatic_entrance', spritesheetAnim: 'walk', frames: 4, frameDuration: 0.18 },
  'sad_slump': { action: 'sad_slump', spritesheetAnim: 'hurt', frames: 2, frameDuration: 0.4, particleType: 'rain' },
  'angry_kick': { action: 'angry_kick', spritesheetAnim: 'hit', frames: 2, frameDuration: 0.15 },
  'flower_offer': { action: 'flower_offer', spritesheetAnim: 'gift', frames: 2, frameDuration: 0.3, particleType: 'heart' },
  'victory_dance': { action: 'victory_dance', spritesheetAnim: 'idleAnim', frames: 6, frameDuration: 0.15, particleType: 'confetti' },
  'eye_roll': { action: 'eye_roll', spritesheetAnim: 'idle', frames: 1, frameDuration: 0.5 },
  'phone_check': { action: 'phone_check', spritesheetAnim: 'phone', frames: 6, frameDuration: 0.2 },
  'blush': { action: 'blush', spritesheetAnim: 'idleAnim', frames: 6, frameDuration: 0.25, particleType: 'heart' },
  'sad_walkoff': { action: 'sad_walkoff', spritesheetAnim: 'walk', frames: 4, frameDuration: 0.2, particleType: 'rain' },
}
```

**Step 2: Commit**

```bash
git add src/engine/genderAnimations.ts src/engine/sprites/spritesheetLoader.ts
git commit -m "feat: add gender-specific animation frame metadata"
```

---

### Task 18: Props System

**Files:**
- Create: `src/engine/propRenderer.ts`
- Modify: `src/engine/engine/renderer.ts` (render props)
- Modify: `src/engine/sprites/spriteData.ts` (add new prop sprites if needed)

**Step 1: Create prop renderer**

Create `src/engine/propRenderer.ts`:
```typescript
import type { SpriteData } from './types'
import { WARDROBE_SPRITE, CAN_SPRITE } from './sprites/spriteData'
import { getCachedSprite } from './sprites/spriteCache'

export interface ActiveProp {
  id: string
  sprite: SpriteData
  x: number
  y: number
  vx: number
  vy: number
  lifetime: number
  timer: number
}

const PROP_SPRITES: Record<string, SpriteData> = {
  wardrobe: WARDROBE_SPRITE,
  can: CAN_SPRITE,
}

export class PropSystem {
  props: ActiveProp[] = []

  spawn(propId: string, x: number, y: number) {
    const sprite = PROP_SPRITES[propId]
    if (!sprite) return

    const vx = propId === 'can' ? 60 : 0
    const vy = propId === 'can' ? -40 : 0
    const lifetime = propId === 'can' ? 1 : 1.5

    this.props.push({ id: propId, sprite, x, y, vx, vy, lifetime, timer: 0 })
  }

  despawn(propId: string) {
    this.props = this.props.filter(p => p.id !== propId)
  }

  update(dt: number) {
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i]
      p.timer += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.id === 'can') p.vy += 80 * dt // gravity
      if (p.timer >= p.lifetime) {
        this.props.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, zoom: number) {
    for (const p of this.props) {
      const cached = getCachedSprite(p.sprite, zoom)
      const px = Math.round(offsetX + p.x * zoom - cached.width / 2)
      const py = Math.round(offsetY + p.y * zoom - cached.height)
      ctx.drawImage(cached, px, py)
    }
  }
}
```

**Step 2: Wire into game loop and renderer**

Add PropSystem instance alongside ParticleSystem. Call `propSystem.update(dt)` in the game loop and `propSystem.render()` in the render function.

Wire SequencePlayer's `onPropSpawn` and `onPropDespawn` callbacks to the PropSystem.

**Step 3: Add new prop sprites**

In `src/engine/sprites/spriteData.ts`, add sprites for flowers and any other needed props (same pattern as existing WARDROBE_SPRITE and CAN_SPRITE — hand-coded hex color arrays).

**Step 4: Commit**

```bash
git add src/engine/propRenderer.ts src/engine/engine/renderer.ts src/engine/sprites/spriteData.ts
git commit -m "feat: add prop system with physics for wardrobe, can, flowers"
```

---

### Task 19: Frame Timer Tuning

**Files:**
- Modify: `src/engine/constants.ts` (adjust timing values)
- Modify: `src/engine/engine/characters.ts` (smooth transitions)

**Step 1: Tune animation constants**

In `src/engine/constants.ts`, adjust values for smoother feel:
```typescript
// Tune these based on visual testing:
export const WALK_FRAME_DURATION_SEC = 0.12  // was 0.15, slightly faster
export const WANDER_PAUSE_MIN_SEC = 1.5      // was 2.0, less idle standing
export const WANDER_PAUSE_MAX_SEC = 8.0      // was 20.0, much less waiting
export const APPROACH_SPEED_CONFIDENT = 96   // was 72, faster confident walk
```

**Step 2: Add idle breathing animation**

In `src/engine/engine/characters.ts`, when character is IDLE and not wandering, cycle through idleAnim frames from LimeZu spritesheet (the breathing/fidget loop).

**Step 3: Test and adjust**

Run: `npx next dev`
Watch character movement. Adjust constants until walks feel smooth and idles feel alive.

**Step 4: Commit**

```bash
git add src/engine/constants.ts src/engine/engine/characters.ts
git commit -m "polish: tune animation frame timers for smoother character movement"
```

---

## Phase 5: Polish & Edge Cases

### Task 20: Theater Replay Updates

**Files:**
- Modify: `src/app/theater/[matchId]/page.tsx` (load gender data for replay)
- Modify: `src/components/TheaterReplay/index.tsx` (use gender-aware animations)

**Step 1: Load gender data for theater replay**

In the theater replay page, fetch both users' gender from the match data and pass to the replay component. The replay component should use the same gender-aware animation sets.

**Step 2: Commit**

```bash
git add src/app/theater/[matchId]/page.tsx src/components/TheaterReplay/index.tsx
git commit -m "feat: support gender-aware animations in public theater replay"
```

---

### Task 21: Mobile Responsive

**Files:**
- Modify: `src/components/PixelWorld/AgentChatBar.tsx` (safe area + touch)
- Modify: `src/components/PixelWorld/MatchChatPanel.tsx` (full-screen on mobile)
- Modify: `src/components/PixelWorld/CandidateSlider.tsx` (swipe gestures)

**Step 1: Bottom bar safe area**

Add `pb-safe` padding to AgentChatBar for iOS safe area. Ensure keyboard doesn't overlap input.

**Step 2: Match chat panel goes full-screen on mobile**

On screens < 768px, MatchChatPanel should be full-screen overlay instead of 320px right panel:
```typescript
className={`absolute z-50 bg-gray-900/95 flex flex-col
  md:right-0 md:top-0 md:h-full md:w-80 md:border-l md:border-gray-700
  inset-0 md:inset-auto`}
```

**Step 3: Swipe gestures on slider**

Add touch event handlers to CandidateSlider for swipe left/right.

**Step 4: Commit**

```bash
git add src/components/PixelWorld/AgentChatBar.tsx src/components/PixelWorld/MatchChatPanel.tsx src/components/PixelWorld/CandidateSlider.tsx
git commit -m "polish: mobile responsive bottom bar, chat panel, and swipe slider"
```

---

### Task 22: Edge Cases

**Files:**
- Modify: `src/hooks/useScenario.ts` (reconnection, timeouts)
- Modify: `src/hooks/useJourneyState.ts` (state recovery)

**Step 1: Handle offline during theater**

If connection drops during THEATER state, pause the sequence player. On reconnect, resync step index from the other client's broadcast.

**Step 2: Match expiry mid-flow**

Listen for match status changes (expired/unmatched). If match expires during any journey state, show agent sad reaction and transition back to HOME_IDLE.

**Step 3: State recovery on page reload**

On mount, check if there's an active match in the database. If so, restore the appropriate journey state (WAITING if proposal pending, THEATER if scenario exists, POST_MATCH if result exists).

**Step 4: Commit**

```bash
git add src/hooks/useScenario.ts src/hooks/useJourneyState.ts
git commit -m "fix: handle disconnection, match expiry, and state recovery"
```

---

## Phase 6: Testing & Deploy

### Task 23: Full E2E Flow Test

**Files:**
- Create: `tests/e2e/journey.spec.ts` (if Playwright is set up)
- Or manual testing checklist

**Step 1: Test all journey states**

Manual test checklist:
1. Fresh user -> onboarding -> lands in home scene
2. Chat "find me someone" -> montage plays -> candidates load
3. Browse slider with arrows -> agent comments change per candidate
4. Click candidate -> ProfilePanel slides in
5. "Send My Agent!" -> DateProposalCard shows (venue picker)
6. Pick venue + propose -> agent shows invite text in bubble
7. (Second browser) Gatekeeper sees notification on home wall
8. Gatekeeper taps -> DateInvitationCard shows
9. Test accept -> both transition to venue -> theater plays
10. Test counter -> countered reaction plays -> different venue loads
11. Test decline -> decline reaction plays -> back to home
12. After theater -> lounge with match chat panel
13. "Find someone else" -> soul ghost escape -> back to home

**Step 2: Test all gender combos**

Create test accounts with different genders. Verify:
- Male chaser + female gatekeeper: classic animations
- Female chaser + male gatekeeper: female-specific animations
- Nonbinary combinations: mixed animations

**Step 3: Test gatekeeper nudge**

Wait 30s as gatekeeper without responding. Verify nudge appears. Accept flip. Verify gatekeeper can now propose.

**Step 4: Test mobile**

Open on mobile viewport. Verify:
- Bottom bar doesn't overlap canvas
- Slider swipes work
- Chat panel goes full-screen
- Safe area respected

**Step 5: Commit test results / fix any bugs found**

```bash
git add -A
git commit -m "test: verify full journey flow across all gender combos and states"
```

---

### Task 24: Build Verification + Deploy

**Step 1: Build check**

Run: `npx next build`
Expected: No errors, no TypeScript failures

**Step 2: Fix any build issues**

Address any type errors, missing imports, or unused variables.

**Step 3: Commit final fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from full journey integration"
```

**Step 4: Push to GitHub**

```bash
git push origin master
```

**Step 5: Deploy to Vercel**

Trigger deploy from Vercel dashboard or via `vercel --prod`.

---

## Summary

| Phase | Tasks | Description |
|-------|-------|------------|
| 1 | 1-5 | Home scene, agent chat bar, montage, candidate slider, venue fix |
| 2 | 6-11 | Gender animations, gatekeeper nudge, theater wiring, speech bubbles, emotes, ghost escape |
| 3 | 12-15 | Journey state machine, post-match chat, invitation notification, realtime wiring |
| 4 | 16-19 | FSM->spritesheet mapping, gender frames, props system, frame tuning |
| 5 | 20-22 | Theater replay, mobile responsive, edge cases |
| 6 | 23-24 | E2E testing, build + deploy |

**Parallelizable groups:**
- Phase 1 tasks 1-4 are sequential (each builds on previous)
- Phase 2 tasks 6-8 can run in parallel (independent engine work)
- Phase 2 tasks 9-11 can run in parallel (independent renderers)
- Phase 3 tasks 12-15 are mostly sequential
- Phase 4 tasks 16-19 can mostly run in parallel
- Phase 5 tasks 20-22 can run in parallel

**Dependencies:**
- Phase 2 depends on Phase 1 (home scene + chat bar must exist)
- Phase 3 depends on Phase 2 (animations must work for theater)
- Phase 4 depends on Phase 2 (FSM states must exist)
- Phase 5 depends on Phases 1-4
- Phase 6 depends on Phase 5
