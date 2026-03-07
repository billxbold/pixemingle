# Date Proposal + Venue Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a date proposal step with venue selection between match approval and scenario generation, including reaction animations for accept/counter/decline outcomes.

**Architecture:** New API routes for propose-date and respond-venue sit between the existing approve/respond flow and scenario generation. LimeZu PNG sprites are loaded via the existing assetLoader extractTile pipeline into SpriteData arrays. Three reaction mini-sequences (accept/counter/decline) are hardcoded FlirtStep arrays played by SequencePlayer before the main Claude-generated scenario.

**Tech Stack:** Next.js 14 App Router, Supabase (DB + Realtime broadcast), Claude Haiku (invite/rejection text), HTML5 Canvas pixel engine, TypeScript

---

### Task 1: Database Migration — Add Venue Columns

**Files:**
- Create: `supabase/migrations/003_venue_columns.sql`
- Modify: `src/types/database.ts`

**Step 1: Write the migration**

```sql
-- Add venue fields to matches
ALTER TABLE matches ADD COLUMN proposed_venue TEXT;
ALTER TABLE matches ADD COLUMN final_venue TEXT;
ALTER TABLE matches ADD COLUMN venue_proposal_text TEXT;
```

**Step 2: Run migration**

Run: `npx supabase db push` (or apply manually if local dev)

**Step 3: Update TypeScript types in `src/types/database.ts`**

Add after line 23 (after SoulType):
```typescript
export type VenueName = 'lounge' | 'gallery' | 'japanese' | 'icecream' | 'studio' | 'museum';

export const VENUE_INFO: Record<VenueName, { label: string; vibe: string; description: string }> = {
  lounge: { label: 'Rooftop Lounge', vibe: 'Chill & Classy', description: 'Upscale rooftop with ambient lighting and plush sofas' },
  gallery: { label: 'Art Gallery', vibe: 'Creative Date', description: 'White-walled gallery with paintings and sculptures' },
  japanese: { label: 'Japanese Restaurant', vibe: 'Romantic Evening', description: 'Intimate spot with low tables, lanterns, and ramen' },
  icecream: { label: 'Ice Cream Shop', vibe: 'Sweet & Casual', description: 'Colorful shop with sundaes and window seats' },
  studio: { label: 'Film Studio', vibe: 'Quirky Adventure', description: 'Behind-the-scenes set with cameras and spotlights' },
  museum: { label: 'The Museum', vibe: 'Intellectual Vibes', description: 'Grand halls with exhibits and quiet corners' },
};
```

Update Match interface (add after `attempt_count` line 54):
```typescript
  proposed_venue: VenueName | null;
  final_venue: VenueName | null;
  venue_proposal_text: string | null;
```

Add new notification types (update line 121):
```typescript
type: 'match_request' | 'theater_ready' | 'chat_message' | 'match_expired' | 'match_result' | 'date_proposal' | 'venue_accepted' | 'venue_countered' | 'date_declined';
```

Add new animation actions (append to AnimationAction union, line 90-97):
```typescript
  | 'wardrobe_change' | 'kick_can' | 'sad_walkoff';
```

**Step 4: Commit**

```bash
git add supabase/migrations/003_venue_columns.sql src/types/database.ts
git commit -m "feat: add venue columns and VenueName type for date proposals"
```

---

### Task 2: Rename Scenes — SceneName to VenueName

**Files:**
- Modify: `src/engine/sceneManager.ts`
- Modify: `src/engine/scenes/index.ts`
- Modify: any files importing `SceneName`

**Step 1: Find all SceneName references**

Run: `grep -rn "SceneName" src/`

**Step 2: Update `src/engine/sceneManager.ts`**

Replace line 4:
```typescript
export type SceneName = 'lounge' | 'gallery' | 'japanese' | 'icecream' | 'studio' | 'museum'
```

Replace line 14 default:
```typescript
currentScene: SceneName = 'lounge'
```

**Step 3: Update `src/engine/scenes/index.ts`**

Replace all function names and the Record type:
```typescript
import type { OfficeLayout } from '../types'
import type { SceneName } from '../sceneManager'

export function createSceneLayouts(): Record<SceneName, OfficeLayout> {
  return {
    lounge: createLoungeLayout(),
    gallery: createGalleryLayout(),
    japanese: createJapaneseLayout(),
    icecream: createIcecreamLayout(),
    studio: createStudioLayout(),
    museum: createMuseumLayout(),
  }
}

function createLoungeLayout(): OfficeLayout {
  return { version: 1, cols: 10, rows: 8, tiles: Array(80).fill(1), furniture: [] }
}

function createGalleryLayout(): OfficeLayout {
  return { version: 1, cols: 12, rows: 8, tiles: Array(96).fill(1), furniture: [] }
}

function createJapaneseLayout(): OfficeLayout {
  return { version: 1, cols: 10, rows: 8, tiles: Array(80).fill(1), furniture: [] }
}

function createIcecreamLayout(): OfficeLayout {
  return { version: 1, cols: 10, rows: 8, tiles: Array(80).fill(1), furniture: [] }
}

function createStudioLayout(): OfficeLayout {
  return { version: 1, cols: 14, rows: 10, tiles: Array(140).fill(1), furniture: [] }
}

function createMuseumLayout(): OfficeLayout {
  return { version: 1, cols: 12, rows: 8, tiles: Array(96).fill(1), furniture: [] }
}
```

