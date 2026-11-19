export type Point2D = { x: number; y: number };

export type RegressionResult = {
  kind: 'linear' | 'quadratic' | 'exponential';
  equation: string;
  r2: number;
  fn: (x: number) => number;
  parameters: Record<string, number>;
  predict: (x: number) => number;
};

const round = (val: number, decimals = 4) => {
  if (!Number.isFinite(val)) return 0;
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
};

/** Calculates coefficient of determination (R^2). */
function computeR2(points: Point2D[], predict: (x: number) => number): number {
  if (points.length < 2) return 0;
  const meanY = points.reduce((acc, p) => acc + p.y, 0) / points.length;

  let ssTot = 0;
  let ssRes = 0;

  for (const p of points) {
    const pred = predict(p.x);
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - pred) ** 2;
  }

  if (ssTot === 0) return 1;
  const r2 = 1 - ssRes / ssTot;
  return Math.max(0, Math.min(1, r2));
}

/** Linear Regression: y = m*x + b */
export function fitLinear(points: Point2D[]): RegressionResult | null {
  const valid = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = valid.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of valid) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) return null; // Vertical line

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;
  const fn = (x: number) => m * x + b;
  const r2 = computeR2(valid, fn);

  const sign = b >= 0 ? '+' : '-';
  const eq = `y = ${round(m)}x ${sign} ${round(Math.abs(b))}`;

  return {
    kind: 'linear',
    equation: eq,
    r2: round(r2),
    fn,
    predict: fn,
    parameters: { m: round(m), b: round(b) },
  };
}

/** Quadratic Regression: y = a*x^2 + b*x + c via 3x3 normal equations */
export function fitQuadratic(points: Point2D[]): RegressionResult | null {
  const valid = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = valid.length;
  if (n < 3) return null;

  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0;

  for (const p of valid) {
    const x2 = p.x * p.x;
    sumX += p.x;
    sumX2 += x2;
    sumX3 += x2 * p.x;
    sumX4 += x2 * x2;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2Y += x2 * p.y;
  }

  // Matrix A (3x3), Vector B (3x1)
  const A = [
    [sumX4, sumX3, sumX2],
    [sumX3, sumX2, sumX],
    [sumX2, sumX, n],
  ];
  const B = [sumX2Y, sumXY, sumY];

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [B[i], B[maxRow]] = [B[maxRow], B[i]];

    if (Math.abs(A[i][i]) < 1e-12) return null;

    for (let k = i + 1; k < 3; k++) {
      const c = A[k][i] / A[i][i];
      for (let j = i; j < 3; j++) A[k][j] -= c * A[i][j];
      B[k] -= c * B[i];
    }
  }

  const coeffs = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = B[i];
    for (let j = i + 1; j < 3; j++) s -= A[i][j] * coeffs[j];
    coeffs[i] = s / A[i][i];
  }

  const [a, b, c] = coeffs;
  const fn = (x: number) => a * x * x + b * x + c;
  const r2 = computeR2(valid, fn);

  const signB = b >= 0 ? '+' : '-';
  const signC = c >= 0 ? '+' : '-';
  const eq = `y = ${round(a)}x² ${signB} ${round(Math.abs(b))}x ${signC} ${round(Math.abs(c))}`;

  return {
    kind: 'quadratic',
    equation: eq,
    r2: round(r2),
    fn,
    predict: fn,
    parameters: { a: round(a), b: round(b), c: round(c) },
  };
}

/** Exponential Regression: y = a * e^(b*x) */
export function fitExponential(points: Point2D[]): RegressionResult | null {
  const valid = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y > 0);
  if (valid.length < 2) return null;

  const transformed = valid.map((p) => ({ x: p.x, y: Math.log(p.y) }));
  const lin = fitLinear(transformed);
  if (!lin) return null;

  const b = lin.parameters.m;
  const a = Math.exp(lin.parameters.b);
  const fn = (x: number) => a * Math.exp(b * x);
  const r2 = computeR2(valid, fn);

  const eq = `y = ${round(a)} · e^(${round(b)}x)`;

  return {
    kind: 'exponential',
    equation: eq,
    r2: round(r2),
    fn,
    predict: fn,
    parameters: { a: round(a), b: round(b) },
  };
}