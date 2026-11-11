/**
 * Pure geometry models for the 3D Geometry workspace.
 *
 * Each model owns its parameters and knows:
 *  - which sides, radii, angles and heights exist (dimensions),
 *  - how to change one dimension while keeping the shape valid (apply),
 *  - the derived measurements and step-by-step working.
 *
 * Everything is in real units (1 unit = 1 cm, or whatever unit the user picks).
 * The 3D view draws these exact numbers, so the picture is to scale.
 */
import { calculateCircle, calculateFrustumCone, calculateRegularPolygon } from '../utils/mathEngine.ts';

export type ShapeId = 'triangle' | 'circle' | 'polygon' | 'frustum';

export interface Dimension {
  /** Stable id used by the 3D view and the editor, for example "side-a" or "angle-C". */
  id: string;
  kind: 'length' | 'angle';
  /** Short symbol shown on the shape, for example "a", "α", "R". */
  symbol: string;
  /** Plain-language name shown in the list. */
  name: string;
  value: number;
}

export type EditResult<P> = { ok: true; params: P; note?: string } | { ok: false; error: string };

export interface Measure {
  label: string;
  value: string;
}

export interface ShapeModel<P> {
  id: ShapeId;
  name: string;
  defaults: P;
  dimensions(p: P): Dimension[];
  apply(p: P, dimensionId: string, value: number): EditResult<P>;
  /** Headline numbers shown as cards. */
  summary(p: P): Measure[];
  /** Secondary numbers and identities. */
  details(p: P): Measure[];
  steps(p: P): { formula: string; lines: string[] };
  /** Short hint shown next to the dimension list. */
  hint: string;
}

const EPS = 1e-9;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const fail = (error: string) => ({ ok: false as const, error });
const isPositive = (v: number) => Number.isFinite(v) && v > EPS;

/* ------------------------------------------------------------------ */
/* Triangle: three sides a (BC), b (CA), c (AB). Angles A, B, C are opposite the sides. */
/* ------------------------------------------------------------------ */

export interface TriangleParams {
  a: number;
  b: number;
  c: number;
}

export function triangleAngles(p: TriangleParams) {
  const { a, b, c } = p;
  const clamp = (x: number) => Math.min(1, Math.max(-1, x));
  return {
    A: toDeg(Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c)))),
    B: toDeg(Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c)))),
    C: toDeg(Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b)))),
  };
}

/** Vertex positions with B at the origin, C on the x-axis, A above it. */
export function triangleVertices(p: TriangleParams) {
  const { a, b, c } = p;
  const ax = (c * c + a * a - b * b) / (2 * a);
  const ay = Math.sqrt(Math.max(0, c * c - ax * ax));
  return {
    A: { x: ax, y: ay },
    B: { x: 0, y: 0 },
    C: { x: a, y: 0 },
  };
}

function triangleInequalityRange(p: TriangleParams, side: 'a' | 'b' | 'c') {
  const others = (['a', 'b', 'c'] as const).filter((s) => s !== side).map((s) => p[s]);
  return { lo: Math.abs(others[0] - others[1]), hi: others[0] + others[1] };
}

