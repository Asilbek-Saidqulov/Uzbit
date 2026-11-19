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

export type ShapeId =
  | 'triangle'
  | 'circle'
  | 'polygon'
  | 'cube'
  | 'cuboid'
  | 'tetrahedron'
  | 'octahedron'
  | 'icosahedron'
  | 'dodecahedron'
  | 'pyramid'
  | 'prism'
  | 'cylinder'
  | 'cone'
  | 'frustum'
  | 'sphere';

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


/* ------------------------------------------------------------------ */
/* 3D solids                                                           */
/* ------------------------------------------------------------------ */

const f2 = (n: number) => n.toFixed(2);
const len3 = (id: string, symbol: string, name: string, value: number): Dimension => ({ id, kind: 'length', symbol, name, value });

/* ----- Cube: edge a ----- */

export interface CubeParams {
  a: number;
}

export const cubeModel: ShapeModel<CubeParams> = {
  id: 'cube',
  name: 'Cube',
  defaults: { a: 6 },
  hint: 'All 12 edges of a cube are equal, so changing any length (edge, face diagonal or space diagonal) rescales the whole cube.',
  dimensions(p) {
    return [
      len3('edge', 'a', 'Edge', p.a),
      len3('diag-face', 'd', 'Face diagonal', p.a * Math.SQRT2),
      len3('diag-space', 'D', 'Space diagonal', p.a * Math.sqrt(3)),
    ];
  },
  apply(p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'edge') return { ok: true, params: { a: v } };
    if (id === 'diag-face') return { ok: true, params: { a: v / Math.SQRT2 } };
    if (id === 'diag-space') return { ok: true, params: { a: v / Math.sqrt(3) } };
    return fail('Unknown dimension.');
  },
  summary(p) {
    return [
      { label: 'Volume', value: f2(p.a ** 3) },
      { label: 'Surface area', value: f2(6 * p.a ** 2) },
    ];
  },
  details(p) {
    return [
      { label: 'Face area', value: f2(p.a ** 2) },
      { label: 'Total edge length', value: f2(12 * p.a) },
      { label: 'Inscribed sphere radius', value: f2(p.a / 2) },
      { label: 'Circumscribed sphere radius', value: f2((p.a * Math.sqrt(3)) / 2) },
      { label: 'Faces', value: '6' },
      { label: 'Vertices', value: '8' },
      { label: 'Edges', value: '12' },
    ];
  },
  steps(p) {
    const a = p.a;
    return {
      formula: 'V = a³ | S = 6a² | d = a√2 | D = a√3',
      lines: [
        `Given: edge a = ${f2(a)}`,
        `1. Volume: V = a³ = ${f2(a)}³ = ${f2(a ** 3)}`,
        `2. Surface area: S = 6a² = 6 × ${f2(a * a)} = ${f2(6 * a * a)}`,
        `3. Face diagonal: d = a√2 = ${f2(a * Math.SQRT2)}`,
        `4. Space diagonal: D = a√3 = ${f2(a * Math.sqrt(3))}`,
      ],
    };
  },
};

/* ----- Cuboid: length l, width w, height h ----- */

export interface CuboidParams {
  l: number;
  w: number;
  h: number;
}

