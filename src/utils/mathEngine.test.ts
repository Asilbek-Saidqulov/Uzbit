import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveQuadratic,
  calculateRightTriangle,
  calculateCircle,
  calculateRegularPolygon,
  calculateFrustumCone,
  numericalSimpson
} from './mathEngine';

test('solveQuadratic computes real roots correctly for distinct roots', () => {
  // x^2 - 5x + 6 = 0 -> roots 3 and 2
  const result = solveQuadratic(1, -5, 6);
  assert.equal(result.hasRealRoots, true);
  assert.equal(result.discriminant, 1);
  assert.deepEqual(result.roots, [3, 2]);
  assert.equal(result.vertex.x, 2.5);
  assert.equal(result.vertex.y, -0.25);
});

test('solveQuadratic handles single repeated root', () => {
  // x^2 - 4x + 4 = 0 -> root 2
  const result = solveQuadratic(1, -4, 4);
  assert.equal(result.hasRealRoots, true);
  assert.equal(result.discriminant, 0);
  assert.deepEqual(result.roots, [2]);
});

test('solveQuadratic handles complex roots when discriminant < 0', () => {
  // x^2 + 1 = 0 -> discriminant -4
  const result = solveQuadratic(1, 0, 1);
  assert.equal(result.hasRealRoots, false);
  assert.equal(result.roots.length, 0);
});

test('calculateRightTriangle correctly computes 3-4-5 triangle', () => {
  const result = calculateRightTriangle(3, 4);
  assert.equal(result.area, 6);
  assert.equal(result.perimeter, 12);
  assert.equal(result.secondaryMetrics['Hypotenuse (c)'], 5);
});

test('calculateCircle computes area and circumference', () => {
  const r = 7;
  const result = calculateCircle(r);
  const expectedArea = Number((Math.PI * 49).toFixed(4));
  assert.equal(result.area, expectedArea);
  assert.equal(result.perimeter, Number((2 * Math.PI * 7).toFixed(4)));
});

test('calculateRegularPolygon works for hexagon', () => {
  const result = calculateRegularPolygon(6, 10);
  assert.equal(result.perimeter > 0, true);
  assert.equal(result.area > 0, true);
  assert.equal(result.secondaryMetrics['Interior Angle'], '120.00°');
});

test('numericalSimpson integrates x^2 from 0 to 3 to ~ 9', () => {
  const integral = numericalSimpson((x) => x * x, 0, 3, 60);
  assert.equal(Math.abs(integral - 9) < 0.01, true);
});
