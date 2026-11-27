import { describe, expect, it, vi } from 'vitest';
import { validateLuhn, detectCardBrand } from '../lib/luhn.ts';
import { validateVerhoeff } from '../lib/verhoeff.ts';
import {
  detectAadhaars,
  detectCreditCards,
  detectEmails,
  detectIPAddresses,
  detectPANs,
  detectPhones,
  detectPII,
  validateIPv4,
  validateIPv6,
} from '../lib/detectors.ts';
import { createPseudonymizer, normalizeEntityValue, restorePseudonyms } from '../lib/pseudonymizer.ts';
import { getPartialMask, redactPlainText } from '../lib/redactors.ts';
import { formatCsvCell, parseCsv, sanitizeCsv } from '../lib/csv.ts';
import {
  decodeAndValidateTextBytes,
  escapeCsvFormula,
  MAX_UPLOAD_BYTES,
  validateCustomRegexSyntax,
  validateUploadedFileMeta,
} from '../lib/security.ts';
import {
  createCustomPatternRunner,
  CUSTOM_REGEX_TIMEOUT_MESSAGE,
  type WorkerFactoryLike,
} from '../lib/customPatternRunner.ts';
import { runSanitizerJobSync } from '../workers/sanitizerWorker.ts';

function buildVerhoeffValid(elevenDigits: string): string {
  for (let d = 0; d <= 9; d++) {
    const candidate = `${elevenDigits}${d}`;
    if (validateVerhoeff(candidate)) return candidate;
  }
  throw new Error('Could not build Verhoeff Aadhaar');
}