export const cuboidModel: ShapeModel<CuboidParams> = {
  id: 'cuboid',
  name: 'Cuboid',
  defaults: { l: 8, w: 5, h: 4 },
  hint: 'Length, width and height are independent. Changing the space diagonal scales the box and keeps its proportions.',
  dimensions(p) {
    return [
      len3('length', 'l', 'Length', p.l),
      len3('width', 'w', 'Width', p.w),
      len3('height', 'h', 'Height', p.h),
      len3('diag-space', 'D', 'Space diagonal', Math.sqrt(p.l ** 2 + p.w ** 2 + p.h ** 2)),
    ];
  },
  apply(p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'length') return { ok: true, params: { ...p, l: v } };
    if (id === 'width') return { ok: true, params: { ...p, w: v } };
    if (id === 'height') return { ok: true, params: { ...p, h: v } };
    if (id === 'diag-space') {
      const k = v / Math.sqrt(p.l ** 2 + p.w ** 2 + p.h ** 2);
      return { ok: true, params: { l: p.l * k, w: p.w * k, h: p.h * k }, note: `All three sides were scaled by ${k.toFixed(3)} to give a space diagonal of ${v.toFixed(2)}.` };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    return [
      { label: 'Volume', value: f2(p.l * p.w * p.h) },
      { label: 'Surface area', value: f2(2 * (p.l * p.w + p.l * p.h + p.w * p.h)) },
    ];
  },
  details(p) {
    return [
      { label: 'Base area', value: f2(p.l * p.w) },
      { label: 'Lateral area', value: f2(2 * p.h * (p.l + p.w)) },
      { label: 'Base diagonal', value: f2(Math.hypot(p.l, p.w)) },
      { label: 'Total edge length', value: f2(4 * (p.l + p.w + p.h)) },
      { label: 'Faces', value: '6' },
      { label: 'Vertices', value: '8' },
      { label: 'Edges', value: '12' },
    ];
  },
  steps(p) {
    const { l, w, h } = p;
    return {
      formula: 'V = l·w·h | S = 2(lw + lh + wh) | D = √(l² + w² + h²)',
      lines: [
        `Given: l = ${f2(l)}, w = ${f2(w)}, h = ${f2(h)}`,
        `1. Volume: V = ${f2(l)} × ${f2(w)} × ${f2(h)} = ${f2(l * w * h)}`,
        `2. Surface area: S = 2(${f2(l * w)} + ${f2(l * h)} + ${f2(w * h)}) = ${f2(2 * (l * w + l * h + w * h))}`,
        `3. Base diagonal: √(l² + w²) = ${f2(Math.hypot(l, w))}`,
        `4. Space diagonal: D = √(l² + w² + h²) = ${f2(Math.sqrt(l * l + w * w + h * h))}`,
      ],
    };
  },
};

/* ----- Regular (Platonic) solids: one edge length a ----- */

export interface RegularParams {
  a: number;
}

interface RegularConfig {
  id: ShapeId;
  name: string;
  defaultEdge: number;
  /** Circumradius / edge. */
  radiusRatio: number;
  /** Inradius / edge. */
  inradiusRatio: number;
  /** Volume = volumeCoef · a³. */
  volumeCoef: number;
  /** Surface area = areaCoef · a². */
  areaCoef: number;
  dihedral: number;
  faces: number;
  vertices: number;
  edges: number;
  faceName: string;
  formula: string;
  volumeText: string;
  areaText: string;
  /** Extra editable lengths that are a fixed multiple of the edge. */
  extra?: { id: string; symbol: string; name: string; ratio: number }[];
}

