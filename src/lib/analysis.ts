type Fn = (x: number) => number;

export type PointKind = 'root' | 'yintercept' | 'minimum' | 'maximum' | 'stationary' | 'intersection';

export type KeyPoint = {
  id: string;
  x: number;
  y: number;
  kind: PointKind;
  label: string;
  description: string;
  expressionLabels?: string[];
  approx: boolean;
};

export type Segment = { xs: number[]; ys: number[] };

const SCAN_SAMPLES = 800;
const MAX_POINTS = 160;

/** Narrows a sign change on [a, b] to a root using bisection. */
function bisect(h: Fn, a: number, b: number, fa: number): number | null {
  let lo = a;
  let hi = b;
  let flo = fa;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fm = h(mid);
    if (!Number.isFinite(fm)) return null;
    if (fm === 0) return mid;
    if (flo * fm < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  const root = (lo + hi) / 2;
  return Math.abs(h(root)) < 1e-7 ? root : null;
}

/** Finds real roots of h(x) = 0 within [xmin, xmax], including tangential roots. */
export function findRoots(h: Fn, xmin: number, xmax: number): number[] {
  const roots: number[] = [];
  const step = (xmax - xmin) / SCAN_SAMPLES;
  let px = xmin;
  let py = h(px);

  for (let i = 1; i <= SCAN_SAMPLES; i++) {
    const x = xmin + i * step;
    const y = h(x);

    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (y === 0) {
        roots.push(x);
      } else if (py * y < 0) {
        const r = bisect(h, px, x, py);
        if (r !== null) roots.push(r);
      } else {
        // Tangential touch detection: local minimum of |h| touching 0 without sign flip
        const mid = (px + x) / 2;
        const ym = h(mid);
        if (Number.isFinite(ym) && Math.abs(ym) < Math.abs(py) && Math.abs(ym) < Math.abs(y)) {
          if (Math.abs(ym) < 1e-4) {
            roots.push(mid);
          }
        }
      }
    }
    px = x;
    py = y;
  }
  return roots;
}

/** Local extrema detection using first-derivative sign changes and stationary points. */
export function findLocalExtrema(
  fn: Fn,
  xmin: number,
  xmax: number
): { x: number; y: number; kind: 'minimum' | 'maximum' }[] {
  const extrema: { x: number; y: number; kind: 'minimum' | 'maximum' }[] = [];
  const step = (xmax - xmin) / SCAN_SAMPLES;
  const tol = (xmax - xmin) * 1e-3;
  const h = 1e-5;

  const d1 = (x: number) => {
    const yp = fn(x + h);
    const ym = fn(x - h);
    return (yp - ym) / (2 * h);
  };

  const isClose = (x: number) => extrema.some((e) => Math.abs(e.x - x) < tol);

  const checkExtremum = (candX: number, kindHint?: 'minimum' | 'maximum') => {
    // Snap machine epsilon near zero to exact 0
    const cleanX = Math.abs(candX) < 1e-7 ? 0 : candX;
    if (isClose(cleanX)) return;
    const y = fn(cleanX);
    if (!Number.isFinite(y)) return;
    const cleanY = Math.abs(y) < 1e-7 ? 0 : y;

    const delta = Math.max(1e-4, step * 0.2);
    const yLeft = fn(cleanX - delta);
    const yRight = fn(cleanX + delta);
    if (!Number.isFinite(yLeft) || !Number.isFinite(yRight)) return;

    if (kindHint === 'minimum' || (cleanY <= yLeft && cleanY <= yRight)) {
      if (cleanY < yLeft || cleanY < yRight) {
        extrema.push({ x: cleanX, y: cleanY, kind: 'minimum' });
      }
    } else if (kindHint === 'maximum' || (cleanY >= yLeft && cleanY >= yRight)) {
      if (cleanY > yLeft || cleanY > yRight) {
        extrema.push({ x: cleanX, y: cleanY, kind: 'maximum' });
      }
    }
  };

  let px = xmin;
  let pd = d1(px);

  for (let i = 1; i <= SCAN_SAMPLES; i++) {
    const x = xmin + i * step;
    const cd = d1(x);

    if (Number.isFinite(pd) && Number.isFinite(cd)) {
      // 1. Direct stationary hit at current sample
      if (Math.abs(cd) <= 1e-9) {
        checkExtremum(x);
      }
      // 2. Sign change between samples: bisect derivative
      else if (pd * cd < 0) {
        let lo = px;
        let hi = x;
        let dlo = pd;
        for (let j = 0; j < 40; j++) {
          const mid = (lo + hi) / 2;
          const dm = d1(mid);
          if (!Number.isFinite(dm)) break;
          if (Math.abs(dm) <= 1e-9) {
            lo = hi = mid;
            break;
          }
          if (dlo * dm < 0) {
            hi = mid;
          } else {
            lo = mid;
            dlo = dm;
          }
        }
        const extX = (lo + hi) / 2;
        const kind: 'minimum' | 'maximum' = pd < 0 ? 'minimum' : 'maximum';
        checkExtremum(extX, kind);
      }
    }
    px = x;
    pd = cd;
  }

  return extrema;
}

