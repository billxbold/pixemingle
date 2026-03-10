#!/usr/bin/env node
/**
 * Build a unique Rooftop Lounge scene (layer1 + layer2) — DEPRECATED, references deleted assets.
 * Uses Room Builder (floors/walls) + Condominium furniture.
 * Target: 14×13 tiles (672×642 px) to match other venues.
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const T = 48; // tile size
const COLS = 14, ROWS = 13;
const W = COLS * T; // 672
const H = ROWS * T + 18; // 642 (extra 18px like home)

const ROOM_BUILDER = path.resolve(__dirname, '../limezu/moderninteriors-win/1_Interiors/48x48/Room_Builder_subfiles_48x48');
const CONDO_DIR = path.resolve(__dirname, '../limezu/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_Black_Shadow_Singles_48x48/26_Condominium_Black_Shadow_Singles_48x48');
const LR_DIR = path.resolve(__dirname, '../limezu/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_Black_Shadow_Singles_48x48/2_LivingRoom_Black_Shadow_Singles_48x48');
const OUT_L1 = path.resolve(__dirname, '../public/sprites/venues/lounge_layer1.png');
const OUT_L2 = path.resolve(__dirname, '../public/sprites/venues/lounge_layer2.png');

/** Extract a tile-sized region from a spritesheet */
async function extractTile(sheet, col, row, w = T, h = T) {
  return sharp(sheet)
    .extract({ left: col * T, top: row * T, width: w, height: h })
    .png()
    .toBuffer();
}

/** Load a singles file (already individual PNG) */
async function loadSingle(dir, num) {
  const prefix = dir.includes('Condominium') ? 'Condominium_Black_Shadow_Singles_48x48_' : 'LivingRoom_Black_Shadow_Singles_48x48_';
  const file = path.join(dir, `${prefix}${num}.png`);
  if (!fs.existsSync(file)) { console.warn(`Missing: ${file}`); return null; }
  return sharp(file).toBuffer();
}

async function main() {
  console.log('Building Rooftop Lounge scene...');

  // ─── Layer 1: Floor + Walls ────────────────────────────────────────
  const floorsSheet = path.join(ROOM_BUILDER, 'Room_Builder_Floors_48x48.png');
  const wallsSheet = path.join(ROOM_BUILDER, 'Room_Builder_Walls_48x48.png');
  const walls3dSheet = path.join(ROOM_BUILDER, 'Room_Builder_3d_walls_48x48.png');

  // Pick a dark wood floor tile (row 6, col 3 in Floors sheet — dark parquet)
  const floorTile = await extractTile(floorsSheet, 3, 6);

  // Pick wall tiles from 3d_walls sheet:
  // Top wall: row 0, col 0-2 (left/mid/right of 3D wall top)
  const wallTopL = await extractTile(walls3dSheet, 0, 0);
  const wallTopM = await extractTile(walls3dSheet, 1, 0);
  const wallTopR = await extractTile(walls3dSheet, 2, 0);
  const wallMidL = await extractTile(walls3dSheet, 0, 1);
  const wallMidM = await extractTile(walls3dSheet, 1, 1);
  const wallMidR = await extractTile(walls3dSheet, 2, 1);

  // Build layer1 composite operations
  const l1Composites = [];

  // Fill entire canvas with floor
  for (let r = 0; r < ROWS + 1; r++) {
    for (let c = 0; c < COLS; c++) {
      l1Composites.push({ input: floorTile, left: c * T, top: r * T });
    }
  }

  // Top wall: rows 0-1 (3D wall effect)
  for (let c = 0; c < COLS; c++) {
    const isL = c === 0, isR = c === COLS - 1;
    l1Composites.push({ input: isL ? wallTopL : isR ? wallTopR : wallTopM, left: c * T, top: 0 });
    l1Composites.push({ input: isL ? wallMidL : isR ? wallMidR : wallMidM, left: c * T, top: T });
  }

  // Side walls: simple dark fill for left/right edges rows 2-12
  const sideWallBuf = await sharp({ create: { width: T, height: T, channels: 4, background: { r: 45, g: 42, b: 55, alpha: 255 } } }).png().toBuffer();
  for (let r = 2; r < ROWS; r++) {
    l1Composites.push({ input: sideWallBuf, left: 0, top: r * T });
    l1Composites.push({ input: (COLS - 1) * T < W ? sideWallBuf : sideWallBuf, left: (COLS - 1) * T, top: r * T });
  }

  // Bottom wall
  const bottomWallBuf = await sharp({ create: { width: T, height: T, channels: 4, background: { r: 55, g: 50, b: 65, alpha: 255 } } }).png().toBuffer();
  for (let c = 0; c < COLS; c++) {
    l1Composites.push({ input: bottomWallBuf, left: c * T, top: (ROWS - 1) * T });
  }

  // Create layer1
  const l1Canvas = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 30, g: 28, b: 40, alpha: 255 } }
  })
    .composite(l1Composites)
    .png()
    .toFile(OUT_L1);

  console.log(`Layer 1 saved: ${OUT_L1}`);

  // ─── Layer 2: Furniture / Decorations (Condominium items) ────────
  const l2Composites = [];

  // Helper to load and place a condo item
  async function placeCondo(num, x, y) {
    const buf = await loadSingle(CONDO_DIR, num);
    if (buf) l2Composites.push({ input: buf, left: x, top: y });
  }

  // Helper to load and place a living room item
  async function placeLR(num, x, y) {
    const buf = await loadSingle(LR_DIR, num);
    if (buf) l2Composites.push({ input: buf, left: x, top: y });
  }

  // --- Place furniture for a rooftop lounge vibe ---

  // Bar counter area (top-center): use condo wide items #63, #65, #67 (96x48 bars)
  await placeCondo(63, T * 4, T * 2);       // bar counter left
  await placeCondo(65, T * 6, T * 2);       // bar counter middle
  await placeCondo(67, T * 8, T * 2);       // bar counter right

  // Couches (bottom area): #76-81 are 96x80 couches
  await placeCondo(76, T * 2, T * 8);       // couch left
  await placeCondo(77, T * 2 + 96, T * 8);  // couch continuation
  await placeCondo(78, T * 8, T * 8);       // couch right

  // Coffee tables: #82-84 are 128x128 large items
  await placeCondo(82, T * 4, T * 9);       // center table area

  // Stools/chairs: #23, #24 are 48x48 items
  await placeCondo(23, T * 4, T * 3);       // bar stool 1
  await placeCondo(24, T * 6, T * 3);       // bar stool 2
  await placeCondo(23, T * 8, T * 3);       // bar stool 3

  // Shelves/cabinets: #25-27 are 48x128 (tall items)
  await placeCondo(25, T * 1, T * 2);       // shelf left wall
  await placeCondo(26, T * 12, T * 2);      // shelf right wall

  // Small items: #69, #70 (48x48) - decorations
  await placeCondo(69, T * 3, T * 5);       // small table
  await placeCondo(70, T * 10, T * 5);      // plant/decoration

  // Additional decor items
  await placeCondo(71, T * 6, T * 5);       // item center
  await placeCondo(72, T * 5, T * 7);       // item
  await placeCondo(73, T * 9, T * 7);       // item

  // Lamps/lights: #49 (64x128), #50 (64x96)
  await placeCondo(49, T * 1, T * 6);       // lamp left
  await placeCondo(50, T * 11, T * 6);      // lamp right

  // Create layer2 (transparent background)
  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(l2Composites)
    .png()
    .toFile(OUT_L2);

  console.log(`Layer 2 saved: ${OUT_L2}`);
  console.log('Done! Lounge scene built.');
}

main().catch(console.error);