function regularModel(cfg: RegularConfig): ShapeModel<RegularParams> {
  const extra = cfg.extra ?? [];
  return {
    id: cfg.id,
    name: cfg.name,
    defaults: { a: cfg.defaultEdge },
    hint: `Every edge of a regular ${cfg.name.toLowerCase()} is equal, so changing the edge, the radius or any other length rescales the whole solid.`,
    dimensions(p) {
      return [
        len3('edge', 'a', 'Edge', p.a),
        len3('radius', 'R', 'Circumradius (centre to vertex)', p.a * cfg.radiusRatio),
        ...extra.map((e) => len3(e.id, e.symbol, e.name, p.a * e.ratio)),
      ];
    },
    apply(p, id, v) {
      if (!isPositive(v)) return fail('The length must be greater than 0.');
      if (id === 'edge') return { ok: true, params: { a: v } };
      if (id === 'radius') return { ok: true, params: { a: v / cfg.radiusRatio } };
      const e = extra.find((x) => x.id === id);
      if (e) return { ok: true, params: { a: v / e.ratio } };
      return fail('Unknown dimension.');
    },
    summary(p) {
      return [
        { label: 'Volume', value: f2(cfg.volumeCoef * p.a ** 3) },
        { label: 'Surface area', value: f2(cfg.areaCoef * p.a ** 2) },
      ];
    },
    details(p) {
      return [
        { label: 'Area of one face', value: f2((cfg.areaCoef * p.a ** 2) / cfg.faces) },
        { label: 'Inscribed sphere radius', value: f2(p.a * cfg.inradiusRatio) },
        { label: 'Total edge length', value: f2(p.a * cfg.edges) },
        { label: 'Dihedral angle', value: `${cfg.dihedral.toFixed(2)}°` },
        { label: 'Faces', value: `${cfg.faces} (${cfg.faceName})` },
        { label: 'Vertices', value: String(cfg.vertices) },
        { label: 'Edges', value: String(cfg.edges) },
      ];
    },
    steps(p) {
      const a = p.a;
      return {
        formula: cfg.formula,
        lines: [
          `Given: edge a = ${f2(a)}`,
          `1. Volume: V = ${cfg.volumeText} = ${f2(cfg.volumeCoef * a ** 3)}`,
          `2. Surface area: S = ${cfg.areaText} = ${f2(cfg.areaCoef * a ** 2)}`,
          `3. Circumradius: R = ${cfg.radiusRatio.toFixed(5)}·a = ${f2(a * cfg.radiusRatio)}`,
          `4. Inradius: r = ${cfg.inradiusRatio.toFixed(5)}·a = ${f2(a * cfg.inradiusRatio)}`,
          `5. Edges: ${cfg.edges} × a = ${f2(a * cfg.edges)}`,
        ],
      };
    },
  };
}

const SQRT5 = Math.sqrt(5);

export const tetrahedronModel = regularModel({
  id: 'tetrahedron',
  name: 'Tetrahedron',
  defaultEdge: 6,
  radiusRatio: Math.sqrt(6) / 4,
  inradiusRatio: Math.sqrt(6) / 12,
  volumeCoef: Math.SQRT2 / 12,
  areaCoef: Math.sqrt(3),
  dihedral: (Math.acos(1 / 3) * 180) / Math.PI,
  faces: 4,
  vertices: 4,
  edges: 6,
  faceName: 'triangles',
  formula: 'V = a³√2 / 12 | S = a²√3 | h = a√(2/3)',
  volumeText: 'a³√2 / 12',
  areaText: 'a²√3',
  extra: [{ id: 'height', symbol: 'h', name: 'Height (apex to base)', ratio: Math.sqrt(2 / 3) }],
});

export const octahedronModel = regularModel({
  id: 'octahedron',
  name: 'Octahedron',
  defaultEdge: 5,
  radiusRatio: Math.SQRT1_2,
  inradiusRatio: Math.sqrt(6) / 6,
  volumeCoef: Math.SQRT2 / 3,
  areaCoef: 2 * Math.sqrt(3),
  dihedral: (Math.acos(-1 / 3) * 180) / Math.PI,
  faces: 8,
  vertices: 6,
  edges: 12,
  faceName: 'triangles',
  formula: 'V = a³√2 / 3 | S = 2a²√3 | diagonal = a√2',
  volumeText: 'a³√2 / 3',
  areaText: '2a²√3',
  extra: [{ id: 'diagonal', symbol: 'D', name: 'Height (vertex to vertex)', ratio: Math.SQRT2 }],
});

export const icosahedronModel = regularModel({
  id: 'icosahedron',
  name: 'Icosahedron',
  defaultEdge: 4,
  radiusRatio: Math.sin((2 * Math.PI) / 5),
  inradiusRatio: (3 * Math.sqrt(3) + Math.sqrt(15)) / 12,
  volumeCoef: (5 * (3 + SQRT5)) / 12,
  areaCoef: 5 * Math.sqrt(3),
  dihedral: (Math.acos(-SQRT5 / 3) * 180) / Math.PI,
  faces: 20,
  vertices: 12,
  edges: 30,
  faceName: 'triangles',
  formula: 'V = 5(3 + √5)a³ / 12 | S = 5a²√3',
  volumeText: '5(3 + √5)a³ / 12',
  areaText: '5a²√3',
});

