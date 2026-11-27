/**
 * Validation algorithms for MaskMate:
 * - Luhn algorithm for Credit Card numbers
 * - Verhoeff algorithm for Aadhaar numbers
 * - PAN format & holder-type code validation
 * - IPv4 and IPv6 format validation
 */

/**
 * Luhn algorithm (mod 10) for validating credit card numbers.
 * Digits are processed right to left; every second digit doubled.
 * Returns true if the checksum is valid.
 */
export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Verhoeff algorithm tables (multiplication table d, permutation table p, inverse table inv).
 * Specifically designed for base 10 error detection (catches all single-digit errors and adjacent transpositions).
 */
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates 12-digit Aadhaar number using Verhoeff checksum.
 * Standard Aadhaar rules: 12 digits, first digit is 2-9 (0 and 1 are not allocated as starting digits).
 */
export function validateVerhoeff(numStr: string): boolean {
  const digits = numStr.replace(/[\s-]/g, '');
  if (!/^[2-9]\d{11}$/.test(digits)) {
    return false;
  }

  let c = 0;
  // Read reversed: index 0 corresponds to the check digit (rightmost)
  const reversedDigits = digits.split('').reverse().map(Number);

  for (let i = 0; i < reversedDigits.length; i++) {
    const digit = reversedDigits[i];
    const permuted = VERHOEFF_P[i % 8][digit];
    c = VERHOEFF_D[c][permuted];
  }

  return c === 0;
}

/**
 * Validates Indian Income Tax PAN (Permanent Account Number).
 * Format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).
 * Fourth letter must represent a valid entity/holder type:
 * P (Individual), C (Company), H (HUF), F (Firm/LLP), A (AOP),
 * B (BOI), L (Local Authority), J (Artificial Juridical Person),
 * G (Government Agency), T (Trust).
 */
export function validatePAN(pan: string): boolean {
  const clean = pan.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) {
    return false;
  }
  const fourthChar = clean[3];
  const validFourthChars = new Set(['P', 'C', 'H', 'F', 'A', 'B', 'L', 'J', 'G', 'T']);
  return validFourthChars.has(fourthChar);
}

/**
 * Validates IPv4 address string (e.g., 192.168.1.1).
 * Checks strictly that there are 4 octets and each is 0-255 with no leading zeros (except single 0).
 */
export function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    // Check leading zeros (e.g., "01" is invalid in standard dotted-decimal)
    if (part.length > 1 && part.startsWith('0')) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
  }
  return true;
}

/**
 * Validates IPv6 address (full, compressed, with or without port).
 */
export function validateIPv6(ip: string): boolean {
  // Regex supporting standard IPv6 and compressed '::' forms
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  return ipv6Regex.test(ip.trim());
}