// Replace identifyPointsOfInterest in src/lib/analysis.ts:
export type FunctionTarget = {
  id: string;
  label: string;
  fn: Fn;
};

export type VLineTarget = {
  id: string;
  label: string;
  x: number;
};

export function identifyPointsOfInterest(
  functions: FunctionTarget[],
  xmin: number,
  xmax: number,
  vlines: VLineTarget[] = []
): KeyPoint[] {
  const points: KeyPoint[] = [];
  const tolX = (xmax - xmin) * 1e-3;

  const exists = (x: number, y: number, kind: PointKind) =>
    points.some(
      (p) => p.kind === kind && Math.abs(p.x - x) < tolX && Math.abs(p.y - y) < tolX
    );

  // 1. Functions: Y-intercept, Roots, Extrema
  functions.forEach((target) => {
    // Y-intercept
    if (0 >= xmin && 0 <= xmax) {
      const y0 = target.fn(0);
      if (Number.isFinite(y0) && !exists(0, y0, 'yintercept')) {
        points.push({
          id: `yint-${target.id}`,
          x: 0,
          y: Math.abs(y0) < 1e-7 ? 0 : y0,
          kind: 'yintercept',
          label: 'y-intercept',
          description: `y-intercept of ${target.label}`,
          expressionLabels: [target.label],
          approx: false,
        });
      }
    }

    // Roots
    const roots = findRoots(target.fn, xmin, xmax);
    roots.forEach((rx, idx) => {
      const cleanX = Math.abs(rx) < 1e-7 ? 0 : rx;
      const ry = target.fn(cleanX);
      const cleanY = Math.abs(ry) < 1e-7 ? 0 : ry;
      if (!exists(cleanX, cleanY, 'root')) {
        points.push({
          id: `root-${target.id}-${idx}`,
          x: cleanX,
          y: cleanY,
          kind: 'root',
          label: 'Root (x-intercept)',
          description: `Zero of ${target.label}`,
          expressionLabels: [target.label],
          approx: Math.abs(cleanY) > 1e-12,
        });
      }
    });

    // Extrema
    const extrema = findLocalExtrema(target.fn, xmin, xmax);
    extrema.forEach((ext, idx) => {
      if (!exists(ext.x, ext.y, ext.kind)) {
        points.push({
          id: `ext-${target.id}-${idx}`,
          x: ext.x,
          y: ext.y,
          kind: ext.kind,
          label: ext.kind === 'maximum' ? 'Local Maximum' : 'Local Minimum',
          description: `${ext.kind === 'maximum' ? 'Peak' : 'Trough'} of ${target.label}`,
          expressionLabels: [target.label],
          approx: true,
        });
      }
    });
  });

  // 2. Intersections between function pairs
  for (let i = 0; i < functions.length; i++) {
    for (let j = i + 1; j < functions.length; j++) {
      const f1 = functions[i];
      const f2 = functions[j];
      const diffRoots = findRoots((x) => f1.fn(x) - f2.fn(x), xmin, xmax);

      diffRoots.forEach((ix, idx) => {
        const iy = f1.fn(ix);
        if (Number.isFinite(iy) && !exists(ix, iy, 'intersection') && points.length < MAX_POINTS) {
          points.push({
            id: `intersect-${f1.id}-${f2.id}-${idx}`,
            x: Math.abs(ix) < 1e-7 ? 0 : ix,
            y: Math.abs(iy) < 1e-7 ? 0 : iy,
            kind: 'intersection',
            label: 'Intersection',
            description: `Intersection of ${f1.label} and ${f2.label}`,
            expressionLabels: [f1.label, f2.label],
            approx: true,
          });
        }
      });
    }
  }

  // 3. Intersections between functions and vertical lines (x = c)
  for (const vl of vlines) {
    if (vl.x >= xmin && vl.x <= xmax) {
      for (const fnTarget of functions) {
        const y = fnTarget.fn(vl.x);
        if (Number.isFinite(y) && !exists(vl.x, y, 'intersection')) {
          points.push({
            id: `vintersect-${vl.id}-${fnTarget.id}`,
            x: vl.x,
            y: Math.abs(y) < 1e-7 ? 0 : y,
            kind: 'intersection',
            label: 'Intersection',
            description: `Intersection of ${vl.label} and ${fnTarget.label}`,
            expressionLabels: [vl.label, fnTarget.label],
            approx: false,
          });
        }
      }
    }
  }

  return points;
}

