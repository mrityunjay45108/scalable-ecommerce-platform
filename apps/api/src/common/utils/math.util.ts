/**
 * Precision monetary and tax mathematics utility
 */
export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function extractInclusiveTax(grossAmount: number, taxRate: number = 0.18): { baseAmount: number; taxAmount: number } {
  const baseAmount = roundToTwoDecimals(grossAmount / (1 + taxRate));
  const taxAmount = roundToTwoDecimals(grossAmount - baseAmount);
  return { baseAmount, taxAmount };
}
