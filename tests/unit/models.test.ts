import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, DEFAULT_PARAMS, triangleAngles } from '../../src/geometry3d/models.ts';

const dim = (shape: any, p: any, id: string) => shape.dimensions(p).find((d: any) => d.id === id)!.value;
const near = (a: number, b: number, t = 1e-6) => Math.abs(a - b) < t;

test('the default triangle is the 6-8-10 right triangle', () => {
  const a = triangleAngles(DEFAULT_PARAMS.triangle);
  assert.ok(near(a.C, 90));
  assert.equal(MODELS.triangle.summary(DEFAULT_PARAMS.triangle)[0].value, '24.00');
});

test('setting an angle shows that angle exactly', () => {
  const r: any = MODELS.triangle.apply(DEFAULT_PARAMS.triangle, 'angle-C', 60);
  assert.ok(r.ok);
  assert.ok(near(dim(MODELS.triangle, r.params, 'angle-C'), 60));
});

test('an impossible side is refused with the allowed range', () => {
  const r: any = MODELS.triangle.apply(DEFAULT_PARAMS.triangle, 'side-c', 20);
  assert.equal(r.ok, false);
  assert.match(r.error, /greater than 2\.00 and less than 14\.00/);
});

test('a polygon interior angle must give a whole number of sides', () => {
  const ok: any = MODELS.polygon.apply(DEFAULT_PARAMS.polygon, 'interior', 120);
  assert.equal(ok.params.n, 6);
  const bad: any = MODELS.polygon.apply(DEFAULT_PARAMS.polygon, 'interior', 110);
  assert.equal(bad.ok, false);
});

test('a cone rim angle round-trips', () => {
  const r: any = MODELS.frustum.apply(DEFAULT_PARAMS.frustum, 'rim-angle', 70);
  assert.ok(near(dim(MODELS.frustum, r.params, 'rim-angle'), 70));
});
