import { detectPII } from '../src/lib/detectors.ts';
import { redactPlainText } from '../src/lib/redactors.ts';
import { SAMPLE_NOISY_TEXT } from '../src/lib/sample.ts';

const ALL_TYPES = new Set([
  'EMAIL',
  'PHONE',
  'IP_ADDRESS',
  'PAN',
  'AADHAAR',
  'CREDIT_CARD',
] as const);

function buildSyntheticPayload(targetBytes: number): string {
  const chunks: string[] = [];
  let bytes = 0;
  while (bytes < targetBytes) {
    chunks.push(SAMPLE_NOISY_TEXT);
    bytes += Buffer.byteLength(SAMPLE_NOISY_TEXT, 'utf8');
  }
  return chunks.join('\n').slice(0, targetBytes);
}

function runBench(label: string, sizeBytes: number) {
  const text = buildSyntheticPayload(sizeBytes);
  const t0 = performance.now();
  const det = detectPII(text);
  const t1 = performance.now();
  const red = redactPlainText(
    text,
    { mode: 'PSEUDONYM', includeTypeTagInFullMask: true, activeTypes: ALL_TYPES },
    det.entities
  );
  const t2 = performance.now();

  const detectMs = +(t1 - t0).toFixed(2);
  const redactMs = +(t2 - t1).toFixed(2);
  const totalMs = +(t2 - t0).toFixed(2);

  console.log(
    `[${label}] input=${(Buffer.byteLength(text, 'utf8') / (1024 * 1024)).toFixed(2)} MB | ` +
      `entities=${det.entities.length} | output=${red.sanitizedText.length} chars | ` +
      `detect=${detectMs}ms | redact=${redactMs}ms | total=${totalMs}ms`
  );
  return totalMs;
}

const t1mb = runBench('1MB', 1 * 1024 * 1024);
const t5mb = runBench('5MB', 5 * 1024 * 1024);

if (t1mb > 1000) {
  console.warn(`Warning: 1 MB took ${t1mb} ms (> 1000 ms target)`);
}
if (t5mb > 4000) {
  console.warn(`Warning: 5 MB took ${t5mb} ms (> 4000 ms target)`);
}

