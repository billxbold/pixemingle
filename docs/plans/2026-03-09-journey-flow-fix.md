# Journey Flow Fix + Dev Demo Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the broken candidate→approve→matchId→propose→theater pipeline end-to-end and add a dev demo mode for testing without auth.

**Architecture:** Surgical fixes to 3 existing files + 2 new files. No schema changes, no engine changes, no new dependencies. The real pipeline gets fixed by propagating matchId from `approve()` through journey transitions. Dev mode gets a toolbar and a fake-match API route.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript

---

## Task 1: Make approve() return matchId

**Files:**
- Modify: `src/hooks/useMatching.ts:22-29`

**Step 1: Update approve to return matchId**

In `src/hooks/useMatching.ts`, the `approve` callback currently returns `res.json()` raw. Change it to extract and return the matchId explicitly:

```typescript
const approve = useCallback(async (candidateId: string, score?: number, reasons?: unknown) => {
  const res = await fetch('/api/matching/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_id: candidateId, score, reasons }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return { matchId: data.match.id as string, match: data.match }
}, [])
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -20`
Expected: No type errors in useMatching.ts

**Step 3: Commit**

```bash
git add src/hooks/useMatching.ts
git commit -m "fix: make approve() return matchId for pipeline propagation"
```

---

## Task 2: Wire candidate selection → approve → matchId → PROPOSING

**Files:**
- Modify: `src/components/PixelWorld/index.tsx:55-89` (onSelect handler, handleAgentResponse)

**Step 1: Add state for partner name**

At the top of the `PixelWorld` component (after line 66, the `useChat` call), add:

```typescript
const [partnerName, setPartnerName] = useState('Agent')
const [partnerAppearance, setPartnerAppearance] = useState<AgentAppearance | null>(null)
```

Add `useState` to the existing React import if not already there (it is).

**Step 2: Create handleSelectCandidate callback**

After the `handleAgentResponse` callback (after line 89), add:

```typescript
const handleSelectCandidate = useCallback(async (candidate: Candidate) => {
  setSelectedCandidate(candidate)
  try {
    const { matchId } = await approve(candidate.user.id, candidate.score, candidate.reasons)
    setPartnerName(candidate.user.name)
    setPartnerAppearance(candidate.user.agent_appearance)
    journey.transition('PROPOSING', { matchId, role: 'chaser' })
  } catch (err) {
    console.error('Failed to approve candidate:', err)
    const ch = worldStateRef.current?.characters.get(1)
    if (ch) { ch.speechText = "Oops, something went wrong..."; ch.speechTimer = 3 }
  }
}, [approve, journey, worldStateRef, setSelectedCandidate])
```

Add `Candidate` to the import from `@/types/database` (line 16).
Add `approve` to the destructured values from `useMatching()` (line 55).

**Step 3: Fix handleAgentResponse 'approve' action**

Change the 'approve' action block (lines 86-88) from:

```typescript
if (action === 'approve' && journey.state === 'BROWSING' && selectedCandidate) {
  journey.transition('PROPOSING')
}
```

To:

```typescript
if (action === 'approve' && journey.state === 'BROWSING' && selectedCandidate) {
  handleSelectCandidate(selectedCandidate)
}
```

**Step 4: Update CandidateSlider onSelect**

Change the CandidateSlider `onSelect` prop (line 239) from:

```tsx
onSelect={(c) => setSelectedCandidate(c)}
```

To:

```tsx
onSelect={handleSelectCandidate}
```

**Step 5: Fix DateProposalOverlay rendering condition**

Change the DateProposalOverlay condition (lines 259-271) from:

```tsx
{(journey.matchId || initialMatchId) && journey.state !== 'THEATER' && journey.state !== 'POST_MATCH' && (
```

To:

```tsx
{journey.matchId && (journey.state === 'PROPOSING' || journey.state === 'WAITING' || dateStatus === 'proposed' || dateStatus === 'accepted' || dateStatus === 'countered' || dateStatus === 'declined') && (
```

**Step 6: Replace hardcoded chaserName with partnerName**

Replace all occurrences of `chaserName` in the JSX with `partnerName`:
- Line 251: `chaserName={chaserName}` → `chaserName={partnerName}`
- Line 265: `chaserName={chaserName}` → `chaserName={partnerName}`
- Line 280: `partnerName={chaserName}` → `partnerName={partnerName}`

