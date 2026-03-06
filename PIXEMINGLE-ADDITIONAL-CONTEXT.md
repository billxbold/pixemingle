# Pixemingle — Additional Context & Decisions
### For Claude Code / Superpower CLI — read alongside PIXEMINGLE-PRD.md

---

## Origin Story & Why This Exists

The idea: copy the KiloClaw model (managed OpenClaw hosting) but for SOCIALIZING instead of dev tools. OpenClaw agents are powerful but only techies use them. We make the agent experience accessible to everyone through a pixel art world where AI agents mingle on your behalf — starting with dating, expanding to all social interaction.

The inspiration chain: Facebook started as college dating → became social platform. Pixemingle starts as AI agent dating entertainment → becomes AI social platform.

MoltMatch (Feb 2026) proved demand for AI agent dating but failed because: no entertainment value (text only), no consent (agents acted autonomously), crypto gimmicks, consent scandals made international news. We fix ALL of these.

---

## Key Brainstorming Decisions (Not in PRD)

### Why "entertainment first, dating second"
Users aren't paying for access to people (feels sleazy like traditional dating apps). They're paying for entertainment and cosmetics (feels fun). This is Fortnite/Sims monetization applied to social. The match is a BYPRODUCT of comedy. This reframing changes everything about retention — people come back to see what funny thing their agent does next, not just to find dates.

### Why pixel art specifically
- Pixel Agents by Pablo De Lucca is trending (3.1k stars, Fast Company coverage)
- MIT licensed — entire rendering engine is legally reusable
- Pixel art is forgiving — you don't need AAA animation quality for comedy
- Low fidelity makes the humor FUNNIER (a pixel character kicking a trash can is funnier than a realistic one)
- Colorization system means one base sprite = infinite character variants
- Small file sizes = fast loading on mobile

### The "soul escaping" mechanic (viral moment)
When a user wants new matches while still in an active match:
- THEIR VIEW: agent's ghost (semi-transparent version) floats out of body, looks disappointed, reforms into solid agent, restarts gallery search
- OTHER USER'S VIEW: sees NOTHING. Café scene continues normally. Gradually the matched agent becomes less engaged (checks phone, looks around). Eventually just disappears. Like Tinder unmatch — no notification, no explanation.
- This asymmetry is important. The leaving user gets a funny/emotional moment. The other user isn't humiliated.

### Why NOT one-by-one candidate browsing
Original idea was agent walks to each photo on a wall one by one. KILLED because:
- Too slow, boring, kills momentum
- Instead: "research montage" (agent at desk working hard, 10 seconds) → ALL candidates revealed at once on gallery wall
- User taps any photo to inspect. Agent walks to THAT photo and presents it.
- Agent explains WHY each candidate was chosen (horoscope, personality fit, shared interests)
- This makes the AI feel intelligent, not random

### Chaser / Gatekeeper roles
- NOT gender-locked. Any user picks either role regardless of gender.
- Chaser: energetic, pursues, gets dramatically sad on rejection, escalates creativity
- Gatekeeper: composed, tests suitors, gradually warms or gets increasingly annoyed
- Comedy comes from the DYNAMIC between them, not from stereotypes
- Frame as "comedy archetypes" in marketing to avoid any controversy

---

## Viral UGC Sharing Strategy

**This is the #1 growth lever and the PRD only mentions it briefly. Here's the full plan:**

### What Gets Shared
The flirting theater scenes. Specifically:
- The rejection moments (agent kicking trash can, rain cloud, dramatic fall)
- The grand gestures (helicopter entrance, flower delivery)
- The "false hope" scenario (holding hands → one drops → devastation)
- The soul escape animation
- The gatekeeper getting increasingly annoyed across attempts

### How Sharing Works (MVP)

**Phase 1 (Launch week): Screenshot-friendly design**
- Every theater scene has a clean, shareable composition
- Agent names + match % visible in corner (like a sports scoreboard)
- Pixel art renders crisply at any zoom level — screenshots look great
- Add a small "pixemingle.com" watermark in corner of the theater scene
- Users manually screenshot and share — this is how most viral content starts

**Phase 2 (Week 3): GIF/Video Export**
- "Share this moment" button appears after key comedy beats
- Captures last 5-10 seconds of canvas animation as GIF or MP4
- Auto-adds Pixemingle watermark + "Watch your agent mingle → pixemingle.com"
- Direct share to: Twitter/X, Instagram Stories, TikTok, iMessage, WhatsApp
- GIF is lightweight (pixel art compresses well), loads fast everywhere

**Phase 3 (Month 2): Replay & Highlight Reel**
- Users can rewatch any past flirting scene (premium feature)
- "Best moments" auto-compiled from most dramatic/funny scenes
- Weekly "highlight reel" notification: "Your agent's funniest moment this week"
- Share full highlight reel as video

### Why This Goes Viral
- Pixel art is inherently shareable (nostalgia, aesthetic appeal)
- Dating disaster stories are ALREADY viral content (r/Tinder, dating TikTok)
- The comedy is visual, not text — works across languages
- Every share has the watermark + URL — free marketing
- People share failures MORE than successes — and our failures are hilarious
- "Watch what my agent did" is a new genre of content nobody else has

### Sharing UX in the Pixel World
- After a theater scene ends, a small pixel camera icon appears in corner
- Tapping it: agent holds up a pixel polaroid of the scene
- Options: "Save to Gallery" (in-app replay) or "Share" (export)
- Sharing shows platform icons (X, IG, TikTok, Copy Link)
- Each platform gets optimized format (square for IG, landscape for X, vertical for TikTok)

---

## Matching Algorithm Details (MVP)

