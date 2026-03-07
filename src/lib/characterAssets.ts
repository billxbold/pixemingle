import type { AgentAppearance } from '@/types/database'

export const PREMADE_COUNT = 20

export function premadeUrl(index: number): string {
  if (index < 1 || index > PREMADE_COUNT) throw new RangeError(`premadeUrl: index ${index} out of range 1-${PREMADE_COUNT}`)
  return `/sprites/characters/premade/Premade_Character_48x48_${String(index).padStart(2, '0')}.png`
}

// All outfit filenames (40 total)
export const OUTFITS: string[] = [
  ...Array.from({ length: 10 }, (_, i) => `Outfit_01_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_02_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_03_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3  }, (_, i) => `Outfit_04_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5  }, (_, i) => `Outfit_05_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_06_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4  }, (_, i) => `Outfit_07_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3  }, (_, i) => `Outfit_08_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3  }, (_, i) => `Outfit_09_48x48_${String(i + 1).padStart(2, '0')}`),
]

// All hairstyle filenames (70 total: 10 groups × 7 variants each)
export const HAIRSTYLES: string[] = [
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_01_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_02_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_03_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_04_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_05_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_06_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_07_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_08_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_09_48x48_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `Hairstyle_10_48x48_${String(i + 1).padStart(2, '0')}`),
]

export const BODY_COUNT = 9
export const EYES_COUNT = 7

export const DEFAULT_APPEARANCE: AgentAppearance = {
  body: 1,
  eyes: 1,
  outfit: 'Outfit_01_48x48_01',
  hairstyle: 'Hairstyle_01_48x48_01',
}
