'use client'

import { useCallback, useEffect } from 'react'
import { usePixelWorld } from '@/hooks/usePixelWorld'
import { useMatching } from '@/hooks/useMatching'
import { useScenario } from '@/hooks/useScenario'
import { useJourneyState } from '@/hooks/useJourneyState'
import { Canvas } from './Canvas'
import { DateProposalOverlay } from './DateProposalOverlay'
import { AgentChatBar } from './AgentChatBar'
import { CandidateSlider } from './CandidateSlider'
import { InvitationNotification } from './InvitationNotification'
import type { SceneName } from '@/engine/sceneManager'
import type { AgentAppearance } from '@/types/database'

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
  chaserName?: string
  userAppearance?: AgentAppearance | null
}

export function PixelWorld({ matchId: initialMatchId = null, role: initialRole = 'chaser', chaserName = 'Agent', userAppearance = null }: PixelWorldProps) {
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
  const { candidates, selectedCandidate, setSelectedCandidate, search, pass, proposeDate, respondVenue } = useMatching()
  const {
    dateStatus,
    venueProposal,
    broadcastDateProposal,
    broadcastVenueResponse,
  } = useScenario(journey.matchId ?? initialMatchId, journey.role ?? initialRole)

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
      journey.transition('PROPOSING')
    }
  }, [worldStateRef, playMontage, journey, search, selectedCandidate])

  // Gatekeeper receives date proposal notification
  useEffect(() => {
    if (dateStatus === 'proposed' && journey.state === 'HOME_IDLE' && (journey.role || initialRole) === 'gatekeeper') {
      // Agent reacts
      const ch = worldStateRef.current?.characters.get(1)
      if (ch) {
        ch.speechText = "Hey, someone wants to take you out!"
        ch.speechTimer = 4
      }
    }
  }, [dateStatus, journey.state, journey.role, initialRole, worldStateRef])

  // Wire realtime events to journey transitions
  useEffect(() => {
    if (dateStatus === 'accepted' && journey.state === 'WAITING') {
      const venue = venueProposal?.venue as SceneName
      if (venue) transitionTo(venue)
      journey.transition('THEATER')
    }
    if (dateStatus === 'countered' && journey.state === 'WAITING') {
      // Play countered reaction, then transition to new venue
      const venue = venueProposal?.venue as SceneName
      if (venue) transitionTo(venue)
      journey.transition('THEATER')
    }
    if (dateStatus === 'declined') {
      journey.transition('HOME_IDLE')
      transitionTo('home')
    }
  }, [dateStatus, journey, venueProposal, transitionTo])

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

  return (
    <div className="flex flex-col w-full h-dvh bg-black overflow-hidden">
      {/* Canvas area — grows to fill all space above the chat bar */}
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
            onSelect={(c) => setSelectedCandidate(c)}
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
            chaserName={chaserName}
            venue={venueProposal.venue}
            inviteText={venueProposal.text}
            onOpen={() => {
              // DateProposalOverlay handles the invitation card display
            }}
          />
        )}

        {/* Date proposal overlay */}
        {(journey.matchId || initialMatchId) && (
          <DateProposalOverlay
            matchId={(journey.matchId || initialMatchId)!}
            role={journey.role || initialRole}
            dateStatus={dateStatus}
            venueProposal={venueProposal}
            chaserName={chaserName}
            onPropose={proposeDate}
            onRespond={respondVenue}
            onBroadcastProposal={broadcastDateProposal}
            onBroadcastResponse={broadcastVenueResponse}
          />
        )}
      </div>

      {/* Agent chat bar — sits below the canvas, never overlaps */}
      <AgentChatBar onAgentResponse={handleAgentResponse} context={journeyContext} />
    </div>
  )
}
