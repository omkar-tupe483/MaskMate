import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { detectPII } from '../lib/detectors.ts';
import { restorePseudonyms } from '../lib/pseudonymizer.ts';
import { redactPlainText } from '../lib/redactors.ts';
import { parseCsv, sanitizeCsv, serializeCsv } from '../lib/csv.ts';

const ALL_TYPES = new Set<'EMAIL' | 'PHONE' | 'IP_ADDRESS' | 'PAN' | 'AADHAAR' | 'CREDIT_CARD' | 'CUSTOM'>([
  'EMAIL',
  'PHONE',
  'IP_ADDRESS',
  'PAN',
  'AADHAAR',
  'CREDIT_CARD',
  'CUSTOM',
]);

describe('Property-based invariants (fast-check)', () => {
  it('detectors and redactor never throw on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (raw) => {
        const res = redactPlainText(raw, {
          mode: 'FULL',
          includeTypeTagInFullMask: true,
          activeTypes: ALL_TYPES,
        });
        expect(typeof res.sanitizedText).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('FULL and PSEUDONYM modes remove all detected raw PII tokens', () => {
    const emailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z]{3,8}$/),
        fc.stringMatching(/^[a-z]{3,8}$/),
        fc.constantFrom('com', 'org', 'io')
      )
      .map(([u, d, tld]) => `${u}@${d}.${tld}`);

    const ipArb = fc
      .tuple(
        fc.integer({ min: 1, max: 254 }),
        fc.integer({ min: 0, max: 254 }),
        fc.integer({ min: 0, max: 254 }),
        fc.integer({ min: 1, max: 254 })
      )
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

    fc.assert(
      fc.property(emailArb, ipArb, (email, ip) => {
        const text = `User ${email} logged in from ${ip} and repeated ${email}.`;
        const det = detectPII(text);
        expect(det.entities.length).toBeGreaterThanOrEqual(3);

        const full = redactPlainText(text, {
          mode: 'FULL',
          includeTypeTagInFullMask: true,
          activeTypes: ALL_TYPES,
        });
        expect(full.sanitizedText).not.toContain(email);
        expect(full.sanitizedText).not.toContain(ip);

        const pseudo = redactPlainText(text, {
          mode: 'PSEUDONYM',
          includeTypeTagInFullMask: true,
          activeTypes: ALL_TYPES,
        });
        expect(pseudo.sanitizedText).not.toContain(email);
        expect(pseudo.sanitizedText).not.toContain(ip);
        // Repeated email maps deterministically to EMAIL_01 twice
        expect(pseudo.sanitizedText.split('EMAIL_01').length - 1).toBe(2);
        // Inverse restore recovers normalized values
        const restored = restorePseudonyms(pseudo.sanitizedText, pseudo.pseudonymEntries);
        expect(restored).toContain(email.toLowerCase());
        expect(restored).toContain(ip);
      }),
      { numRuns: 60 }
    );
  });

  it('CSV serializer + sanitizer preserve exact row and column dimensions', () => {
    const safeCellArb = fc.stringMatching(/^[a-zA-Z0-9 .@,_]{1,20}$/);
    const matrixArb = fc.array(fc.array(safeCellArb, { minLength: 1, maxLength: 5 }), {
      minLength: 1,
      maxLength: 6,
    });

    fc.assert(
      fc.property(matrixArb, (rows) => {
        const csvText = serializeCsv(rows, '\n', false);
        const out = sanitizeCsv(csvText, {
          mode: 'PSEUDONYM',
          includeTypeTagInFullMask: true,
          activeTypes: ALL_TYPES,
        });
        const reparsed = parseCsv(out.sanitizedCsv);
        expect(reparsed.rows.length).toBe(rows.length);
        for (let r = 0; r < rows.length; r++) {
          expect(reparsed.rows[r].length).toBe(rows[r].length);
        }
      }),
      { numRuns: 50 }
    );
  });
});