**Step 4: Fix all other SceneName imports/references found in Step 1**

Update any component or hook that references old scene names ('bedroom', 'office', etc.) to use new names.

**Step 5: Verify build**

Run: `npx next build`
Expected: No TypeScript errors related to scene names

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename scenes to dating venues (lounge, gallery, japanese, icecream, studio, museum)"
```

---

### Task 3: LimeZu Asset Pipeline — Copy + Load Singles PNGs

**Files:**
- Create: `public/sprites/tilesets/floors/` (copy from LimeZu)
- Create: `public/sprites/tilesets/lounge/` (copy from LimeZu)
- Create: `public/sprites/tilesets/gallery/` (copy from LimeZu)
- Create: `public/sprites/tilesets/japanese/` (copy from LimeZu)
- Create: `public/sprites/tilesets/icecream/` (copy from LimeZu)
- Create: `public/sprites/tilesets/studio/` (copy from LimeZu)
- Create: `public/sprites/tilesets/museum/` (copy from LimeZu)
- Modify: `src/engine/assetLoader.ts`

**Step 1: Copy floor tileset**

```bash
mkdir -p public/sprites/tilesets/floors
cp "moderninteriors-win/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Floors_16x16.png" public/sprites/tilesets/floors/floors.png
```

**Step 2: Copy Singles folders (pick ~15-25 best pieces per venue)**

For each venue, copy the full Singles folder first, then we'll reference specific files by number in the scene layout code. No need to cherry-pick files upfront — the loader only loads what the layout references.

```bash
mkdir -p public/sprites/tilesets/{lounge,gallery,japanese,icecream,studio,museum}

# Lounge <- Living Room Singles
cp moderninteriors-win/1_Interiors/16x16/Theme_Sorter_Singles/2_Living_Room_Singles/*.png public/sprites/tilesets/lounge/

# Gallery <- Art Singles
cp moderninteriors-win/1_Interiors/16x16/Theme_Sorter_Singles/7_Art_Singles/*.png public/sprites/tilesets/gallery/

# Japanese Restaurant <- Japanese Interiors Singles
cp moderninteriors-win/1_Interiors/16x16/Theme_Sorter_Singles/20_Japanese_Interiors_Singles/*.png public/sprites/tilesets/japanese/

# Ice Cream Shop <- Ice Cream Shop Singles
cp moderninteriors-win/1_Interiors/16x16/Theme_Sorter_Singles/24_Ice_Cream_Shop_Singles/*.png public/sprites/tilesets/icecream/

# Film Studio <- Television and Film Studio Singles
cp "moderninteriors-win/1_Interiors/16x16/Theme_Sorter_Singles/23_Television_and_Film_Studio_SIngles/"*.png public/sprites/tilesets/studio/

# Museum <- Museum Singles
cp moderninteriors-win/1_Interiors/16x16/Theme_Sorter_Singles/22_Museum_Singles/*.png public/sprites/tilesets/museum/
```

**Step 3: Extend `src/engine/assetLoader.ts`**

Add PNG-to-SpriteData batch loader that loads Singles by filename:

```typescript
import type { SpriteData } from './types'

export async function loadSpriteSheet(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function extractTile(
  sheet: HTMLImageElement,
  x: number, y: number, w: number, h: number
): SpriteData {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const sprite: SpriteData = []
  for (let row = 0; row < h; row++) {
    const line: string[] = []
    for (let col = 0; col < w; col++) {
      const i = (row * w + col) * 4
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const a = imageData.data[i + 3]
      if (a < 128) {
        line.push('')
      } else {
        line.push(
          '#' +
          r.toString(16).padStart(2, '0') +
          g.toString(16).padStart(2, '0') +
          b.toString(16).padStart(2, '0')
        )
      }
    }
    sprite.push(line)
  }
  return sprite
}

/** Load a single PNG as full SpriteData (entire image, no cropping) */
export async function loadSingleSprite(url: string): Promise<SpriteData> {
  const img = await loadSpriteSheet(url)
  return extractTile(img, 0, 0, img.naturalWidth, img.naturalHeight)
}

