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
): string[][] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const sprite: string[][] = []
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
