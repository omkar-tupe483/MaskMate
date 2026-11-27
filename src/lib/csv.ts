import { detectPII, type DetectedEntity } from './detectors.ts';
import { createPseudonymizer, type PseudonymEntry } from './pseudonymizer.ts';
import { redactWithEntities, type RedactedReplacement, type RedactionOptions } from './redactors.ts';
import { escapeCsvFormula } from './security.ts';

export interface CsvParseResult {
  rows: string[][];
  lineEnding: '\r\n' | '\n';
}

export interface CsvSanitizeResult {
  sanitizedCsv: string;
  safeExportCsv: string;
  originalRebuilt: string;
  entities: DetectedEntity[];
  replacements: RedactedReplacement[];
  pseudonymEntries: PseudonymEntry[];
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  processingTimeMs: number;
  rowCount: number;
  columnCount: number;
}

/**
 * Parses RFC 4180 CSV text while preserving quoted fields, commas inside quotes,
 * embedded newlines inside quotes, empty fields, and escaped double quotes ("").
 */
export function parseCsv(input: string): CsvParseResult {
  const lineEnding: '\r\n' | '\n' = input.includes('\r\n') ? '\r\n' : '\n';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0 || input.endsWith(',')) {
    row.push(field);
    rows.push(row);
  }

  return { rows, lineEnding };
}

/**
 * Formats a single CSV cell safely, quoting whenever it contains delimiters,
 * double quotes, or newlines. Optionally applies formula-injection prefixing.
 */
export function formatCsvCell(value: string, protectFormulas = false): string {
  const safeVal = protectFormulas ? escapeCsvFormula(value) : value;
  if (/[",\r\n]/.test(safeVal)) {
    return `"${safeVal.replace(/"/g, '""')}"`;
  }
  return safeVal;
}

/**
 * Serializes rows back into valid CSV text.
 */
export function serializeCsv(
  rows: string[][],
  lineEnding: '\r\n' | '\n' = '\n',
  protectFormulas = false
): string {
  return rows
    .map((row) => row.map((cell) => formatCsvCell(cell, protectFormulas)).join(','))
    .join(lineEnding);
}

/**
 * Sanitizes CSV cell-by-cell so PII replacement never corrupts CSV delimiters or quotes.
 * Also builds `safeExportCsv` with formula-injection protection for downloaded CSVs.
 */
export function sanitizeCsv(
  input: string,
  options: RedactionOptions,
  extraEntitiesByCell?: Map<string, DetectedEntity[]>
): CsvSanitizeResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { rows, lineEnding } = parseCsv(input);

  const pseudonymizer = createPseudonymizer();
  const allEntities: DetectedEntity[] = [];
  const allReplacements: RedactedReplacement[] = [];
  let rejectedLuhnCount = 0;
  let rejectedVerhoeffCount = 0;

  const originalOutChunks: string[] = [];
  const sanitizedOutChunks: string[] = [];
  const safeExportOutChunks: string[] = [];
  let origOffset = 0;
  let sanitOffset = 0;
  let maxCols = 0;

  rows.forEach((row, rIdx) => {
    if (row.length > maxCols) maxCols = row.length;
    if (rIdx > 0) {
      originalOutChunks.push(lineEnding);
      sanitizedOutChunks.push(lineEnding);
      safeExportOutChunks.push(lineEnding);
      origOffset += lineEnding.length;
      sanitOffset += lineEnding.length;
    }

    row.forEach((cell, cIdx) => {
      if (cIdx > 0) {
        originalOutChunks.push(',');
        sanitizedOutChunks.push(',');
        safeExportOutChunks.push(',');
        origOffset += 1;
        sanitOffset += 1;
      }

      const cellNeedsQuoteOrig = /[",\r\n]/.test(cell);
      const extra = extraEntitiesByCell?.get(`${rIdx}:${cIdx}`) ?? [];
      const cellDet = detectPII(cell, extra);
      rejectedLuhnCount += cellDet.rejectedLuhnCount;
      rejectedVerhoeffCount += cellDet.rejectedVerhoeffCount;

      const cellRed = redactWithEntities(cell, cellDet.entities, options, pseudonymizer);
      const sanitizedCell = cellRed.sanitizedText;
      const cellNeedsQuoteSanit = /[",\r\n]/.test(sanitizedCell);

      const formattedOrig = cellNeedsQuoteOrig ? formatCsvCell(cell, false) : cell;
      const formattedSanit = cellNeedsQuoteSanit ? formatCsvCell(sanitizedCell, false) : sanitizedCell;
      const formattedSafeExport = formatCsvCell(sanitizedCell, true);

      const countQuotesBefore = (str: string, limit: number) => {
        let count = 0;
        for (let k = 0; k < limit; k++) if (str[k] === '"') count += 1;
        return count;
      };
      const origPrefixOffset = cellNeedsQuoteOrig ? 1 : 0;
      const sanitPrefixOffset = cellNeedsQuoteSanit ? 1 : 0;

      const mappedEntitiesById = new Map<string, DetectedEntity>();
      for (const entity of cellDet.entities) {
        const globalId = `r${rIdx}c${cIdx}-${entity.id}`;
        const qShift = cellNeedsQuoteOrig ? countQuotesBefore(cell, entity.start) : 0;
        const mapped: DetectedEntity = {
          ...entity,
          id: globalId,
          start: origOffset + origPrefixOffset + qShift + entity.start,
          end: origOffset + origPrefixOffset + qShift + entity.end,
        };
        allEntities.push(mapped);
        mappedEntitiesById.set(entity.id, mapped);
      }

      for (const rep of cellRed.replacements) {
        const mappedEntity = mappedEntitiesById.get(rep.originalEntity.id) ?? rep.originalEntity;
        const qShift = cellNeedsQuoteSanit ? countQuotesBefore(sanitizedCell, rep.start) : 0;
        allReplacements.push({
          id: mappedEntity.id,
          originalEntity: mappedEntity,
          replacement: rep.replacement,
          start: sanitOffset + sanitPrefixOffset + qShift + rep.start,
          end: sanitOffset + sanitPrefixOffset + qShift + rep.end,
        });
      }

      originalOutChunks.push(formattedOrig);
      sanitizedOutChunks.push(formattedSanit);
      safeExportOutChunks.push(formattedSafeExport);
      origOffset += formattedOrig.length;
      sanitOffset += formattedSanit.length;
    });
  });

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    sanitizedCsv: sanitizedOutChunks.join(''),
    safeExportCsv: safeExportOutChunks.join(''),
    originalRebuilt: originalOutChunks.join(''),
    entities: allEntities,
    replacements: allReplacements,
    pseudonymEntries: pseudonymizer.getEntries(),
    rejectedLuhnCount,
    rejectedVerhoeffCount,
    processingTimeMs: Math.round((t1 - t0) * 100) / 100,
    rowCount: rows.length,
    columnCount: maxCols,
  };
}
