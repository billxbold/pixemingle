#!/usr/bin/env node
/**
 * Fix museum_layer2.png — remove the red placeholder grid in the right gallery wing.
 * Red pixels (R>180, G<80, B<80) get replaced with transparency.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../public/sprites/venues/museum_layer2.png');
const DST = SRC; // overwrite in place

async function main() {
  const img = sharp(SRC);
  const { width, height } = await img.metadata();
  console.log(`Museum layer2: ${width}x${height}`);

  const { data, info } = await img
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  let fixed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Detect red grid lines: high red, low green, low blue
    if (r > 180 && g < 80 && b < 80) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0; // make transparent
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} red pixels → transparent`);

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(DST);

  console.log(`Saved to ${DST}`);
}

main().catch(console.error);
