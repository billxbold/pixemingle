import type { BodyModifier } from './types'

/**
 * Body modifier visual adjustments.
 * MVP approach: Y offset and scale only. No new sprite frames needed.
 * A "slump" is just renderOffsetY = 3. A "slight_bounce" is sin(time) * 2.
 */

export interface BodyModifierVisuals {
  offsetY: number      // Pixel offset (positive = lower)
  scale: number        // Scale factor (1.0 = normal)
  oscillateY?: number  // Sine oscillation amplitude on Y (px)
  oscillateSpeed?: number // Oscillation speed multiplier
}

const MODIFIER_VISUALS: Partial<Record<BodyModifier, BodyModifierVisuals>> = {
  // Posture
  lean_forward:            { offsetY: -2, scale: 1.0 },
  lean_back:               { offsetY: 1, scale: 1.0 },
  lean_back_arms_crossed:  { offsetY: 1, scale: 1.0 },
  casual_lean:             { offsetY: 1, scale: 1.0 },
  stiff_pose:              { offsetY: -1, scale: 1.02 },
  slump:                   { offsetY: 3, scale: 0.97 },
  slump_heavy:             { offsetY: 4, scale: 0.95 },
  open_posture:            { offsetY: -1, scale: 1.02 },
  puff_chest:              { offsetY: -2, scale: 1.08 },

  // Hands/Arms
  arms_crossed:            { offsetY: 0, scale: 1.0 },
  arms_crossed_smirk:      { offsetY: 0, scale: 1.0 },
  hands_in_pockets:        { offsetY: 1, scale: 0.98 },
  rub_back_of_neck:        { offsetY: 0, scale: 1.0 },
  cover_face_peek:         { offsetY: 0, scale: 0.98 },
  hand_on_hip:             { offsetY: 0, scale: 1.02 },
  chin_touch:              { offsetY: 0, scale: 1.0 },
  over_gesticulate:        { offsetY: 0, scale: 1.0, oscillateY: 1, oscillateSpeed: 3 },
  finger_guns:             { offsetY: -1, scale: 1.02 },

  // Head
  slight_nod:              { offsetY: 1, scale: 1.0 },
  head_tilt:               { offsetY: 0, scale: 1.0 },
  look_away:               { offsetY: 0, scale: 1.0 },
  look_away_smile:         { offsetY: 0, scale: 1.0 },
  blush_look_away:         { offsetY: 0, scale: 0.98 },
  eyebrow_raise:           { offsetY: -1, scale: 1.0 },
  slow_blink:              { offsetY: 0, scale: 1.0 },
  deadpan_stare:           { offsetY: 0, scale: 1.0 },

  // Full Body
  slight_bounce:           { offsetY: 0, scale: 1.0, oscillateY: 2, oscillateSpeed: 4 },
  slight_fidget:           { offsetY: 0, scale: 1.0, oscillateY: 1, oscillateSpeed: 2 },
  slight_shift:            { offsetY: 0, scale: 1.0, oscillateY: 0.5, oscillateSpeed: 1.5 },
  slight_wave:             { offsetY: 0, scale: 1.0 },
  shrink_slightly:         { offsetY: 2, scale: 0.93 },
  fist_pump:               { offsetY: -3, scale: 1.05 },
  hair_flip:               { offsetY: -1, scale: 1.02 },
  shrug_smile:             { offsetY: 1, scale: 1.0 },
  cover_mouth_laugh:       { offsetY: 0, scale: 1.0, oscillateY: 1, oscillateSpeed: 3 },
  tap_foot:                { offsetY: 0, scale: 1.0, oscillateY: 0.5, oscillateSpeed: 5 },
  determined_face:         { offsetY: -1, scale: 1.03 },
  relaxed_smile:           { offsetY: 0, scale: 1.0 },

  // None
  none:                    { offsetY: 0, scale: 1.0 },
}

/**
 * Get the visual adjustments for a body modifier.
 * Returns neutral visuals for unknown modifiers.
 */
export function getBodyModifierVisuals(modifier: BodyModifier | undefined): BodyModifierVisuals {
  if (!modifier || modifier === 'none') return { offsetY: 0, scale: 1.0 }
  return MODIFIER_VISUALS[modifier] ?? { offsetY: 0, scale: 1.0 }
}

/**
 * Calculates the current Y offset including oscillation.
 * Call this each frame with the current time for animated modifiers.
 */
export function getBodyModifierYOffset(modifier: BodyModifier | undefined, time: number): number {
  const visuals = getBodyModifierVisuals(modifier)
  let y = visuals.offsetY
  if (visuals.oscillateY && visuals.oscillateSpeed) {
    y += Math.sin(time * visuals.oscillateSpeed) * visuals.oscillateY
  }
  return y
}

/**
 * Get scale factor for the current body modifier.
 */
export function getBodyModifierScale(modifier: BodyModifier | undefined): number {
  return getBodyModifierVisuals(modifier).scale
}