/** Load multiple Singles PNGs by filename prefix + numbers */
export async function loadVenueFurniture(
  venueDir: string,
  prefix: string,
  numbers: number[]
): Promise<Map<number, SpriteData>> {
  const result = new Map<number, SpriteData>()
  await Promise.all(
    numbers.map(async (n) => {
      const url = `/sprites/tilesets/${venueDir}/${prefix}${n}.png`
      try {
        const sprite = await loadSingleSprite(url)
        result.set(n, sprite)
      } catch {
        console.warn(`Failed to load: ${url}`)
      }
    })
  )
  return result
}

/** Extract floor tiles from the Room Builder floors sheet (16x16 grid) */
export async function loadFloorTiles(url: string): Promise<SpriteData[]> {
  const sheet = await loadSpriteSheet(url)
  const tiles: SpriteData[] = []
  const cols = Math.floor(sheet.naturalWidth / 16)
  // Extract first row of floor variants (7 patterns)
  for (let i = 0; i < Math.min(cols, 7); i++) {
    tiles.push(extractTile(sheet, i * 16, 0, 16, 16))
  }
  return tiles
}
```

**Step 4: Verify assets load**

Run: `npx next dev` then check browser console for any 404s on sprite URLs

**Step 5: Commit**

```bash
git add src/engine/assetLoader.ts
git commit -m "feat: add LimeZu Singles loader and floor tile extraction"
```

Note: Do NOT commit the LimeZu PNGs to git (they are licensed assets). Add to `.gitignore`:
```
public/sprites/tilesets/lounge/
public/sprites/tilesets/gallery/
public/sprites/tilesets/japanese/
public/sprites/tilesets/icecream/
public/sprites/tilesets/studio/
public/sprites/tilesets/museum/
public/sprites/tilesets/floors/
```

---

### Task 4: Claude LLM — Invite Text + Rejection Text Generation

**Files:**
- Modify: `src/lib/llm.ts`

**Step 1: Add venue invite text generator**

Add after line 18 (after ANIMATION_ACTIONS):

```typescript
import type { VenueName } from '@/types/database';
import { VENUE_INFO } from '@/types/database';

