# Character Appearance Picker + Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder character picker with real LimeZu sprite previews (premade + layered), persist `CharacterAppearance` to the user profile, apply it in-world, then run deployment commands.

**Architecture:** Update `AgentAppearance` type to match engine's `CharacterAppearance`. Rewrite `CharacterStep` with canvas previews using `buildCharacterSheet`. Pass appearance from profile → world page → PixelWorld → usePixelWorld → character 1.

**Tech Stack:** Next.js 14 App Router, HTML5 Canvas, LimeZu sprite PNGs, Supabase, TypeScript.

---

### Task 1: Align `AgentAppearance` type with engine's `CharacterAppearance`

The DB column `agent_appearance` is JSONB — no migration needed, just update the TypeScript type.

**Files:**
- Modify: `src/types/database.ts:47-55`

**Step 1: Replace `AgentAppearance` interface**

```typescript
// Replace the existing AgentAppearance interface (lines 47-55) with:
export interface AgentAppearance {
  body: number        // 1-9 (skin tone/body type)
  eyes: number        // 1-7
  outfit: string      // e.g. 'Outfit_01_48x48_01'
  hairstyle: string   // e.g. 'Hairstyle_01_48x48_01'
  accessory?: string
  premadeIndex?: number // if set, use premade PNG directly
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to this change)

**Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: align AgentAppearance type with engine CharacterAppearance"
```

---

### Task 2: Build sprite catalogue helpers

Create a shared helper listing all available LimeZu character assets.

**Files:**
- Create: `src/lib/characterAssets.ts`

**Step 1: Create the helper file**

```typescript
// src/lib/characterAssets.ts

export const PREMADE_COUNT = 20

export function premadeUrl(index: number): string {
  return `/sprites/characters/premade/Premade_Character_48x48_${String(index).padStart(2, '0')}.png`
}

// All outfit filenames (40 total)
export const OUTFITS: string[] = [
  ...Array.from({ length: 10 }, (_, i) => `Outfit_01_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_02_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_03_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3  }, (_, i) => `Outfit_04_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5  }, (_, i) => `Outfit_05_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_06_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_07_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3  }, (_, i) => `Outfit_08_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3  }, (_, i) => `Outfit_09_48x48_${String(i + 1).padStart(2, '0')}`),
]

// All hairstyle filenames (7 per group, groups 01-10)
export const HAIRSTYLES: string[] = Array.from({ length: 10 }, (_, g) =>
  Array.from({ length: 7 }, (_, i) =>
    `Hairstyle_${String(g + 1).padStart(2, '0')}_48x48_${String(i + 1).padStart(2, '0')}`
  )
).flat()

export const BODY_COUNT = 9
export const EYES_COUNT = 7

export const DEFAULT_APPEARANCE: import('@/types/database').AgentAppearance = {
  premadeIndex: 1,
  body: 1,
  eyes: 1,
  outfit: 'Outfit_01_48x48_01',
  hairstyle: 'Hairstyle_01_48x48_01',
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/characterAssets.ts
git commit -m "feat: add character asset catalogue helpers"
```

---

### Task 3: Create `CharacterPreviewCanvas` component

A small canvas that renders the idle-facing-down frame of any `CharacterAppearance`.

**Files:**
- Create: `src/components/CharacterPreview/CharacterPreviewCanvas.tsx`

**Step 1: Create the component**

```tsx
// src/components/CharacterPreview/CharacterPreviewCanvas.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { AgentAppearance } from '@/types/database'
import { buildCharacterSheet } from '@/engine/sprites/spritesheetLoader'

interface Props {
  appearance: AgentAppearance
  size?: number // rendered pixel size (default 96)
}

// Idle DOWN frame: row 2, col 0 in the 48×48 spritesheet
const FRAME_SX = 0
const FRAME_SY = 2 * 48
const FRAME_SIZE = 48

export function CharacterPreviewCanvas({ appearance, size = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, size, size)

    buildCharacterSheet(appearance as Parameters<typeof buildCharacterSheet>[0])
      .then(sheet => {
        ctx.clearRect(0, 0, size, size)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(sheet, FRAME_SX, FRAME_SY, FRAME_SIZE, FRAME_SIZE, 0, 0, size, size)
      })
      .catch(() => {
        // fallback: draw a pink placeholder square
        ctx.fillStyle = '#ec4899'
        ctx.fillRect(size * 0.2, size * 0.1, size * 0.6, size * 0.8)
      })
  }, [appearance, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', width: size, height: size }}
    />
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/CharacterPreview/CharacterPreviewCanvas.tsx
git commit -m "feat: add CharacterPreviewCanvas component"
```

---

### Task 4: Rewrite `CharacterStep` with LimeZu sprite picker

Replace the abstract placeholder picker with actual sprite previews. Two tabs: Premade (20 characters) and Custom (body/eyes/outfit/hairstyle).

