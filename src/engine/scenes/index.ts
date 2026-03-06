import type { OfficeLayout } from '../types'
import type { SceneName } from '../sceneManager'

// Placeholder layouts — will be populated with LimeZu tiles in Task 5
export function createSceneLayouts(): Record<SceneName, OfficeLayout> {
  return {
    bedroom: createBedroomLayout(),
    office: createOfficeLayout(),
    gallery: createGalleryLayout(),
    theater: createTheaterLayout(),
    cafe: createCafeLayout(),
    park: createParkLayout(),
  }
}

function createBedroomLayout(): OfficeLayout {
  // 8x6 grid: bed, wardrobe, mirror, door
  return {
    version: 1,
    cols: 8,
    rows: 6,
    tiles: Array(48).fill(1),
    furniture: [],
  }
}

function createOfficeLayout(): OfficeLayout {
  // 10x8 grid: desk, laptop, papers, coffee
  return {
    version: 1,
    cols: 10,
    rows: 8,
    tiles: Array(80).fill(1),
    furniture: [],
  }
}

function createGalleryLayout(): OfficeLayout {
  // 12x8 grid: large wall with photo frame positions
  return {
    version: 1,
    cols: 12,
    rows: 8,
    tiles: Array(96).fill(1),
    furniture: [],
  }
}

function createTheaterLayout(): OfficeLayout {
  // 14x10 grid: open area with entrance points
  return {
    version: 1,
    cols: 14,
    rows: 10,
    tiles: Array(140).fill(1),
    furniture: [],
  }
}

function createCafeLayout(): OfficeLayout {
  // 10x8 grid: table, two chairs, ambient items
  return {
    version: 1,
    cols: 10,
    rows: 8,
    tiles: Array(80).fill(1),
    furniture: [],
  }
}

function createParkLayout(): OfficeLayout {
  // 12x8 grid: bench, trees, flowers
  return {
    version: 1,
    cols: 12,
    rows: 8,
    tiles: Array(96).fill(1),
    furniture: [],
  }
}
