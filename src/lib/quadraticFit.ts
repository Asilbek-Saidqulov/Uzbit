/**
 * Detects whether a function is a quadratic and recovers its coefficients
 * by sampling. Works for any expression the grapher can evaluate, including
 * factored forms like (x - 3)(x - 1), without parsing the text.
 */

export interface QuadraticCoefficients {
  a: number;
  b: number;
  c: number;
}

const CHECK_POINTS = [-3.5, -1.25, -0.5, 0.75, 1.5, 2.25, 4];

/**
 * Returns a, b, c if f(x) = a·x² + b·x + c at every sample point, or null
 * otherwise (non-quadratic, undefined somewhere, or linear with a = 0).
 */
export function fitQuadratic(f: (x: number) => number): QuadraticCoefficients | null {
  let f0: number, f1: number, fm1: number;
  try {
    f0 = f(0);
    f1 = f(1);
    fm1 = f(-1);
  } catch {
    return null;
  }
  if (![f0, f1, fm1].every(Number.isFinite)) return null;

  const c = f0;
  const a = (f1 + fm1) / 2 - c;
  const b = (f1 - fm1) / 2;

  // Verify on points that were not used to fit, so non-polynomials are rejected.
  for (const x of CHECK_POINTS) {
    let fx: number;
    try {
      fx = f(x);
    } catch {
      return null;
    }
    const predicted = a * x * x + b * x + c;
    if (!Number.isFinite(fx) || Math.abs(fx - predicted) > 1e-6 * Math.max(1, Math.abs(fx))) return null;
  }

  // a = 0 is linear, so it is not a quadratic.
  if (Math.abs(a) < 1e-9) return null;

  return { a: cleanNumber(a), b: cleanNumber(b), c: cleanNumber(c) };
}

/** Removes floating-point noise such as 2.0000000001 or -0.0. */
export function cleanNumber(v: number): number {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
}

/** Writes a·x² + b·x + c in the grapher's syntax, omitting zero terms. */
export function formatQuadratic({ a, b, c }: QuadraticCoefficients): string {
  let out = '';
  const add = (coef: number, body: string) => {
    if (coef === 0) return;
    const mag = Math.abs(coef);
    // A coefficient of 1 is left out before a variable: x, not 1x.
    const magText = body !== '' && mag === 1 ? '' : String(mag);
    const core = magText + body;
    if (out === '') out = (coef < 0 ? '-' : '') + core;
    else out += (coef < 0 ? ' - ' : ' + ') + core;
  };
  add(a, 'x^2');
  add(b, 'x');
  add(c, '');
  return out || '0';
}
