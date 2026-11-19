/**
 * Pure vertex and face data for the convex solids in the Geometry Lab.
 * No three.js here, so the numbers can be unit-tested against the formulas.
 *
 * Conventions: y is up, every solid is centred on the origin (by bounding box,
 * except the round-ish Platonic solids which are centred on their own centre),
 * and each face is a list of vertex indices wound counter-clockwise from outside.
 */

export type V3 = [number, number, number];

export interface Poly {
  verts: V3[];
  faces: number[][];
}

const PHI = (1 + Math.sqrt(5)) / 2;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const dist = (a: V3, b: V3) => len(sub(a, b));

/** Flip any face that points towards the centre, so every face is wound outward (convex solids only). */
function orient(poly: Poly): Poly {
  const c: V3 = [0, 0, 0];
  poly.verts.forEach((v) => {
    c[0] += v[0] / poly.verts.length;
    c[1] += v[1] / poly.verts.length;
    c[2] += v[2] / poly.verts.length;
  });
  const faces = poly.faces.map((f) => {
    const [p0, p1, p2] = [poly.verts[f[0]], poly.verts[f[1]], poly.verts[f[2]]];
    const n = cross(sub(p1, p0), sub(p2, p0));
    const fc: V3 = [0, 0, 0];
    f.forEach((i) => {
      fc[0] += poly.verts[i][0] / f.length;
      fc[1] += poly.verts[i][1] / f.length;
      fc[2] += poly.verts[i][2] / f.length;
    });
    return dot(n, sub(fc, c)) < 0 ? [...f].reverse() : f;
  });
  return { verts: poly.verts, faces };
}

/* ---------- boxes, pyramids, prisms ---------- */

/**
 * Cuboid: l along x, h along y, w along z. Vertex i has x = bit 0, y = bit 1, z = bit 2
 * (0 = negative side, 1 = positive side), so the front-bottom edge runs 4 → 5.
 */
export function cuboidPoly(l: number, w: number, h: number): Poly {
  const verts: V3[] = [];
  for (let i = 0; i < 8; i++) {
    verts.push([(i & 1 ? 1 : -1) * (l / 2), (i & 2 ? 1 : -1) * (h / 2), (i & 4 ? 1 : -1) * (w / 2)]);
  }
  return orient({
    verts,
    faces: [
      [0, 1, 3, 2],
      [4, 5, 7, 6],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 3, 7, 5],
    ],
  });
}

/** Rectangular pyramid. Base vertices 0..3 at y = -h/2 (front edge is 3 → 2), apex is 4. */
export function pyramidPoly(l: number, w: number, h: number): Poly {
  return orient({
    verts: [
      [-l / 2, -h / 2, -w / 2],
      [l / 2, -h / 2, -w / 2],
      [l / 2, -h / 2, w / 2],
      [-l / 2, -h / 2, w / 2],
      [0, h / 2, 0],
    ],
    faces: [
      [0, 1, 2, 3],
      [0, 1, 4],
      [1, 2, 4],
      [2, 3, 4],
      [3, 0, 4],
    ],
  });
}

/**
 * Triangular prism lying on a rectangular face. The triangle (base b, height t) is in the XY plane
 * and is extruded along z for length L. Front triangle is 0,1,2; back triangle is 3,4,5.
 */
export function prismPoly(b: number, t: number, L: number): Poly {
  const tri: [number, number][] = [
    [-b / 2, -t / 2],
    [b / 2, -t / 2],
    [0, t / 2],
  ];
  const verts: V3[] = [
    ...tri.map(([x, y]) => [x, y, L / 2] as V3),
    ...tri.map(([x, y]) => [x, y, -L / 2] as V3),
  ];
  return orient({
    verts,
    faces: [
      [0, 1, 2],
      [3, 4, 5],
      [0, 1, 4, 3],
      [1, 2, 5, 4],
      [2, 0, 3, 5],
    ],
  });
}

/* ---------- Platonic solids (edge length a) ---------- */

/** Regular tetrahedron standing on a face. Base vertices 1..3 at y = -h/2, apex 0 at y = h/2. */
export function tetrahedronPoly(a: number): Poly {
  const h = a * Math.sqrt(2 / 3);
  const r3 = a / Math.sqrt(3);
  const base: V3[] = [0, 1, 2].map((k) => {
    const t = Math.PI / 2 + (k * 2 * Math.PI) / 3;
    return [r3 * Math.cos(t), -h / 2, r3 * Math.sin(t)] as V3;
  });
  return orient({
    verts: [[0, h / 2, 0], ...base],
    faces: [
      [1, 2, 3],
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
    ],
  });
}

