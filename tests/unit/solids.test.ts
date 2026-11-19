import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, DEFAULT_PARAMS, type ShapeId } from '../../src/geometry3d/models.ts';
import {
  cuboidPoly,
  dodecahedronPoly,
  edgeLength,
  icosahedronPoly,
  octahedronPoly,
  polyArea,
  polyEdges,
  polyVolume,
  prismPoly,
  pyramidPoly,
  tetrahedronPoly,
  type Poly,
} from '../../src/geometry3d/solidGeometry.ts';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));
const summaryValue = (id: ShapeId, p: any, label: string) =>
  Number((MODELS[id] as any).summary(p).find((m: any) => m.label === label)!.value);
const dim = (id: ShapeId, p: any, dimId: string) => (MODELS[id] as any).dimensions(p).find((d: any) => d.id === dimId)!.value as number;

const POLY_CASES: { id: ShapeId; poly: (p: any) => Poly; edges: number; faces: number; verts: number }[] = [
  { id: 'cube', poly: (p) => cuboidPoly(p.a, p.a, p.a), edges: 12, faces: 6, verts: 8 },
  { id: 'cuboid', poly: (p) => cuboidPoly(p.l, p.w, p.h), edges: 12, faces: 6, verts: 8 },
  { id: 'tetrahedron', poly: (p) => tetrahedronPoly(p.a), edges: 6, faces: 4, verts: 4 },
  { id: 'octahedron', poly: (p) => octahedronPoly(p.a), edges: 12, faces: 8, verts: 6 },
  { id: 'icosahedron', poly: (p) => icosahedronPoly(p.a), edges: 30, faces: 20, verts: 12 },
  { id: 'dodecahedron', poly: (p) => dodecahedronPoly(p.a), edges: 30, faces: 12, verts: 20 },
  { id: 'pyramid', poly: (p) => pyramidPoly(p.l, p.w, p.h), edges: 8, faces: 5, verts: 5 },
  { id: 'prism', poly: (p) => prismPoly(p.b, p.t, p.L), edges: 9, faces: 5, verts: 6 },
];

for (const c of POLY_CASES) {
  test(`${c.id}: formulas match the drawn mesh`, () => {
    const p = DEFAULT_PARAMS[c.id];
    const poly = c.poly(p);
    assert.equal(poly.verts.length, c.verts);
    assert.equal(poly.faces.length, c.faces);
    assert.equal(polyEdges(poly).length, c.edges);
    assert.ok(rel(polyVolume(poly), summaryValue(c.id, p, 'Volume')) < 1e-3, 'volume');
    assert.ok(rel(polyArea(poly), summaryValue(c.id, p, 'Surface area')) < 1e-3, 'surface area');
  });
}

test('Platonic solids: every edge equals a, and the circumradius matches', () => {
  for (const id of ['tetrahedron', 'octahedron', 'icosahedron', 'dodecahedron'] as const) {
    const p = { a: 3.7 };
    const poly = POLY_CASES.find((c) => c.id === id)!.poly(p);
    for (const e of polyEdges(poly)) assert.ok(Math.abs(edgeLength(poly, e) - p.a) < 1e-9, `${id} edge`);
    const R = Math.max(...poly.verts.map((v) => Math.hypot(...v)));
    const min = Math.min(...poly.verts.map((v) => Math.hypot(...v)));
    if (id !== 'tetrahedron') assert.ok(Math.abs(R - dim(id, p, 'radius')) < 1e-9, `${id} radius`);
    if (id !== 'tetrahedron') assert.ok(Math.abs(R - min) < 1e-9, `${id} vertices equidistant`);
  }
});

test('editing a derived length rescales a regular solid and round-trips', () => {
  for (const id of ['tetrahedron', 'octahedron', 'icosahedron', 'dodecahedron', 'cube'] as const) {
    const m = MODELS[id] as any;
    for (const d of m.dimensions(m.defaults)) {
      const r = m.apply(m.defaults, d.id, 9);
      assert.ok(r.ok, `${id}/${d.id}`);
      assert.ok(Math.abs(dim(id, r.params, d.id) - 9) < 1e-9, `${id}/${d.id} round-trip`);
    }
  }
});

test('cuboid length, width and height are independent and the diagonal scales the box', () => {
  const m = MODELS.cuboid;
  const r: any = m.apply(m.defaults, 'height', 10);
  assert.equal(r.params.h, 10);
  assert.equal(r.params.l, m.defaults.l);
  const s: any = m.apply(m.defaults, 'diag-space', 20);
  assert.ok(Math.abs(dim('cuboid', s.params, 'diag-space') - 20) < 1e-9);
  assert.ok(Math.abs(s.params.l / s.params.w - m.defaults.l / m.defaults.w) < 1e-9);
});

test('pyramid, cone and prism slanted lengths recompute the height and refuse impossible values', () => {
  const py: any = MODELS.pyramid.apply(MODELS.pyramid.defaults, 'lateral', 12);
  assert.ok(Math.abs(dim('pyramid', py.params, 'lateral') - 12) < 1e-9);
  assert.equal((MODELS.pyramid.apply(MODELS.pyramid.defaults, 'lateral', 1) as any).ok, false);
  const co: any = MODELS.cone.apply(MODELS.cone.defaults, 'slant', 10);
  assert.ok(Math.abs(dim('cone', co.params, 'slant') - 10) < 1e-9);
  assert.equal((MODELS.cone.apply(MODELS.cone.defaults, 'slant', 2) as any).ok, false);
  const pr: any = MODELS.prism.apply(MODELS.prism.defaults, 'slant', 7);
  assert.ok(Math.abs(dim('prism', pr.params, 'slant') - 7) < 1e-9);
});

test('round solids use the standard formulas', () => {
  const cyl = MODELS.cylinder.defaults;
  assert.ok(rel(summaryValue('cylinder', cyl, 'Volume'), Math.PI * cyl.r ** 2 * cyl.h) < 1e-3);
  const sph = MODELS.sphere.defaults;
  assert.ok(rel(summaryValue('sphere', sph, 'Volume'), (4 / 3) * Math.PI * sph.r ** 3) < 1e-3);
  const cone = MODELS.cone.defaults;
  assert.ok(rel(summaryValue('cone', cone, 'Surface area'), Math.PI * cone.r * (cone.r + Math.hypot(cone.r, cone.h))) < 1e-3);
});

test('non-positive lengths are refused on every solid', () => {
  for (const id of ['cube', 'cuboid', 'tetrahedron', 'octahedron', 'icosahedron', 'dodecahedron', 'pyramid', 'prism', 'cylinder', 'cone', 'sphere'] as const) {
    const m = MODELS[id] as any;
    const first = m.dimensions(m.defaults)[0].id;
    assert.equal(m.apply(m.defaults, first, 0).ok, false, id);
    assert.equal(m.apply(m.defaults, first, -3).ok, false, id);
  }
});