The PRD says "rule-based scoring" but here's exactly how:

```
Score = (personality_match * 0.40) + (horoscope_match * 0.15) + 
        (lifestyle_match * 0.25) + (interest_match * 0.20)

personality_match:
  Count shared answers across personality quiz questions.
  Each shared answer = 1 point. Normalize to 0-1.
  
horoscope_match:
  Hardcoded 12x12 compatibility matrix (0.0 to 1.0).
  Classic astrology pairings: Scorpio+Pisces = 0.95, etc.
  This is for entertainment, not science. Users love it.

lifestyle_match:
  Compare: location proximity, age range preference met,
  relationship goals alignment (casual/serious/friends).
  Binary checks weighted equally.

interest_match:
  Count overlapping interests from profile.
  Normalize by total unique interests.
```

Week 2 upgrade: replace personality_match with actual embedding similarity using profile text. But rule-based is perfectly fine for launch.

---

## The "Not Just Dating" Vision

Pixemingle starts with dating because:
1. Highest emotional engagement → best comedy
2. Proven market (MoltMatch virality)
3. Clear monetization (dating users pay more than social users)

But the platform architecture supports ANY social interaction:
- **Friend-finding mode**: agents mingle at a pixel party, find people with shared hobbies
- **Networking mode**: agents in a pixel conference, exchange pixel business cards
- **Group mode**: multiple agents at a pixel dinner party, comedy chaos
- **Event mode**: themed pixel events (Valentine's, Halloween, New Year)

The pixel world, character customization, soul system, and agent animation engine are ALL mode-agnostic. Only the LLM prompts and scenario templates change per mode.

**Don't build any of this for Monday.** But architect the Theater component and scenario system so the `FlirtScenario` type can later become a generic `SocialScenario` type with different action sets.

---

## Seed Profiles Strategy

Cold start problem: matching needs critical mass. 50-100 seed profiles needed for Day 1.

**How to create them:**
- Use stock photos from Unsplash (free, attribution in profile: "Demo profile")
- Fill personality answers with diverse combinations (cover all 4 soul types)
- Mix of genders, age ranges, horoscope signs
- Flag as `is_demo: true` in DB
- Demo profiles' "agents" run pre-written scenario responses (no LLM needed)
- When a real user matches with a demo, the flirt theater still plays normally but the demo agent uses template responses

**Important:** Be transparent. Demo profiles should have a small badge "✨ Demo Agent" visible in their gallery card. Users should know these aren't real people. Trust > engagement tricks.

**Remove demo profiles** when you hit 200+ real users in the same region.

---

## Cost Estimates

### Monthly Burn at Launch (500 users)

| Item | Cost |
|------|------|
| Vercel Pro | $20/mo |
| Supabase Pro | $25/mo |
| Anthropic API (~500 scenarios/week) | $25-50/mo |
| Domain (pixemingle.com or .ai) | $12-50/year |
| Fiverr sprite commission | $60-100 one-time |
| **Total monthly** | **~$70-95/mo** |

### Revenue at 500 Users (conservative)

| Stream | Amount |
|--------|--------|
| 40 Wingman subscribers (8%) | $400/mo |
| 10 Rizz Lord subscribers (2%) | $200/mo |
| **Total monthly** | **~$600/mo** |

Profitable from month 1 with just 500 users and 10% conversion.

---

## Things Claude Code Should Know

1. **pixel-agents repo** is at github.com/pablodelucca/pixel-agents — MIT licensed. The webview-ui/src/ folder contains the React + Canvas rendering engine. The key files to extract: engine/ folder (rendering, sprites, pathfinding), office/types.ts (core interfaces). Strip ALL VS Code extension code (PixelAgentsViewProvider, agentManager, fileWatcher, transcriptParser).

2. **The canvas renders at integer zoom levels for pixel-perfect display.** Default zoom = Math.round(2 * devicePixelRatio). Never use ctx.scale(dpr). Z-sort all entities by Y coordinate. Use requestAnimationFrame for the game loop.

3. **Character FSM states:** idle → walk (BFS pathfind to target) → action (type-specific animation) → return to idle. Add new states for dating: approach, deliver_line, react_emotion, use_prop, celebrate, despair.

4. **Sprite colorization** works by palette swap — take base sprite RGBA buffer, replace specific color ranges with new palette. This is how one character base becomes many unique characters. The system is already built in pixel-agents.

5. **LLM calls MUST use structured output.** Send the FlirtScenario TypeScript interface as part of the prompt. Tell Claude to output ONLY valid JSON. Parse with try/catch, retry once on parse failure. Never trust raw LLM output without validation.

6. **Supabase Realtime** for chat: subscribe to `chat_messages` table filtered by match_id. On insert, render as speech bubble in café scene + append to chat log. Simple, no custom WebSocket server needed.

7. **The "thinking" animation** is your escape hatch for ANY async operation. Whenever waiting for backend: play the thinking loop (agent taps chin, paces, looks at notebook). It's funnier than a spinner and buys unlimited time.

8. **Mobile canvas touch:** translate touch events to canvas coordinates accounting for zoom and pan offset. The pixel-agents codebase has this already in its input handling.

9. **Photo overlay on canvas:** don't try to draw photos IN the canvas. Use absolutely positioned HTML img elements on top of the canvas, aligned to world coordinates. Transform their position when the camera pans/zooms. This way photos stay crisp (no canvas scaling artifacts).

10. **Pre-generate scenarios aggressively.** On every matching/search call, also fire background scenario generation for top 3 candidates. Cache in DB. By the time user browses gallery and approves someone, their scenario is already waiting. This is the single biggest UX win.
