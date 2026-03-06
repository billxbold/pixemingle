'use client'

import { usePixelWorld } from '@/hooks/usePixelWorld'
import { Canvas } from './Canvas'
import type { SceneName } from '@/engine/sceneManager'

const SCENE_LABELS: Record<SceneName, string> = {
  bedroom: 'Bedroom',
  office: 'Office',
  gallery: 'Gallery',
  theater: 'Theater',
  cafe: 'Cafe',
  park: 'Park',
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
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Canvas
        worldStateRef={worldStateRef}
        sceneManagerRef={sceneManagerRef}
        panRef={panRef}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      {/* Scene nav (dev overlay — will be replaced with proper UI) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {(Object.keys(SCENE_LABELS) as SceneName[]).map((scene) => (
          <button
            key={scene}
            onClick={() => transitionTo(scene)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
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
