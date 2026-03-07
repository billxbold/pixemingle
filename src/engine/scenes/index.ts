import type { OfficeLayout } from '../types'
import type { SceneName } from '../sceneManager'

export function createSceneLayouts(): Record<SceneName, OfficeLayout> {
  return {
    lounge: createLoungeLayout(),
    gallery: createGalleryLayout(),
    japanese: createJapaneseLayout(),
    icecream: createIcecreamLayout(),
    studio: createStudioLayout(),
    museum: createMuseumLayout(),
  }
}

function createLoungeLayout(): OfficeLayout {
  return { version: 1, cols: 10, rows: 8, tiles: Array(80).fill(1), furniture: [] }
}

function createGalleryLayout(): OfficeLayout {
  return { version: 1, cols: 12, rows: 8, tiles: Array(96).fill(1), furniture: [] }
}

function createJapaneseLayout(): OfficeLayout {
  return { version: 1, cols: 10, rows: 8, tiles: Array(80).fill(1), furniture: [] }
}

function createIcecreamLayout(): OfficeLayout {
  return { version: 1, cols: 10, rows: 8, tiles: Array(80).fill(1), furniture: [] }
}

function createStudioLayout(): OfficeLayout {
  return { version: 1, cols: 14, rows: 10, tiles: Array(140).fill(1), furniture: [] }
}

function createMuseumLayout(): OfficeLayout {
  return { version: 1, cols: 12, rows: 8, tiles: Array(96).fill(1), furniture: [] }
}