export const triangleModel: ShapeModel<TriangleParams> = {
  id: 'triangle',
  name: 'Triangle',
  defaults: { a: 6, b: 8, c: 10 },
  hint: 'Changing a side keeps the other two sides. Changing an angle keeps the two sides beside it and adjusts the side opposite.',
  dimensions(p) {
    const ang = triangleAngles(p);
    return [
      { id: 'side-a', kind: 'length', symbol: 'a', name: 'Side BC', value: p.a },
      { id: 'side-b', kind: 'length', symbol: 'b', name: 'Side CA', value: p.b },
      { id: 'side-c', kind: 'length', symbol: 'c', name: 'Side AB', value: p.c },
      { id: 'angle-A', kind: 'angle', symbol: 'A', name: 'Angle at A', value: ang.A },
      { id: 'angle-B', kind: 'angle', symbol: 'B', name: 'Angle at B', value: ang.B },
      { id: 'angle-C', kind: 'angle', symbol: 'C', name: 'Angle at C', value: ang.C },
    ];
  },
  apply(p, id, v) {
    if (id.startsWith('side-')) {
      if (!isPositive(v)) return fail('A side must be greater than 0.');
      const side = id.slice(5) as 'a' | 'b' | 'c';
      const next = { ...p, [side]: v };
      const { lo, hi } = triangleInequalityRange(next, side);
      if (!(v > lo + EPS && v < hi - EPS)) {
        return fail(`Side ${side} must be greater than ${lo.toFixed(2)} and less than ${hi.toFixed(2)} for these two sides to close a triangle.`);
      }
      return { ok: true, params: next };
    }
    if (id.startsWith('angle-')) {
      const vertex = id.slice(6) as 'A' | 'B' | 'C';
      if (!(v > EPS && v < 180 - EPS)) return fail('An angle must be between 0° and 180°.');
      const rad = toRad(v);
      const { a, b, c } = p;
      // Keep the two sides beside the angle, and recompute the side opposite it.
      if (vertex === 'A') {
        const next = { ...p, a: Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad)) };
        return { ok: true, params: next, note: `Side a became ${next.a.toFixed(2)} so that angle A is ${v.toFixed(1)}°.` };
      }
      if (vertex === 'B') {
        const next = { ...p, b: Math.sqrt(a * a + c * c - 2 * a * c * Math.cos(rad)) };
        return { ok: true, params: next, note: `Side b became ${next.b.toFixed(2)} so that angle B is ${v.toFixed(1)}°.` };
      }
      const next = { ...p, c: Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(rad)) };
      return { ok: true, params: next, note: `Side c became ${next.c.toFixed(2)} so that angle C is ${v.toFixed(1)}°.` };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    const { a, b, c } = p;
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    return [
      { label: 'Area', value: area.toFixed(2) },
      { label: 'Perimeter', value: (a + b + c).toFixed(2) },
    ];
  },
  details(p) {
    const { a, b, c } = p;
    const ang = triangleAngles(p);
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    const maxAngle = Math.max(ang.A, ang.B, ang.C);
    const sideKind =
      Math.abs(a - b) < 1e-6 && Math.abs(b - c) < 1e-6
        ? 'Equilateral'
        : Math.abs(a - b) < 1e-6 || Math.abs(b - c) < 1e-6 || Math.abs(a - c) < 1e-6
          ? 'Isosceles'
          : 'Scalene';
    const angleKind = Math.abs(maxAngle - 90) < 0.05 ? 'right' : maxAngle > 90 ? 'obtuse' : 'acute';
    return [
      { label: 'Type', value: `${sideKind}, ${angleKind}` },
      { label: 'Angle sum', value: `${(ang.A + ang.B + ang.C).toFixed(1)}°` },
      { label: 'Altitude from A', value: (2 * area / a).toFixed(2) },
      { label: 'Inradius', value: (area / s).toFixed(2) },
      { label: 'Circumradius', value: (a * b * c / (4 * area)).toFixed(2) },
    ];
  },
  steps(p) {
    const { a, b, c } = p;
    const ang = triangleAngles(p);
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    return {
      formula: 'Law of cosines: a² = b² + c² − 2bc·cos A | Heron: A = √(s(s−a)(s−b)(s−c))',
      lines: [
        `Given: a = ${a.toFixed(2)}, b = ${b.toFixed(2)}, c = ${c.toFixed(2)}`,
        `1. Angle A: cos A = (b² + c² − a²) / (2bc) → A = ${ang.A.toFixed(2)}°`,
        `2. Angle B: cos B = (a² + c² − b²) / (2ac) → B = ${ang.B.toFixed(2)}°`,
        `3. Angle C: C = 180° − A − B = ${ang.C.toFixed(2)}°`,
        `4. Semi-perimeter: s = (a + b + c) / 2 = ${s.toFixed(2)}`,
        `5. Area (Heron): √(${s.toFixed(2)} × ${(s - a).toFixed(2)} × ${(s - b).toFixed(2)} × ${(s - c).toFixed(2)}) = ${area.toFixed(2)}`,
        `6. Perimeter: a + b + c = ${(a + b + c).toFixed(2)}`,
      ],
    };
  },
};

/* ------------------------------------------------------------------ */
/* Circle */
/* ------------------------------------------------------------------ */

export interface CircleParams {
  r: number;
}