export const dodecahedronModel = regularModel({
  id: 'dodecahedron',
  name: 'Dodecahedron',
  defaultEdge: 3,
  radiusRatio: (Math.sqrt(3) * (1 + SQRT5)) / 4,
  inradiusRatio: Math.sqrt(250 + 110 * SQRT5) / 20,
  volumeCoef: (15 + 7 * SQRT5) / 4,
  areaCoef: 3 * Math.sqrt(25 + 10 * SQRT5),
  dihedral: (Math.acos(-1 / SQRT5) * 180) / Math.PI,
  faces: 12,
  vertices: 20,
  edges: 30,
  faceName: 'pentagons',
  formula: 'V = (15 + 7√5)a³ / 4 | S = 3√(25 + 10√5)·a²',
  volumeText: '(15 + 7√5)a³ / 4',
  areaText: '3√(25 + 10√5)·a²',
});

/* ----- Rectangular pyramid: base length l, base width w, height h ----- */

export interface PyramidParams {
  l: number;
  w: number;
  h: number;
}

export function pyramidSlants(p: PyramidParams) {
  return {
    /** Slant height of the faces that stand on the length edges. */
    onLength: Math.sqrt(p.h ** 2 + (p.w / 2) ** 2),
    /** Slant height of the faces that stand on the width edges. */
    onWidth: Math.sqrt(p.h ** 2 + (p.l / 2) ** 2),
    /** Edge from the apex to a base corner. */
    lateral: Math.sqrt(p.h ** 2 + (p.l ** 2 + p.w ** 2) / 4),
  };
}

export const pyramidModel: ShapeModel<PyramidParams> = {
  id: 'pyramid',
  name: 'Pyramid',
  defaults: { l: 8, w: 6, h: 7 },
  hint: 'The apex sits straight above the centre of the rectangular base. Changing the slanted edge recalculates the height.',
  dimensions(p) {
    return [
      len3('length', 'l', 'Base length', p.l),
      len3('width', 'w', 'Base width', p.w),
      len3('height', 'h', 'Height', p.h),
      len3('lateral', 'e', 'Slanted edge (apex to corner)', pyramidSlants(p).lateral),
    ];
  },
  apply(p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'length') return { ok: true, params: { ...p, l: v } };
    if (id === 'width') return { ok: true, params: { ...p, w: v } };
    if (id === 'height') return { ok: true, params: { ...p, h: v } };
    if (id === 'lateral') {
      const half = Math.sqrt(p.l ** 2 + p.w ** 2) / 2;
      if (!(v > half + EPS)) return fail(`The slanted edge must be longer than half the base diagonal (${half.toFixed(2)}).`);
      return { ok: true, params: { ...p, h: Math.sqrt(v * v - half * half) } };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    const s = pyramidSlants(p);
    return [
      { label: 'Volume', value: f2((p.l * p.w * p.h) / 3) },
      { label: 'Surface area', value: f2(p.l * p.w + p.l * s.onLength + p.w * s.onWidth) },
    ];
  },
  details(p) {
    const s = pyramidSlants(p);
    return [
      { label: 'Base area', value: f2(p.l * p.w) },
      { label: 'Lateral area', value: f2(p.l * s.onLength + p.w * s.onWidth) },
      { label: 'Slant height (on length edge)', value: f2(s.onLength) },
      { label: 'Slant height (on width edge)', value: f2(s.onWidth) },
      { label: 'Faces', value: '5' },
      { label: 'Vertices', value: '5' },
      { label: 'Edges', value: '8' },
    ];
  },
  steps(p) {
    const s = pyramidSlants(p);
    return {
      formula: 'V = l·w·h / 3 | S = lw + l·s₁ + w·s₂',
      lines: [
        `Given: l = ${f2(p.l)}, w = ${f2(p.w)}, h = ${f2(p.h)}`,
        `1. Volume: V = ${f2(p.l)} × ${f2(p.w)} × ${f2(p.h)} / 3 = ${f2((p.l * p.w * p.h) / 3)}`,
        `2. Slant on length edge: s₁ = √(h² + (w/2)²) = ${f2(s.onLength)}`,
        `3. Slant on width edge: s₂ = √(h² + (l/2)²) = ${f2(s.onWidth)}`,
        `4. Surface area: S = ${f2(p.l * p.w)} + ${f2(p.l * s.onLength)} + ${f2(p.w * s.onWidth)} = ${f2(p.l * p.w + p.l * s.onLength + p.w * s.onWidth)}`,
        `5. Slanted edge: e = √(h² + (l² + w²)/4) = ${f2(s.lateral)}`,
      ],
    };
  },
};

