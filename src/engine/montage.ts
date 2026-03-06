import { CharacterState } from './types'
import type { Character } from './types'
import { ParticleSystem } from './particles'

export interface MontageStep {
  timeOffset: number // seconds from start
  action: (character: Character, particles: ParticleSystem) => void
  description: string
}

export function createResearchMontage(): MontageStep[] {
  return [
    {
      timeOffset: 0,
      description: 'Agent sits at desk, opens laptop',
      action: (ch) => {
        ch.state = CharacterState.TYPE
        ch.frame = 0
        ch.frameTimer = 0
      },
    },
    {
      timeOffset: 1.5,
      description: 'Papers fly around',
      action: (ch, particles) => {
        particles.spawn('confetti', ch.x, ch.y - 16, 8)
      },
    },
    {
      timeOffset: 2.5,
      description: 'Chart icons appear',
      action: (ch, particles) => {
        particles.spawn('star', ch.x + 8, ch.y - 20, 3)
        particles.spawn('star', ch.x - 8, ch.y - 20, 3)
      },
    },
    {
      timeOffset: 3.5,
      description: 'Horoscope symbols flash',
      action: (ch, particles) => {
        particles.spawn('star', ch.x, ch.y - 24, 5)
      },
    },
    {
      timeOffset: 4.5,
      description: 'Brain icon pulses',
      action: (ch, particles) => {
        particles.spawn('lightbulb', ch.x, ch.y - 20, 1)
      },
    },
    {
      timeOffset: 5.5,
      description: 'Agent writes furiously',
      action: (ch) => {
        ch.state = CharacterState.TYPE
        ch.frame = 0
        ch.frameTimer = 0
      },
    },
    {
      timeOffset: 6.5,
      description: 'Coffee cup level decreases',
      action: (ch, particles) => {
        particles.spawn('sweat', ch.x + 12, ch.y - 8, 2)
      },
    },
    {
      timeOffset: 7.5,
      description: 'Agent leans back, strokes chin',
      action: (ch) => {
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
      },
    },
    {
      timeOffset: 8.5,
      description: 'Lightbulb appears, agent jumps',
      action: (ch, particles) => {
        ch.state = CharacterState.CELEBRATE
        ch.stateDuration = 1.5
        ch.stateTimer = 0
        ch.frame = 0
        ch.frameTimer = 0
        particles.spawn('lightbulb', ch.x, ch.y - 28, 1)
        particles.spawn('star', ch.x, ch.y - 24, 5)
      },
    },
    {
      timeOffset: 10,
      description: 'Transition to gallery',
      action: (ch) => {
        ch.state = CharacterState.IDLE
        ch.frame = 0
      },
    },
  ]
}

export class MontagePlayer {
  private steps: MontageStep[]
  private timer = 0
  private currentStepIndex = 0
  private character: Character | null = null
  private particles: ParticleSystem
  private _isComplete = false
  private onComplete: (() => void) | null = null

  constructor(steps: MontageStep[], particles: ParticleSystem) {
    this.steps = steps
    this.particles = particles
  }

  start(character: Character, onComplete?: () => void) {
    this.character = character
    this.timer = 0
    this.currentStepIndex = 0
    this._isComplete = false
    this.onComplete = onComplete ?? null
  }

  update(dt: number) {
    if (this._isComplete || !this.character) return

    this.timer += dt

    // Execute any steps whose timeOffset has been reached
    while (
      this.currentStepIndex < this.steps.length &&
      this.timer >= this.steps[this.currentStepIndex].timeOffset
    ) {
      this.steps[this.currentStepIndex].action(this.character, this.particles)
      this.currentStepIndex++
    }

    if (this.currentStepIndex >= this.steps.length) {
      this._isComplete = true
      this.onComplete?.()
    }
  }

  get isComplete(): boolean {
    return this._isComplete
  }

  get progress(): number {
    if (this.steps.length === 0) return 1
    const totalDuration = this.steps[this.steps.length - 1].timeOffset
    return totalDuration > 0 ? Math.min(this.timer / totalDuration, 1) : 1
  }
}