export const circleModel: ShapeModel<CircleParams> = {
  id: 'circle',
  name: 'Circle',
  defaults: { r: 5 },
  hint: 'The radius and the diameter describe the same circle, so changing one changes the other.',
  dimensions(p) {
    return [
      { id: 'radius', kind: 'length', symbol: 'r', name: 'Radius', value: p.r },
      { id: 'diameter', kind: 'length', symbol: 'd', name: 'Diameter', value: 2 * p.r },
    ];
  },
  apply(_p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'radius') return { ok: true, params: { r: v } };
    if (id === 'diameter') return { ok: true, params: { r: v / 2 } };
    return fail('Unknown dimension.');
  },
  summary(p) {
    return [
      { label: 'Area', value: (Math.PI * p.r * p.r).toFixed(2) },
      { label: 'Circumference', value: (2 * Math.PI * p.r).toFixed(2) },
    ];
  },
  details(p) {
    return [
      { label: 'Diameter', value: (2 * p.r).toFixed(2) },
      { label: 'Radius', value: p.r.toFixed(2) },
    ];
  },
  steps(p) {
    const res = calculateCircle(p.r);
    return { formula: res.formula, lines: res.stepByStep };
  },
};

/* ------------------------------------------------------------------ */
/* Regular polygon: n equal sides of length s */
/* ------------------------------------------------------------------ */

export interface PolygonParams {
  n: number;
  s: number;
}

