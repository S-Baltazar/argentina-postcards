import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const stampsJsonPath = 'client/src/stamps.json';
const stampsDir = 'client/src/assets/stamps';
const stamps = JSON.parse(fs.readFileSync(stampsJsonPath, 'utf8'));

function isBgPixel(data, idx) {
  const p = idx * 4;
  const r = data[p];
  const g = data[p + 1];
  const b = data[p + 2];
  const a = data[p + 3];
  if (a < 25) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r >= 215 && g >= 215 && b >= 215 && (max - min) <= 28;
}

let processed = 0;
for (const s of stamps) {
  const baseName = path.basename(s.file, path.extname(s.file));
  const outFile = `${baseName}.webp`;
  const outPath = path.join(stampsDir, outFile);
  let inPath = path.join(stampsDir, s.file);
  if (!fs.existsSync(inPath) && fs.existsSync(outPath)) {
    inPath = outPath;
    s.file = outFile;
  }
  if (!fs.existsSync(inPath)) {
    console.warn('Missing:', inPath);
    continue;
  }

  const inBuf = fs.readFileSync(inPath);
  const { data, info } = await sharp(inBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const total = width * height;
  const visited = new Uint8Array(total);
  const isTransparent = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const tryPush = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isBgPixel(data, idx)) {
      isTransparent[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * 4 + 3] = 0;
    const x = idx % width;
    const y = (idx - x) / width;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  // Suavizar borde blanco residual (1px alrededor de lo transparente)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (isTransparent[idx]) continue;
      if (
        isTransparent[idx - 1] ||
        isTransparent[idx + 1] ||
        isTransparent[idx - width] ||
        isTransparent[idx + width]
      ) {
        const p = idx * 4;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (r + g + b) / 3;
        if (lum >= 205 && (max - min) <= 28) {
          data[p + 3] = Math.max(0, Math.min(255, Math.round((232 - lum) * 8)));
        }
      }
    }
  }

  let pipeline = sharp(data, { raw: { width, height, channels: 4 } });
  try {
    pipeline = pipeline.trim({ threshold: 10 });
  } catch {
    // Si por alguna razón trim falla, guardar sin trim
  }
  const outBuf = await pipeline.webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  fs.writeFileSync(outPath, outBuf);

  if (outFile !== s.file && fs.existsSync(inPath)) {
    fs.unlinkSync(inPath);
  }
  s.file = outFile;
  processed++;
}

fs.writeFileSync(stampsJsonPath, JSON.stringify(stamps, null, 1));
console.log(`Processed ${processed} stamps to transparent WebP.`);
