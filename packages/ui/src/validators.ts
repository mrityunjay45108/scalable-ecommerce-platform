/**
 * Input validators for Indian e-commerce checkout
 */
export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-+]/g, '');
  const match = cleaned.match(/^(?:91)?([6-9]\d{9})$/);
  return Boolean(match);
}

export function isValidIndianPinCode(pin: string): boolean {
  if (!pin) return false;
  return /^[1-9][0-9]{5}$/.test(pin.trim());
}

export function isValidEmailAddress(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