describe('MaskMate checksums & validators', () => {
  it('validates Luhn credit cards and brands while rejecting decoys', () => {
    expect(validateLuhn('4')).toBe(false);
    expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
    expect(validateLuhn('4111 1111 1111 1112')).toBe(false);
    expect(detectCardBrand('4111111111111111')).toBe('Visa');
    expect(detectCardBrand('5105105105105100')).toBe('Mastercard');
    expect(detectCardBrand('378282246310005')).toBe('Amex');
    expect(detectCardBrand('6011111111111117')).toBe('Discover');
    expect(detectCardBrand('6074841234567893')).toBe('RuPay');
    expect(detectCardBrand('999999999999')).toBe('Unknown');
  });

  it('validates Verhoeff check digit for 12-digit Aadhaar', () => {
    const valid = buildVerhoeffValid('98765432101');
    const lastDigit = Number(valid[11]);
    const invalid = `${valid.slice(0, 11)}${(lastDigit + 1) % 10}`;
    expect(validateVerhoeff(valid)).toBe(true);
    expect(validateVerhoeff(invalid)).toBe(false);
    expect(validateVerhoeff('000011112222')).toBe(false); // leading 0/1 invalid
  });

  it('validates IPv4 and IPv6 strictly', () => {
    expect(validateIPv4('192.168.1.45')).toBe(true);
    expect(validateIPv4('256.10.1.1')).toBe(false);
    expect(validateIPv4('01.10.1.1')).toBe(false);

    expect(validateIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(validateIPv6('2001:db8::1')).toBe(true);
    expect(validateIPv6('::1')).toBe(true);
    expect(validateIPv6('2001::85a3::1')).toBe(false);
    expect(validateIPv6('2001:::1')).toBe(false);
  });
});

describe('PII detectors and overlap priority', () => {
  it('detects emails, PANs, IPs, phones, valid Aadhaar, and valid cards', () => {
    const validAadhaar = buildVerhoeffValid('82345678901');
    const formattedAadhaar = `${validAadhaar.slice(0, 4)} ${validAadhaar.slice(4, 8)} ${validAadhaar.slice(8)}`;
    const sample = [
      'Email: alice.dev@example.com',
      'PAN: ABCDE1234F (ignore abcde1234f)',
      `Aadhaar: ${formattedAadhaar} and fake 8234 5678 901${(Number(validAadhaar[11]) + 1) % 10}`,
      'Card: 4111-1111-1111-1111 and decoy 4111-1111-1111-1112',
      'Phone: +91-9876543210 and +1 (415) 555-0199',
      'IPs: 10.20.30.40, 256.0.0.1, 2001:db8::1',
    ].join('\n');

    expect(detectEmails(sample).map((e) => e.value)).toEqual(['alice.dev@example.com']);
    expect(detectPANs(sample).map((e) => e.value)).toEqual(['ABCDE1234F']);
    expect(detectAadhaars(sample).map((e) => e.normalized)).toEqual([validAadhaar]);
    expect(detectCreditCards(sample).map((e) => e.brand)).toEqual(['Visa']);
    expect(detectIPAddresses(sample).map((e) => e.value)).toEqual(['10.20.30.40', '2001:db8::1']);
    expect(detectPhones(sample).length).toBeGreaterThanOrEqual(2);

    const pii = detectPII(sample);
    expect(pii.rejectedLuhnCount).toBe(1);
    expect(pii.rejectedVerhoeffCount).toBe(1);
    expect(pii.entities.some((e) => e.type === 'CREDIT_CARD')).toBe(true);
    expect(pii.entities.some((e) => e.type === 'AADHAAR')).toBe(true);
    // Card digits and Aadhaar digits must not also be emitted as PHONE overlaps
    expect(
      pii.entities.filter((e) => e.type === 'PHONE' && (e.value.includes('4111') || e.value.includes(validAadhaar.slice(0, 4))))
    ).toEqual([]);
  });

  it('processes pathological phone-like strings in linear time without ReDoS', () => {
    const adversarial = `+1 ${'1234-'.repeat(2000)}X`;
    const t0 = performance.now();
    const res = detectPhones(adversarial);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(100);
    expect(Array.isArray(res)).toBe(true);
  });
});

describe('Redaction modes, pseudonymizer & restoration', () => {
  const allTypes = new Set<'EMAIL' | 'PHONE' | 'IP_ADDRESS' | 'PAN' | 'AADHAAR' | 'CREDIT_CARD' | 'CUSTOM'>([
    'EMAIL',
    'PHONE',
    'IP_ADDRESS',
    'PAN',
    'AADHAAR',
    'CREDIT_CARD',
    'CUSTOM',
  ]);

  it('supports FULL (with & without tags), PARTIAL, PSEUDONYM, and ignoredIds', () => {
    const text = 'Mail Ravi@Example.com or ravi@example.com, Card 4111 1111 1111 1111';
    const fullTagged = redactPlainText(text, {
      mode: 'FULL',
      includeTypeTagInFullMask: true,
      activeTypes: allTypes,
    });
    expect(fullTagged.sanitizedText).toContain('[REDACTED:EMAIL]');
    expect(fullTagged.sanitizedText).toContain('[REDACTED:CREDIT_CARD]');

    const fullUntagged = redactPlainText(text, {
      mode: 'FULL',
      includeTypeTagInFullMask: false,
      activeTypes: allTypes,
    });
    expect(fullUntagged.sanitizedText).not.toContain('[REDACTED:EMAIL]');
    expect(fullUntagged.sanitizedText).toContain('[REDACTED]');

    const partial = redactPlainText(text, {
      mode: 'PARTIAL',
      includeTypeTagInFullMask: true,
      activeTypes: allTypes,
    });
    expect(partial.sanitizedText).toContain('R***@Example.com');
    expect(partial.sanitizedText).toContain('XXXX-XXXX-XXXX-1111');

    const pseudo = redactPlainText(text, {
      mode: 'PSEUDONYM',
      includeTypeTagInFullMask: true,
      activeTypes: allTypes,
    });
    expect(pseudo.sanitizedText).toBe('Mail EMAIL_01 or EMAIL_01, Card CARD_01');
    expect(restorePseudonyms(pseudo.sanitizedText, pseudo.pseudonymEntries)).toBe(
      'Mail ravi@example.com or ravi@example.com, Card 4111111111111111'
    );

    const firstId = detectPII(text).entities[0].id;
    const skipped = redactPlainText(text, {
      mode: 'FULL',
      includeTypeTagInFullMask: true,
      activeTypes: allTypes,
      ignoredIds: new Set([firstId]),
    });
    expect(skipped.sanitizedText).toContain('Ravi@Example.com');
  });

  it('normalizes phone numbers consistently in Pseudonymizer', () => {
    const pseudo = createPseudonymizer();
    expect(normalizeEntityValue('PHONE', '+91 98765-43210')).toBe('+919876543210');
    expect(pseudo.getPlaceholder('PHONE', '+91 98765-43210')).toBe('PHONE_01');
    expect(pseudo.getPlaceholder('PHONE', '+91-9876543210')).toBe('PHONE_01');
    expect(normalizeEntityValue('CUSTOM', '  TOK-99  ')).toBe('TOK-99');
  });

  it('produces distinct partial masks across every entity type', () => {
    const base = { start: 0, end: 10, confidence: 0.99 };
    expect(getPartialMask({ ...base, id: '1', type: 'AADHAAR', value: '9876 5432 1012', normalized: '987654321012' })).toBe('XXXX-XXXX-1012');
    expect(getPartialMask({ ...base, id: '2', type: 'PAN', value: 'ABCDE1234F', normalized: 'ABCDE1234F' })).toBe('ABCDE****F');
    expect(getPartialMask({ ...base, id: '3', type: 'PHONE', value: '+91-9876543210', normalized: '+919876543210' })).toBe('+91-XXXXXX3210');
    expect(getPartialMask({ ...base, id: '4', type: 'PHONE', value: '9876543210', normalized: '9876543210' })).toBe('XXXXXX3210');
    expect(getPartialMask({ ...base, id: '5', type: 'IP_ADDRESS', value: '192.168.10.22', normalized: '192.168.10.22' })).toBe('192.168.*.*');
    expect(getPartialMask({ ...base, id: '6', type: 'IP_ADDRESS', value: '2001:db8::1', normalized: '2001:db8::1' })).toBe('2001:db8:****:****');
    expect(getPartialMask({ ...base, id: '7', type: 'CUSTOM', value: 'EMP-4821', normalized: 'EMP-4821' })).toBe('E******1');
    expect(getPartialMask({ ...base, id: '8', type: 'CUSTOM', value: 'AB', normalized: 'AB' })).toBe('**');
  });
});

describe('CSV preservation & formula injection protection', () => {
  it('preserves quoted commas, escaped quotes, newlines, empty cells, and escapes formulas on export', () => {
    const csvInput = [
      'name,note,formula,email,empty',
      '"Doe, ""Jane"" user@example.com",=SUM(A1),"Line1\nLine2",jane@example.com,',
      '+1234-5678,-alert,@cmd,jane@example.com,""',
    ].join('\r\n');

    const parsed = parseCsv(csvInput);
    expect(parsed.lineEnding).toBe('\r\n');
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[1][0]).toBe('Doe, "Jane" user@example.com');
    expect(parsed.rows[1][2]).toBe('Line1\nLine2');
    expect(parsed.rows[1][4]).toBe('');

    const out = sanitizeCsv(csvInput, {
      mode: 'PSEUDONYM',
      includeTypeTagInFullMask: true,
      activeTypes: new Set(['EMAIL', 'PHONE', 'IP_ADDRESS', 'PAN', 'AADHAAR', 'CREDIT_CARD', 'CUSTOM']),
    });
    expect(out.rowCount).toBe(3);
    expect(out.columnCount).toBe(5);
    expect(out.sanitizedCsv).toContain('EMAIL_01');
    expect(out.sanitizedCsv).not.toContain('jane@example.com');
    expect(out.sanitizedCsv).not.toContain('user@example.com');
    expect(out.safeExportCsv).toContain("'=SUM(A1)");
    expect(out.safeExportCsv).toContain("'-alert");
    expect(out.safeExportCsv).toContain("'@cmd");
    expect(escapeCsvFormula('safe value')).toBe('safe value');
    expect(formatCsvCell('=1+1', true)).toBe("'=1+1");
  });
});

