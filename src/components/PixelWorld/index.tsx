'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePixelWorld } from '@/hooks/usePixelWorld'
import { useMatching } from '@/hooks/useMatching'
import { useDateSync } from '@/hooks/useDateSync'
import { useJourneyState } from '@/hooks/useJourneyState'
import { useTheater } from '@/hooks/useTheater'
import { Canvas } from './Canvas'
import { DateProposalOverlay } from './DateProposalOverlay'
import { AgentChatBar } from './AgentChatBar'
import { CandidateSlider } from './CandidateSlider'
import { InvitationNotification } from './InvitationNotification'
import { ChatPanel } from './ChatPanel'
import { DevToolbar } from './DevToolbar'
import { useChat } from '@/hooks/useChat'
import { PortraitPanel } from '@/components/PortraitPanel'
import { resolveExpression } from '@/engine/expressionEngine'
import { parseExpressionPreferences } from '@/engine/soulMdParser'
import type { ExpressionPreferences } from '@/engine/soulMdParser'
import type { PortraitExpression } from '@/engine/types'
import type { EmotionState } from '@/types/database'
import type { SceneName } from '@/engine/sceneManager'
import type { AgentAppearance, Candidate } from '@/types/database'

const SCENE_LABELS: Record<SceneName, string> = {
  home: 'Home',
  lounge: 'Rooftop Lounge',
  gallery: 'Art Gallery',
  japanese: 'Japanese Restaurant',
  icecream: 'Ice Cream Shop',
  studio: 'Film Studio',
  museum: 'The Museum',
}

interface PixelWorldProps {
  matchId?: string | null
  role?: 'chaser' | 'gatekeeper'
  userAppearance?: AgentAppearance | null
  userId?: string
}

