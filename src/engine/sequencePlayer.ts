import type { FlirtScenario, FlirtStep, AnimationAction } from '@/types/database';
import type { WorldState } from './engine/officeState';
import type { ParticleSystem } from './particles';
import { CharacterState, Direction } from './types';
import { getAnimationSet, type Gender } from './genderAnimations';

/** Map scenario AnimationAction → engine CharacterState for sprite rendering */
const ACTION_TO_STATE: Record<string, CharacterState> = {
  idle: CharacterState.IDLE,
  nervous_walk: CharacterState.WALK,
  confident_walk: CharacterState.WALK,
  walk_away: CharacterState.WALK_AWAY,
  dramatic_entrance: CharacterState.APPROACH,
  pickup_line: CharacterState.DELIVER_LINE,
  flower_offer: CharacterState.DELIVER_LINE,
  flower_accept: CharacterState.DELIVER_LINE,
  flower_throw: CharacterState.ANGRY_KICK,
  victory_dance: CharacterState.CELEBRATE,
  walk_together: CharacterState.WALK,
  eye_roll: CharacterState.IDLE,
  phone_check: CharacterState.THINK,
  blush: CharacterState.BLUSH,
  sad_slump: CharacterState.DESPAIR,
  angry_kick: CharacterState.ANGRY_KICK,
  rejected_shock: CharacterState.DESPAIR,
  thinking: CharacterState.THINK,
  determined_face: CharacterState.IDLE,
  irritated_foot_tap: CharacterState.IDLE,
  wardrobe_change: CharacterState.USE_PROP,
};

export type SequencePlayerCallback = {
  onStepStart: (stepIndex: number, step: FlirtStep) => void;
  onStepEnd: (stepIndex: number) => void;
  onComplete: (result: string) => void;
  onSpeechBubble: (agent: string, text: string) => void;
  onPropSpawn?: (propId: string, x: number, y: number) => void;
  onPropDespawn?: (propId: string) => void;
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

  /** Play a hardcoded mini-sequence before the main scenario */
  playReaction(steps: FlirtStep[], onDone: () => void) {
    const reactionScenario: FlirtScenario = {
      match_id: '',
      attempt_number: 0,
      soul_type_a: 'funny',
      soul_type_b: 'funny',
      steps,
      result: 'pending',
    };
    this.load(reactionScenario);
    const origOnComplete = this.callbacks.onComplete;
    this.callbacks.onComplete = () => {
      this.callbacks.onComplete = origOnComplete;
      onDone();
    };
    this.play();
  }

  /** Venue countered: gender-aware reaction sequence */
  static venueCounteredSteps(chaserGender: Gender = 'male'): FlirtStep[] {
    const set = getAnimationSet(chaserGender, 'chaser');
    return [
      { agent: 'chaser', action: set.venueCountered[0] || 'sad_slump', text: 'oh man...', duration_ms: 1500, emotion: 'sad' },
      { agent: 'chaser', action: 'wardrobe_change', duration_ms: 1000, props: ['wardrobe'] },
      { agent: 'chaser', action: set.venueCountered[2] || 'confident_walk', text: "alright, let's go!", duration_ms: 1500, emotion: 'excited' },
    ];
  }

  /** Date declined: gender-aware rejection sequence */
  static dateDeclinedSteps(rejectionText: string, walkoffText: string, chaserGender: Gender = 'male', gatekeeperGender: Gender = 'female'): FlirtStep[] {
    const gkSet = getAnimationSet(gatekeeperGender, 'gatekeeper');
    const chSet = getAnimationSet(chaserGender, 'chaser');
    return [
      { agent: 'gatekeeper', action: gkSet.rejected[0] || 'eye_roll', text: rejectionText, duration_ms: 1500, emotion: 'irritated' },
      { agent: 'chaser', action: 'rejected_shock', text: '...', duration_ms: 1000, emotion: 'sad' },
      { agent: 'chaser', action: chSet.rejected[0] || 'angry_kick', duration_ms: 1000, props: ['can'] },
      { agent: 'chaser', action: chSet.walkoff, text: walkoffText, duration_ms: 1500, emotion: 'sad' },
    ];
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

    // Set character animation state based on action
    const applyState = (id: number, action: AnimationAction) => {
      const ch = this.worldState.characters.get(id);
      if (!ch) return;
      ch.state = ACTION_TO_STATE[action] ?? CharacterState.IDLE;
      ch.frame = 0;
    };

    if (agentId) {
      applyState(agentId, step.action);
    } else {
      // 'both' — apply to both characters
      applyState(this.chaserId, step.action);
      applyState(this.gatekeeperId, step.action);
    }

    // Ensure characters face each other
    const chaser = this.worldState.characters.get(this.chaserId);
    const gk = this.worldState.characters.get(this.gatekeeperId);
    if (chaser && gk) {
      chaser.dir = chaser.x < gk.x ? Direction.RIGHT : Direction.LEFT;
      gk.dir = gk.x < chaser.x ? Direction.RIGHT : Direction.LEFT;
    }

    // Walk-away: face away and start moving via x offset each frame
    if (step.action === 'walk_away' || step.action === 'sad_walkoff') {
      const ch = agentId ? this.worldState.characters.get(agentId) : null;
      if (ch) {
        ch.dir = Direction.LEFT;
        // Mark as walking; the engine update loop will animate movement
        ch.state = CharacterState.WALK_AWAY;
      }
    }

    // Show speech bubble
    if (step.text) {
      this.callbacks.onSpeechBubble(step.agent, step.text);
    }

    // Spawn props at character position
    if (step.props?.length && agentId) {
      const ch = this.worldState.characters.get(agentId);
      if (ch) {
        for (const prop of step.props) {
          this.callbacks.onPropSpawn?.(prop, ch.x, ch.y);
        }
      }
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