describe('Upload security, regex syntax & custom-pattern worker timeout', () => {
  it('validates file metadata, UTF-8 text, binary bytes, and regex syntax', () => {
    expect(validateUploadedFileMeta({ name: 'report.txt', type: 'text/plain', size: 100 }).ok).toBe(true);
    expect(validateUploadedFileMeta({ name: 'data.csv', type: 'text/csv', size: MAX_UPLOAD_BYTES }).ok).toBe(true);
    expect(validateUploadedFileMeta({ name: 'malware.exe', type: 'application/octet-stream', size: 100 }).ok).toBe(false);
    expect(validateUploadedFileMeta({ name: 'fake.txt', type: 'application/pdf', size: 100 }).ok).toBe(false);
    expect(validateUploadedFileMeta({ name: 'huge.txt', type: 'text/plain', size: MAX_UPLOAD_BYTES + 1 }).ok).toBe(false);

    const cleanBytes = new TextEncoder().encode('hello alice@example.com').buffer;
    expect(decodeAndValidateTextBytes(cleanBytes)).toEqual({
      ok: true,
      text: 'hello alice@example.com',
    });

    const nullBytes = new Uint8Array([65, 0, 66]).buffer;
    expect(decodeAndValidateTextBytes(nullBytes).ok).toBe(false);

    const controlHeavyBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(decodeAndValidateTextBytes(controlHeavyBytes).ok).toBe(false);

    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0xfd]).buffer;
    expect(decodeAndValidateTextBytes(invalidUtf8).ok).toBe(false);

    expect(validateCustomRegexSyntax('EMP-\\d{4}', 'g').valid).toBe(true);
    expect(validateCustomRegexSyntax('', 'g').valid).toBe(false);
    expect(validateCustomRegexSyntax('[unclosed', 'g').valid).toBe(false);
  });

  it('terminates timed-out custom regex worker at timeout and emits friendly error', async () => {
    vi.useFakeTimers();
    const terminateSpy = vi.fn();
    let createdCount = 0;

    const mockFactory: WorkerFactoryLike = () => {
      createdCount += 1;
      return {
        postMessage: () => {
          // Intentionally hang (never postMessage back)
        },
        terminate: terminateSpy,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    };

    const runner = createCustomPatternRunner(mockFactory, 500);
    const pending = runner.run('EMP-1234', [
      { id: 'c1', label: 'Emp', pattern: 'EMP-\\d+', flags: 'g', enabled: true },
    ]);

    await vi.advanceTimersByTimeAsync(500);
    const res = await pending;
    expect(res.timedOut).toBe(true);
    expect(res.error).toBe(CUSTOM_REGEX_TIMEOUT_MESSAGE);
    expect(terminateSpy).toHaveBeenCalledTimes(1);
    expect(createdCount).toBe(1);

    // Subsequent run respawns a fresh worker cleanly
    const pending2 = runner.run('EMP-5678', [
      { id: 'c1', label: 'Emp', pattern: 'EMP-\\d+', flags: 'g', enabled: true },
    ]);
    await vi.advanceTimersByTimeAsync(500);
    await pending2;
    expect(createdCount).toBe(2);
    runner.dispose();
    vi.useRealTimers();
  });

  it('executes sanitizerWorker sync helper cleanly', () => {
    const result = runSanitizerJobSync({
      jobId: 7,
      text: 'Contact dev@maskmate.local',
      isCsv: false,
      mode: 'FULL',
      includeTypeTagInFullMask: true,
      activeTypes: ['EMAIL'],
      ignoredIds: [],
      customEntities: [],
    });
    expect(result.jobId).toBe(7);
    expect(result.entities).toHaveLength(1);
    expect(result.sanitizedText).toBe('Contact [REDACTED:EMAIL]');
  });
});