export const polygonModel: ShapeModel<PolygonParams> = {
  id: 'polygon',
  name: 'Regular polygon',
  defaults: { n: 6, s: 7 },
  hint: 'All sides and all angles of a regular polygon are equal. Tapping a side changes every side. Tapping the interior angle changes the number of sides, so it must give a whole number.',
  dimensions(p) {
    const R = p.s / (2 * Math.sin(Math.PI / p.n));
    return [
      { id: 'side', kind: 'length', symbol: 's', name: 'Side length', value: p.s },
      { id: 'radius', kind: 'length', symbol: 'R', name: 'Circumradius', value: R },
      { id: 'interior', kind: 'angle', symbol: 'θ', name: 'Interior angle', value: ((p.n - 2) * 180) / p.n },
    ];
  },
  apply(p, id, v) {
    if (id === 'side') {
      if (!isPositive(v)) return fail('The side length must be greater than 0.');
      return { ok: true, params: { ...p, s: v } };
    }
    if (id === 'radius') {
      if (!isPositive(v)) return fail('The radius must be greater than 0.');
      return { ok: true, params: { ...p, s: 2 * v * Math.sin(Math.PI / p.n) } };
    }
    if (id === 'interior') {
      if (!(v > EPS && v < 180 - EPS)) return fail('An interior angle must be between 0° and 180°.');
      const exact = 360 / (180 - v);
      const n = Math.round(exact);
      if (Math.abs(exact - n) > 1e-6 || n < 3) {
        const lower = Math.max(3, Math.floor(exact));
        const upper = Math.max(3, Math.ceil(exact));
        const angleFor = (k: number) => ((k - 2) * 180) / k;
        return fail(`No regular polygon has an interior angle of ${v.toFixed(1)}°. The nearest are ${lower} sides (${angleFor(lower).toFixed(1)}°) and ${upper} sides (${angleFor(upper).toFixed(1)}°).`);
      }
      return { ok: true, params: { ...p, n }, note: `A regular polygon with ${v.toFixed(1)}° interior angle has ${n} sides.` };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    const res = calculateRegularPolygon(p.n, p.s / (2 * Math.sin(Math.PI / p.n)));
    return [
      { label: 'Area', value: res.area.toFixed(2) },
      { label: 'Perimeter', value: (p.n * p.s).toFixed(2) },
    ];
  },
  details(p) {
    const apothem = p.s / (2 * Math.tan(Math.PI / p.n));
    return [
      { label: 'Sides', value: String(p.n) },
      { label: 'Interior angle', value: `${(((p.n - 2) * 180) / p.n).toFixed(1)}°` },
      { label: 'Central angle', value: `${(360 / p.n).toFixed(1)}°` },
      { label: 'Apothem', value: apothem.toFixed(2) },
    ];
  },
  steps(p) {
    const R = p.s / (2 * Math.sin(Math.PI / p.n));
    const res = calculateRegularPolygon(p.n, R);
    return { formula: res.formula, lines: res.stepByStep };
  },
};

/* ------------------------------------------------------------------ */
/* Frustum: a cone with the top cut off. r1 bottom radius, r2 top radius, h height. */
/* ------------------------------------------------------------------ */

export interface FrustumParams {
  r1: number;
  r2: number;
  h: number;
}

/** Angle between the slanted side and the bottom base, measured on the outside. */
export function frustumRimAngle(p: FrustumParams): number {
  const d = p.r1 - p.r2;
  if (Math.abs(d) < EPS) return 90;
  return d > 0 ? toDeg(Math.atan2(p.h, d)) : 180 - toDeg(Math.atan2(p.h, -d));
}

export const frustumModel: ShapeModel<FrustumParams> = {
  id: 'frustum',
  name: 'Truncated cone',
  defaults: { r1: 7, r2: 3.5, h: 8 },
  hint: 'Changing the slanted side or the rim angle recalculates the height, so the shape stays a valid truncated cone.',
  dimensions(p) {
    const slant = Math.sqrt(p.h * p.h + (p.r1 - p.r2) ** 2);
    return [
      { id: 'radius-bottom', kind: 'length', symbol: 'R', name: 'Bottom radius', value: p.r1 },
      { id: 'radius-top', kind: 'length', symbol: 'r', name: 'Top radius', value: p.r2 },
      { id: 'height', kind: 'length', symbol: 'h', name: 'Height', value: p.h },
      { id: 'slant', kind: 'length', symbol: 'l', name: 'Slant side', value: slant },
      { id: 'rim-angle', kind: 'angle', symbol: 'φ', name: 'Rim angle (bottom)', value: frustumRimAngle(p) },
    ];
  },
  apply(p, id, v) {
    if (id === 'radius-bottom') {
      if (!isPositive(v)) return fail('The bottom radius must be greater than 0.');
      return { ok: true, params: { ...p, r1: v } };
    }
    if (id === 'radius-top') {
      if (!isPositive(v)) return fail('The top radius must be greater than 0.');
      return { ok: true, params: { ...p, r2: v } };
    }
    if (id === 'height') {
      if (!isPositive(v)) return fail('The height must be greater than 0.');
      return { ok: true, params: { ...p, h: v } };
    }
    if (id === 'slant') {
      const d = Math.abs(p.r1 - p.r2);
      if (!(v > d + EPS)) return fail(`The slanted side must be longer than the difference of the radii (${d.toFixed(2)}).`);
      return { ok: true, params: { ...p, h: Math.sqrt(v * v - d * d) } };
    }
    if (id === 'rim-angle') {
      if (!(v > EPS && v < 180 - EPS)) return fail('The rim angle must be between 0° and 180°.');
      const rad = toRad(v);
      if (Math.abs(v - 90) < 1e-6) {
        if (Math.abs(p.r1 - p.r2) > EPS) return fail('A 90° rim angle needs the top and bottom radii to be equal (a cylinder).');
        return fail('A cylinder has a 90° rim angle, so the height cannot be set from it. Change the height instead.');
      }
      if (v < 90) {
        if (!(p.r1 > p.r2)) return fail('A rim angle below 90° needs the bottom radius to be larger than the top radius.');
        return { ok: true, params: { ...p, h: (p.r1 - p.r2) * Math.tan(rad) } };
      }
      if (!(p.r2 > p.r1)) return fail('A rim angle above 90° needs the top radius to be larger than the bottom radius.');
      return { ok: true, params: { ...p, h: (p.r2 - p.r1) * Math.tan(Math.PI - rad) } };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    const res = calculateFrustumCone(p.r1, p.r2, p.h);
    return [
      { label: 'Volume', value: Number(res.secondaryMetrics['Volume (V)']).toFixed(2) },
      { label: 'Surface area', value: res.area.toFixed(2) },
    ];
  },
  details(p) {
    const res = calculateFrustumCone(p.r1, p.r2, p.h);
    return [
      { label: 'Slant side', value: Number(res.secondaryMetrics['Slant Height (s)']).toFixed(2) },
      { label: 'Lateral area', value: Number(res.secondaryMetrics['Lateral Area']).toFixed(2) },
      { label: 'Rim angle', value: `${frustumRimAngle(p).toFixed(1)}°` },
    ];
  },
  steps(p) {
    const res = calculateFrustumCone(p.r1, p.r2, p.h);
    return { formula: res.formula, lines: res.stepByStep };
  },
};

export const MODELS = {
  triangle: triangleModel,
  circle: circleModel,
  polygon: polygonModel,
  frustum: frustumModel,
} as const;

export const DEFAULT_PARAMS = {
  triangle: triangleModel.defaults,
  circle: circleModel.defaults,
  polygon: polygonModel.defaults,
  frustum: frustumModel.defaults,
};

export type AllParams = typeof DEFAULT_PARAMS;
