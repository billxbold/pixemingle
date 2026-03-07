'use client'

import { usePixelWorld } from '@/hooks/usePixelWorld'
import { Canvas } from './Canvas'
import type { SceneName } from '@/engine/sceneManager'

const SCENE_LABELS: Record<SceneName, string> = {
  lounge: 'Rooftop Lounge',
  gallery: 'Art Gallery',
  japanese: 'Japanese Restaurant',
  icecream: 'Ice Cream Shop',
  studio: 'Film Studio',
  museum: 'The Museum',
}

export function PixelWorld() {
  const {
    worldStateRef,
    sceneManagerRef,
    panRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
  } = usePixelWorld()

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      <Canvas
        worldStateRef={worldStateRef}
        sceneManagerRef={sceneManagerRef}
        panRef={panRef}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      {/* Scene nav (dev overlay — will be replaced with proper UI) */}
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