export async function generateInviteText(
  chaserProfile: User,
  venue: VenueName
): Promise<string> {
  const soul = SOUL_CONFIGS[chaserProfile.soul_type];
  const venueInfo = VENUE_INFO[venue];

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are a ${chaserProfile.soul_type} soul type dating agent (humor: ${soul.humor_type}, drama: ${soul.drama_level}/5). Write a 2-3 sentence date invite for "${venueInfo.label}" (${venueInfo.description}). Be fun, personalized, in-character. Name: ${chaserProfile.name}. Output ONLY the invite text, no quotes.`
    }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Hey, wanna grab a bite?';
}
```

**Step 2: Add rejection + walkoff text generator**

```typescript
export async function generateRejectionTexts(
  chaserProfile: User,
  gatekeeperProfile: User,
  venue: VenueName
): Promise<{ rejection_text: string; walkoff_text: string }> {
  const chaserSoul = SOUL_CONFIGS[chaserProfile.soul_type];
  const gatekeeperSoul = SOUL_CONFIGS[gatekeeperProfile.soul_type];

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Two dating agents. Gatekeeper (${gatekeeperProfile.soul_type}, humor: ${gatekeeperSoul.humor_type}) is rejecting Chaser (${chaserProfile.soul_type}, humor: ${chaserSoul.humor_type})'s date at "${VENUE_INFO[venue].label}".

Output ONLY this JSON:
{"rejection_text": "Gatekeeper's savage but funny rejection line (1 sentence)", "walkoff_text": "Chaser's sad funny defeated line as they walk off (1 sentence)"}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text);
  } catch {
    return {
      rejection_text: "I'd rather reorganize my bookshelf.",
      walkoff_text: "Guess I'll go talk to my plants...",
    };
  }
}
```

**Step 3: Add venue context to existing `generateScenario`**

Modify the prompt in `generateScenario` (around line 30). Add after the "Gatekeeper profile" line:

```typescript
const venueContext = venue
  ? `\nThis date takes place at: ${VENUE_INFO[venue].label} (${VENUE_INFO[venue].description}). Contextualize all actions, props, and dialogue to this venue setting.`
  : '';
```

Update function signature to accept venue:
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

Insert `${venueContext}` into the prompt string after the gatekeeper profile line.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**

```bash
git add src/lib/llm.ts
git commit -m "feat: add Claude invite/rejection text generation and venue-aware scenarios"
```

---

### Task 5: API Routes — Propose Date + Respond Venue

**Files:**
- Create: `src/app/api/matches/[id]/propose-date/route.ts`
- Create: `src/app/api/matches/[id]/respond-venue/route.ts`

**Step 1: Create propose-date route**

```typescript
// src/app/api/matches/[id]/propose-date/route.ts
import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateInviteText } from '@/lib/llm'
import type { VenueName } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { venue } = await request.json()
  if (!venue || !VALID_VENUES.includes(venue)) {
    return NextResponse.json({ error: 'Invalid venue' }, { status: 400 })
  }

  // Verify user is chaser (user_a) and match is active
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('user_a_id', user.id)
    .eq('status', 'active')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Load chaser profile for invite text generation
  const { data: chaserProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!chaserProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Generate invite text via Claude
  const inviteText = await generateInviteText(chaserProfile, venue as VenueName)

  // Save to match
  await supabase
    .from('matches')
    .update({
      proposed_venue: venue,
      venue_proposal_text: inviteText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  // Notify gatekeeper
  await supabase.from('notifications').insert({
    user_id: match.user_b_id,
    type: 'date_proposal',
    data: { match_id: matchId, venue, text: inviteText, from_user_id: user.id },
  })

  return NextResponse.json({ text: inviteText, venue })
}
```

**Step 2: Create respond-venue route**

```typescript
// src/app/api/matches/[id]/respond-venue/route.ts
import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateRejectionTexts } from '@/lib/llm'
import type { VenueName } from '@/types/database'

const VALID_VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, venue } = await request.json()
  if (!['accept', 'counter', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'counter' && (!venue || !VALID_VENUES.includes(venue))) {
    return NextResponse.json({ error: 'Invalid venue for counter' }, { status: 400 })
  }

  // Verify user is gatekeeper (user_b) and match is active
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('user_b_id', user.id)
    .eq('status', 'active')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (action === 'accept') {
    await supabase
      .from('matches')
      .update({ final_venue: match.proposed_venue, updated_at: new Date().toISOString() })
      .eq('id', matchId)

    await supabase.from('notifications').insert({
      user_id: match.user_a_id,
      type: 'venue_accepted',
      data: { match_id: matchId, venue: match.proposed_venue },
    })

    return NextResponse.json({ status: 'accepted', venue: match.proposed_venue })
  }

  if (action === 'counter') {
    await supabase
      .from('matches')
      .update({ final_venue: venue, updated_at: new Date().toISOString() })
      .eq('id', matchId)

    await supabase.from('notifications').insert({
      user_id: match.user_a_id,
      type: 'venue_countered',
      data: { match_id: matchId, original: match.proposed_venue, chosen: venue },
    })

    return NextResponse.json({ status: 'countered', original: match.proposed_venue, chosen: venue })
  }

  // Decline
  const [chaserProfile, gatekeeperProfile] = await Promise.all([
    supabase.from('users').select('*').eq('id', match.user_a_id).single(),
    supabase.from('users').select('*').eq('id', user.id).single(),
  ])

  let rejectionTexts = { rejection_text: "I'd rather not.", walkoff_text: "Back to swiping..." }
  if (chaserProfile.data && gatekeeperProfile.data) {
    rejectionTexts = await generateRejectionTexts(
      chaserProfile.data, gatekeeperProfile.data, match.proposed_venue as VenueName
    )
  }

  await supabase
    .from('matches')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', matchId)

  await supabase.from('notifications').insert({
    user_id: match.user_a_id,
    type: 'date_declined',
    data: { match_id: matchId, ...rejectionTexts },
  })

  return NextResponse.json({ status: 'declined', ...rejectionTexts })
}
```

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/app/api/matches/
git commit -m "feat: add propose-date and respond-venue API routes"
```

---

### Task 6: Hooks — useMatching + useScenario Updates

**Files:**
- Modify: `src/hooks/useMatching.ts`
- Modify: `src/hooks/useScenario.ts`

**Step 1: Add proposeDate and respondVenue to `useMatching.ts`**

Add after the `pass` callback (~line 31):

```typescript
const proposeDate = useCallback(async (matchId: string, venue: string) => {
  const res = await fetch(`/api/matches/${matchId}/propose-date`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venue }),
  })
  return res.json()
}, [])

