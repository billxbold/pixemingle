# Date Proposal + Venue Selection Design

## Overview

Add a date proposal step between match approval and scenario generation. The chaser picks a venue, their AI agent writes a personalized invite, and the gatekeeper can accept, counter-pick, or decline. Each outcome triggers a distinct pixel animation sequence visible to both users in real-time.

## Flow

```
approve -> active -> chaser proposes date + venue -> gatekeeper responds
  -> accepted:  scene loads -> scenario generates -> play
  -> countered: "oh man" + wardrobe gag -> scene loads -> scenario generates -> play
  -> declined:  roast + can kick + sad walkoff -> done
```

## Data Changes

### Match type additions
- `proposed_venue: VenueName | null` — chaser's pick
- `final_venue: VenueName | null` — venue actually used
- `venue_proposal_text: string | null` — Claude-generated invite

### New types
- `VenueName = 'lounge' | 'gallery' | 'japanese' | 'icecream' | 'studio' | 'museum'`
- Notification types: `'date_proposal' | 'venue_accepted' | 'venue_countered' | 'date_declined'`
- AnimationActions: `'wardrobe_change' | 'kick_can' | 'sad_walkoff'`

### Database migration
- Add `proposed_venue`, `final_venue`, `venue_proposal_text` columns to matches table

## 6 Venues

| Key | Display Name | LimeZu Source | Vibe |
|-----|-------------|---------------|------|
| lounge | Rooftop Lounge | Living Room Singles | Chill & Classy |
| gallery | Art Gallery | Art Singles | Creative Date |
| japanese | Japanese Restaurant | Japanese Interiors Singles | Romantic Evening |
| icecream | Ice Cream Shop | Ice Cream Shop Singles | Sweet & Casual |
| studio | Film Studio | TV & Film Studio Singles | Quirky Adventure |
| museum | The Museum | Museum Singles | Intellectual Vibes |

Replaces old scenes: bedroom, office, gallery, theater, cafe, park.

## API Routes

### POST /api/matches/{id}/propose-date
- Called by: chaser
- Body: `{ venue: VenueName }`
- Action: saves proposed_venue, calls Claude Haiku to generate invite text (~200 tokens), broadcasts `date_proposed` event, creates `date_proposal` notification
- Returns: `{ text: string }`

### POST /api/matches/{id}/respond-venue
- Called by: gatekeeper
- Body: `{ action: 'accept' | 'counter' | 'decline', venue?: VenueName }`
- Accept: sets final_venue = proposed_venue, broadcasts `venue_accepted`, triggers scenario generation
- Counter: sets final_venue = chosen venue, calls Claude for rejection/walkoff text, broadcasts `venue_countered`
- Decline: calls Claude for roast + walkoff text, broadcasts `date_declined`, sets match status to 'rejected'

## Realtime Events (Supabase broadcast on match:{id} channel)

| Event | Payload | Who sees |
|-------|---------|----------|
| date_proposed | { venue, text } | Gatekeeper sees invite card |
| venue_accepted | { venue } | Both — scene loads, scenario generates |
| venue_countered | { original, chosen, rejection_text, walkoff_text } | Both — wardrobe sequence plays |
| date_declined | { rejection_text, walkoff_text } | Both — rejection sequence plays |

## Reaction Sequences

### Venue Countered (~4s, 3 steps)
1. Chaser `sad_slump` + "oh man..." (1500ms)
2. Chaser `wardrobe_change` — wardrobe prop spawns/despawns at character position (1000ms)
3. Chaser `confident_walk` + "alright, let's go!" (1500ms)
Then fade to gatekeeper's venue.

### Date Declined (~5s, 4 steps)
1. Gatekeeper `eye_roll` + Claude-generated roast (1500ms)
2. Chaser `rejected_shock` + "..." (1000ms)
3. Chaser `kick_can` — can prop spawns at feet, arcs across screen (1000ms)
4. Chaser `sad_walkoff` + Claude-generated funny defeated line (1500ms)

## New Sprites

- Wardrobe prop: 16x32 (1x2 tiles), spawns/despawns at character position
- Can prop: 6x6 pixels, simple arc physics (lerp x/y over 500ms)
- `wardrobe_change`: 3 frames (char -> wardrobe covers -> char with new palette)
- `kick_can`: 2 frames (foot forward, foot back)
- `sad_walkoff`: reuse walk_away with sad emotion overlay

## UI Components

### DateProposalCard (chaser)
- 2x3 grid of venue cards with pixel preview + vibe tag
- "Propose This Date" button
- Shows generated invite text before sending

### DateInvitationCard (gatekeeper)
- Chaser agent avatar + invite text + venue preview
- Three buttons: "Let's go!" / "I'd rather go to..." / "No thanks"

## LLM Changes

### Invite text generation (new, small prompt)
- Input: chaser soul type, venue, chaser profile
- Output: 2-3 sentence invite, contextual to venue
- Model: Haiku, ~200 tokens

### Rejection + walkoff text generation (new, small prompt)
- Input: both soul types, venue
- Output: { rejection_text, walkoff_text }
- Model: Haiku, ~200 tokens

### Scenario generation (existing, modified)
- Add venue context: "This date takes place at: {venue} ({description}). Contextualize actions and dialogue to the venue."

## Scene Infrastructure

### LimeZu Asset Pipeline
- Copy Singles folders for 6 venues into public/sprites/tilesets/
- Copy Room_Builder_Floors_16x16.png for floor patterns
- Build image loader: load PNGs -> extractTile -> SpriteData arrays
- Populate scene layouts with real tiles + furniture

### Scene Rename
- SceneName type changes from old names to VenueName
- sceneManager.ts, scenes/index.ts, all references updated

## Hook Changes

### useMatching
- Add `proposeDate(matchId, venue)` — calls propose-date API
- Add `respondVenue(matchId, action, venue?)` — calls respond-venue API

### useScenario
- Listen for `date_proposed`, `venue_accepted`, `venue_countered`, `date_declined` events
- On counter/decline: play reaction sequence via SequencePlayer before main scenario
- Expose `venueProposal`, `dateStatus` state

## Files Changed

| File | Change |
|------|--------|
| src/types/database.ts | Add VenueName, match fields, notification types, animation actions |
| src/engine/sceneManager.ts | SceneName -> VenueName |
| src/engine/scenes/index.ts | 6 new layouts with LimeZu tiles |
| src/engine/sequencePlayer.ts | Add playReactionSequence() for counter/decline mini-sequences |
| src/lib/llm.ts | Add generateInviteText(), generateRejectionText(), venue context in scenario prompt |
| src/hooks/useMatching.ts | Add proposeDate(), respondVenue() |
| src/hooks/useScenario.ts | Add venue event listeners, reaction sequence state |
| src/app/api/matches/[id]/propose-date/route.ts | New |
| src/app/api/matches/[id]/respond-venue/route.ts | New |
| src/components/DateProposal/DateProposalCard.tsx | New |
| src/components/DateProposal/DateInvitationCard.tsx | New |
| src/engine/sprites/spriteData.ts | Wardrobe, can, new animation frame data |
| src/engine/assetLoader.ts | LimeZu PNG loader |
| public/sprites/tilesets/ | LimeZu Singles PNGs |
| supabase/migrations/ | Add venue columns to matches |
