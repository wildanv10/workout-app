/* Generates the app icons from one vector definition - no image tooling and no
   dependencies, so they can be regenerated on any machine.

   Run: pnpm run make-icons

   The glyph is a dumbbell on the brand blue. Its furthest point sits 0.363 from
   the centre in normalised units, inside the 0.4 radius that Android's maskable
   icons keep clear, so the 512 can be declared "maskable" safely. */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BRAND = [12, 102, 228]; // #0C66E4, the app's --brand
const GLYPH = [255, 255, 255];

/** Rounded rectangles in normalised units: [centreX, centreY, halfW, halfH, radius]. */
const BAR = [0.5, 0.5, 0.17, 0.035, 0.018];
const PLATES = [
  [0.22, 0.045, 0.145, 0.028], // inner, offset from centre
  [0.315, 0.035, 0.095, 0.022], // outer
];
const CORNER = 0.22; // background corner radius

/** Signed distance to a rounded rectangle; negative inside. */
function sdRoundRect(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(x - cx) - (halfW - r);
  const dy = Math.abs(y - cy) - (halfH - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}

const inBackground = (x, y) => sdRoundRect(x, y, 0.5, 0.5, 0.5, 0.5, CORNER) < 0;

function inGlyph(x, y) {
  if (sdRoundRect(x, y, ...BAR) < 0) return true;
  for (const [offset, halfW, halfH, r] of PLATES) {
    if (sdRoundRect(x, y, 0.5 - offset, 0.5, halfW, halfH, r) < 0) return true;
    if (sdRoundRect(x, y, 0.5 + offset, 0.5, halfW, halfH, r) < 0) return true;
  }
  return false;
}

// ------------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10-12: compression, filter, interlace - all zero

  // One filter byte (0 = none) per scanline, then the row's RGBA bytes.
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Renders the icon with 3x3 supersampling for smooth edges. */
function render(size, { bleed = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0;
      let glyph = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (bleed || inBackground(u, v)) bg++;
          if (inGlyph(u, v)) glyph++;
        }
      }
      const samples = SS * SS;
      const bgA = bg / samples;
      const glyphA = glyph / samples;
      // Glyph over background, background over transparency.
      const alpha = Math.max(bgA, glyphA);
      const mix = alpha > 0 ? glyphA / alpha : 0;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        pixels[i + c] = Math.round(BRAND[c] * (1 - mix) + GLYPH[c] * mix);
      }
      pixels[i + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

const svg = () => {
  const rect = (cx, cy, halfW, halfH, r) =>
    `<rect x="${((cx - halfW) * 512).toFixed(1)}" y="${((cy - halfH) * 512).toFixed(1)}" ` +
    `width="${(halfW * 2 * 512).toFixed(1)}" height="${(halfH * 2 * 512).toFixed(1)}" ` +
    `rx="${(r * 512).toFixed(1)}" fill="#fff"/>`;
  const parts = [rect(...BAR)];
  for (const [offset, halfW, halfH, r] of PLATES) {
    parts.push(rect(0.5 - offset, 0.5, halfW, halfH, r));
    parts.push(rect(0.5 + offset, 0.5, halfW, halfH, r));
  }
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Workout">',
    `  <rect width="512" height="512" rx="${(CORNER * 512).toFixed(1)}" fill="#0C66E4"/>`,
    ...parts.map((p) => '  ' + p),
    '</svg>',
    '',
  ].join('\n');
};

// ---------------------------------------------------------------- output

const targets = [
  // Full bleed, so Android can mask the 512 to any shape.
  ['public/icon-512.png', 512, { bleed: true }],
  ['public/icon-192.png', 192, { bleed: true }],
  // iOS applies its own mask and dislikes transparency, so this is full bleed too.
  ['app/apple-icon.png', 180, { bleed: true }],
];

for (const [path, size, options] of targets) {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  const png = encodePng(size, render(size, options));
  writeFileSync(file, png);
  console.log(`${path.padEnd(24)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

writeFileSync(join(ROOT, 'app/icon.svg'), svg());
console.log('app/icon.svg'.padEnd(24), 'vector');
