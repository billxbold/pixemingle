import type { ParticleType } from './types'

export type { ParticleType }

export interface Particle {
  type: ParticleType
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  frame: number
  frameTimer: number
  color: string
  // For character-tracking particles (rain_cloud_personal)
  trackCharacterId?: number
}

const PARTICLE_COLORS: Record<ParticleType, string[]> = {
  heart: ['#FF1493', '#FF69B4', '#FF007F'],
  confetti: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3'],
  rain: ['#6B9BD2', '#87CEEB'],
  sweat: ['#87CEEB', '#ADD8E6'],
  lightbulb: ['#FFD700', '#FFA500'],
  star: ['#FFD700', '#FFF8DC', '#FFFACD'],
  music_note: ['#9B59B6', '#8E44AD', '#BB8FCE'],
  // New particle colors
  blush_tint: ['#FFB6C1', '#FF9CAD'],
  blush_gradient: ['#FF6B8A', '#FF4571', '#FFB6C1'],
  slight_blush: ['#FFB6C1'],
  single_sweat_drop: ['#87CEEB'],
  sweat_fountain: ['#87CEEB', '#ADD8E6', '#B0D4F1'],
  small_sparkle: ['#FFFFFF', '#FFFACD', '#FFF8DC'],
  small_star: ['#FFD700', '#FFEC8B'],
  question_mark: ['#FFFFFF', '#E0E0E0'],
  anger: ['#FF4444', '#CC0000'],
  rain_cloud_personal: ['#8899AA', '#6B7D8E'],
  tumbleweed: ['#C4A46B', '#A0845C', '#8B7355'],
  tears: ['#87CEEB', '#6BA3D6'],
}

export class ParticleSystem {
  particles: Particle[] = []

