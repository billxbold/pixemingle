import type { SpriteData } from './types'
import { WARDROBE_SPRITE, CAN_SPRITE } from './sprites/spriteData'
import { getCachedSprite } from './sprites/spriteCache'

export interface ActiveProp {
  id: string
  sprite: SpriteData
  x: number
  y: number
  vx: number
  vy: number
  lifetime: number
  timer: number
}

const PROP_SPRITES: Record<string, SpriteData> = {
  wardrobe: WARDROBE_SPRITE,
  can: CAN_SPRITE,
}

export class PropSystem {
  props: ActiveProp[] = []

  spawn(propId: string, x: number, y: number) {
    const sprite = PROP_SPRITES[propId]
    if (!sprite) return

    const vx = propId === 'can' ? 60 : 0
    const vy = propId === 'can' ? -40 : 0
    const lifetime = propId === 'can' ? 1 : 1.5

    this.props.push({ id: propId, sprite, x, y, vx, vy, lifetime, timer: 0 })
  }

  despawn(propId: string) {
    this.props = this.props.filter(p => p.id !== propId)
  }

  update(dt: number) {
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i]
      p.timer += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.id === 'can') p.vy += 80 * dt // gravity
      if (p.timer >= p.lifetime) {
        this.props.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, zoom: number) {
    for (const p of this.props) {
      const cached = getCachedSprite(p.sprite, zoom)
      const px = Math.round(offsetX + p.x * zoom - cached.width / 2)
      const py = Math.round(offsetY + p.y * zoom - cached.height)
      ctx.drawImage(cached, px, py)
    }
  }
}