Remove `chaserName = 'Agent'` from the props destructuring (line 36).

**Step 7: Add useEffect to fetch partner info when matchId changes**

After the existing useEffects, add:

```typescript
// Fetch partner name + appearance when matchId is set
useEffect(() => {
  const mid = journey.matchId
  if (!mid) return
  let cancelled = false
  fetch('/api/matches')
    .then(r => r.json())
    .then(data => {
      if (cancelled) return
      const match = data.matches?.find((m: Record<string, unknown>) => m.id === mid)
      if (match?.partner) {
        setPartnerName((match.partner as { name: string }).name)
        const appearance = (match.partner as { agent_appearance: AgentAppearance | null }).agent_appearance
        if (appearance) setPartnerAppearance(appearance)
      }
    })
    .catch(() => {})
  return () => { cancelled = true }
}, [journey.matchId])
```

**Step 8: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build, no type errors

**Step 9: Commit**

```bash
git add src/components/PixelWorld/index.tsx
git commit -m "fix: wire candidate→approve→matchId→PROPOSING pipeline"
```

---

## Task 3: Add POST_MATCH → HOME_IDLE "Find Another" button

**Files:**
- Modify: `src/components/PixelWorld/index.tsx` (JSX, add button + handler)

**Step 1: Create handleFindAnother callback**

After `handleSelectCandidate`, add:

```typescript
const handleFindAnother = useCallback(() => {
  // Remove match character
  worldStateRef.current?.characters.delete(2)
  // Reset state
  setPartnerName('Agent')
  setPartnerAppearance(null)
  // Go home
  transitionTo('home')
  journey.transition('HOME_IDLE')
}, [worldStateRef, transitionTo, journey])
```

**Step 2: Add the button in the canvas area**

Inside the canvas `<div>` (after the DateProposalOverlay block, before the closing `</div>` of the canvas area), add:

```tsx
{/* Find Another button in POST_MATCH */}
{journey.state === 'POST_MATCH' && (
  <button
    onClick={handleFindAnother}
    className="absolute top-4 right-4 z-50 bg-pink-500 hover:bg-pink-600 text-white text-sm font-mono px-4 py-2 rounded-lg shadow-lg"
  >
    Find Another
  </button>
)}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -20`
Expected: Clean

**Step 4: Commit**

```bash
git add src/components/PixelWorld/index.tsx
git commit -m "feat: add Find Another button for POST_MATCH→HOME_IDLE loop"
```

---

## Task 4: Create dev demo-match API route

**Files:**
- Create: `src/app/api/dev/demo-match/route.ts`

**Step 1: Create the route**

Create `src/app/api/dev/demo-match/route.ts`:

```typescript
import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  // Get dev user ID from cookie or header
  const cookieStore = cookies()
  const headerStore = headers()
  const userId = cookieStore.get('dev-user-id')?.value || headerStore.get('x-dev-user-id') || null

  if (!userId) {
    return NextResponse.json({ error: 'No dev user. Visit /dev-login first.' }, { status: 401 })
  }

  const db = createServiceClient()

  // Find a random partner (prefer demo profiles)
  const { data: candidates } = await db
    .from('users')
    .select('id, name, agent_appearance, soul_type, photos')
    .neq('id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: 'No other users found. Run seed script first.' }, { status: 404 })
  }

  // Pick random candidate
  const partner = candidates[Math.floor(Math.random() * candidates.length)]

  // Create active match (skip pending_b for dev)
  const { data: match, error } = await db
    .from('matches')
    .insert({
      user_a_id: userId,
      user_b_id: partner.id,
      status: 'active',
      match_score: 85,
      match_reasons: { personality: 'Dev match', horoscope: 'Stars aligned', shared: ['testing'], explanation: 'Demo match for development' },
      attempt_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    matchId: match.id,
    matchUser: {
      name: partner.name,
      appearance: partner.agent_appearance,
      soulType: partner.soul_type,
      photo: partner.photos?.[0] ?? null,
    },
  })
}
```

**Step 2: Verify the file compiles**

Run: `npx next build 2>&1 | head -20`
Expected: Clean

**Step 3: Commit**

```bash
git add src/app/api/dev/demo-match/route.ts
git commit -m "feat: add dev demo-match route for testing journey flow"
```

