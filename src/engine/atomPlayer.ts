import type { ComedyAtom, AtomFrame } from './comedyAtoms'
import { getAtom, MAX_ATOMS_PER_TURN } from './comedyAtoms'
import type { Character, CharacterState } from './types'
import type { ParticleSystem } from './particles'
import type { CameraSystem } from './cameraSystem'

// ── Atom adjustments applied per-frame to character rendering ───

export interface AtomAdjustments {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// ── Atom player ─────────────────────────────────────────────────
// Manages playback of comedy atom sequences for a single character.
// Called every frame from the game loop. Returns render adjustments
// that the renderer applies to the character's draw position.

export class AtomPlayer {
  private currentAtom: ComedyAtom | null = null
  private currentFrameIndex: number = 0
  private frameElapsed: number = 0    // ms elapsed in current frame
  private atomElapsed: number = 0     // ms elapsed in current atom (for particle triggers)
  private queue: ComedyAtom[] = []
  private onComplete?: () => void
  private firedParticles: Set<string> = new Set()  // "atomId:triggerIndex" keys already fired
  private firedCamera: boolean = false
  private playedEntrances: Set<string> = new Set() // entrance atoms can only play once

  /** Whether an atom is currently playing */
  isPlaying(): boolean {
    return this.currentAtom !== null
  }

  /**
   * Queue up to MAX_ATOMS_PER_TURN atoms for a turn.
   * Atoms play sequentially. Particles and camera triggers fire at specified times.
   */
  playSequence(
    atomIds: string[],
    onComplete?: () => void,
  ): void {
    // If already playing, resolve the previous onComplete before resetting
    if (this.currentAtom !== null) {
      const prevComplete = this.onComplete
      this.currentAtom = null
      this.currentFrameIndex = 0
      this.frameElapsed = 0
      this.atomElapsed = 0
      this.queue = []
      this.firedParticles.clear()
      this.firedCamera = false
      this.onComplete = undefined
      prevComplete?.()
    }

    const atoms: ComedyAtom[] = []
    const limited = atomIds.slice(0, MAX_ATOMS_PER_TURN)

    for (const id of limited) {
      const atom = getAtom(id)
      if (!atom) continue

      // Entrance atoms can only play once per player lifetime
      if (atom.category === 'entrance') {
        if (this.playedEntrances.has(atom.id)) continue
        this.playedEntrances.add(atom.id)
      }

      atoms.push(atom)
    }

    if (atoms.length === 0) {
      onComplete?.()
      return
    }

    this.queue = atoms.slice(1) // remaining after first
    this.onComplete = onComplete
    this.startAtom(atoms[0])
  }

  /**
   * Play a single atom immediately. Returns a promise that resolves on completion.
   */
  playAtom(atomId: string): Promise<void> {
    return new Promise((resolve) => {
      this.playSequence([atomId], resolve)
    })
  }

