'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WorldState } from '@/engine/engine/officeState'
import { SceneManager, SceneName } from '@/engine/sceneManager'
import { createSceneLayouts } from '@/engine/scenes'
import { loadSingleSprite } from '@/engine/assetLoader'
import { VENUE_FURNITURE, getVenueFurnitureUrl } from '@/engine/scenes/venueAssets'
import { buildDynamicCatalog } from '@/engine/layout/furnitureCatalog'
import type { VenueName } from '@/types/database'

export function usePixelWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldStateRef = useRef<WorldState | null>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const [currentScene, setCurrentScene] = useState<SceneName>('lounge')
  const [zoom, setZoom] = useState(() => {
    if (typeof window === 'undefined') return 2
    return window.innerWidth < 768 ? 1 : 3
  })

  useEffect(() => {
    const layouts = createSceneLayouts()
    const worldState = new WorldState(layouts.lounge)
    const sceneManager = new SceneManager(worldState, layouts)

    worldStateRef.current = worldState
    sceneManagerRef.current = sceneManager

    // Add a demo agent
    worldState.addAgent(1, 0, 0, undefined, true)

    // Load venue furniture sprites asynchronously
    loadVenueSprites()

    return () => {
      worldStateRef.current = null
      sceneManagerRef.current = null
    }
  }, [])

  // Load all venue Singles PNGs and register as dynamic catalog entries
  async function loadVenueSprites() {
    const venues: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']
    const catalog: Array<{
      id: string; label: string; category: string
      width: number; height: number; footprintW: number; footprintH: number; isDesk: boolean
    }> = []
    const sprites: Record<string, string[][]> = {}

    await Promise.all(
      venues.flatMap((venue) =>
        VENUE_FURNITURE[venue].map(async (entry) => {
          const url = getVenueFurnitureUrl(venue, entry.number)
          try {
            const sprite = await loadSingleSprite(url)
            const id = `venue_${venue}_${entry.number}`
            sprites[id] = sprite
            catalog.push({
              id,
              label: entry.label,
              category: 'dating',
              width: sprite[0]?.length ?? 16,
              height: sprite.length,
              footprintW: Math.max(1, Math.ceil((sprite[0]?.length ?? 16) / 16)),
              footprintH: Math.max(1, Math.ceil(sprite.length / 16)),
              isDesk: false,
            })
          } catch {
            // Silently skip missing assets
          }
        })
      )
    )

    if (catalog.length > 0) {
      buildDynamicCatalog({ catalog, sprites })
    }
  }

  const transitionTo = useCallback((scene: SceneName) => {
    sceneManagerRef.current?.transitionTo(scene)
    setCurrentScene(scene)
  }, [])

  const addAgent = useCallback((id: number, palette?: number) => {
    worldStateRef.current?.addAgent(id, palette)
  }, [])

  return {
    canvasRef,
    worldStateRef,
    sceneManagerRef,
    panRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
    addAgent,
  }
}
