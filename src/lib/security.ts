export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set(['txt', 'csv']);
const ALLOWED_MIME_TYPES = new Set([
  '',
  'text/plain',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/comma-separated-values',
]);

export interface FileMetaLike {
  name: string;
  type: string;
  size: number;
}

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates file extension, MIME type, and size (<= 5 MB).
 */
export function validateUploadedFileMeta(file: FileMetaLike): FileValidationResult {
  const parts = file.name.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `Unsupported file type (.${ext || 'unknown'}). Only .txt and .csv files are accepted.`,
    };
  }

  const normalizedMime = (file.type || '').toLowerCase().split(';')[0].trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      ok: false,
      error: `Unsupported file MIME type (${normalizedMime}). Only plain text and CSV files are allowed.`,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'File exceeds the 5 MB limit. Please upload a smaller .txt or .csv file.',
    };
  }

  return { ok: true };
}

/**
 * Decodes raw file bytes as strict UTF-8 and rejects null bytes or binary payloads.
 */
export function decodeAndValidateTextBytes(
  buffer: ArrayBuffer
): { ok: true; text: string } | { ok: false; error: string } {
  const bytes = new Uint8Array(buffer);

  // Check for null bytes or excessive control characters in sample (up to first 64 KB)
  const checkLen = Math.min(bytes.length, 65536);
  let controlCount = 0;
  for (let i = 0; i < checkLen; i++) {
    const b = bytes[i];
    if (b === 0) {
      return {
        ok: false,
        error: 'Binary or null-byte file rejected. Please upload a valid UTF-8 .txt or .csv text file.',
      };
    }
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) {
      controlCount += 1;
    }
  }

  if (checkLen > 0 && controlCount / checkLen > 0.05) {
    return {
      ok: false,
      error: 'File appears to contain binary content and was rejected.',
    };
  }

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const text = decoder.decode(bytes);
    if (text.includes('\u0000')) {
      return {
        ok: false,
        error: 'Binary or null-byte content is not allowed.',
      };
    }
    return { ok: true, text };
  } catch {
    return {
      ok: false,
      error: 'File could not be decoded as valid UTF-8 text.',
    };
  }
}

/**
 * Protects downloaded CSV cells against spreadsheet formula injection
 * by prefixing leading =, +, -, or @ with a single quote.
 */
export function escapeCsvFormula(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Validates custom regex pattern syntax without executing it on text.
 */
export function validateCustomRegexSyntax(
  pattern: string,
  flags: string
): { valid: boolean; error?: string } {
  if (!pattern.trim()) {
    return { valid: false, error: 'Pattern cannot be empty.' };
  }
  const cleanFlags = flags.replace(/[^gimsuy]/g, '');
  try {
    // Compile inside try/catch strictly for syntax checking
    new RegExp(pattern, cleanFlags.includes('g') ? cleanFlags : `${cleanFlags}g`);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid regular expression syntax.',
    };
  }
}

