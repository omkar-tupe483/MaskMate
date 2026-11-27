import { describe, it, expect } from 'vitest';
import { validateLuhn, validateVerhoeff, validatePAN, validateIPv4, validateIPv6 } from '../src/lib/validators.js';
import { detectPII, detectEmails, detectPhones } from '../src/lib/detectors.js';
import { redactText } from '../src/lib/redactors.js';
import { SAMPLE_NOISY_TEXT } from '../src/lib/sample.js';
import { EntityType } from '../src/lib/types.js';

describe('Validators', () => {
  describe('Luhn Algorithm', () => {
    it('passes standard valid credit card numbers', () => {
      expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
      expect(validateLuhn('4532-0150-1234-5671')).toBe(true);
      expect(validateLuhn('5425 2334 3010 9119')).toBe(true);
      expect(validateLuhn('3782-822463-10005')).toBe(true); // Amex 15-digit
    });

    it('rejects numbers failing Luhn checksum', () => {
      expect(validateLuhn('4111 1111 1111 1112')).toBe(false);
      expect(validateLuhn('5555-5555-5555-5555')).toBe(false);
      expect(validateLuhn('9999888877776666')).toBe(false);
    });

    it('rejects strings with invalid lengths or non-digit chars', () => {
      expect(validateLuhn('12345')).toBe(false);
      expect(validateLuhn('4111-1111-1111-111a')).toBe(false);
    });
  });

  describe('Verhoeff Algorithm (Aadhaar)', () => {
    it('validates known valid 12-digit Aadhaar numbers', () => {
      expect(validateVerhoeff('9876-5432-1096')).toBe(true);
      expect(validateVerhoeff('3675 9834 6016')).toBe(true);
      expect(validateVerhoeff('219847382910')).toBe(true);
    });

    it('rejects invalid Aadhaar numbers (checksum errors or invalid starting digit)', () => {
      expect(validateVerhoeff('3675 9834 6019')).toBe(false);
      expect(validateVerhoeff('987654321098')).toBe(false);
      // First digit 0 or 1 is invalid for UIDAI Aadhaar
      expect(validateVerhoeff('0123 4567 8901')).toBe(false);
      expect(validateVerhoeff('1234 5678 9012')).toBe(false);
    });
  });

  describe('PAN Validator', () => {
    it('validates correct PAN structure and holder-type codes', () => {
      expect(validatePAN('ABCPE1234F')).toBe(true); // Individual 'P'
      expect(validatePAN('AAACA9988G')).toBe(true); // Company 'C'
      expect(validatePAN('AAATA1234Z')).toBe(true); // Trust 'T'
    });

    it('rejects PAN with invalid 4th holder character or bad format', () => {
      expect(validatePAN('ABCDE12345')).toBe(false); // Last character is not letter
      expect(validatePAN('XYZKE1234P')).toBe(false); // 'K' is invalid holder code
      expect(validatePAN('12345ABCDE')).toBe(false);
    });
  });

  describe('IP Validator', () => {
    it('validates standard IPv4 addresses', () => {
      expect(validateIPv4('192.168.1.1')).toBe(true);
      expect(validateIPv4('10.0.0.1')).toBe(true);
      expect(validateIPv4('255.255.255.255')).toBe(true);
      expect(validateIPv4('0.0.0.0')).toBe(true);
    });

    it('rejects IPv4 with out-of-bounds octets (e.g., 256) or invalid leading zeros', () => {
      expect(validateIPv4('192.168.1.256')).toBe(false);
      expect(validateIPv4('192.168.01.1')).toBe(false);
      expect(validateIPv4('192.168.1')).toBe(false);
      expect(validateIPv4('192.168.1.1.1')).toBe(false);
    });

    it('validates standard and compressed IPv6 addresses', () => {
      expect(validateIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(validateIPv6('fe80::1ff:fe23:4567:890a')).toBe(true);
      expect(validateIPv6('::1')).toBe(true);
    });
  });
});

describe('PII Detection Engine', () => {
  it('detects emails accurately', () => {
    const text = 'Contact alice@example.com or BOB.SMITH@CORP.ORG for help.';
    const results = detectEmails(text);
    expect(results.length).toBe(2);
    expect(results[0].value).toBe('alice@example.com');
    expect(results[1].value).toBe('BOB.SMITH@CORP.ORG');
  });

  it('detects Indian and international phones avoiding order IDs and timestamps', () => {
    const text = 'Order ORD-9876543210 placed at 2026-11-27T10:30:00. Call +91 98765 43210 or +1 (555) 234-5678.';
    const results = detectPhones(text);
    expect(results.some((p) => p.value.includes('98765 43210'))).toBe(true);
    expect(results.some((p) => p.value.includes('234-5678'))).toBe(true);
    // Must NOT flag order ID or timestamp numbers
    expect(results.some((p) => p.value.includes('ORD-'))).toBe(false);
    expect(results.some((p) => p.value.includes('2026-11-27'))).toBe(false);
  });

  it('resolves overlaps deterministically: Aadhaar wins over Phone', () => {
    const text = 'My Aadhaar number is 9876-5432-1096.';
    const result = detectPII(text);
    const aadhaarMatches = result.entities.filter((e) => e.type === 'AADHAAR');
    const phoneMatches = result.entities.filter((e) => e.type === 'PHONE');
    expect(aadhaarMatches.length).toBe(1);
    expect(phoneMatches.length).toBe(0);
  });

  it('resolves overlaps deterministically: Credit Card wins over Phone', () => {
    const text = 'Paid with Visa 4532-0150-1234-5671.';
    const result = detectPII(text);
    const ccMatches = result.entities.filter((e) => e.type === 'CREDIT_CARD');
    const phoneMatches = result.entities.filter((e) => e.type === 'PHONE');
    expect(ccMatches.length).toBe(1);
    expect(phoneMatches.length).toBe(0);
  });

  it('tracks rejected by Luhn count accurately for false-positive bait', () => {
    const text = 'Card 4111 1111 1111 1112 and 5555-5555-5555-5555 are bait.';
    const result = detectPII(text);
    expect(result.entities.filter((e) => e.type === 'CREDIT_CARD').length).toBe(0);
    expect(result.rejectedLuhnCount).toBe(2);
  });
});

describe('Redaction Modes & Pseudonymization', () => {
  const allTypes = new Set<EntityType>(['EMAIL', 'PHONE', 'IP', 'PAN', 'AADHAAR', 'CREDIT_CARD']);

  it('Full mask replaces with tagged or untagged tokens', () => {
    const text = 'Reach me at test@example.com';
    const detection = detectPII(text);

    const fullTagged = redactText(text, detection.entities, {
      mode: 'FULL',
      includeTypeTagInFullMask: true,
      activeTypes: allTypes,
    });
    expect(fullTagged.sanitizedText).toBe('Reach me at [REDACTED:EMAIL]');

    const fullUntagged = redactText(text, detection.entities, {
      mode: 'FULL',
      includeTypeTagInFullMask: false,
      activeTypes: allTypes,
    });
    expect(fullUntagged.sanitizedText).toBe('Reach me at [REDACTED]');
  });

  it('Partial mask retains verification hints', () => {
    const text = 'Card: 4532-0150-1234-5671, Email: test@example.com, PAN: ABCPE1234F';
    const detection = detectPII(text);

    const partial = redactText(text, detection.entities, {
      mode: 'PARTIAL',
      activeTypes: allTypes,
    });

    expect(partial.sanitizedText).toContain('XXXX-XXXX-XXXX-5671');
    expect(partial.sanitizedText).toContain('t***@example.com');
    expect(partial.sanitizedText).toContain('ABXXXXXX4F');
  });

  it('Consistent Pseudonymization: same email in different cases maps to the same EMAIL_01', () => {
    const text = 'Alice alice@example.com emailed ALICE@EXAMPLE.COM and then bob@example.com.';
    const detection = detectPII(text);

    const pseudonymized = redactText(text, detection.entities, {
      mode: 'PSEUDONYM',
      activeTypes: allTypes,
    });

    expect(pseudonymized.sanitizedText).toBe('Alice EMAIL_01 emailed EMAIL_01 and then EMAIL_02.');
    expect(pseudonymized.mappingTable.size).toBe(2);
  });

  it('Honors per-entity active types toggles', () => {
    const text = 'Email: test@example.com, Phone: +91 98765 43210';
    const detection = detectPII(text);

    const emailOnly = redactText(text, detection.entities, {
      mode: 'FULL',
      includeTypeTagInFullMask: true,
      activeTypes: new Set<EntityType>(['EMAIL']),
    });

    expect(emailOnly.sanitizedText).toContain('[REDACTED:EMAIL]');
    expect(emailOnly.sanitizedText).toContain('+91 98765 43210');
  });
});

describe('Sample Noisy Text Processing', () => {
  it('accurately parses the sample document and meets expected entity criteria', () => {
    const result = detectPII(SAMPLE_NOISY_TEXT);
    expect(result.entities.length).toBeGreaterThan(10);

    // Verify entity types presence
    const typesPresent = new Set(result.entities.map((e) => e.type));
    expect(typesPresent.has('EMAIL')).toBe(true);
    expect(typesPresent.has('PHONE')).toBe(true);
    expect(typesPresent.has('PAN')).toBe(true);
    expect(typesPresent.has('AADHAAR')).toBe(true);
    expect(typesPresent.has('CREDIT_CARD')).toBe(true);
    expect(typesPresent.has('IP')).toBe(true);

    // Verify rejected Luhn count caught bait strings
    expect(result.rejectedLuhnCount).toBeGreaterThanOrEqual(3);

    // Verify rejected Verhoeff caught invalid Aadhaar
    expect(result.rejectedVerhoeffCount).toBeGreaterThanOrEqual(1);

    // Verify no overlaps in resolved entities
    for (let i = 0; i < result.entities.length - 1; i++) {
      expect(result.entities[i].end).toBeLessThanOrEqual(result.entities[i + 1].start);
    }
  });
});
