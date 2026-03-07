import type { VenueName } from '@/types/database'

/**
 * Maps venue -> Singles PNG file prefix and numbers to load as furniture.
 * Each entry: [singleNumber, gridCol, gridRow, label]
 *
 * Note: These numbers reference specific PNGs from LimeZu Modern Interiors Singles folders.
 * Numbers may need adjustment after visual inspection of actual PNG contents.
 */

export interface VenueFurnitureEntry {
  number: number
  col: number
  row: number
  label: string
}

export const VENUE_PREFIXES: Record<VenueName, string> = {
  lounge: 'Living_Room_Singles_',
  gallery: 'Art_Singles_',
  japanese: 'Japanese_Interiors_Singles_',
  icecream: 'Ice_Cream_Shop_Singles_',
  studio: 'Television_and_FIlm_Studio_Singles_',
  museum: 'Museum_Singles_',
}

export const VENUE_FURNITURE: Record<VenueName, VenueFurnitureEntry[]> = {
  lounge: [
    { number: 1, col: 2, row: 3, label: 'sofa' },
    { number: 5, col: 5, row: 3, label: 'armchair' },
    { number: 10, col: 3, row: 1, label: 'lamp' },
    { number: 15, col: 7, row: 2, label: 'side_table' },
    { number: 20, col: 1, row: 1, label: 'bookshelf' },
    { number: 25, col: 8, row: 5, label: 'rug' },
  ],
  gallery: [
    { number: 1, col: 2, row: 0, label: 'painting_large' },
    { number: 5, col: 5, row: 0, label: 'painting_small' },
    { number: 10, col: 8, row: 0, label: 'sculpture' },
    { number: 15, col: 10, row: 0, label: 'frame' },
    { number: 20, col: 3, row: 5, label: 'bench' },
    { number: 25, col: 7, row: 5, label: 'pedestal' },
  ],
  japanese: [
    { number: 1, col: 3, row: 3, label: 'low_table' },
    { number: 5, col: 2, row: 2, label: 'cushion_a' },
    { number: 10, col: 4, row: 2, label: 'cushion_b' },
    { number: 15, col: 1, row: 1, label: 'lantern' },
    { number: 20, col: 7, row: 1, label: 'screen' },
    { number: 25, col: 5, row: 5, label: 'plant' },
  ],
  icecream: [
    { number: 1, col: 3, row: 3, label: 'counter' },
    { number: 5, col: 5, row: 4, label: 'table' },
    { number: 10, col: 4, row: 4, label: 'chair_a' },
    { number: 15, col: 6, row: 4, label: 'chair_b' },
    { number: 20, col: 1, row: 1, label: 'display' },
    { number: 25, col: 8, row: 2, label: 'sign' },
  ],
  studio: [
    { number: 1, col: 2, row: 3, label: 'camera' },
    { number: 5, col: 5, row: 1, label: 'spotlight' },
    { number: 10, col: 8, row: 3, label: 'director_chair' },
    { number: 15, col: 3, row: 6, label: 'monitor' },
    { number: 20, col: 10, row: 2, label: 'clapperboard' },
    { number: 25, col: 7, row: 5, label: 'cable_reel' },
  ],
  museum: [
    { number: 1, col: 2, row: 2, label: 'display_case' },
    { number: 5, col: 5, row: 1, label: 'exhibit_stand' },
    { number: 10, col: 8, row: 2, label: 'info_panel' },
    { number: 15, col: 3, row: 5, label: 'bench' },
    { number: 20, col: 10, row: 0, label: 'artifact' },
    { number: 25, col: 6, row: 4, label: 'globe' },
  ],
}

/** Get the PNG URL for a venue furniture item */
export function getVenueFurnitureUrl(venue: VenueName, number: number): string {
  return `/sprites/tilesets/${venue}/${VENUE_PREFIXES[venue]}${number}.png`
}