/* ----- Triangular prism: isosceles triangle (base b, height t) extruded over length L ----- */

export interface PrismParams {
  b: number;
  t: number;
  L: number;
}

export const prismModel: ShapeModel<PrismParams> = {
  id: 'prism',
  name: 'Triangular prism',
  defaults: { b: 6, t: 5, L: 9 },
  hint: 'The cross-section is an isosceles triangle with base b and height t. The prism length L runs from the front triangle to the back one.',
  dimensions(p) {
    return [
      len3('base', 'b', 'Triangle base', p.b),
      len3('tri-height', 't', 'Triangle height', p.t),
      len3('length', 'L', 'Prism length', p.L),
      len3('slant', 's', 'Triangle slanted side', Math.sqrt(p.t ** 2 + (p.b / 2) ** 2)),
    ];
  },
  apply(p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'base') return { ok: true, params: { ...p, b: v } };
    if (id === 'tri-height') return { ok: true, params: { ...p, t: v } };
    if (id === 'length') return { ok: true, params: { ...p, L: v } };
    if (id === 'slant') {
      const half = p.b / 2;
      if (!(v > half + EPS)) return fail(`The slanted side must be longer than half the base (${half.toFixed(2)}).`);
      return { ok: true, params: { ...p, t: Math.sqrt(v * v - half * half) } };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    const s = Math.sqrt(p.t ** 2 + (p.b / 2) ** 2);
    const tri = (p.b * p.t) / 2;
    return [
      { label: 'Volume', value: f2(tri * p.L) },
      { label: 'Surface area', value: f2(2 * tri + (p.b + 2 * s) * p.L) },
    ];
  },
  details(p) {
    const s = Math.sqrt(p.t ** 2 + (p.b / 2) ** 2);
    return [
      { label: 'Triangle area', value: f2((p.b * p.t) / 2) },
      { label: 'Triangle perimeter', value: f2(p.b + 2 * s) },
      { label: 'Lateral area', value: f2((p.b + 2 * s) * p.L) },
      { label: 'Faces', value: '5' },
      { label: 'Vertices', value: '6' },
      { label: 'Edges', value: '9' },
    ];
  },
  steps(p) {
    const s = Math.sqrt(p.t ** 2 + (p.b / 2) ** 2);
    const tri = (p.b * p.t) / 2;
    return {
      formula: 'V = (b·t / 2)·L | S = b·t + (b + 2s)·L',
      lines: [
        `Given: b = ${f2(p.b)}, t = ${f2(p.t)}, L = ${f2(p.L)}`,
        `1. Triangle area: b·t / 2 = ${f2(tri)}`,
        `2. Volume: V = ${f2(tri)} × ${f2(p.L)} = ${f2(tri * p.L)}`,
        `3. Slanted side: s = √(t² + (b/2)²) = ${f2(s)}`,
        `4. Surface area: S = 2 × ${f2(tri)} + ${f2(p.b + 2 * s)} × ${f2(p.L)} = ${f2(2 * tri + (p.b + 2 * s) * p.L)}`,
      ],
    };
  },
};

