import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';

// Table for CRC32 calculation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: width (4), height (4), depth (1 = 8), color (1 = 6/RGBA), comp (0), filter (0), interlace (0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // Scanlines: each row has 1 filter byte (0) + width * 4 bytes RGBA
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(r)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(g)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(b)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  const idatCompressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPngChunk('IDAT', idatCompressed);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw a stylized, elegant Personal Note icon
function drawNoteIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Center coordinates (-1 to 1)
  const cx = nx * 2 - 1;
  const cy = ny * 2 - 1;

  // Base background: rounded squircle
  const cornerRadius = 0.35;
  const absX = Math.abs(cx);
  const absY = Math.abs(cy);
  const maxExtent = 0.85;

  let inSquircle = false;
  if (absX <= maxExtent && absY <= maxExtent) {
    if (absX <= maxExtent - cornerRadius || absY <= maxExtent - cornerRadius) {
      inSquircle = true;
    } else {
      const dx = absX - (maxExtent - cornerRadius);
      const dy = absY - (maxExtent - cornerRadius);
      if (dx * dx + dy * dy <= cornerRadius * cornerRadius) {
        inSquircle = true;
      }
    }
  }

  if (!inSquircle) {
    return [0, 0, 0, 0];
  }

  // Background gradient: dark obsidian #090d16 to #111827
  let bgR = 10 + ny * 12;
  let bgG = 14 + ny * 14;
  let bgB = 24 + ny * 20;

  // Subtle border glow (teal / cyan)
  const isBorder = absX > maxExtent - 0.04 || absY > maxExtent - 0.04;
  if (isBorder) {
    bgR = 20;
    bgG = 184;
    bgB = 166;
  }

  // Notebook / Document page
  // Doc boundary: nx from 0.28 to 0.72, ny from 0.24 to 0.76
  const docLeft = 0.28;
  const docRight = 0.72;
  const docTop = 0.24;
  const docBottom = 0.76;

  if (nx >= docLeft && nx <= docRight && ny >= docTop && ny <= docBottom) {
    // Top-right dog-ear fold corner
    const foldSize = 0.12;
    const isFoldArea = nx > docRight - foldSize && ny < docTop + foldSize;
    const foldDiagonal = nx - (docRight - foldSize) + (docTop + foldSize - ny);

    if (isFoldArea && foldDiagonal > foldSize) {
      // Cutout for dog-ear fold
      return [bgR, bgG, bgB, 255];
    }

    if (isFoldArea && foldDiagonal <= foldSize) {
      // Folded flap surface: darker teal accent
      return [13, 148, 136, 255];
    }

    // Inside notebook page: crisp dark slate
    let pageR = 26;
    let pageG = 34;
    let pageB = 48;

    // Spine border on left
    if (nx < docLeft + 0.05) {
      return [20, 184, 166, 255]; // Primary teal spine
    }

    // Document lines (horizontal rows)
    const lineXStart = docLeft + 0.1;
    const lineXEnd = docRight - 0.08;
    const lineYPositions = [0.38, 0.48, 0.58, 0.68];
    const lineHeight = 0.025;

    for (const lineY of lineYPositions) {
      if (ny >= lineY && ny <= lineY + lineHeight && nx >= lineXStart && nx <= lineXEnd) {
        // Line 1 is header (wider/teal), rest are muted lines
        if (lineY === 0.38) {
          return [56, 189, 248, 240]; // Sky blue header
        } else {
          return [148, 163, 184, 180]; // Muted text line
        }
      }
    }

    return [pageR, pageG, pageB, 255];
  }

  // Small floating glowing pencil/quill accent at bottom-right
  const penX = 0.68;
  const penY = 0.7;
  const penDist = Math.sqrt((nx - penX) * (nx - penX) + (ny - penY) * (ny - penY));
  if (penDist < 0.06) {
    return [20, 184, 166, 255];
  }

  return [bgR, bgG, bgB, 255];
}

// Build standard ICO file containing multiple PNG streams
function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4); // count

  const directoryEntries = [];
  let currentOffset = 6 + count * 16;

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    directoryEntries.push(entry);
    currentOffset += item.buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...pngBuffers.map((b) => b.buffer)]);
}

// Build standard ICNS file containing PNG payloads
function createIcns(entries) {
  // entries: array of { ostype: string (4 chars), buffer: Buffer }
  let totalLength = 8;
  for (const e of entries) {
    totalLength += 8 + e.buffer.length;
  }

  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);

  const chunks = [];
  for (const e of entries) {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(e.ostype, 0, 4, 'ascii');
    chunkHeader.writeUInt32BE(8 + e.buffer.length, 4);
    chunks.push(chunkHeader);
    chunks.push(e.buffer);
  }

  return Buffer.concat([header, ...chunks]);
}

async function main() {
  const outDir = path.resolve('assets/icons');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating high-res PNG icons...');
  const png512 = createPng(512, 512, drawNoteIcon);
  const png256 = createPng(256, 256, drawNoteIcon);
  const png128 = createPng(128, 128, drawNoteIcon);
  const png48 = createPng(48, 48, drawNoteIcon);
  const png32 = createPng(32, 32, drawNoteIcon);
  const png16 = createPng(16, 16, drawNoteIcon);

  // Write icon.png (512x512)
  const pngPath = path.join(outDir, 'icon.png');
  fs.writeFileSync(pngPath, png512);
  console.log(`Created ${pngPath} (${png512.length} bytes)`);

  // Write icon.ico (16, 32, 48, 256)
  const icoData = createIco([
    { width: 256, height: 256, buffer: png256 },
    { width: 48, height: 48, buffer: png48 },
    { width: 32, height: 32, buffer: png32 },
    { width: 16, height: 16, buffer: png16 },
  ]);
  const icoPath = path.join(outDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoData);
  console.log(`Created ${icoPath} (${icoData.length} bytes)`);

  // Write icon.icns (ic07 = 128, ic08 = 256, ic09 = 512)
  const icnsData = createIcns([
    { ostype: 'ic09', buffer: png512 },
    { ostype: 'ic08', buffer: png256 },
    { ostype: 'ic07', buffer: png128 },
  ]);
  const icnsPath = path.join(outDir, 'icon.icns');
  fs.writeFileSync(icnsPath, icnsData);
  console.log(`Created ${icnsPath} (${icnsData.length} bytes)`);

  console.log('All application icon assets successfully created!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