**Files:**
- Modify: `src/components/Onboarding/steps/CharacterStep.tsx`

**Step 1: Rewrite CharacterStep.tsx**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { OnboardingData } from '../OnboardingWizard'
import type { AgentAppearance } from '@/types/database'
import { buildCharacterSheet } from '@/engine/sprites/spritesheetLoader'
import {
  PREMADE_COUNT, BODY_COUNT, EYES_COUNT, OUTFITS, HAIRSTYLES, DEFAULT_APPEARANCE,
} from '@/lib/characterAssets'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const FRAME_SX = 0
const FRAME_SY = 2 * 48
const FRAME_SIZE = 48
const PREVIEW_SIZE = 96

function SpriteThumb({ appearance, selected, onClick }: {
  appearance: AgentAppearance
  selected: boolean
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 48, 48)
    buildCharacterSheet(appearance as Parameters<typeof buildCharacterSheet>[0])
      .then(sheet => {
        ctx.clearRect(0, 0, 48, 48)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(sheet, FRAME_SX, FRAME_SY, FRAME_SIZE, FRAME_SIZE, 0, 0, 48, 48)
      })
      .catch(() => {
        ctx.fillStyle = '#ec4899'
        ctx.fillRect(8, 4, 32, 40)
      })
  }, [appearance])

  return (
    <button
      onClick={onClick}
      className={`rounded border-2 transition-colors p-0.5 ${
        selected ? 'border-pink-500' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={48}
        height={48}
        style={{ imageRendering: 'pixelated', display: 'block', width: 48, height: 48 }}
      />
    </button>
  )
}

export function CharacterStep({ data, onChange, onNext, onBack }: Props) {
  const [tab, setTab] = useState<'premade' | 'custom'>('premade')
  const [appearance, setAppearance] = useState<AgentAppearance>(
    data.agent_appearance ?? DEFAULT_APPEARANCE
  )
  const bigCanvasRef = useRef<HTMLCanvasElement>(null)

  // Render big preview whenever appearance changes
  useEffect(() => {
    const canvas = bigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
    buildCharacterSheet(appearance as Parameters<typeof buildCharacterSheet>[0])
      .then(sheet => {
        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(sheet, FRAME_SX, FRAME_SY, FRAME_SIZE, FRAME_SIZE, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
      })
      .catch(() => {
        ctx.fillStyle = '#ec4899'
        ctx.fillRect(PREVIEW_SIZE * 0.2, PREVIEW_SIZE * 0.1, PREVIEW_SIZE * 0.6, PREVIEW_SIZE * 0.8)
      })
  }, [appearance])

  const select = (next: AgentAppearance) => {
    setAppearance(next)
    onChange({ agent_appearance: next })
  }

  const updateCustom = (partial: Partial<AgentAppearance>) => {
    const next: AgentAppearance = { ...appearance, premadeIndex: undefined, ...partial }
    select(next)
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create your Agent</h2>
        <p className="text-sm text-gray-400 mt-1">This pixel buddy represents you in the world</p>
      </div>

      {/* Big preview */}
      <div className="flex justify-center">
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <canvas
            ref={bigCanvasRef}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            style={{ imageRendering: 'pixelated', display: 'block', width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {(['premade', 'custom'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'premade' ? 'Premade (20)' : 'Custom'}
          </button>
        ))}
      </div>

      {/* Premade grid */}
      {tab === 'premade' && (
        <div className="max-h-[35vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: PREMADE_COUNT }, (_, i) => i + 1).map(n => (
              <SpriteThumb
                key={n}
                appearance={{ premadeIndex: n, body: 1, eyes: 1, outfit: OUTFITS[0], hairstyle: HAIRSTYLES[0] }}
                selected={appearance.premadeIndex === n}
                onClick={() => select({ premadeIndex: n, body: 1, eyes: 1, outfit: OUTFITS[0], hairstyle: HAIRSTYLES[0] })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom layered picker */}
      {tab === 'custom' && (
        <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
          {/* Body (skin tone) */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Body / Skin Tone</label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: BODY_COUNT }, (_, i) => i + 1).map(b => (
                <SpriteThumb
                  key={b}
                  appearance={{ ...appearance, premadeIndex: undefined, body: b }}
                  selected={!appearance.premadeIndex && appearance.body === b}
                  onClick={() => updateCustom({ body: b })}
                />
              ))}
            </div>
          </div>

          {/* Eyes */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Eyes</label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: EYES_COUNT }, (_, i) => i + 1).map(e => (
                <SpriteThumb
                  key={e}
                  appearance={{ ...appearance, premadeIndex: undefined, eyes: e }}
                  selected={!appearance.premadeIndex && appearance.eyes === e}
                  onClick={() => updateCustom({ eyes: e })}
                />
              ))}
            </div>
          </div>

          {/* Outfit */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Outfit ({OUTFITS.length} options)</label>
            <div className="flex gap-1.5 flex-wrap">
              {OUTFITS.map(o => (
                <SpriteThumb
                  key={o}
                  appearance={{ ...appearance, premadeIndex: undefined, outfit: o }}
                  selected={!appearance.premadeIndex && appearance.outfit === o}
                  onClick={() => updateCustom({ outfit: o })}
                />
              ))}
            </div>
          </div>

          {/* Hairstyle */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Hairstyle ({HAIRSTYLES.length} options)</label>
            <div className="flex gap-1.5 flex-wrap">
              {HAIRSTYLES.map(h => (
                <SpriteThumb
                  key={h}
                  appearance={{ ...appearance, premadeIndex: undefined, hairstyle: h }}
                  selected={!appearance.premadeIndex && appearance.hairstyle === h}
                  onClick={() => updateCustom({ hairstyle: h })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/Onboarding/steps/CharacterStep.tsx
git commit -m "feat: rewrite CharacterStep with LimeZu sprite previews"
```

---

### Task 5: Apply user appearance in-world

When the user loads the world, their chosen avatar should render instead of the hardcoded premadeIndex 1.

**Files:**
- Modify: `src/app/world/page.tsx`
- Modify: `src/components/PixelWorld/index.tsx:19-23`
- Modify: `src/hooks/usePixelWorld.ts:35-39`

**Step 1: Make world page a server component that fetches user appearance**

```tsx
// src/app/world/page.tsx
import { createServerSupabase } from '@/lib/supabase-server'
import { PixelWorld } from '@/components/PixelWorld'
import type { AgentAppearance } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function WorldPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  let appearance: AgentAppearance | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('agent_appearance')
      .eq('id', user.id)
      .single()
    appearance = (data?.agent_appearance as AgentAppearance) ?? null
  }

  return <PixelWorld userAppearance={appearance} />
}
```

**Step 2: Add `userAppearance` prop to `PixelWorld`**

In `src/components/PixelWorld/index.tsx`, update the interface and pass to hook:

```tsx
// Add to PixelWorldProps interface:
userAppearance?: import('@/types/database').AgentAppearance | null

// Update the function signature:
export function PixelWorld({ matchId = null, role = 'chaser', chaserName = 'Agent', userAppearance = null }: PixelWorldProps) {

// Pass to usePixelWorld:
const { ... } = usePixelWorld(userAppearance ?? undefined)
```

**Step 3: Accept and apply appearance in `usePixelWorld`**

In `src/hooks/usePixelWorld.ts`, update to accept appearance param:

```typescript
// Change signature:
export function usePixelWorld(userAppearance?: import('@/types/database').AgentAppearance) {

// In the useEffect that creates worldState, replace hardcoded appearance:
worldState.addAgent(1, 0, 0, undefined, true)
const ch = worldState.characters.get(1)
if (ch) {
  // Use user's saved appearance, or default to premade 1
  const appearance = userAppearance ?? { body: 1, eyes: 1, outfit: 'Outfit_01_48x48_01', hairstyle: 'Hairstyle_01_48x48_01', premadeIndex: 1 }
  ch.appearance = appearance as import('@/engine/types').CharacterAppearance
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/app/world/page.tsx src/components/PixelWorld/index.tsx src/hooks/usePixelWorld.ts
git commit -m "feat: load user avatar appearance from profile in world"
```

---

### Task 6: Manual verification

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts, no compile errors

**Step 2: Check onboarding character step**

Navigate to `http://localhost:3000/onboarding` in browser, advance to character step.
Expected:
- 20 premade sprites shown as a grid with actual pixel art
- Clicking one updates the big preview
- Custom tab shows body/eyes/outfit/hairstyle pickers with sprite thumbnails
- Next button advances to role step

**Step 3: Check world page applies avatar**

Complete onboarding with a specific premade character, then go to `/world`.
Expected: Character in the world uses selected appearance (not always premadeIndex 1).

**Step 4: Stop dev server**

---

### Task 7: Deployment - automatable commands

These run the pending deployment tasks that don't require a browser/dashboard.

**Step 1: Push DB migrations**

Run: `npx supabase db push`
Expected: Outputs "Applying migration 20260307000000_venue_columns.sql" and succeeds (or "No migrations to apply" if already done)

**Step 2: Push code to GitHub**

Run: `git push origin master`
Expected: Pushed to remote, shows commit count

**Step 3: Run seed script**

Run: `npx tsx scripts/seed-profiles.ts`
Expected: Outputs "Seeded N demo profiles" with no errors

**Remaining manual steps (out of scope for this plan):**
- Vercel: Connect GitHub repo → add env vars → deploy
- Stripe: Create products/prices in dashboard → add `STRIPE_PRICE_WINGMAN_ID` + `STRIPE_PRICE_RIZZLORD_ID` env vars