export function PixelWorld({ matchId: initialMatchId = null, role: initialRole = 'chaser', userAppearance = null, userId = '' }: PixelWorldProps) {
  const {
    worldStateRef,
    sceneManagerRef,
    panRef,
    venueImagesRef,
    particlesRef,
    propsRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
    playMontage,
    onFrameUpdate,
  } = usePixelWorld(userAppearance ?? undefined)

  const journey = useJourneyState()
  const theaterStartedRef = useRef(false)
  const theaterCompletedRef = useRef(false)
  const { candidates, selectedCandidate, setSelectedCandidate, search, approve, pass, proposeDate, respondVenue } = useMatching()
  const {
    dateStatus,
    venueProposal,
    reactionData,
    broadcastDateProposal,
    broadcastVenueResponse,
  } = useDateSync(journey.matchId ?? initialMatchId, journey.role ?? initialRole, journey.recoveredProposal)

  // Post-match human chat
  const chatMatchId = journey.state === 'POST_MATCH' ? (journey.matchId ?? initialMatchId) : null
  const { messages, sendMessage, isLoading: chatLoading } = useChat(chatMatchId)

  // Partner info (fetched on match)
  const [partnerName, setPartnerName] = useState('Agent')
  const [partnerAppearance, setPartnerAppearance] = useState<AgentAppearance | null>(null)

  // Theater hook — active during THEATER journey state
  const theaterMatchId = journey.state === 'THEATER' ? (journey.matchId ?? initialMatchId) : null
  const theater = useTheater(theaterMatchId, userId)

  // Portrait panel state — driven by theater when active, manual otherwise
  const defaultPrefs = useRef<ExpressionPreferences>(parseExpressionPreferences(''))
  const [manualChaserEmotion, setManualChaserEmotion] = useState<PortraitExpression>('neutral')
  const [manualGatekeeperEmotion, setManualGatekeeperEmotion] = useState<PortraitExpression>('neutral')
  const [manualActiveSpeaker, setManualActiveSpeaker] = useState<'chaser' | 'gatekeeper' | null>(null)
  const [manualSpeechText, setManualSpeechText] = useState<string | null>(null)
  const [manualChaserSoulPrefs, setManualChaserSoulPrefs] = useState<ExpressionPreferences>(defaultPrefs.current)
  const [manualGatekeeperSoulPrefs, setManualGatekeeperSoulPrefs] = useState<ExpressionPreferences>(defaultPrefs.current)

  // Use theater-driven values when theater is active, manual otherwise
  const isTheaterActive = theater.status !== 'idle'
  const chaserEmotion = isTheaterActive ? theater.chaserEmotion : manualChaserEmotion
  const gatekeeperEmotion = isTheaterActive ? theater.gatekeeperEmotion : manualGatekeeperEmotion
  const activeSpeaker = isTheaterActive ? theater.activeSpeaker : manualActiveSpeaker
  const speechText = isTheaterActive ? theater.speechText : manualSpeechText
  const chaserSoulPrefs = isTheaterActive ? theater.chaserSoulPrefs : manualChaserSoulPrefs
  const gatekeeperSoulPrefs = isTheaterActive ? theater.gatekeeperSoulPrefs : manualGatekeeperSoulPrefs

  // Derive character IDs for portraits
  const chaserCharId = userAppearance?.premadeIndex
    ? `char_${String(userAppearance.premadeIndex).padStart(2, '0')}`
    : 'char_custom_chaser'
  const gatekeeperCharId = partnerAppearance?.premadeIndex
    ? `char_${String(partnerAppearance.premadeIndex).padStart(2, '0')}`
    : 'char_custom_gatekeeper'

  /**
   * Updates portrait panel from a theater turn.
   * Used by dev toolbar for manual testing. Theater hook drives this automatically.
   */
  const updatePortraitFromTurn = useCallback((turn: {
    agent_role: 'chaser' | 'gatekeeper'
    emotion: EmotionState
    text?: string
    soul_md?: string
  }) => {
    const prefs = turn.agent_role === 'chaser' ? manualChaserSoulPrefs : manualGatekeeperSoulPrefs
    const config = resolveExpression(turn.emotion, prefs)

    if (turn.agent_role === 'chaser') {
      setManualChaserEmotion(config.portrait)
    } else {
      setManualGatekeeperEmotion(config.portrait)
    }

    setManualActiveSpeaker(turn.agent_role)
    setManualSpeechText(turn.text ?? null)
  }, [manualChaserSoulPrefs, manualGatekeeperSoulPrefs])

  // Connect particle system to world state for atom triggers
  useEffect(() => {
    if (worldStateRef.current && particlesRef.current) {
      worldStateRef.current.setParticleSystem(particlesRef.current)
    }
  }, [worldStateRef, particlesRef])

  // Expose for dev testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__updatePortrait = updatePortraitFromTurn;
      (window as unknown as Record<string, unknown>).__setChaserSoulPrefs = setManualChaserSoulPrefs;
      (window as unknown as Record<string, unknown>).__setGatekeeperSoulPrefs = setManualGatekeeperSoulPrefs;
    }
  }, [updatePortraitFromTurn])

  // Wire theater turn rendering to canvas (atom playback + body modifiers)
  useEffect(() => {
    if (!theater.renderingTurn || !worldStateRef.current) return
    const turn = theater.renderingTurn
    const ws = worldStateRef.current
    const characterId = turn.agent_role === 'chaser' ? 1 : 2
    const ch = ws.characters.get(characterId)
    if (!ch) {
      theater.onTurnRendered()
      return
    }

    // Apply body modifier from expression
    const prefs = turn.agent_role === 'chaser' ? theater.chaserSoulPrefs : theater.gatekeeperSoulPrefs
    const expr = resolveExpression(turn.emotion, prefs)
    ch.activeBodyModifier = expr.body_modifier

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // Play comedy atoms if any
    if (turn.comedy_atoms && turn.comedy_atoms.length > 0) {
      ws.playAtoms(characterId, turn.comedy_atoms, () => {
        theater.onTurnRendered()
      })
    } else {
      // No atoms — auto-complete after speech display time
      const displayTime = turn.text ? Math.max(2000, turn.text.length * 60) : 1500
      timeoutId = setTimeout(() => theater.onTurnRendered(), displayTime)
    }

    // Spawn particles from expression, accounting for atom player offsets
    if (expr.particles.length > 0 && particlesRef.current) {
      const atomPlayer = ws.getAtomPlayer(characterId)
      const atomAdj = atomPlayer?.getCurrentAdjustments()
      const atomOffX = atomAdj?.offsetX ?? 0
      const atomOffY = atomAdj?.offsetY ?? 0
      for (const pType of expr.particles) {
        particlesRef.current.spawn(pType, ch.x + atomOffX, ch.y - 24 + atomOffY, 1)
      }
    }

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [theater.renderingTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset theater completed ref when entering theater
  useEffect(() => {
    if (journey.state === 'THEATER') {
      theaterCompletedRef.current = false
    }
  }, [journey.state])

  // Theater completion → journey transition (guarded against double-fire)
  useEffect(() => {
    if (theater.status !== 'complete') return
    if (theaterCompletedRef.current) return
    theaterCompletedRef.current = true
    worldStateRef.current?.resetTheater()
    if (theater.outcome === 'accepted') {
      journey.transition('POST_MATCH')
    } else if (theater.outcome === 'rejected') {
      journey.transition('HOME_IDLE')
      transitionTo('home')
    }
  }, [theater.status, theater.outcome]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Wire agent chat actions to journey transitions
  const handleAgentResponse = useCallback((text: string, action: string | null) => {
    const ch = worldStateRef.current?.characters.get(1)
    if (ch) {
      ch.speechText = text
      ch.speechTimer = Math.max(3, text.length * 0.05)
    }
    if (action === 'search' && journey.state === 'HOME_IDLE') {
      journey.transition('RESEARCHING')
      playMontage(() => {
        const ch2 = worldStateRef.current?.characters.get(1)
        if (ch2) {
          ch2.speechText = "Found some interesting people!"
          ch2.speechTimer = 3
        }
        search().then(() => journey.transition('BROWSING'))
      })
    }
    if (action === 'approve' && journey.state === 'BROWSING' && selectedCandidate) {
      handleSelectCandidate(selectedCandidate)
    }
  }, [worldStateRef, playMontage, journey, search, selectedCandidate, handleSelectCandidate])

  const handleFindAnother = useCallback(() => {
    worldStateRef.current?.characters.delete(2)
    setPartnerName('Agent')
    setPartnerAppearance(null)
    transitionTo('home')
    journey.transition('HOME_IDLE')
  }, [worldStateRef, transitionTo, journey])

  // Chaser transitions to WAITING after proposing
  useEffect(() => {
    if (dateStatus === 'proposed' && (journey.role || initialRole) === 'chaser' && journey.state !== 'WAITING') {
      journey.transition('WAITING')
    }
  }, [dateStatus, journey, initialRole])

  // Gatekeeper receives date proposal notification
  useEffect(() => {
    if (dateStatus === 'proposed' && journey.state === 'HOME_IDLE' && (journey.role || initialRole) === 'gatekeeper') {
      const ch = worldStateRef.current?.characters.get(1)
      if (ch) {
        ch.speechText = "Hey, someone wants to take you out!"
        ch.speechTimer = 4
      }
    }
  }, [dateStatus, journey.state, journey.role, initialRole, worldStateRef])

  // Wire realtime events to journey transitions + theater entry
  useEffect(() => {
    const enterTheater = (venue: SceneName) => {
      worldStateRef.current?.resetTheater()
      theaterStartedRef.current = true
      transitionTo(venue)
      journey.transition('THEATER')

      // Spawn partner character if not present
      const ws = worldStateRef.current
      if (ws && !ws.characters.has(2)) {
        ws.addAgent(2, 3, 0, undefined, true)
      }
      const ch2 = ws?.characters.get(2)
      if (ch2) {
        ch2.appearance = partnerAppearance ?? { body: 1, eyes: 1, outfit: 'Outfit_01_48x48_01', hairstyle: 'Hairstyle_01_48x48_01', premadeIndex: 8 }
        ch2.sheetCanvas = undefined
      }

      // Position characters facing each other in venue
      const ch1 = ws?.characters.get(1)
      if (ch1 && ch2 && ws) {
        const cx = (ws.layout.cols * 48) / 2
        const cy = (ws.layout.rows * 48) / 2
        ch1.x = cx - 72; ch1.y = cy; ch1.tileCol = Math.floor((cx - 72) / 48); ch1.tileRow = Math.floor(cy / 48)
        ch2.x = cx + 72; ch2.y = cy; ch2.tileCol = Math.floor((cx + 72) / 48); ch2.tileRow = Math.floor(cy / 48)
        ch1.path = []; ch2.path = []
      }

      // Theater hook (useTheater) now drives playback via realtime subscription
    }

    // Dev shortcut: expose enterTheater on window for testing
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__enterTheater = enterTheater
    }

    // Enter theater when venue accepted/countered
    if (dateStatus === 'accepted' && journey.state !== 'THEATER' && journey.state !== 'POST_MATCH') {
      const venue = venueProposal?.venue as SceneName
      if (venue) enterTheater(venue)
    }
    if (dateStatus === 'countered' && journey.state !== 'THEATER' && journey.state !== 'POST_MATCH') {
      const venue = (reactionData?.chosen ?? venueProposal?.venue) as SceneName
      if (venue) enterTheater(venue)
    }
    if (dateStatus === 'declined' && journey.state !== 'HOME_IDLE') {
      journey.transition('HOME_IDLE')
      transitionTo('home')
    }

    // Recovery: page reloaded during theater — re-enter theater with recovered venue
    if (journey.state === 'THEATER' && dateStatus === 'pending' && !theaterStartedRef.current) {
      theaterStartedRef.current = true
      const venue = (journey.recoveredVenue ?? 'lounge') as SceneName
      enterTheater(venue)
    }
  }, [dateStatus, journey, venueProposal, reactionData, transitionTo, initialMatchId, partnerAppearance, worldStateRef])

  const journeyContext = (() => {
    switch (journey.state) {
      case 'HOME_IDLE': return `User is at home. ${SCENE_LABELS[currentScene]}`
      case 'RESEARCHING': return 'Agent is researching potential matches...'
      case 'BROWSING': return 'User is browsing candidates.'
      case 'PROPOSING': return 'User is proposing a date.'
      case 'WAITING': return 'Waiting for date response...'
      case 'THEATER': return 'Watching the theater scene play out!'
      case 'POST_MATCH': return 'Chatting with match in the lounge.'
      default: return `User is viewing ${SCENE_LABELS[currentScene]}`
    }
  })()

  // Fetch partner name + appearance when matchId changes
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

  const showChat = journey.state === 'POST_MATCH' && chatMatchId

  return (
    <div className="flex flex-col w-full h-dvh bg-black overflow-hidden">
      {/* Main content row: canvas + optional right-side chat */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          <Canvas
            worldStateRef={worldStateRef}
            sceneManagerRef={sceneManagerRef}
            panRef={panRef}
            venueImagesRef={venueImagesRef}
            particlesRef={particlesRef}
            propsRef={propsRef}
            onFrameUpdate={onFrameUpdate}
            zoom={zoom}
            onZoomChange={setZoom}
          />

          {/* Candidate slider */}
          {journey.state === 'BROWSING' && candidates && candidates.length > 0 && (
            <CandidateSlider
              candidates={candidates}
              onSelect={handleSelectCandidate}
              onPass={() => pass()}
              onAgentComment={(text) => {
                const ch = worldStateRef.current?.characters.get(1)
                if (ch) { ch.speechText = text; ch.speechTimer = 4 }
              }}
            />
          )}

          {/* Gatekeeper invitation notification */}
          {dateStatus === 'proposed' && journey.state === 'HOME_IDLE' && (journey.role || initialRole) === 'gatekeeper' && venueProposal && (
            <InvitationNotification
              chaserName={partnerName}
              venue={venueProposal.venue}
              inviteText={venueProposal.text}
              onOpen={() => {}}
            />
          )}

          {/* Date proposal overlay — only when relevant */}
          {journey.matchId && (journey.state === 'PROPOSING' || journey.state === 'WAITING' || dateStatus === 'proposed' || dateStatus === 'accepted' || dateStatus === 'countered' || dateStatus === 'declined') && (
            <DateProposalOverlay
              matchId={journey.matchId}
              role={journey.role || initialRole}
              dateStatus={dateStatus}
              venueProposal={venueProposal}
              chaserName={partnerName}
              onPropose={proposeDate}
              onRespond={respondVenue}
              onBroadcastProposal={broadcastDateProposal}
              onBroadcastResponse={broadcastVenueResponse}
            />
          )}

          {/* Find Another button in POST_MATCH */}
          {journey.state === 'POST_MATCH' && (
            <button
              onClick={handleFindAnother}
              className="absolute top-4 right-4 z-50 bg-pink-500 hover:bg-pink-600 text-white text-sm font-mono px-4 py-2 rounded-lg shadow-lg"
            >
              Find Another
            </button>
          )}
        </div>

        {/* Right-side user-to-user chat panel (POST_MATCH only) */}
        {showChat && (
          <div className="w-72 md:w-80 shrink-0">
            <ChatPanel
              messages={messages}
              currentUserId={userId}
              partnerId="match"
              partnerName={partnerName}
              isLoading={chatLoading}
              onSendMessage={sendMessage}
              onSpeechBubble={(text) => {
                const ch = worldStateRef.current?.characters.get(2)
                if (ch) { ch.speechText = text; ch.speechTimer = Math.max(2, text.length * 0.06) }
              }}
            />
          </div>
        )}
      </div>

      {/* Portrait panel — visible during THEATER */}
      <PortraitPanel
        chaserCharacterId={chaserCharId}
        gatekeeperCharacterId={gatekeeperCharId}
        chaserEmotion={chaserEmotion}
        gatekeeperEmotion={gatekeeperEmotion}
        chaserVariant={chaserSoulPrefs.portrait_variant}
        gatekeeperVariant={gatekeeperSoulPrefs.portrait_variant}
        activeSpeaker={activeSpeaker}
        speechText={speechText}
        chaserName={userId ? 'You' : 'Chaser'}
        gatekeeperName={partnerName}
        visible={journey.state === 'THEATER'}
      />

      {/* Agent chat bar — always at bottom */}
      <AgentChatBar onAgentResponse={handleAgentResponse} context={journeyContext} />

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
    </div>
  )
}