---

## Task 5: Create DevToolbar component

**Files:**
- Create: `src/components/PixelWorld/DevToolbar.tsx`
- Modify: `src/components/PixelWorld/index.tsx` (add DevToolbar)

**Step 1: Create DevToolbar**

Create `src/components/PixelWorld/DevToolbar.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import type { JourneyState } from '@/hooks/useJourneyState'
import type { AgentAppearance } from '@/types/database'
import type { SceneName } from '@/engine/sceneManager'

interface DevToolbarProps {
  journeyState: JourneyState
  onTransition: (state: JourneyState, meta?: { matchId?: string; role?: 'chaser' | 'gatekeeper' }) => void
  onTransitionScene: (scene: SceneName) => void
  onSetPartner: (name: string, appearance: AgentAppearance | null) => void
}

export function DevToolbar({ journeyState, onTransition, onTransitionScene, onSetPartner }: DevToolbarProps) {
  const [loading, setLoading] = useState(false)

  if (process.env.NODE_ENV !== 'development') return null

  const handleDemoMatch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/demo-match', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Demo match failed: ${data.error}`)
        return
      }
      onSetPartner(data.matchUser.name, data.matchUser.appearance)
      onTransition('PROPOSING', { matchId: data.matchId, role: 'chaser' })
    } catch (err) {
      alert(`Demo match error: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [onTransition, onSetPartner])

  const handleSkipToTheater = useCallback(() => {
    const enterTheater = (window as unknown as Record<string, unknown>).__enterTheater as ((venue: string) => void) | undefined
    if (enterTheater) {
      enterTheater('lounge')
    } else {
      alert('No __enterTheater on window. Need a matchId first — click Demo Match.')
    }
  }, [])

  const handleReset = useCallback(() => {
    onTransitionScene('home')
    onTransition('HOME_IDLE')
  }, [onTransition, onTransitionScene])

  return (
    <div className="fixed top-2 right-2 z-[9999] flex flex-col gap-1 bg-black/80 border border-yellow-500/50 rounded-lg p-2 text-xs font-mono">
      <div className="text-yellow-400 text-center mb-1">DEV</div>
      <div className="text-gray-400 text-center mb-1">{journeyState}</div>
      <button
        onClick={handleDemoMatch}
        disabled={loading}
        className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        {loading ? '...' : 'Demo Match'}
      </button>
      <button
        onClick={handleSkipToTheater}
        className="bg-purple-700 hover:bg-purple-600 text-white px-2 py-1 rounded"
      >
        Skip→Theater
      </button>
      <button
        onClick={handleReset}
        className="bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded"
      >
        Reset
      </button>
    </div>
  )
}
```

**Step 2: Wire DevToolbar into PixelWorld**

In `src/components/PixelWorld/index.tsx`, add import at top:

```typescript
import { DevToolbar } from './DevToolbar'
```

Add DevToolbar at the end of the root `<div>`, right before the closing `</div>` of the outermost flex container (before `AgentChatBar`):

```tsx
{/* Dev toolbar */}
<DevToolbar
  journeyState={journey.state}
  onTransition={journey.transition}
  onTransitionScene={transitionTo}
  onSetPartner={(name, appearance) => {
    setPartnerName(name)
    setPartnerAppearance(appearance)
  }}
/>
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -20`
Expected: Clean build

**Step 4: Commit**

```bash
git add src/components/PixelWorld/DevToolbar.tsx src/components/PixelWorld/index.tsx
git commit -m "feat: add DevToolbar for testing journey flow without auth"
```

---

## Task 6: Final verification

**Step 1: Full build check**

Run: `npx next build`
Expected: Clean build, no errors

**Step 2: Manual smoke test**

1. `npm run dev`
2. Go to `/dev-login`, pick a user
3. Go to `/world`
4. Dev toolbar should appear top-right showing "HOME_IDLE"
5. Click "Demo Match" → state should change to "PROPOSING", venue picker should appear
6. Pick a venue → state should change to "WAITING"
7. Click "Reset" → back to "HOME_IDLE"
8. Click "Demo Match" again → "PROPOSING"
9. Click "Skip→Theater" → theater should play with fallback scenario

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete journey flow pipeline fix + dev demo mode"
```
