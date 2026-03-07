'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WorldState } from '@/engine/engine/officeState'
import { SceneManager, SceneName } from '@/engine/sceneManager'
import { createSceneLayouts } from '@/engine/scenes'
import { loadVenueImages } from '@/engine/assetLoader'
import type { VenueImages } from '@/engine/assetLoader'
import type { CharacterAppearance } from '@/engine/types'
import type { AgentAppearance } from '@/types/database'

// Cache venue images across scene transitions
const venueImageCache = new Map<SceneName, VenueImages>()

export function usePixelWorld(userAppearance?: AgentAppearance) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldStateRef = useRef<WorldState | null>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const venueImagesRef = useRef<VenueImages | null>(null)
  const [currentScene, setCurrentScene] = useState<SceneName>('lounge')
  const [zoom, setZoom] = useState(() => {
    if (typeof window === 'undefined') return 2
    return window.innerWidth < 768 ? 1 : 2
  })

  // Effect 1: world init — runs once
  useEffect(() => {
    const layouts = createSceneLayouts()
    const worldState = new WorldState(layouts.lounge)
    const sceneManager = new SceneManager(worldState, layouts)

    worldStateRef.current = worldState
    sceneManagerRef.current = sceneManager

    worldState.addAgent(1, 0, 0, undefined, true)
    const ch = worldState.characters.get(1)
    if (ch) {
      ch.appearance = { body: 1, eyes: 1, outfit: 'Outfit_01_48x48_01', hairstyle: 'Hairstyle_01_48x48_01', premadeIndex: 1 }
    }
    worldState.cameraFollowId = 1

    loadVenueForScene('lounge')

    return () => {
      worldStateRef.current = null
      sceneManagerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: apply user appearance when available
  useEffect(() => {
    const ch = worldStateRef.current?.characters.get(1)
    if (!ch) return
    if (userAppearance) {
      // AgentAppearance and CharacterAppearance are structurally identical — cast is safe
      ch.appearance = userAppearance as CharacterAppearance
      ch.sheetCanvas = undefined // reset so renderer re-requests the sheet
    }
  }, [userAppearance])

  async function loadVenueForScene(scene: SceneName) {
    if (venueImageCache.has(scene)) {
      venueImagesRef.current = venueImageCache.get(scene)!
      return
    }
    try {
      const images = await loadVenueImages(scene)
      venueImageCache.set(scene, images)
      venueImagesRef.current = images
    } catch {
      venueImagesRef.current = null
    }
  }

  const transitionTo = useCallback((scene: SceneName) => {
    sceneManagerRef.current?.transitionTo(scene)
    setCurrentScene(scene)
    loadVenueForScene(scene)
  }, [])

  const addAgent = useCallback((id: number, palette?: number, appearance?: CharacterAppearance) => {
    const ws = worldStateRef.current
    if (!ws) return
    ws.addAgent(id, palette)
    if (appearance) {
      const ch = ws.characters.get(id)
      if (ch) ch.appearance = appearance
    }
  }, [])

  return {
    canvasRef,
    worldStateRef,
    sceneManagerRef,
    panRef,
    venueImagesRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
    addAgent,
  }
}