  spawn(type: ParticleType, x: number, y: number, count: number = 1) {
    // Guard against invalid particle types (e.g. from SOUL.md parsing)
    if (!PARTICLE_COLORS[type]) return

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(type, x, y))
    }
  }

  private createParticle(type: ParticleType, x: number, y: number): Particle {
    const configs: Record<ParticleType, { vx: number; vy: number; life: number }> = {
      heart:              { vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.5 },
      confetti:           { vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 30, life: 2.0 },
      rain:               { vx: -5, vy: 40 + Math.random() * 20, life: 1.0 },
      sweat:              { vx: (Math.random() - 0.5) * 10, vy: 15 + Math.random() * 10, life: 0.8 },
      lightbulb:          { vx: 0, vy: -15, life: 1.5 },
      star:               { vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 15, life: 1.0 },
      music_note:         { vx: (Math.random() - 0.5) * 15, vy: -25 - Math.random() * 10, life: 1.2 },
      // New v2 particles
      blush_tint:         { vx: 0, vy: 0, life: 1.5 },
      blush_gradient:     { vx: 8, vy: 0, life: 2.0 },
      slight_blush:       { vx: 0, vy: 0, life: 1.0 },
      single_sweat_drop:  { vx: (Math.random() - 0.5) * 4, vy: 20, life: 0.8 },
      sweat_fountain:     { vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 20, life: 1.5 },
      small_sparkle:      { vx: (Math.random() - 0.5) * 6, vy: -8 - Math.random() * 4, life: 0.6 },
      small_star:         { vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 0.5 },
      question_mark:      { vx: 0, vy: -5, life: 1.5 },
      anger:              { vx: 0, vy: 0, life: 1.0 },
      rain_cloud_personal:{ vx: 0, vy: 0, life: 3.0 },
      tumbleweed:         { vx: 40 + Math.random() * 20, vy: 0, life: 2.5 },
      tears:              { vx: (Math.random() - 0.5) * 3, vy: 25 + Math.random() * 10, life: 2.0 },
    }
    const cfg = configs[type]
    const colors = PARTICLE_COLORS[type]
    return {
      type, x, y,
      vx: cfg.vx, vy: cfg.vy,
      life: cfg.life, maxLife: cfg.life,
      frame: 0, frameTimer: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      // Gravity for confetti and sweat_fountain
      if (p.type === 'confetti' || p.type === 'sweat_fountain') p.vy += 60 * dt
      // Gravity for tears and single_sweat_drop
      if (p.type === 'tears' || p.type === 'single_sweat_drop') p.vy += 30 * dt
      // Float for hearts
      if (p.type === 'heart') p.vy *= 0.98
      // Anger: pulse in/out via frame
      if (p.type === 'anger') p.vx = 0
      // Blush types: static (no movement)
      if (p.type === 'blush_tint' || p.type === 'slight_blush') {
        p.vx = 0; p.vy = 0
      }
      // Tumbleweed: rolls horizontally, slight bounce
      if (p.type === 'tumbleweed') {
        p.vy = Math.sin(p.frameTimer * 8) * 5
      }
      // rain_cloud_personal: stays in place above character
      if (p.type === 'rain_cloud_personal') {
        p.vx = 0; p.vy = 0
      }
      // Frame animation
      p.frameTimer += dt
      if (p.frameTimer > 0.15) {
        p.frame = (p.frame + 1) % 3
        p.frameTimer = 0
      }
    }
  }

  clear() {
    this.particles = []
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  offsetX: number,
  offsetY: number,
  zoom: number,
) {
  for (const p of particles) {
    const sx = offsetX + p.x * zoom
    const sy = offsetY + p.y * zoom
    const alpha = Math.min(p.life / (p.maxLife * 0.3), 1)
    ctx.save()
    ctx.globalAlpha = alpha

    const size = Math.max(2, 3 * zoom)

    switch (p.type) {
      case 'heart': {
        ctx.fillStyle = p.color
        // Simple pixel heart: 3x3
        const s = size / 3
        ctx.fillRect(sx - s, sy - s * 2, s, s)
        ctx.fillRect(sx + s, sy - s * 2, s, s)
        ctx.fillRect(sx - s * 2, sy - s, s, s)
        ctx.fillRect(sx, sy - s, s, s)
        ctx.fillRect(sx + s * 2, sy - s, s, s)
        ctx.fillRect(sx - s, sy, s, s)
        ctx.fillRect(sx + s, sy, s, s)
        ctx.fillRect(sx, sy + s, s, s)
        break
      }
      case 'confetti': {
        ctx.fillStyle = p.color
        ctx.fillRect(sx, sy, size * 0.8, size * 0.4)
        break
      }
      case 'rain': {
        ctx.fillStyle = p.color
        ctx.fillRect(sx, sy, 1, size)
        break
      }
      case 'star': {
        ctx.fillStyle = p.color
        const hs = size / 2
        ctx.fillRect(sx, sy - hs, 1, size)
        ctx.fillRect(sx - hs, sy, size, 1)
        break
      }
      case 'blush_tint':
      case 'blush_gradient':
      case 'slight_blush': {
        // Pink overlay circle
        ctx.fillStyle = p.color
        const r = p.type === 'blush_gradient' ? size * 2 : size
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'single_sweat_drop': {
        // Single blue teardrop
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2)
        ctx.fill()
        // Pointed top
        ctx.beginPath()
        ctx.moveTo(sx - size * 0.4, sy)
        ctx.lineTo(sx, sy - size)
        ctx.lineTo(sx + size * 0.4, sy)
        ctx.fill()
        break
      }
      case 'sweat_fountain': {
        // Multiple drops spraying
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'small_sparkle': {
        // Tiny twinkle cross
        ctx.fillStyle = p.color
        const sp = Math.max(1, size * 0.3)
        ctx.fillRect(sx - sp, sy, sp * 2, 1)
        ctx.fillRect(sx, sy - sp, 1, sp * 2)
        break
      }
      case 'small_star': {
        // 4-point star burst
        ctx.fillStyle = p.color
        const hs = size * 0.5
        ctx.fillRect(sx, sy - hs, 1, size)
        ctx.fillRect(sx - hs, sy, size, 1)
        // Diagonals
        ctx.fillRect(sx - hs * 0.5, sy - hs * 0.5, 1, 1)
        ctx.fillRect(sx + hs * 0.5, sy - hs * 0.5, 1, 1)
        ctx.fillRect(sx - hs * 0.5, sy + hs * 0.5, 1, 1)
        ctx.fillRect(sx + hs * 0.5, sy + hs * 0.5, 1, 1)
        break
      }
      case 'question_mark': {
        // ? symbol
        ctx.fillStyle = p.color
        ctx.font = `${Math.max(8, size * 3)}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText('?', sx, sy)
        break
      }
      case 'anger': {
        // Red vein marks (# shape)
        ctx.strokeStyle = p.color
        ctx.lineWidth = Math.max(1, size * 0.3)
        const as = size * 0.8
        // Horizontal lines
        ctx.beginPath()
        ctx.moveTo(sx - as, sy - as * 0.3); ctx.lineTo(sx + as, sy - as * 0.3)
        ctx.moveTo(sx - as, sy + as * 0.3); ctx.lineTo(sx + as, sy + as * 0.3)
        // Vertical lines
        ctx.moveTo(sx - as * 0.3, sy - as); ctx.lineTo(sx - as * 0.3, sy + as)
        ctx.moveTo(sx + as * 0.3, sy - as); ctx.lineTo(sx + as * 0.3, sy + as)
        ctx.stroke()
        break
      }
      case 'rain_cloud_personal': {
        // Small cloud shape
        ctx.fillStyle = p.color
        const cs = size * 1.5
        ctx.beginPath()
        ctx.arc(sx, sy, cs, 0, Math.PI * 2)
        ctx.arc(sx - cs * 0.8, sy + cs * 0.2, cs * 0.7, 0, Math.PI * 2)
        ctx.arc(sx + cs * 0.8, sy + cs * 0.2, cs * 0.7, 0, Math.PI * 2)
        ctx.fill()
        // Rain drops below
        ctx.fillStyle = '#87CEEB'
        for (let d = 0; d < 3; d++) {
          const dx = sx - cs * 0.6 + d * cs * 0.6
          const dy = sy + cs + (p.frame * 2)
          ctx.fillRect(dx, dy, 1, size * 0.5)
        }
        break
      }
      case 'tumbleweed': {
        // Brown rolling ball
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(sx, sy, size, 0, Math.PI * 2)
        ctx.fill()
        // Cross-hatch lines for texture
        ctx.strokeStyle = '#8B6914'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(sx - size * 0.6, sy); ctx.lineTo(sx + size * 0.6, sy)
        ctx.moveTo(sx, sy - size * 0.6); ctx.lineTo(sx, sy + size * 0.6)
        ctx.stroke()
        break
      }
      case 'tears': {
        // Tear streams
        ctx.fillStyle = p.color
        ctx.fillRect(sx, sy, Math.max(1, size * 0.3), size * 0.6)
        break
      }
      default: {
        ctx.fillStyle = p.color
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
        break
      }
    }
    ctx.restore()
  }
}
