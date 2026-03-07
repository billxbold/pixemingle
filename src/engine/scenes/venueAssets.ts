import type { VenueName } from '@/types/database'

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
    { number: 35, col: 1, row: 3, label: 'sofa' },           // couch with pillow
    { number: 20, col: 5, row: 4, label: 'armchair' },        // comfy armchair
    { number: 25, col: 7, row: 4, label: 'armchair_2' },      // second armchair
    { number: 80, col: 3, row: 1, label: 'lamp' },            // blue table lamp
    { number: 75, col: 8, row: 2, label: 'mushroom_lamp' },   // mushroom floor lamp
    { number: 30, col: 1, row: 0, label: 'cabinet' },         // dresser with frames
    { number: 15, col: 4, row: 1, label: 'plant' },           // potted plant
    { number: 45, col: 6, row: 0, label: 'fireplace' },       // decorative frame
    { number: 55, col: 3, row: 5, label: 'coffee_table' },    // low table
    { number: 90, col: 8, row: 0, label: 'shelf' },           // tall shelf
  ],
  gallery: [
    { number: 35, col: 2, row: 0, label: 'easel_tall' },      // tall easel
    { number: 40, col: 5, row: 0, label: 'easel_triangle' },  // triangle easel
    { number: 25, col: 8, row: 3, label: 'work_table' },      // table with supplies
    { number: 10, col: 10, row: 4, label: 'paint_cans' },     // paint supplies
    { number: 1, col: 3, row: 5, label: 'vase' },             // clay vase
    { number: 5, col: 7, row: 5, label: 'sculpture' },        // sculpture jar
    { number: 30, col: 1, row: 4, label: 'stool' },           // wooden stool
    { number: 15, col: 10, row: 1, label: 'paint_bucket' },   // blue paint bucket
    { number: 20, col: 6, row: 2, label: 'paint_cups' },      // paint cups
  ],
  japanese: [
    { number: 30, col: 3, row: 3, label: 'low_bench' },       // wooden bench/sofa
    { number: 50, col: 5, row: 4, label: 'low_table' },       // low table/shelf
    { number: 80, col: 2, row: 4, label: 'blue_bench' },      // blue cushion bench
    { number: 20, col: 1, row: 0, label: 'tv_stand' },        // decorative stand
    { number: 70, col: 7, row: 0, label: 'wall_frames' },     // wall art frames
    { number: 90, col: 4, row: 1, label: 'cushion' },         // blue sitting mat
    { number: 100, col: 8, row: 2, label: 'chest' },          // purple chest
    { number: 120, col: 1, row: 5, label: 'lamp_stand' },     // floor lamp
    { number: 130, col: 7, row: 5, label: 'lantern' },        // tall lantern cabinet
  ],
  icecream: [
    { number: 1, col: 1, row: 0, label: 'display_shelf' },    // display shelves
    { number: 30, col: 3, row: 0, label: 'display_case' },    // colorful display case
    { number: 40, col: 5, row: 0, label: 'striped_display' }, // striped display
    { number: 50, col: 7, row: 0, label: 'tall_display' },    // tall display
    { number: 10, col: 4, row: 4, label: 'scoop' },           // ice cream scoop
    { number: 80, col: 3, row: 5, label: 'cone' },            // ice cream cone
    { number: 90, col: 5, row: 5, label: 'drink' },           // drink cup
    { number: 20, col: 8, row: 2, label: 'menu_board' },      // menu board
    { number: 60, col: 1, row: 3, label: 'fridge' },          // refrigerator
    { number: 70, col: 7, row: 3, label: 'display_case_2' },  // another display
  ],
  studio: [
    { number: 1, col: 2, row: 3, label: 'camera_robot' },     // camera/tripod small
    { number: 10, col: 5, row: 1, label: 'camera_tall' },     // tall camera tripod
    { number: 20, col: 8, row: 0, label: 'green_screen' },    // green screen
    { number: 30, col: 10, row: 3, label: 'monitor' },        // monitor/TV
    { number: 50, col: 3, row: 0, label: 'tv_screen' },       // TV screen
    { number: 60, col: 12, row: 1, label: 'teleprompter' },   // teleprompter
    { number: 70, col: 7, row: 6, label: 'shelf_strip' },     // equipment shelf
    { number: 40, col: 1, row: 6, label: 'cable' },           // cable/strip
  ],
  museum: [
    { number: 350, col: 4, row: 1, label: 'dinosaur' },       // dinosaur skeleton!
    { number: 100, col: 1, row: 0, label: 'painting' },       // framed painting
    { number: 300, col: 8, row: 0, label: 'dark_painting' },  // dark display
    { number: 50, col: 10, row: 3, label: 'face_statue' },    // cute face statue
    { number: 10, col: 2, row: 5, label: 'rope_pole' },       // rope barrier pole
    { number: 80, col: 6, row: 6, label: 'rope_barrier' },    // rope barrier long
    { number: 30, col: 9, row: 5, label: 'display_sign' },    // display with sign
    { number: 60, col: 3, row: 3, label: 'art_display' },     // display case with art
    { number: 250, col: 7, row: 2, label: 'globe' },          // globe
    { number: 150, col: 11, row: 1, label: 'column' },        // display column
  ],
}

/** Get the PNG URL for a venue furniture item */
export function getVenueFurnitureUrl(venue: VenueName, number: number): string {
  return `/sprites/tilesets/${venue}/${VENUE_PREFIXES[venue]}${number}.png`
}
