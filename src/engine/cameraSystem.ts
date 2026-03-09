// ── Camera system ───────────────────────────────────────────────
// Handles zoom, pan, and shake effects for comedy timing.
// Operates as an overlay on top of the base zoom/pan from usePixelWorld.
// The renderer applies getTransform() additively to the base offset.

export type Easing = 'linear' | 'ease_in' | 'ease_out' | 'bounce'

interface CameraAnimation {
  type: 'zoom' | 'pan' | 'shake' | 'reset'
  startTime: number        // ms when animation started
  duration: number         // ms total
  easing: Easing

  // Zoom
  fromZoom?: number
  toZoom?: number
  focusX?: number          // world coordinates to zoom toward
  focusY?: number

  // Pan
  fromX?: number
  fromY?: number
  toX?: number
  toY?: number

  // Shake
  intensity?: number
}

export interface CameraTransform {
  /** Multiplicative zoom relative to base (1.0 = no change) */
  zoom: number
  /** Additive pixel offset (in world coords, before zoom) */
  offsetX: number
  /** Additive pixel offset (in world coords, before zoom) */
  offsetY: number
}

/** Camera presets from design doc */
export const CAMERA_PRESETS = {
  dramatic_zoom_to_face: { type: 'zoom' as const, zoom_level: 2.5, duration_ms: 500, easing: 'ease_in' as const },
  reaction_pan: { type: 'pan' as const, duration_ms: 800, easing: 'ease_out' as const },
  impact_shake: { type: 'shake' as const, duration_ms: 300, easing: 'bounce' as const },
  awkward_zoom_out: { type: 'zoom' as const, zoom_level: 0.8, duration_ms: 1200, easing: 'linear' as const },
} as const

export class CameraSystem {
  private currentZoom: number = 1
  private offsetX: number = 0
  private offsetY: number = 0
  private animations: CameraAnimation[] = []
  private elapsed: number = 0 // total elapsed time in ms

  /**
   * Zoom to a level relative to base zoom.
   * @param level - target zoom (1.0 = base, 2.0 = 2x, 0.5 = half)
   * @param duration - animation duration in ms
   * @param easing - easing function
   * @param focusPoint - world coordinates to zoom toward (optional)
   */
  zoom(level: number, duration: number, easing: Easing, focusPoint?: { x: number; y: number }): void {
    this.removeAnimationsOfType('zoom')
    this.animations.push({
      type: 'zoom',
      startTime: this.elapsed,
      duration,
      easing,
      fromZoom: this.currentZoom,
      toZoom: level,
      focusX: focusPoint?.x,
      focusY: focusPoint?.y,
    })
  }

  /**
   * Pan to a world coordinate.
   */
  pan(target: { x: number; y: number }, duration: number, easing: Easing): void {
    this.removeAnimationsOfType('pan')
    this.animations.push({
      type: 'pan',
      startTime: this.elapsed,
      duration,
      easing,
      fromX: this.offsetX,
      fromY: this.offsetY,
      toX: target.x,
      toY: target.y,
    })
  }

  /**
   * Screen shake effect.
   * @param intensity - max jitter in pixels
   * @param duration - duration in ms
   */
  shake(intensity: number, duration: number): void {
    this.removeAnimationsOfType('shake')
    this.animations.push({
      type: 'shake',
      startTime: this.elapsed,
      duration,
      easing: 'bounce',
      intensity,
    })
  }

  /**
   * Reset camera to default (zoom=1, offset=0,0) over duration.
   */
  reset(duration: number): void {
    this.removeAnimationsOfType('reset')
    this.animations.push({
      type: 'reset',
      startTime: this.elapsed,
      duration,
      easing: 'ease_out',
      fromZoom: this.currentZoom,
      toZoom: 1,
      fromX: this.offsetX,
      fromY: this.offsetY,
      toX: 0,
      toY: 0,
    })
  }

  /**
   * Called every frame.
   * @param dt - delta time in seconds
   */
  update(dt: number): void {
    this.elapsed += dt * 1000

    // Process animations (remove completed ones)
    let shakeX = 0
    let shakeY = 0

    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i]
      const progress = Math.min((this.elapsed - anim.startTime) / anim.duration, 1)
      const t = applyEasing(progress, anim.easing)

      switch (anim.type) {
        case 'zoom':
        case 'reset': {
          if (anim.fromZoom !== undefined && anim.toZoom !== undefined) {
            this.currentZoom = lerp(anim.fromZoom, anim.toZoom, t)
          }
          if (anim.type === 'reset' && anim.fromX !== undefined && anim.toX !== undefined) {
            this.offsetX = lerp(anim.fromX, anim.toX, t)
            this.offsetY = lerp(anim.fromY ?? 0, anim.toY ?? 0, t)
          }
          break
        }
        case 'pan': {
          if (anim.fromX !== undefined && anim.toX !== undefined) {
            this.offsetX = lerp(anim.fromX, anim.toX, t)
            this.offsetY = lerp(anim.fromY ?? 0, anim.toY ?? 0, t)
          }
          break
        }
        case 'shake': {
          const decay = 1 - progress
          const intensity = (anim.intensity ?? 5) * decay
          shakeX = (Math.random() - 0.5) * 2 * intensity
          shakeY = (Math.random() - 0.5) * 2 * intensity
          break
        }
      }

      // Remove completed animations
      if (progress >= 1) {
        this.animations.splice(i, 1)
      }
    }

    // Store shake for getTransform()
    this._shakeX = shakeX
    this._shakeY = shakeY
  }

  private _shakeX: number = 0
  private _shakeY: number = 0

  /**
   * Get current camera transform to apply in renderer.
   * Zoom is multiplicative (multiply with base zoom).
   * Offsets are additive (add to base pan offsets).
   */
  getTransform(): CameraTransform {
    return {
      zoom: this.currentZoom,
      offsetX: this.offsetX + this._shakeX,
      offsetY: this.offsetY + this._shakeY,
    }
  }

  /** Whether any animation is active */
  isAnimating(): boolean {
    return this.animations.length > 0
  }

  /** Remove any existing animations of a given type to prevent stacking */
  private removeAnimationsOfType(type: CameraAnimation['type']): void {
    this.animations = this.animations.filter(a => a.type !== type)
  }

  /** Force clear all animations and reset to default */
  forceReset(): void {
    this.animations = []
    this.currentZoom = 1
    this.offsetX = 0
    this.offsetY = 0
    this._shakeX = 0
    this._shakeY = 0
  }
}

// ── Easing functions ────────────────────────────────────────────

function applyEasing(t: number, easing: Easing): number {
  switch (easing) {
    case 'linear':
      return t
    case 'ease_in':
      return t * t
    case 'ease_out':
      return 1 - (1 - t) * (1 - t)
    case 'bounce': {
      // Damped bounce — clamped to [0,1] to prevent overshoot at final value
      if (t < 0.5) return 2 * t * t
      const t2 = 2 * t - 1
      const result = 0.5 + 0.5 * (1 - Math.pow(1 - t2, 2) * Math.cos(t2 * Math.PI * 2))
      return Math.min(1, Math.max(0, result))
    }
    default:
      return t
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
