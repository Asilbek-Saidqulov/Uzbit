/**
 * Marching squares: traces the zero set of F(x, y) = 0 over a rectangle and returns
 * it as polylines. Works for any shape: circles, lines written in any form, and
 * curves that are not functions of x.
 */

export type Polyline = { xs: number[]; ys: number[] };
export type Box = { xmin: number; xmax: number; ymin: number; ymax: number };


type Side = 'B' | 'R' | 'T' | 'L';

// Which pairs of sides a cell's zero segments join, by the sign pattern of its corners.
// Corner bits: a = bottom-left 1, b = bottom-right 2, c = top-right 4, d = top-left 8.
const SEGMENTS: Record<number, [Side, Side][]> = {
  1: [['B', 'L']],
  2: [['B', 'R']],
  4: [['R', 'T']],
  8: [['T', 'L']],
  3: [['L', 'R']],
  12: [['L', 'R']],
  6: [['B', 'T']],
  9: [['B', 'T']],
  7: [['T', 'L']],
  14: [['B', 'L']],
  13: [['B', 'R']],
  11: [['R', 'T']],
};

export function traceZeroSet(
  F: (x: number, y: number) => number,
  box: Box,
  nx: number,
  ny: number
): Polyline[] {
  const { xmin, xmax, ymin, ymax } = box;
  const dx = (xmax - xmin) / nx;
  const dy = (ymax - ymin) / ny;
  const W = nx + 1;

  const v = new Float64Array(W * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    const y = ymin + j * dy;
    for (let i = 0; i <= nx; i++) v[j * W + i] = F(xmin + i * dx, y);
  }

  const X = (i: number) => xmin + i * dx;
  const Y = (j: number) => ymin + j * dy;

  // Marching squares only sees sign changes, so an isolated zero such as
  // x^2 + y^2 = 0 can disappear when it falls between grid samples. Search
  // strict local minima of |F| that have no nearby zero samples, refine them
  // with a bounded 2-D pattern search, and retain only numerically convincing
  // zeros. Ordinary contour points are excluded by the nearby-zero check.
  const isolated: Polyline[] = [];
  let valueScale = 1;
  for (const value of v) {
    if (Number.isFinite(value)) valueScale = Math.max(valueScale, Math.abs(value));
  }
  const zeroTolerance = valueScale * 1e-11;
  const candidates: [number, number][] = [];
  for (let j = 1; j < ny; j++) {
    for (let i = 1; i < nx; i++) {
      const index = j * W + i;
      const value = v[index];
      if (!Number.isFinite(value) || Math.abs(value) <= zeroTolerance) continue;
      let localMinimum = true;
      let hasNearbyZero = false;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const neighbor = v[(j + oy) * W + i + ox];
          if (!Number.isFinite(neighbor)) {
            localMinimum = false;
            continue;
          }
          if (Math.abs(neighbor) <= zeroTolerance) hasNearbyZero = true;
          if (Math.abs(neighbor) < Math.abs(value)) localMinimum = false;
        }
      }
      if (localMinimum && !hasNearbyZero) candidates.push([X(i), Y(j)]);
    }
  }

  for (const [startX, startY] of candidates) {
    let x = startX;
    let y = startY;
    let best = F(x, y);
    let sx = Math.abs(dx);
    let sy = Math.abs(dy);
    for (let iteration = 0; iteration < 48; iteration++) {
      let improved = false;
      for (const [ox, oy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) {
        const nxp = x + ox * sx;
        const nyp = y + oy * sy;
        if (nxp < xmin || nxp > xmax || nyp < ymin || nyp > ymax) continue;
        const next = F(nxp, nyp);
        if (Number.isFinite(next) && Math.abs(next) < Math.abs(best)) {
          x = nxp;
          y = nyp;
          best = next;
          improved = true;
        }
      }
      if (!improved) {
        sx *= 0.5;
        sy *= 0.5;
      }
      if (Math.max(sx, sy) < Math.max(xmax - xmin, ymax - ymin) * 1e-13) break;
    }
    if (!Number.isFinite(best) || Math.abs(best) > zeroTolerance) continue;

    // A local minimum of |F| may lie on an ordinary contour (for example,
    // x^2 + y^2 = 9), not just at an isolated zero. Keep only candidates
    // whose gradient is effectively zero. Regular contour points have a
    // nonzero gradient and must be rendered as part of the continuous line.
    const h = Math.max(Math.min(Math.abs(dx), Math.abs(dy)) * 0.25, (xmax - xmin) * 1e-8);
    const fxp = F(x + h, y);
    const fxm = F(x - h, y);
    const fyp = F(x, y + h);
    const fym = F(x, y - h);
    if (![fxp, fxm, fyp, fym].every(Number.isFinite)) continue;
    const gx = (fxp - fxm) / (2 * h);
    const gy = (fyp - fym) / (2 * h);
    const localScale = Math.max(Math.abs(fxp), Math.abs(fxm), Math.abs(fyp), Math.abs(fym));
    const gradientTolerance = 1e-4 * localScale / h;
    if (Math.hypot(gx, gy) > gradientTolerance) continue;

    if (isolated.some((line) => Math.hypot(line.xs[0] - x, line.ys[0] - y) < Math.max(Math.abs(dx), Math.abs(dy)) * 0.1)) continue;
    isolated.push({ xs: [x], ys: [y] });
  }

  // Crossing points, keyed by the two lattice indices of their edge. null = no usable crossing.
  const pts = new Map<string, [number, number] | null>();

  const edge = (a: number, b: number): string | null => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (!pts.has(key)) {
      const va = v[a];
      const vb = v[b];
      let pt: [number, number] | null = null;

      if (Number.isFinite(va) && Number.isFinite(vb) && va > 0 !== vb > 0) {
        const xa = X(a % W);
        const ya = Y(Math.floor(a / W));
        const xb = X(b % W);
        const yb = Y(Math.floor(b / W));

        // Bisect along the edge to the true zero, rather than trusting linear interpolation.
        let lo = 0;
        let hi = 1;
        let flo = va;
        let valid = true;
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          const fm = F(xa + mid * (xb - xa), ya + mid * (yb - ya));
          if (!Number.isFinite(fm)) {
            valid = false;
            break;
          }
          if (fm === 0) {
            lo = hi = mid;
            break;
          }
          if (flo > 0 === fm > 0) {
            lo = mid;
            flo = fm;
          } else {
            hi = mid;
          }
        }

        if (valid) {
          const t = (lo + hi) / 2;
          const x = xa + t * (xb - xa);
          const y = ya + t * (yb - ya);
          const fx = F(x, y);
          // A true zero has |F| near 0. A jump over a pole leaves |F| larger than the corners.
          if (Number.isFinite(fx) && Math.abs(fx) <= Math.max(Math.abs(va), Math.abs(vb))) {
            pt = [x, y];
          }
        }
      }
      pts.set(key, pt);
    }
    return pts.get(key) ? key : null;
  };

  // Adjacency between crossing points. Each point is shared by the two cells on either side of its edge.
  const adj = new Map<string, string[]>();
  const link = (p: string, q: string) => {
    if (!adj.has(p)) adj.set(p, []);
    adj.get(p)!.push(q);
  };

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * W + i;
      const b = a + 1;
      const d = a + W;
      const c = d + 1;
      const va = v[a];
      const vb = v[b];
      const vc = v[c];
      const vd = v[d];
      if (!Number.isFinite(va) || !Number.isFinite(vb) || !Number.isFinite(vc) || !Number.isFinite(vd)) continue;

      const code = (va > 0 ? 1 : 0) | (vb > 0 ? 2 : 0) | (vc > 0 ? 4 : 0) | (vd > 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;

      const e: Record<Side, string | null> = {
        B: edge(a, b),
        R: edge(b, c),
        T: edge(d, c),
        L: edge(a, d),
      };

      let pairs: [Side, Side][];
      if (code === 5 || code === 10) {
        // Saddle: sample the actual cell centre instead of averaging corners.
        // The average can choose the wrong topology for nonlinear functions.
        const centerValue = F((X(i) + X(i + 1)) / 2, (Y(j) + Y(j + 1)) / 2);
        const centerPositive = Number.isFinite(centerValue)
          ? centerValue > 0
          : va + vb + vc + vd > 0;
        const cutBD = code === 5 ? centerPositive : !centerPositive;
        pairs = cutBD
          ? [
              ['B', 'R'],
              ['T', 'L'],
            ]
          : [
              ['B', 'L'],
              ['R', 'T'],
            ];
      } else {
        pairs = SEGMENTS[code];
      }

      for (const [p, q] of pairs) {
        const kp = e[p];
        const kq = e[q];
        if (kp && kq) {
          link(kp, kq);
          link(kq, kp);
        }
      }
    }
  }

  // Walk the adjacency into continuous polylines.
  const used = new Set<string>();
  const segId = (p: string, q: string) => (p < q ? `${p}|${q}` : `${q}|${p}`);
  const freeNeighbor = (p: string): string | undefined =>
    adj.get(p)?.find((q) => !used.has(segId(p, q)));

  const out: Polyline[] = [...isolated];

  for (const start of adj.keys()) {
    for (const next of adj.get(start)!) {
      if (used.has(segId(start, next))) continue;
      used.add(segId(start, next));

      const forward: string[] = [start, next];
      let cur = next;
      let step = freeNeighbor(cur);
      while (step !== undefined) {
        used.add(segId(cur, step));
        forward.push(step);
        cur = step;
        step = freeNeighbor(cur);
      }

      const backward: string[] = [];
      cur = start;
      step = freeNeighbor(cur);
      while (step !== undefined) {
        used.add(segId(cur, step));
        backward.push(step);
        cur = step;
        step = freeNeighbor(cur);
      }

      const keys = [...backward.reverse(), ...forward];
      out.push({
        xs: keys.map((k) => pts.get(k)![0]),
        ys: keys.map((k) => pts.get(k)![1]),
      });
    }
  }

  return out;
}