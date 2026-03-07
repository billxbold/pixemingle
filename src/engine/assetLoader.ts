import type { SpriteData } from './types'

export async function loadSpriteSheet(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function extractTile(
  sheet: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): SpriteData {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const sprite: SpriteData = []
  for (let row = 0; row < h; row++) {
    const line: string[] = []
    for (let col = 0; col < w; col++) {
      const i = (row * w + col) * 4
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const a = imageData.data[i + 3]
      if (a < 128) {
        line.push('')
      } else {
        line.push(
          '#' +
          r.toString(16).padStart(2, '0') +
          g.toString(16).padStart(2, '0') +
          b.toString(16).padStart(2, '0')
        )
      }
    }
    sprite.push(line)
  }
  return sprite
}

/** Load a single PNG as full SpriteData (entire image, no cropping) */
export async function loadSingleSprite(url: string): Promise<SpriteData> {
  const img = await loadSpriteSheet(url)
  return extractTile(img, 0, 0, img.naturalWidth, img.naturalHeight)
}

/** Load multiple Singles PNGs by filename prefix + numbers */
export async function loadVenueFurniture(
  venueDir: string,
  prefix: string,
  numbers: number[]
): Promise<Map<number, SpriteData>> {
  const result = new Map<number, SpriteData>()
  await Promise.all(
    numbers.map(async (n) => {
      const url = `/sprites/tilesets/${venueDir}/${prefix}${n}.png`
      try {
        const sprite = await loadSingleSprite(url)
        result.set(n, sprite)
      } catch {
        console.warn(`Failed to load: ${url}`)
      }
    })
  )
  return result
}

/** Extract floor tiles from the Room Builder floors sheet (16x16 grid) */
export async function loadFloorTiles(url: string): Promise<SpriteData[]> {
  const sheet = await loadSpriteSheet(url)
  const tiles: SpriteData[] = []
  const cols = Math.floor(sheet.naturalWidth / 16)
  for (let i = 0; i < Math.min(cols, 7); i++) {
    tiles.push(extractTile(sheet, i * 16, 0, 16, 16))
  }
  return tiles
}
