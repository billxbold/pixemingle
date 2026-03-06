'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WorldState } from '@/engine/engine/officeState'
import { SceneManager, SceneName } from '@/engine/sceneManager'
import { createSceneLayouts } from '@/engine/scenes'

export function usePixelWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldStateRef = useRef<WorldState | null>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const [currentScene, setCurrentScene] = useState<SceneName>('bedroom')
  const [zoom, setZoom] = useState(3)

  useEffect(() => {
    const layouts = createSceneLayouts()
    const worldState = new WorldState(layouts.bedroom)
    const sceneManager = new SceneManager(worldState, layouts)

    worldStateRef.current = worldState
    sceneManagerRef.current = sceneManager

    // Add a demo agent
    worldState.addAgent(1, 0, 0, undefined, true)

    return () => {
      worldStateRef.current = null
      sceneManagerRef.current = null
    }
  }, [])

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