/** Regular octahedron standing on a vertex: 0/1 = ±x, 2/3 = ±y (bottom/top), 4/5 = ±z. */
export function octahedronPoly(a: number): Poly {
  const d = a / Math.SQRT2;
  const verts: V3[] = [
    [d, 0, 0],
    [-d, 0, 0],
    [0, -d, 0],
    [0, d, 0],
    [0, 0, d],
    [0, 0, -d],
  ];
  const faces: number[][] = [];
  for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) faces.push([x, y, z]);
  return orient({ verts, faces });
}

/** Regular icosahedron. Faces are found as every triple of mutually adjacent vertices. */
export function icosahedronPoly(a: number): Poly {
  const k = a / 2; // the base coordinates below give edge length 2
  const raw: V3[] = [];
  for (const s1 of [1, -1])
    for (const s2 of [1, -1]) {
      raw.push([0, s1, s2 * PHI], [s1, s2 * PHI, 0], [s2 * PHI, 0, s1]);
    }
  const verts = raw.map((v) => [v[0] * k, v[1] * k, v[2] * k] as V3);
  const faces: number[][] = [];
  const near = (i: number, j: number) => Math.abs(dist(verts[i], verts[j]) - a) < a * 1e-6;
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++) {
      if (!near(i, j)) continue;
      for (let m = j + 1; m < 12; m++) if (near(i, m) && near(j, m)) faces.push([i, j, m]);
    }
  return orient({ verts, faces });
}

/** Regular dodecahedron. Each pentagon is the 5 vertices closest to an icosahedron-vertex direction. */
export function dodecahedronPoly(a: number): Poly {
  const k = a / (2 / PHI); // base coordinates give edge length 2/φ
  const raw: V3[] = [];
  for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) raw.push([x, y, z]);
  for (const s1 of [1, -1])
    for (const s2 of [1, -1]) {
      raw.push([0, s1 / PHI, s2 * PHI], [s1 / PHI, s2 * PHI, 0], [s2 * PHI, 0, s1 / PHI]);
    }
  const verts = raw.map((v) => [v[0] * k, v[1] * k, v[2] * k] as V3);

  // A pentagon is every set of vertices lying in the plane of three neighbouring vertices
  // (i - j - m along edges). Collect those planes, drop duplicates, then order round each normal.
  const near = (i: number, j: number) => Math.abs(dist(verts[i], verts[j]) - a) < a * 1e-6;
  const seen = new Set<string>();
  const faces: number[][] = [];
  for (let j = 0; j < verts.length; j++) {
    const nb = verts.map((_, i) => i).filter((i) => i !== j && near(i, j));
    for (let x = 0; x < nb.length; x++)
      for (let y = x + 1; y < nb.length; y++) {
        const n0 = cross(sub(verts[nb[x]], verts[j]), sub(verts[nb[y]], verts[j]));
        const nl = len(n0);
        const n: V3 = [n0[0] / nl, n0[1] / nl, n0[2] / nl];
        const d0 = dot(verts[j], n);
        const idx = verts.map((_, i) => i).filter((i) => Math.abs(dot(verts[i], n) - d0) < a * 1e-6);
        if (idx.length !== 5) continue;
        const key = [...idx].sort((p, q) => p - q).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const c: V3 = [0, 0, 0];
        idx.forEach((i) => {
          c[0] += verts[i][0] / 5;
          c[1] += verts[i][1] / 5;
          c[2] += verts[i][2] / 5;
        });
        const e1 = sub(verts[idx[0]], c);
        const e1l = len(e1);
        const u: V3 = [e1[0] / e1l, e1[1] / e1l, e1[2] / e1l];
        const w = cross(n, u);
        const angle = (i: number) => {
          const r = sub(verts[i], c);
          return Math.atan2(dot(r, w), dot(r, u));
        };
        faces.push([...idx].sort((p, q) => angle(p) - angle(q)));
      }
  }
  return orient({ verts, faces });
}

/* ---------- measurements straight from the mesh (used to test the formulas) ---------- */

export function polyVolume(poly: Poly): number {
  let vol = 0;
  for (const f of poly.faces) {
    for (let k = 1; k < f.length - 1; k++) {
      vol += dot(poly.verts[f[0]], cross(poly.verts[f[k]], poly.verts[f[k + 1]])) / 6;
    }
  }
  return Math.abs(vol);
}

export function polyArea(poly: Poly): number {
  let area = 0;
  for (const f of poly.faces) {
    for (let k = 1; k < f.length - 1; k++) {
      const n = cross(sub(poly.verts[f[k]], poly.verts[f[0]]), sub(poly.verts[f[k + 1]], poly.verts[f[0]]));
      area += len(n) / 2;
    }
  }
  return area;
}

/** Distinct edges as index pairs. */
export function polyEdges(poly: Poly): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const f of poly.faces) {
    for (let k = 0; k < f.length; k++) {
      const a = f[k];
      const b = f[(k + 1) % f.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([a, b]);
      }
    }
  }
  return out;
}

export function edgeLength(poly: Poly, e: [number, number]) {
  return dist(poly.verts[e[0]], poly.verts[e[1]]);
}