/* ----- Cylinder: radius r, height h ----- */

export interface CylinderParams {
  r: number;
  h: number;
}

export const cylinderModel: ShapeModel<CylinderParams> = {
  id: 'cylinder',
  name: 'Cylinder',
  defaults: { r: 3, h: 8 },
  hint: 'The radius and the diameter describe the same circle, so changing one changes the other. The height is independent.',
  dimensions(p) {
    return [
      len3('radius', 'r', 'Radius', p.r),
      len3('diameter', 'd', 'Diameter', 2 * p.r),
      len3('height', 'h', 'Height', p.h),
    ];
  },
  apply(p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'radius') return { ok: true, params: { ...p, r: v } };
    if (id === 'diameter') return { ok: true, params: { ...p, r: v / 2 } };
    if (id === 'height') return { ok: true, params: { ...p, h: v } };
    return fail('Unknown dimension.');
  },
  summary(p) {
    return [
      { label: 'Volume', value: f2(Math.PI * p.r ** 2 * p.h) },
      { label: 'Surface area', value: f2(2 * Math.PI * p.r * (p.r + p.h)) },
    ];
  },
  details(p) {
    return [
      { label: 'Base area', value: f2(Math.PI * p.r ** 2) },
      { label: 'Lateral area', value: f2(2 * Math.PI * p.r * p.h) },
      { label: 'Base circumference', value: f2(2 * Math.PI * p.r) },
    ];
  },
  steps(p) {
    return {
      formula: 'V = πr²h | S = 2πr(r + h)',
      lines: [
        `Given: r = ${f2(p.r)}, h = ${f2(p.h)}`,
        `1. Base area: πr² = ${f2(Math.PI * p.r ** 2)}`,
        `2. Volume: V = ${f2(Math.PI * p.r ** 2)} × ${f2(p.h)} = ${f2(Math.PI * p.r ** 2 * p.h)}`,
        `3. Lateral area: 2πrh = ${f2(2 * Math.PI * p.r * p.h)}`,
        `4. Surface area: S = 2 × ${f2(Math.PI * p.r ** 2)} + ${f2(2 * Math.PI * p.r * p.h)} = ${f2(2 * Math.PI * p.r * (p.r + p.h))}`,
      ],
    };
  },
};

/* ----- Cone: radius r, height h ----- */

export interface ConeParams {
  r: number;
  h: number;
}

export const coneModel: ShapeModel<ConeParams> = {
  id: 'cone',
  name: 'Cone',
  defaults: { r: 4, h: 8 },
  hint: 'Changing the slant height recalculates the height, so the cone stays valid. The slant must be longer than the radius.',
  dimensions(p) {
    return [
      len3('radius', 'r', 'Base radius', p.r),
      len3('height', 'h', 'Height', p.h),
      len3('slant', 'l', 'Slant height', Math.hypot(p.r, p.h)),
    ];
  },
  apply(p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'radius') return { ok: true, params: { ...p, r: v } };
    if (id === 'height') return { ok: true, params: { ...p, h: v } };
    if (id === 'slant') {
      if (!(v > p.r + EPS)) return fail(`The slant height must be longer than the radius (${p.r.toFixed(2)}).`);
      return { ok: true, params: { ...p, h: Math.sqrt(v * v - p.r * p.r) } };
    }
    return fail('Unknown dimension.');
  },
  summary(p) {
    const l = Math.hypot(p.r, p.h);
    return [
      { label: 'Volume', value: f2((Math.PI * p.r ** 2 * p.h) / 3) },
      { label: 'Surface area', value: f2(Math.PI * p.r * (p.r + l)) },
    ];
  },
  details(p) {
    const l = Math.hypot(p.r, p.h);
    return [
      { label: 'Base area', value: f2(Math.PI * p.r ** 2) },
      { label: 'Lateral area', value: f2(Math.PI * p.r * l) },
      { label: 'Half-angle at apex', value: `${((Math.atan2(p.r, p.h) * 180) / Math.PI).toFixed(1)}°` },
    ];
  },
  steps(p) {
    const l = Math.hypot(p.r, p.h);
    return {
      formula: 'V = πr²h / 3 | l = √(r² + h²) | S = πr(r + l)',
      lines: [
        `Given: r = ${f2(p.r)}, h = ${f2(p.h)}`,
        `1. Slant height: l = √(${f2(p.r)}² + ${f2(p.h)}²) = ${f2(l)}`,
        `2. Volume: V = π × ${f2(p.r ** 2)} × ${f2(p.h)} / 3 = ${f2((Math.PI * p.r ** 2 * p.h) / 3)}`,
        `3. Lateral area: πrl = ${f2(Math.PI * p.r * l)}`,
        `4. Surface area: S = ${f2(Math.PI * p.r ** 2)} + ${f2(Math.PI * p.r * l)} = ${f2(Math.PI * p.r * (p.r + l))}`,
      ],
    };
  },
};

