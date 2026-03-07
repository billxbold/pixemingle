'use client'

import { usePixelWorld } from '@/hooks/usePixelWorld'
import { useMatching } from '@/hooks/useMatching'
import { useScenario } from '@/hooks/useScenario'
import { Canvas } from './Canvas'
import { DateProposalOverlay } from './DateProposalOverlay'
import type { SceneName } from '@/engine/sceneManager'
import type { AgentAppearance } from '@/types/database'

const SCENE_LABELS: Record<SceneName, string> = {
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

export function PixelWorld({ matchId = null, role = 'chaser', chaserName = 'Agent', userAppearance = null }: PixelWorldProps) {
  const {
    worldStateRef,
    sceneManagerRef,
    panRef,
    venueImagesRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
  } = usePixelWorld(userAppearance ?? undefined)

  const { proposeDate, respondVenue } = useMatching()
  const {
    dateStatus,
    venueProposal,
    broadcastDateProposal,
    broadcastVenueResponse,
  } = useScenario(matchId, role)

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      <Canvas
        worldStateRef={worldStateRef}
        sceneManagerRef={sceneManagerRef}
        panRef={panRef}
        venueImagesRef={venueImagesRef}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* Date proposal overlay */}
      {matchId && (
        <DateProposalOverlay
          matchId={matchId}
          role={role}
          dateStatus={dateStatus}
          venueProposal={venueProposal}
          chaserName={chaserName}
          onPropose={proposeDate}
          onRespond={respondVenue}
          onBroadcastProposal={broadcastDateProposal}
          onBroadcastResponse={broadcastVenueResponse}
        />
      )}

      {/* Scene nav (dev overlay) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 flex-wrap justify-center max-w-[95vw] px-2">
        {(Object.keys(SCENE_LABELS) as SceneName[]).map((scene) => (
          <button
            key={scene}
            onClick={() => transitionTo(scene)}
            className={`px-3 py-2 sm:py-1 rounded text-xs font-mono transition-colors min-h-[44px] sm:min-h-0 ${
              currentScene === scene
                ? 'bg-pink-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {SCENE_LABELS[scene]}
          </button>
        ))}
      </div>
    </div>
  )
}
