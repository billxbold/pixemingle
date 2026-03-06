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
}

export type ParticleType = 'heart' | 'confetti' | 'rain' | 'sweat' | 'lightbulb' | 'star' | 'music_note'

const PARTICLE_COLORS: Record<ParticleType, string[]> = {
  heart: ['#FF1493', '#FF69B4', '#FF007F'],
  confetti: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3'],
  rain: ['#6B9BD2', '#87CEEB'],
  sweat: ['#87CEEB', '#ADD8E6'],
  lightbulb: ['#FFD700', '#FFA500'],
  star: ['#FFD700', '#FFF8DC', '#FFFACD'],
  music_note: ['#9B59B6', '#8E44AD', '#BB8FCE'],
}

export class ParticleSystem {
  particles: Particle[] = []

  spawn(type: ParticleType, x: number, y: number, count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(type, x, y))
    }
  }

  private createParticle(type: ParticleType, x: number, y: number): Particle {
    const configs: Record<ParticleType, { vx: number; vy: number; life: number }> = {
      heart:      { vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.5 },
      confetti:   { vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 30, life: 2.0 },
      rain:       { vx: -5, vy: 40 + Math.random() * 20, life: 1.0 },
      sweat:      { vx: (Math.random() - 0.5) * 10, vy: 15 + Math.random() * 10, life: 0.8 },
      lightbulb:  { vx: 0, vy: -15, life: 1.5 },
      star:       { vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 15, life: 1.0 },
      music_note: { vx: (Math.random() - 0.5) * 15, vy: -25 - Math.random() * 10, life: 1.2 },
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
      // Gravity for confetti
      if (p.type === 'confetti') p.vy += 60 * dt
      // Float for hearts
      if (p.type === 'heart') p.vy *= 0.98
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
      default: {
        ctx.fillStyle = p.color
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
        break
      }
    }
    ctx.restore()
  }
}
