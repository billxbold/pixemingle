'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WorldState } from '@/engine/engine/officeState'
import { SceneManager, SceneName } from '@/engine/sceneManager'
import { createSceneLayouts } from '@/engine/scenes'
import { loadVenueImages } from '@/engine/assetLoader'
import type { VenueImages } from '@/engine/assetLoader'
import type { CharacterAppearance } from '@/engine/types'
import type { AgentAppearance } from '@/types/database'
import { ParticleSystem } from '@/engine/particles'
import { MontagePlayer, createResearchMontage } from '@/engine/montage'
import { PropSystem } from '@/engine/propRenderer'
import { SequencePlayer } from '@/engine/sequencePlayer'
import type { FlirtScenario } from '@/types/database'

// Cache venue images across scene transitions
const venueImageCache = new Map<SceneName, VenueImages>()

export function usePixelWorld(userAppearance?: AgentAppearance) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldStateRef = useRef<WorldState | null>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const venueImagesRef = useRef<VenueImages | null>(null)
  const particlesRef = useRef<ParticleSystem>(new ParticleSystem())
  const montageRef = useRef<MontagePlayer | null>(null)
  const propsRef = useRef<PropSystem>(new PropSystem())
  const sequenceRef = useRef<SequencePlayer | null>(null)
  const [currentScene, setCurrentScene] = useState<SceneName>('home')
  const [zoom, setZoom] = useState(() => {
    if (typeof window === 'undefined') return 2
    // Auto-fit: home is 14×13 tiles at 48px each; pick zoom so map fills viewport
    const mapW = 14 * 48
    const mapH = 13 * 48
    const fitZoom = Math.min(window.innerWidth / mapW, window.innerHeight / mapH)
    return Math.max(1, Math.min(3, Math.round(fitZoom)))
  })

  // Effect 1: world init — runs once
  useEffect(() => {
    const layouts = createSceneLayouts()
    const worldState = new WorldState(layouts.home)
    const sceneManager = new SceneManager(worldState, layouts)

    worldStateRef.current = worldState
    sceneManagerRef.current = sceneManager

    worldState.addAgent(1, 0, 0, undefined, true)
    const ch = worldState.characters.get(1)
    if (ch) {
      ch.appearance = { body: 1, eyes: 1, outfit: 'Outfit_01_48x48_01', hairstyle: 'Hairstyle_01_48x48_01', premadeIndex: 1 }
    }
    worldState.cameraFollowId = 1

    loadVenueForScene('home')

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

  const playMontage = useCallback((onComplete: () => void) => {
    const ch = worldStateRef.current?.characters.get(1)
    if (!ch) return
    const montage = new MontagePlayer(createResearchMontage(), particlesRef.current)
    montage.start(ch, onComplete)
    montageRef.current = montage
  }, [])

  /** Start in-canvas theater playback: spawn character 2, load scenario, play it */
  const startTheater = useCallback((
    scenario: FlirtScenario,
    matchAppearance: CharacterAppearance | null,
    onComplete: (result: string) => void,
  ) => {
    const ws = worldStateRef.current
    if (!ws) return

    // Spawn character 2 (the match) if not already present
    if (!ws.characters.has(2)) {
      ws.addAgent(2, 3, 0, undefined, true)
    }
    const ch2 = ws.characters.get(2)
    if (ch2) {
      ch2.appearance = matchAppearance ?? { body: 1, eyes: 1, outfit: 'Outfit_01_48x48_01', hairstyle: 'Hairstyle_01_48x48_01', premadeIndex: 8 }
      ch2.sheetCanvas = undefined // trigger async sheet load
    }

    // Position characters facing each other in the center of the venue
    const ch1 = ws.characters.get(1)
    if (ch1 && ch2) {
      const cx = (ws.layout.cols * 48) / 2
      const cy = (ws.layout.rows * 48) / 2
      ch1.x = cx - 72; ch1.y = cy; ch1.tileCol = Math.floor((cx - 72) / 48); ch1.tileRow = Math.floor(cy / 48)
      ch2.x = cx + 72; ch2.y = cy; ch2.tileCol = Math.floor((cx + 72) / 48); ch2.tileRow = Math.floor(cy / 48)
      ch1.path = []; ch2.path = [] // clear any pending movement
    }

    // Create SequencePlayer with callbacks that drive the canvas
    const player = new SequencePlayer(ws, particlesRef.current, {
      onStepStart: () => {},
      onStepEnd: () => {},
      onComplete: (result) => onComplete(result),
      onSpeechBubble: (agent, text) => {
        const id = agent === 'chaser' ? 1 : agent === 'gatekeeper' ? 2 : null
        if (id) {
          const ch = ws.characters.get(id)
          if (ch) {
            ch.speechText = text
            ch.speechTimer = Math.max(2, text.length * 0.06)
          }
        }
        if (agent === 'both') {
          for (const cid of [1, 2]) {
            const ch = ws.characters.get(cid)
            if (ch) { ch.speechText = text; ch.speechTimer = Math.max(2, text.length * 0.06) }
          }
        }
      },
      onPropSpawn: (propId, x, y) => propsRef.current.spawn(propId, x, y),
    })
    player.setChaserAndGatekeeper(1, 2)
    player.load(scenario)
    player.play()
    sequenceRef.current = player
  }, [])

  // Called each frame from Canvas update loop
  const onFrameUpdate = useCallback((dt: number) => {
    montageRef.current?.update(dt)
    sequenceRef.current?.update(dt)
    particlesRef.current.update(dt)
    propsRef.current.update(dt)
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
    particlesRef,
    propsRef,
    currentScene,
    zoom,
    setZoom,
    transitionTo,
    addAgent,
    playMontage,
    startTheater,
    onFrameUpdate,
  }
}