export type SystemSolution = {
  id: string;
  x: number;
  y: number;
  equations: string[];
  status: 'verified' | 'candidate';
  residual: number;
};

/** Finds common solutions (intersections) across multiple equations with tolerance verification. */
export function solveSystemOfEquations(
  functions: FunctionTarget[],
  xmin: number,
  xmax: number,
  tol = 1e-4
): SystemSolution[] {
  const solutions: SystemSolution[] = [];
  const exists = (x: number, y: number) =>
    solutions.some((s) => Math.abs(s.x - x) < tol && Math.abs(s.y - y) < tol);

  for (let i = 0; i < functions.length; i++) {
    for (let j = i + 1; j < functions.length; j++) {
      const f1 = functions[i];
      const f2 = functions[j];
      const diff = (x: number) => f1.fn(x) - f2.fn(x);
      const roots = findRoots(diff, xmin, xmax);

      for (const rx of roots) {
        const y1 = f1.fn(rx);
        const y2 = f2.fn(rx);
        if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;

        const residual = Math.abs(y1 - y2);
        if (residual > tol * 10) continue;

        const midY = (y1 + y2) / 2;
        if (!exists(rx, midY)) {
          solutions.push({
            id: `sol-${f1.id}-${f2.id}-${rx.toFixed(4)}`,
            x: rx,
            y: midY,
            equations: [f1.label, f2.label],
            status: residual < 1e-6 ? 'verified' : 'candidate',
            residual,
          });
        }
      }
    }
  }

  return solutions;
}

export function sampleSegments(
  fn: Fn,
  xmin: number,
  xmax: number,
  span: number,
  samples: number
): Segment[] {
  const segments: Segment[] = [];
  let xs: number[] = [];
  let ys: number[] = [];
  let prev = NaN;

  const flush = () => {
    if (xs.length > 1) segments.push({ xs, ys });
    xs = [];
    ys = [];
  };

  for (let i = 0; i <= samples; i++) {
    const x = xmin + ((xmax - xmin) * i) / samples;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      flush();
      prev = NaN;
      continue;
    }
    if (xs.length && Math.abs(y - prev) > 2 * span) flush();
    xs.push(x);
    ys.push(y);
    prev = y;
  }
  flush();

  return segments;
}

export type DerivativeResult = {
  value: number;
  isDefined: boolean;
  reason?: string;
};

