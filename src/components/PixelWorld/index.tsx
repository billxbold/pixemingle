'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePixelWorld } from '@/hooks/usePixelWorld'
import { useMatching } from '@/hooks/useMatching'
import { useDateSync } from '@/hooks/useDateSync'
import { useJourneyState } from '@/hooks/useJourneyState'
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
    startTheater,
    onFrameUpdate,
  } = usePixelWorld(userAppearance ?? undefined)

  const journey = useJourneyState()
  const theaterStartedRef = useRef(false)
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

  // Portrait panel state (theater)
  const [chaserEmotion, setChaserEmotion] = useState<PortraitExpression>('neutral')
  const [gatekeeperEmotion, setGatekeeperEmotion] = useState<PortraitExpression>('neutral')
  const [activeSpeaker, setActiveSpeaker] = useState<'chaser' | 'gatekeeper' | null>(null)
  const [speechText, setSpeechText] = useState<string | null>(null)
  const defaultPrefs = useRef<ExpressionPreferences>(parseExpressionPreferences(''))
  const [chaserSoulPrefs, setChaserSoulPrefs] = useState<ExpressionPreferences>(defaultPrefs.current)
  const [gatekeeperSoulPrefs, setGatekeeperSoulPrefs] = useState<ExpressionPreferences>(defaultPrefs.current)

  // Derive character IDs for portraits
  const chaserCharId = userAppearance?.premadeIndex
    ? `char_${String(userAppearance.premadeIndex).padStart(2, '0')}`
    : 'char_custom_chaser'
  const gatekeeperCharId = partnerAppearance?.premadeIndex
    ? `char_${String(partnerAppearance.premadeIndex).padStart(2, '0')}`
    : 'char_custom_gatekeeper'

  /**
   * Updates portrait panel from a theater turn.
   * Called by useTheater (Phase 5) or dev toolbar for testing.
   */
  const updatePortraitFromTurn = useCallback((turn: {
    agent_role: 'chaser' | 'gatekeeper'
    emotion: EmotionState
    text?: string
    soul_md?: string
  }) => {
    const prefs = turn.agent_role === 'chaser' ? chaserSoulPrefs : gatekeeperSoulPrefs
    const config = resolveExpression(turn.emotion, prefs)

    if (turn.agent_role === 'chaser') {
      setChaserEmotion(config.portrait)
    } else {
      setGatekeeperEmotion(config.portrait)
    }

    setActiveSpeaker(turn.agent_role)
    setSpeechText(turn.text ?? null)
  }, [chaserSoulPrefs, gatekeeperSoulPrefs])

  // Expose updatePortraitFromTurn for Phase 5 integration and dev testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__updatePortrait = updatePortraitFromTurn;
      (window as unknown as Record<string, unknown>).__setChaserSoulPrefs = setChaserSoulPrefs;
      (window as unknown as Record<string, unknown>).__setGatekeeperSoulPrefs = setGatekeeperSoulPrefs;
    }
  }, [updatePortraitFromTurn])

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
    const enterTheater = async (venue: SceneName) => {
      theaterStartedRef.current = true
      transitionTo(venue)
      journey.transition('THEATER')

      // Theater entry — rewired in Phase 5 (useTheater)
      // For now, start the no-op theater stub
      const matchId = journey.matchId ?? initialMatchId
      if (!matchId) return

      startTheater(partnerAppearance, (result: string) => {
        if (result === 'rejected') {
          transitionTo('home')
          journey.transition('HOME_IDLE')
        } else {
          journey.transition('POST_MATCH')
        }
      })
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
  }, [dateStatus, journey, venueProposal, reactionData, transitionTo, startTheater, initialMatchId, partnerAppearance])

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
