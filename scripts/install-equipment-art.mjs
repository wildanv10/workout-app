/* Copies the downloaded isometric SVGs into public/equipment/ under their real
   file names. The blobs arrive named by asset id; EQUIPMENT_ART maps id -> name.

   Usage: node scripts/install-equipment-art.mjs <dir-holding-<id>.svg-files> */

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EQUIPMENT_ART } from './source/equipment-art.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'public', 'equipment');

const source = process.argv[2];
if (!source || !existsSync(source)) {
  console.error('Pass the directory holding the downloaded <assetId>.svg files.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

let copied = 0;
let bytes = 0;
const missing = [];

for (const item of EQUIPMENT_ART) {
  const from = join(source, `${item.blobId}.svg`);
  if (!existsSync(from)) {
    missing.push(`${item.file} (${item.blobId})`);
    continue;
  }
  copyFileSync(from, join(OUT, item.file));
  bytes += statSync(from).size;
  copied += 1;
}

console.log(`copied ${copied}/${EQUIPMENT_ART.length} illustrations, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
if (missing.length) {
  console.error(`\nnot downloaded yet (${missing.length}):`);
  for (const m of missing) console.error('  - ' + m);
  process.exit(1);
}
