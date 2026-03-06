import type { FlirtScenario, FlirtStep } from '@/types/database';
import type { WorldState } from './engine/officeState';
import type { ParticleSystem } from './particles';

export type SequencePlayerCallback = {
  onStepStart: (stepIndex: number, step: FlirtStep) => void;
  onStepEnd: (stepIndex: number) => void;
  onComplete: (result: string) => void;
  onSpeechBubble: (agent: string, text: string) => void;
};

export class SequencePlayer {
  private scenario: FlirtScenario | null = null;
  private currentStep = 0;
  private stepTimer = 0;
  private playing = false;
  private worldState: WorldState;
  private particles: ParticleSystem;
  private callbacks: SequencePlayerCallback;

  // Character IDs for chaser and gatekeeper
  private chaserId = 1;
  private gatekeeperId = 2;

  constructor(
    worldState: WorldState,
    particles: ParticleSystem,
    callbacks: SequencePlayerCallback
  ) {
    this.worldState = worldState;
    this.particles = particles;
    this.callbacks = callbacks;
  }

  setChaserAndGatekeeper(chaserId: number, gatekeeperId: number) {
    this.chaserId = chaserId;
    this.gatekeeperId = gatekeeperId;
  }

  load(scenario: FlirtScenario) {
    this.scenario = scenario;
    this.currentStep = 0;
    this.stepTimer = 0;
    this.playing = false;
  }

  play() {
    if (!this.scenario) return;
    this.playing = true;
    this.startStep(0);
  }

  pause() {
    this.playing = false;
  }

  resume() {
    if (!this.scenario) return;
    this.playing = true;
  }

  jumpToStep(index: number) {
    if (!this.scenario || index >= this.scenario.steps.length) return;
    this.currentStep = index;
    this.stepTimer = 0;
    this.startStep(index);
  }

  private startStep(index: number) {
    const step = this.scenario!.steps[index];
    this.callbacks.onStepStart(index, step);

    // Resolve which character(s) to animate
    const agentId =
      step.agent === 'chaser'
        ? this.chaserId
        : step.agent === 'gatekeeper'
          ? this.gatekeeperId
          : null;

    // Show speech bubble
    if (step.text) {
      this.callbacks.onSpeechBubble(step.agent, step.text);
    }

    // Spawn particles based on emotion
    if (step.emotion && agentId) {
      const ch = this.worldState.characters.get(agentId);
      if (ch) {
        switch (step.emotion) {
          case 'nervous':
            this.particles.spawn('sweat', ch.x, ch.y - 16, 3);
            break;
          case 'happy':
            this.particles.spawn('heart', ch.x, ch.y - 16, 2);
            break;
          case 'sad':
            this.particles.spawn('rain', ch.x, ch.y - 20, 5);
            break;
          case 'excited':
            this.particles.spawn('star', ch.x, ch.y - 16, 4);
            break;
          case 'angry':
            this.particles.spawn('confetti', ch.x, ch.y, 1);
            break;
        }
      }
    }

    // If "both", spawn particles for both characters
    if (step.emotion && step.agent === 'both') {
      for (const id of [this.chaserId, this.gatekeeperId]) {
        const ch = this.worldState.characters.get(id);
        if (ch && step.emotion === 'excited') {
          this.particles.spawn('star', ch.x, ch.y - 16, 3);
        }
      }
    }
  }

  update(dt: number) {
    if (!this.playing || !this.scenario) return;

    this.stepTimer += dt * 1000; // convert to ms

    const step = this.scenario.steps[this.currentStep];
    if (this.stepTimer >= step.duration_ms) {
      this.callbacks.onStepEnd(this.currentStep);
      this.currentStep++;
      this.stepTimer = 0;

      if (this.currentStep >= this.scenario.steps.length) {
        this.playing = false;
        this.callbacks.onComplete(this.scenario.result);
      } else {
        this.startStep(this.currentStep);
      }
    }
  }

  get isPlaying() {
    return this.playing;
  }
  get step() {
    return this.currentStep;
  }
  get totalSteps() {
    return this.scenario?.steps.length ?? 0;
  }
  get currentScenario() {
    return this.scenario;
  }
}
