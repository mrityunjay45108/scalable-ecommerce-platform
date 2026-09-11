/**
 * Normalizes an input phone number to E.164 format.
 * Defaults 10-digit Indian numbers without country code to +91.
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  
  // Strip spaces, hyphens, parentheses, etc.
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // If 10 digits (e.g. 9876543210), prefix with +91 (India)
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // If 11 digits starting with 0 (e.g. 09876543210), replace leading 0 with +91
  if (/^0\d{10}$/.test(cleaned)) {
    return `+91${cleaned.substring(1)}`;
  }

  // If already starts with +, ensure digits follow
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If digits only with country code without plus (e.g. 919876543210)
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

/**
 * Validates whether a phone number matches standard E.164 format.
 * Format: +[1-9]\d{6,14}
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Masks a phone number for safe logging and UI display.
 * Example: +919876543210 -> +9198******10
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '******';
  const prefix = phone.slice(0, 5);
  const suffix = phone.slice(-2);
  const maskedLength = Math.max(phone.length - 7, 4);
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}
