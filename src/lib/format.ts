/**
 * Formats a number for display.
 * Snaps floating-point numerical noise (|v| < 1e-7) to clean 0.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) < 1e-7) return '0';

  const rounded = Number(value.toPrecision(6));
  if (Math.abs(rounded) < 1e-7) return '0';

  return String(Number(rounded.toPrecision(4)));
}

/**
 * Attempts to convert a floating-point value to an exact simplified fraction (e.g., -5.333333 -> -16/3).
 * Returns null if no clean rational representation is found with small denominator (<= 64).
 */
export function toExactFraction(val: number, tolerance = 1e-5): { num: number; den: number; str: string } | null {
  if (!Number.isFinite(val) || Math.abs(val) > 1e5) return null;
  if (Math.abs(val) < 1e-7) return { num: 0, den: 1, str: '0' };

  const sign = val < 0 ? -1 : 1;
  const abs = Math.abs(val);

  for (let den = 1; den <= 64; den++) {
    const num = Math.round(abs * den);
    if (Math.abs(abs - num / den) < tolerance) {
      const finalNum = sign * num;
      if (den === 1) return { num: finalNum, den: 1, str: `${finalNum}` };
      return { num: finalNum, den, str: `${finalNum}/${den}` };
    }
  }
  return null;
}