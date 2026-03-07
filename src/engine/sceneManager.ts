import { WorldState } from './engine/officeState'
import type { OfficeLayout } from './types'

export type SceneName = 'home' | 'lounge' | 'gallery' | 'japanese' | 'icecream' | 'studio' | 'museum'

export interface SceneTransition {
  from: SceneName
  to: SceneName
  fadeOutMs: number
  fadeInMs: number
}

export class SceneManager {
  currentScene: SceneName = 'home'
  transitioning = false
  fadeAlpha = 1 // 1 = fully visible, 0 = black
  private targetScene: SceneName | null = null
  private fadePhase: 'out' | 'in' | null = null
  private fadeTimer = 0
  private readonly FADE_DURATION = 200 // ms
  private worldState: WorldState
  private layouts: Record<SceneName, OfficeLayout>

  constructor(worldState: WorldState, layouts: Record<SceneName, OfficeLayout>) {
    this.worldState = worldState
    this.layouts = layouts
  }

  transitionTo(scene: SceneName) {
    if (this.transitioning || scene === this.currentScene) return
    this.transitioning = true
    this.targetScene = scene
    this.fadePhase = 'out'
    this.fadeTimer = 0
  }

  update(dt: number) {
    if (!this.fadePhase) return

    this.fadeTimer += dt * 1000

    if (this.fadePhase === 'out') {
      this.fadeAlpha = 1 - Math.min(this.fadeTimer / this.FADE_DURATION, 1)
      if (this.fadeTimer >= this.FADE_DURATION) {
        // Swap scene at black
        this.currentScene = this.targetScene!
        this.worldState.rebuildFromLayout(this.layouts[this.currentScene])
        this.fadePhase = 'in'
        this.fadeTimer = 0
      }
    } else if (this.fadePhase === 'in') {
      this.fadeAlpha = Math.min(this.fadeTimer / this.FADE_DURATION, 1)
      if (this.fadeTimer >= this.FADE_DURATION) {
        this.fadeAlpha = 1
        this.fadePhase = null
        this.targetScene = null
        this.transitioning = false
      }
    }
  }
}
