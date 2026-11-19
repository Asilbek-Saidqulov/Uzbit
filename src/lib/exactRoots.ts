/**
 * Exact forms of quadratic roots: x = (p ± k√m) / d, with m square-free.
 * Works when the coefficients are rational (whole numbers, or decimals such as 1.5).
 * Returns null otherwise, so the caller can show decimals only.
 */

export interface ExactRoot {
  /** Plain text, for example "(3 + √5)/2" or "-1/2". */
  text: string;
  /** LaTeX for display with KaTeX. */
  latex: string;
  /** Decimal value. */
  value: number;
  /** True when the root is complex (negative discriminant). */
  complex: boolean;
}

export interface ExactQuadratic {
  kind: 'two-real' | 'double' | 'complex';
  roots: ExactRoot[];
  /** The discriminant as an exact integer. */
  discriminant: number;
}

const EPS = 1e-9;

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Scales decimal coefficients to whole numbers, if they are rational with a small denominator. */
export function toWholeCoefficients(a: number, b: number, c: number): [number, number, number] | null {
  for (const scale of [1, 10, 100, 1000, 10000, 100000, 1000000]) {
    const A = a * scale, B = b * scale, C = c * scale;
    if ([A, B, C].every((v) => Math.abs(v - Math.round(v)) < EPS)) {
      return [Math.round(A), Math.round(B), Math.round(C)];
    }
  }
  return null;
}

/** Splits n into k and m with n = k²·m and m square-free (for n > 0). */
export function squareFreeParts(n: number): { k: number; m: number } {
  let k = 1;
  let m = n;
  for (let f = 2; f * f <= m; f++) {
    while (m % (f * f) === 0) {
      m /= f * f;
      k *= f;
    }
  }
  return { k, m };
}

/**
 * Formats one root (p + sign·k√m)/d, reduced, as plain text and LaTeX.
 * Rational roots (m = 1) become plain fractions; irrational and imaginary roots use
 * the usual notation: 2√3, (1 + √5)/2, −1 + i√2.
 */
function formatRoot(p: number, k: number, m: number, d: number, sign: 1 | -1, imaginary: boolean): { text: string; latex: string } {
  if (d < 0) {
    p = -p;
    k = -k;
    d = -d;
  }
  const signedK = sign * k;

  // Rational root: the radical is 1, so the root is one fraction.
  if (m === 1 && !imaginary) {
    let num = p + signedK;
    let den = d;
    const g = gcd(num, den) || 1;
    num /= g;
    den /= g;
    if (den === 1) return { text: String(num), latex: String(num) };
    return { text: `${num}/${den}`, latex: `${num < 0 ? '-' : ''}\\frac{${Math.abs(num)}}{${den}}` };
  }

  // Irrational or imaginary root: reduce p, signedK and d by their common factor.
  const g = gcd(gcd(p, signedK), d) || 1;
  const pr = p / g;
  const kr = signedK / g;
  const dr = d / g;
  const K = Math.abs(kr);
  const neg = kr < 0;

  // The radical part, for example 2√3, √5, i, 2i√2 or i√2.
  const coefT = K === 1 && (m !== 1 || imaginary) ? '' : String(K);
  const coefL = coefT;
  const radT = imaginary
    ? `${coefT}i${m === 1 ? '' : `√${m}`}`
    : `${coefT}√${m}`;
  const radL = imaginary
    ? `${coefL}${m === 1 ? 'i' : `i\\sqrt{${m}}`}`
    : `${coefL}\\sqrt{${m}}`;

  const numT = pr === 0 ? `${neg ? '-' : ''}${radT}` : `${pr} ${neg ? '-' : '+'} ${radT}`;
  const numL = pr === 0 ? `${neg ? '-' : ''}${radL}` : `${pr} ${neg ? '-' : '+'} ${radL}`;
  if (dr === 1) return { text: numT, latex: numL };
  if (pr === 0) return { text: `${numT}/${dr}`, latex: `\\frac{${numL}}{${dr}}` };
  return { text: `(${numT})/${dr}`, latex: `\\frac{${numL}}{${dr}}` };
}

/** Exact roots of a·x² + b·x + c = 0, or null if the coefficients are not rational. */
export function exactQuadraticRoots(a: number, b: number, c: number): ExactQuadratic | null {
  const whole = toWholeCoefficients(a, b, c);
  if (!whole) return null;
  const [A, B, C] = whole;
  if (A === 0) return null;
  const disc = B * B - 4 * A * C;
  const d = 2 * A;
  const p = -B;

  if (disc === 0) {
    const r = formatRoot(p, 0, 1, d, 1, false);
    return { kind: 'double', discriminant: 0, roots: [{ ...r, value: -B / d, complex: false }] };
  }

  if (disc > 0) {
    const { k, m } = squareFreeParts(disc);
    const roots: ExactRoot[] = [];
    for (const sign of [1, -1] as const) {
      const r = formatRoot(p, k, m, d, sign, false);
      roots.push({ ...r, value: (p + sign * k * Math.sqrt(m)) / d, complex: false });
    }
    if (m === 1) {
      // Rational roots: keep them as exact fractions, smallest value first.
      roots.sort((x, y) => x.value - y.value);
    }
    return { kind: 'two-real', discriminant: disc, roots };
  }

  // Negative discriminant: complex roots (p ± i·k√m)/d
  const { k, m } = squareFreeParts(-disc);
  const roots: ExactRoot[] = [];
  for (const sign of [1, -1] as const) {
    const r = formatRoot(p, k, m, d, sign, true);
    roots.push({ ...r, value: p / d, complex: true });
  }
  return { kind: 'complex', discriminant: disc, roots };
}
