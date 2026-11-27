import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) total += getDirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

const distDir = path.resolve('dist');
const srcDir = path.resolve('src');
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Identify initial entry JS referenced directly via <script type="module" src="...">
const entryScripts = [...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) =>
  m[1].replace(/^\//, '')
);

let initialGzipTotal = 0;
for (const rel of entryScripts) {
  const filePath = path.join(distDir, rel);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath);
    const gz = zlib.gzipSync(raw);
    initialGzipTotal += gz.length;
    console.log(`Initial JS ${rel}: ${(raw.length / 1024).toFixed(2)} KB (${(gz.length / 1024).toFixed(2)} KB gzip)`);
  }
}

const distBytes = getDirSize(distDir);
const srcBytes = getDirSize(srcDir);
const combinedBytes = distBytes + srcBytes;

console.log(`Total dist size: ${(distBytes / 1024).toFixed(2)} KB (${(distBytes / (1024 * 1024)).toFixed(4)} MB)`);
console.log(`Total src + dist size: ${(combinedBytes / 1024).toFixed(2)} KB (${(combinedBytes / (1024 * 1024)).toFixed(4)} MB)`);

const MAX_INITIAL_GZIP_BYTES = 150 * 1024;
const MAX_DIST_BYTES = 2 * 1024 * 1024;
const MAX_COMBINED_BYTES = 10 * 1024 * 1024;

let failed = false;
if (initialGzipTotal > MAX_INITIAL_GZIP_BYTES) {
  console.error(`FAIL: Initial JS gzip (${(initialGzipTotal / 1024).toFixed(2)} KB) exceeds 150 KB budget.`);
  failed = true;
}
if (distBytes > MAX_DIST_BYTES) {
  console.error(`FAIL: dist size exceeds 2 MB budget.`);
  failed = true;
}
if (combinedBytes > MAX_COMBINED_BYTES) {
  console.error(`FAIL: src + dist exceeds 10 MB budget.`);
  failed = true;
}

if (failed) process.exit(1);
console.log('Bundle size budget check PASSED.');