/* ----- Sphere: radius r ----- */

export interface SphereParams {
  r: number;
}

export const sphereModel: ShapeModel<SphereParams> = {
  id: 'sphere',
  name: 'Sphere',
  defaults: { r: 5 },
  hint: 'The radius and the diameter describe the same sphere, so changing one changes the other.',
  dimensions(p) {
    return [len3('radius', 'r', 'Radius', p.r), len3('diameter', 'd', 'Diameter', 2 * p.r)];
  },
  apply(_p, id, v) {
    if (!isPositive(v)) return fail('The length must be greater than 0.');
    if (id === 'radius') return { ok: true, params: { r: v } };
    if (id === 'diameter') return { ok: true, params: { r: v / 2 } };
    return fail('Unknown dimension.');
  },
  summary(p) {
    return [
      { label: 'Volume', value: f2((4 / 3) * Math.PI * p.r ** 3) },
      { label: 'Surface area', value: f2(4 * Math.PI * p.r ** 2) },
    ];
  },
  details(p) {
    return [
      { label: 'Great circle area', value: f2(Math.PI * p.r ** 2) },
      { label: 'Great circle circumference', value: f2(2 * Math.PI * p.r) },
    ];
  },
  steps(p) {
    return {
      formula: 'V = 4πr³ / 3 | S = 4πr²',
      lines: [
        `Given: r = ${f2(p.r)}`,
        `1. Volume: V = 4π × ${f2(p.r ** 3)} / 3 = ${f2((4 / 3) * Math.PI * p.r ** 3)}`,
        `2. Surface area: S = 4π × ${f2(p.r ** 2)} = ${f2(4 * Math.PI * p.r ** 2)}`,
      ],
    };
  },
};

export const MODELS = {
  triangle: triangleModel,
  circle: circleModel,
  polygon: polygonModel,
  cube: cubeModel,
  cuboid: cuboidModel,
  tetrahedron: tetrahedronModel,
  octahedron: octahedronModel,
  icosahedron: icosahedronModel,
  dodecahedron: dodecahedronModel,
  pyramid: pyramidModel,
  prism: prismModel,
  cylinder: cylinderModel,
  cone: coneModel,
  frustum: frustumModel,
  sphere: sphereModel,
} as const;

export const DEFAULT_PARAMS = {
  triangle: triangleModel.defaults,
  circle: circleModel.defaults,
  polygon: polygonModel.defaults,
  cube: cubeModel.defaults,
  cuboid: cuboidModel.defaults,
  tetrahedron: tetrahedronModel.defaults,
  octahedron: octahedronModel.defaults,
  icosahedron: icosahedronModel.defaults,
  dodecahedron: dodecahedronModel.defaults,
  pyramid: pyramidModel.defaults,
  prism: prismModel.defaults,
  cylinder: cylinderModel.defaults,
  cone: coneModel.defaults,
  frustum: frustumModel.defaults,
  sphere: sphereModel.defaults,
};

export type AllParams = typeof DEFAULT_PARAMS;
