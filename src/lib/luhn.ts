export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'RuPay' | 'Discover' | 'Unknown';

/**
 * Validates a credit card number (13-19 digits, spaces/hyphens allowed)
 * using the Luhn (mod-10) checksum algorithm.
 */
export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Identifies major payment card brands from IIN/BIN prefix and digit length.
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return 'Unknown';

  if (/^3[47]\d{13}$/.test(digits)) return 'Amex';
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return 'Visa';
  if (/^(5[1-5]\d{14}|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)\d{12})$/.test(digits)) {
    return 'Mastercard';
  }
  if (/^(60(?!11)|6521|6522|81|82|508)\d+$/.test(digits) && digits.length === 16) {
    return 'RuPay';
  }
  if (/^(6011|65|64[4-9])\d+$/.test(digits)) {
    return 'Discover';
  }

  return 'Unknown';
}