export function differentiate(fn: Fn, x: number): DerivativeResult {
  const h = 1e-5 * Math.max(1, Math.abs(x));
  const y0 = fn(x);
  const ym2 = fn(x - 2 * h);
  const ym1 = fn(x - h);
  const yp1 = fn(x + h);
  const yp2 = fn(x + 2 * h);

  if (![y0, ym1, yp1, ym2, yp2].every(Number.isFinite)) {
    return { value: NaN, isDefined: false, reason: 'Undefined or non-finite around x' };
  }

  const dLeft = (y0 - ym1) / h;
  const dRight = (yp1 - y0) / h;
  const slopeScale = Math.max(1, Math.abs(dLeft), Math.abs(dRight));
  if (Math.abs(dLeft - dRight) > 0.05 * slopeScale && Math.abs(dLeft - dRight) > 1e-3) {
    return { value: NaN, isDefined: false, reason: 'Non-differentiable corner or jump at x' };
  }

  const d = (-yp2 + 8 * yp1 - 8 * ym1 + ym2) / (12 * h);
  return { value: d, isDefined: Number.isFinite(d) };
}

export type IntegralResult =
  | { status: 'ok'; value: number; errorEstimate: number; reversed: boolean; subintervals: number }
  | { status: 'divergent' | 'singular' | 'undefined'; message: string; reversed: boolean };

function simpsonStep(fa: number, fb: number, fm: number, a: number, b: number): number {
  return ((b - a) / 6) * (fa + 4 * fm + fb);
}

function adaptiveSubdivide(
  fn: Fn,
  a: number,
  b: number,
  fa: number,
  fb: number,
  fm: number,
  whole: number,
  tol: number,
  depth: number,
  maxDepth: number,
  counter: { count: number }
): { value: number; error: number; ok: boolean } {
  counter.count++;
  const m = (a + b) / 2;
  const lm = (a + m) / 2;
  const rm = (m + b) / 2;
  const flm = fn(lm);
  const frm = fn(rm);

  if (!Number.isFinite(flm) || !Number.isFinite(frm)) {
    return { value: NaN, error: Infinity, ok: false };
  }

  const left = simpsonStep(fa, fm, flm, a, m);
  const right = simpsonStep(fm, fb, frm, m, b);
  const delta = left + right - whole;
  const error = Math.abs(delta) / 15;

  if (error <= tol || depth >= maxDepth) {
    return {
      value: left + right + delta / 15,
      error,
      ok: depth < maxDepth || error < tol * 10,
    };
  }

  const lRes = adaptiveSubdivide(fn, a, m, fa, fm, flm, left, tol / 2, depth + 1, maxDepth, counter);
  if (!lRes.ok) return { value: NaN, error: Infinity, ok: false };
  const rRes = adaptiveSubdivide(fn, m, b, fm, fb, frm, right, tol / 2, depth + 1, maxDepth, counter);
  if (!rRes.ok) return { value: NaN, error: Infinity, ok: false };

  return {
    value: lRes.value + rRes.value,
    error: lRes.error + rRes.error,
    ok: true,
  };
}

export function integrateAdaptive(
  fn: Fn,
  a: number,
  b: number,
  tol = 1e-7,
  maxDepth = 18
): IntegralResult {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { status: 'undefined', message: 'Bounds must be finite numbers', reversed: false };
  }
  if (a === b) {
    return { status: 'ok', value: 0, errorEstimate: 0, reversed: false, subintervals: 1 };
  }

  const reversed = a > b;
  const x0 = reversed ? b : a;
  const x1 = reversed ? a : b;

  const f0 = fn(x0);
  const f1 = fn(x1);
  const xm = (x0 + x1) / 2;
  const fm = fn(xm);

  if (!Number.isFinite(f0) || !Number.isFinite(f1) || !Number.isFinite(fm)) {
    return { status: 'singular', message: 'Function is undefined or non-finite at evaluation points', reversed };
  }

  const initial = simpsonStep(f0, f1, fm, x0, x1);
  const counter = { count: 0 };
  const res = adaptiveSubdivide(fn, x0, x1, f0, f1, fm, initial, tol, 1, maxDepth, counter);

  if (!res.ok || !Number.isFinite(res.value)) {
    return { status: 'divergent', message: 'Integral diverges or contains an asymptotic singularity', reversed };
  }

  const finalVal = reversed ? -res.value : res.value;
  return {
    status: 'ok',
    value: finalVal,
    errorEstimate: res.error,
    reversed,
    subintervals: counter.count,
  };
}