  /**
   * Called every frame from the game loop.
   * Updates atom playback state. Triggers particles and camera actions.
   *
   * @param dt - Delta time in seconds
   * @param character - The character this player is attached to
   * @param particleSystem - For spawning particles
   * @param cameraSystem - For triggering camera actions
   */
  update(
    dt: number,
    character: Character,
    particleSystem?: ParticleSystem,
    cameraSystem?: CameraSystem,
  ): void {
    if (!this.currentAtom) return

    const dtMs = dt * 1000
    this.frameElapsed += dtMs
    this.atomElapsed += dtMs

    // Fire particle triggers
    if (particleSystem && this.currentAtom.particles) {
      for (let ti = 0; ti < this.currentAtom.particles.length; ti++) {
        const trigger = this.currentAtom.particles[ti]
        const key = `${this.currentAtom.id}:${ti}`
        if (this.atomElapsed >= trigger.trigger_at_ms && !this.firedParticles.has(key)) {
          this.firedParticles.add(key)
          particleSystem.spawn(trigger.type, character.x, character.y - 20, trigger.count ?? 1)
        }
      }
    }

    // Fire camera action (once per atom, at start)
    if (cameraSystem && this.currentAtom.camera && !this.firedCamera) {
      this.firedCamera = true
      const cam = this.currentAtom.camera
      switch (cam.type) {
        case 'zoom':
          cameraSystem.zoom(cam.zoom_level ?? 1.5, cam.duration_ms, cam.easing, { x: character.x, y: character.y })
          break
        case 'shake':
          cameraSystem.shake(5, cam.duration_ms)
          break
        case 'pan':
          cameraSystem.pan({ x: character.x, y: character.y }, cam.duration_ms, cam.easing)
          break
      }
    }

    // Advance frames
    const currentFrame = this.currentAtom.frames[this.currentFrameIndex]
    if (this.frameElapsed >= currentFrame.duration_ms) {
      this.frameElapsed -= currentFrame.duration_ms
      this.currentFrameIndex++

      // Atom complete?
      if (this.currentFrameIndex >= this.currentAtom.frames.length) {
        const exitState = this.currentAtom.exit_state as CharacterState
        this.currentAtom = null
        this.currentFrameIndex = 0
        this.frameElapsed = 0
        this.atomElapsed = 0
        this.firedParticles.clear()
        this.firedCamera = false

        // Set character to exit state
        character.state = exitState
        character.stateTimer = 0

        // Play next in queue, or complete
        if (this.queue.length > 0) {
          this.startAtom(this.queue.shift()!)
        } else {
          this.onComplete?.()
          this.onComplete = undefined
        }
      }
    }
  }

  /**
   * Interrupt current playback (only if atom allows it).
   * Returns true if interrupted successfully.
   */
  cancel(): boolean {
    if (!this.currentAtom) return false
    if (!this.currentAtom.can_interrupt) return false

    this.currentAtom = null
    this.currentFrameIndex = 0
    this.frameElapsed = 0
    this.atomElapsed = 0
    this.queue = []
    this.firedParticles.clear()
    this.firedCamera = false
    this.onComplete?.()
    this.onComplete = undefined
    return true
  }

  /** Force stop regardless of can_interrupt flag */
  forceStop(): void {
    this.currentAtom = null
    this.currentFrameIndex = 0
    this.frameElapsed = 0
    this.atomElapsed = 0
    this.queue = []
    this.firedParticles.clear()
    this.firedCamera = false
    this.onComplete = undefined
  }

  /**
   * Returns current frame's render adjustments.
   * Applied by renderer to character draw position/scale.
   * Returns null if no atom is playing.
   */
  getCurrentAdjustments(): AtomAdjustments | null {
    if (!this.currentAtom) return null

    const frame = this.currentAtom.frames[this.currentFrameIndex]
    if (!frame) return null

    // Interpolate between current and next frame for smooth motion
    const nextFrameIndex = this.currentFrameIndex + 1
    const nextFrame: AtomFrame | undefined = this.currentAtom.frames[nextFrameIndex]
    const t = Math.min(this.frameElapsed / frame.duration_ms, 1)

    if (nextFrame) {
      return {
        offsetX: lerp(frame.offset_x ?? 0, nextFrame.offset_x ?? 0, t),
        offsetY: lerp(frame.offset_y ?? 0, nextFrame.offset_y ?? 0, t),
        scale: lerp(frame.scale ?? 1, nextFrame.scale ?? 1, t),
      }
    }

    return {
      offsetX: frame.offset_x ?? 0,
      offsetY: frame.offset_y ?? 0,
      scale: frame.scale ?? 1,
    }
  }

  /** Reset entrance tracking (for new theater session) */
  resetEntrances(): void {
    this.playedEntrances.clear()
  }

  private startAtom(atom: ComedyAtom): void {
    this.currentAtom = atom
    this.currentFrameIndex = 0
    this.frameElapsed = 0
    this.atomElapsed = 0
    this.firedParticles.clear()
    this.firedCamera = false
  }
}

// ── Utilities ───────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