const respondVenue = useCallback(async (matchId: string, action: string, venue?: string) => {
  const res = await fetch(`/api/matches/${matchId}/respond-venue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, venue }),
  })
  return res.json()
}, [])
```

Add to return: `proposeDate, respondVenue`

**Step 2: Add venue events to `useScenario.ts`**

Add state (after line 13):
```typescript
const [venueProposal, setVenueProposal] = useState<{ venue: string; text: string } | null>(null);
const [dateStatus, setDateStatus] = useState<'pending' | 'proposed' | 'accepted' | 'countered' | 'declined'>('pending');
const [reactionData, setReactionData] = useState<Record<string, string> | null>(null);
```

Add new broadcast listeners inside the channel setup (after line 33):
```typescript
.on('broadcast', { event: 'date_proposed' }, ({ payload }) => {
  setVenueProposal(payload as { venue: string; text: string });
  setDateStatus('proposed');
})
.on('broadcast', { event: 'venue_accepted' }, ({ payload }) => {
  setDateStatus('accepted');
  setReactionData(payload as Record<string, string>);
})
.on('broadcast', { event: 'venue_countered' }, ({ payload }) => {
  setDateStatus('countered');
  setReactionData(payload as Record<string, string>);
})
.on('broadcast', { event: 'date_declined' }, ({ payload }) => {
  setDateStatus('declined');
  setReactionData(payload as Record<string, string>);
})
```

Add broadcast helpers:
```typescript
const broadcastDateProposal = useCallback((venue: string, text: string) => {
  channelRef.current?.send({
    type: 'broadcast', event: 'date_proposed', payload: { venue, text },
  });
}, []);

const broadcastVenueResponse = useCallback((event: string, payload: Record<string, unknown>) => {
  channelRef.current?.send({ type: 'broadcast', event, payload });
}, []);
```

Add to return: `venueProposal, dateStatus, reactionData, broadcastDateProposal, broadcastVenueResponse`

**Step 3: Commit**

```bash
git add src/hooks/useMatching.ts src/hooks/useScenario.ts
git commit -m "feat: add venue proposal hooks and realtime broadcast events"
```

---

### Task 7: Reaction Sequences — Wardrobe + Can Kick + Walkoff

**Files:**
- Modify: `src/engine/sequencePlayer.ts`

**Step 1: Add reaction sequence factory methods**

Add after the constructor (~line 33):

```typescript
/** Play a hardcoded mini-sequence before the main scenario */
playReaction(steps: FlirtStep[], onDone: () => void) {
  const reactionScenario: FlirtScenario = {
    match_id: '',
    attempt_number: 0,
    soul_type_a: 'funny',
    soul_type_b: 'funny',
    steps,
    result: 'pending',
  };
  this.load(reactionScenario);
  const origOnComplete = this.callbacks.onComplete;
  this.callbacks.onComplete = () => {
    this.callbacks.onComplete = origOnComplete;
    onDone();
  };
  this.play();
}

/** Venue countered: "oh man" -> wardrobe drop -> outfit change */
static venueCounteredSteps(): FlirtStep[] {
  return [
    { agent: 'chaser', action: 'sad_slump', text: 'oh man...', duration_ms: 1500, emotion: 'sad' },
    { agent: 'chaser', action: 'wardrobe_change', duration_ms: 1000, props: ['wardrobe'] },
    { agent: 'chaser', action: 'confident_walk', text: "alright, let's go!", duration_ms: 1500, emotion: 'excited' },
  ];
}

/** Date declined: roast -> shock -> can kick -> sad walkoff */
static dateDeclinedSteps(rejectionText: string, walkoffText: string): FlirtStep[] {
  return [
    { agent: 'gatekeeper', action: 'eye_roll', text: rejectionText, duration_ms: 1500, emotion: 'irritated' },
    { agent: 'chaser', action: 'rejected_shock', text: '...', duration_ms: 1000, emotion: 'sad' },
    { agent: 'chaser', action: 'kick_can', duration_ms: 1000, props: ['can'] },
    { agent: 'chaser', action: 'sad_walkoff', text: walkoffText, duration_ms: 1500, emotion: 'sad' },
  ];
}
```

**Step 2: Add prop spawn/despawn in startStep**

In `startStep` method, add prop handling after the speech bubble check (~line 84):

```typescript
// Spawn props at character position
if (step.props?.length && agentId) {
  const ch = this.worldState.characters.get(agentId);
  if (ch) {
    for (const prop of step.props) {
      this.callbacks.onPropSpawn?.(prop, ch.x, ch.y);
    }
  }
}
```

Update `SequencePlayerCallback` type to include:
```typescript
onPropSpawn?: (propId: string, x: number, y: number) => void;
onPropDespawn?: (propId: string) => void;
```

**Step 3: Commit**

```bash
git add src/engine/sequencePlayer.ts
git commit -m "feat: add reaction sequences for venue counter and date decline"
```

---

### Task 8: New Sprites — Wardrobe, Can, Kick/Walkoff Animations

**Files:**
- Modify: `src/engine/sprites/spriteData.ts`

**Step 1: Add wardrobe prop sprite (16x32)**

Add at end of furniture sprites section:

```typescript
/** Wardrobe prop for venue counter sequence: 16x32 */
export const WARDROBE_SPRITE: SpriteData = (() => {
  const W = '#5B3A1A' // dark wood
  const L = '#8B6914' // lighter wood
  const D = '#3D2510' // dark edge
  const H = '#C4A43E' // handle/gold
  const S = '#6B4E0A' // shadow
  const rows: string[][] = []
  // Top cap (rows 0-1)
  rows.push([_, _, D, D, D, D, D, D, D, D, D, D, D, D, _, _])
  rows.push([_, D, W, W, W, W, W, W, W, W, W, W, W, W, D, _])
  // Upper body (rows 2-12)
  for (let r = 0; r < 11; r++) {
    const row = [D, W, L, L, L, L, L, L, L, L, L, L, L, L, W, D]
    if (r === 5) { row[7] = H; row[8] = H } // handles
    rows.push(row)
  }
  // Center divider
  rows.push([D, W, W, W, W, W, W, W, W, W, W, W, W, W, W, D])
  // Lower body (rows 14-26)
  for (let r = 0; r < 13; r++) {
    const row = [D, W, L, L, L, L, L, L, L, L, L, L, L, L, W, D]
    if (r === 6) { row[7] = H; row[8] = H } // handles
    rows.push(row)
  }
  // Base (rows 27-28)
  rows.push([D, D, W, W, W, W, W, W, W, W, W, W, W, W, D, D])
  rows.push([_, _, D, D, _, _, _, _, _, _, _, _, _, D, D, _])
  // Feet (rows 29-31)
  rows.push([_, _, S, S, _, _, _, _, _, _, _, _, _, S, S, _])
  rows.push([_, _, S, S, _, _, _, _, _, _, _, _, _, S, S, _])
  rows.push(new Array(16).fill(_))
  return rows
})()
```

**Step 2: Add can prop sprite (6x6)**

```typescript
/** Kicked can: 6x6 pixels */
export const CAN_SPRITE: SpriteData = [
  ['', '#888', '#888', '#888', '#888', ''],
  ['#888', '#AAA', '#CCC', '#CCC', '#AAA', '#888'],
  ['#888', '#CCC', '#E44', '#E44', '#CCC', '#888'],
  ['#888', '#CCC', '#E44', '#E44', '#CCC', '#888'],
  ['#888', '#AAA', '#CCC', '#CCC', '#AAA', '#888'],
  ['', '#888', '#888', '#888', '#888', ''],
]
```

**Step 3: Add wardrobe to furniture catalog**

Find where `FURNITURE_CATALOG` is defined and add:
```typescript
{
  type: 'wardrobe',
  label: 'Wardrobe',
  footprintW: 1,
  footprintH: 2,
  sprite: WARDROBE_SPRITE,
  isDesk: false,
  category: 'props',
},
```

**Step 4: Commit**

```bash
git add src/engine/sprites/spriteData.ts
git commit -m "feat: add wardrobe and can sprites for reaction sequences"
```

---

### Task 9: UI Components — DateProposalCard + DateInvitationCard

**Files:**
- Create: `src/components/DateProposal/DateProposalCard.tsx`
- Create: `src/components/DateProposal/DateInvitationCard.tsx`
- Create: `src/components/DateProposal/VenueCard.tsx`

**Step 1: Create VenueCard (shared between both)**

```typescript
// src/components/DateProposal/VenueCard.tsx
'use client'

import type { VenueName } from '@/types/database'
import { VENUE_INFO } from '@/types/database'

const VENUE_COLORS: Record<VenueName, string> = {
  lounge: '#1a1a2e',
  gallery: '#f5f5f0',
  japanese: '#2d1b0e',
  icecream: '#ffe4f0',
  studio: '#1c1c1c',
  museum: '#e8e0d0',
}

const VENUE_TEXT_COLORS: Record<VenueName, string> = {
  lounge: '#e0d0ff',
  gallery: '#333',
  japanese: '#ffcc80',
  icecream: '#d63384',
  studio: '#00ff88',
  museum: '#5c4033',
}

interface VenueCardProps {
  venue: VenueName
  selected?: boolean
  onClick?: () => void
  compact?: boolean
}

export function VenueCard({ venue, selected, onClick, compact }: VenueCardProps) {
  const info = VENUE_INFO[venue]
  return (
    <button
      onClick={onClick}
      style={{
        background: VENUE_COLORS[venue],
        color: VENUE_TEXT_COLORS[venue],
        border: selected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
        borderRadius: 12,
        padding: compact ? '8px 12px' : '16px',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'monospace',
        imageRendering: 'pixelated' as const,
        transition: 'transform 0.1s, border-color 0.2s',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <div style={{ fontSize: compact ? 14 : 18, fontWeight: 'bold' }}>{info.label}</div>
      {!compact && (
        <>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{info.vibe}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{info.description}</div>
        </>
      )}
    </button>
  )
}
```

**Step 2: Create DateProposalCard (chaser UI)**

```typescript
// src/components/DateProposal/DateProposalCard.tsx
'use client'

import { useState } from 'react'
import type { VenueName } from '@/types/database'
import { VenueCard } from './VenueCard'

const VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

interface DateProposalCardProps {
  matchId: string
  onPropose: (matchId: string, venue: VenueName) => Promise<{ text: string }>
}

export function DateProposalCard({ matchId, onPropose }: DateProposalCardProps) {
  const [selected, setSelected] = useState<VenueName | null>(null)
  const [inviteText, setInviteText] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handlePropose = async () => {
    if (!selected) return
    setSending(true)
    const result = await onPropose(matchId, selected)
    setInviteText(result.text)
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>Invite Sent!</div>
        <div style={{ fontSize: 14, opacity: 0.7, fontStyle: 'italic' }}>"{inviteText}"</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 12 }}>Waiting for their response...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        Pick a Date Spot
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        marginBottom: 16,
      }}>
        {VENUES.map((v) => (
          <VenueCard key={v} venue={v} selected={selected === v} onClick={() => setSelected(v)} />
        ))}
      </div>
      <button
        onClick={handlePropose}
        disabled={!selected || sending}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: selected ? '#e44' : '#555',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontFamily: 'monospace',
          cursor: selected ? 'pointer' : 'not-allowed',
          opacity: sending ? 0.5 : 1,
        }}
      >
        {sending ? 'Your agent is writing...' : 'Propose This Date'}
      </button>
    </div>
  )
}
```

**Step 3: Create DateInvitationCard (gatekeeper UI)**

```typescript
// src/components/DateProposal/DateInvitationCard.tsx
'use client'

import { useState } from 'react'
import type { VenueName } from '@/types/database'
import { VENUE_INFO } from '@/types/database'
import { VenueCard } from './VenueCard'

const VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

interface DateInvitationCardProps {
  chaserName: string
  venue: VenueName
  inviteText: string
  onAccept: () => void
  onCounter: (venue: VenueName) => void
  onDecline: () => void
}

export function DateInvitationCard({
  chaserName, venue, inviteText, onAccept, onCounter, onDecline,
}: DateInvitationCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const info = VENUE_INFO[venue]

  if (showPicker) {
    return (
      <div style={{ padding: 16, fontFamily: 'monospace' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Pick a different spot:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {VENUES.filter((v) => v !== venue).map((v) => (
            <VenueCard key={v} venue={v} onClick={() => onCounter(v)} compact />
          ))}
        </div>
        <button
          onClick={() => setShowPicker(false)}
          style={{
            marginTop: 12, padding: '8px 16px', background: 'transparent',
            color: '#aaa', border: '1px solid #555', borderRadius: 6,
            fontFamily: 'monospace', cursor: 'pointer', width: '100%',
          }}
        >
          Never mind, go back
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', textAlign: 'center' }}>
      <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 8 }}>
        {chaserName}'s agent says:
      </div>
      <div style={{
        fontSize: 16, fontStyle: 'italic', marginBottom: 16,
        padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
        borderRadius: 8, borderLeft: '3px solid #e44',
      }}>
        "{inviteText}"
      </div>
      <VenueCard venue={venue} />
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onAccept} style={{
          flex: 1, padding: 12, background: '#4a4', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', cursor: 'pointer',
        }}>
          Let's go!
        </button>
        <button onClick={() => setShowPicker(true)} style={{
          flex: 1, padding: 12, background: '#e90', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', cursor: 'pointer',
        }}>
          I'd rather go to...
        </button>
        <button onClick={onDecline} style={{
          flex: 1, padding: 12, background: '#a33', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', cursor: 'pointer',
        }}>
          No thanks
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/DateProposal/
git commit -m "feat: add DateProposalCard and DateInvitationCard UI components"
```

---

### Task 10: Integration — Wire Everything Together

**Files:**
- Modify: whichever component renders the match view (find via `grep -rn "useMatching\|useScenario" src/components/`)
- Modify: `src/app/api/scenarios/[matchId]/generate/route.ts` — pass venue

**Step 1: Find the main match/theater component**

Run: `grep -rn "useScenario\|useMatching" src/components/ src/app/`

**Step 2: Wire date proposal flow into the match UI**

After match becomes `active`, show `DateProposalCard` to chaser instead of going straight to scenario generation. Show `DateInvitationCard` to gatekeeper when `date_proposed` event arrives.

On accept/counter/decline:
- Accept: broadcast `venue_accepted`, transition to venue scene, generate scenario
- Counter: broadcast `venue_countered`, play `SequencePlayer.venueCounteredSteps()`, then transition + generate
- Decline: broadcast `date_declined`, play `SequencePlayer.dateDeclinedSteps(rejectionText, walkoffText)`

**Step 3: Update scenario generate route to pass venue**

In `src/app/api/scenarios/[matchId]/generate/route.ts`, read `final_venue` from match record and pass to `generateScenario()`:

```typescript
const venue = match.final_venue as VenueName | undefined
const scenario = await generateScenario(matchId, attemptNumber, chaser, gatekeeper, previousResults, venue)
```

**Step 4: Update SceneManager usage**

Where the scenario starts playing, call `sceneManager.transitionTo(match.final_venue)` before `sequencePlayer.play()`.

**Step 5: Verify full flow**

Run: `npx next dev`
Test: Create two test accounts, approve match, propose venue, accept/counter/decline

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: integrate date proposal flow with venue selection and reaction sequences"
```

---

### Task 11: Populate Scene Layouts with LimeZu Furniture (Post-Integration)

**Files:**
- Modify: `src/engine/scenes/index.ts`
- Create: `src/engine/scenes/venueAssets.ts`

**Step 1: Create venue asset manifest**

```typescript
// src/engine/scenes/venueAssets.ts
import type { VenueName } from '@/types/database'

// Maps venue -> Singles PNG numbers to load as furniture
// Each entry: [singleNumber, gridCol, gridRow, label]
export const VENUE_FURNITURE: Record<VenueName, Array<[number, number, number, string]>> = {
  lounge: [
    [42, 2, 3, 'sofa'],
    [45, 5, 3, 'armchair'],
    [60, 3, 1, 'lamp'],
    [78, 7, 2, 'side_table'],
    [90, 1, 1, 'bookshelf'],
    [15, 8, 5, 'rug'],
  ],
  gallery: [
    [5, 2, 0, 'painting_large'],
    [8, 5, 0, 'painting_small'],
    [12, 8, 0, 'sculpture'],
    [20, 10, 0, 'frame'],
    [30, 3, 5, 'bench'],
    [35, 7, 5, 'pedestal'],
  ],
  japanese: [
    [10, 3, 3, 'low_table'],
    [25, 2, 2, 'cushion_a'],
    [26, 4, 2, 'cushion_b'],
    [50, 1, 1, 'lantern'],
    [70, 7, 1, 'screen'],
    [90, 5, 5, 'plant'],
  ],
  icecream: [
    [15, 3, 3, 'counter'],
    [30, 5, 4, 'table'],
    [35, 4, 4, 'chair_a'],
    [36, 6, 4, 'chair_b'],
    [50, 1, 1, 'display'],
    [70, 8, 2, 'sign'],
  ],
  studio: [
    [10, 2, 3, 'camera'],
    [20, 5, 1, 'spotlight'],
    [30, 8, 3, 'director_chair'],
    [40, 3, 6, 'monitor'],
    [50, 10, 2, 'clapperboard'],
    [60, 7, 5, 'cable_reel'],
  ],
  museum: [
    [10, 2, 2, 'display_case'],
    [30, 5, 1, 'exhibit_stand'],
    [50, 8, 2, 'info_panel'],
    [70, 3, 5, 'bench'],
    [100, 10, 0, 'dinosaur_skull'],
    [120, 6, 4, 'globe'],
  ],
}
```

Note: The exact Singles numbers need to be verified by opening the PNGs visually. These are placeholder numbers — the implementer should open a few PNGs from each folder, find the best furniture items, and update the numbers.

**Step 2: Create scene layout builder that loads assets at runtime**

Update `src/engine/scenes/index.ts` to accept loaded furniture sprites and place them on the grid. The actual tile patterns (walls, floors) use TileType values. Furniture positions come from the manifest above.

**Step 3: Wire asset loading on engine init**

Where the pixel engine initializes (likely in `usePixelWorld` or the main canvas component), call `loadVenueFurniture()` for each venue, then pass results into `createSceneLayouts()`.

**Step 4: Test each venue visually**

Run: `npx next dev`
Navigate to each venue scene and verify furniture renders correctly

**Step 5: Commit**

```bash
git add src/engine/scenes/
git commit -m "feat: populate venue scene layouts with LimeZu furniture sprites"
```

---

## Summary

| Task | Description | Depends On |
|------|------------|-----------|
| 1 | DB migration + types | None |
| 2 | Rename scenes to venues | Task 1 |
| 3 | LimeZu asset pipeline | None (parallel with 1-2) |
| 4 | Claude invite/rejection text | Task 1 |
| 5 | API routes | Tasks 1, 4 |
| 6 | Hook updates | Task 5 |
| 7 | Reaction sequences | Task 1 |
| 8 | New sprites (wardrobe, can) | None (parallel) |
| 9 | UI components | Task 1 |
| 10 | Full integration | Tasks 2, 5, 6, 7, 8, 9 |
| 11 | Scene layouts with LimeZu | Tasks 2, 3 |

Parallelizable groups:
- **Group A (data layer):** Tasks 1, 2, 4, 5, 6
- **Group B (engine):** Tasks 3, 7, 8
- **Group C (UI):** Task 9
- **Group D (glue):** Tasks 10, 11
