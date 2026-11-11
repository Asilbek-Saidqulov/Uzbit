import test from 'node:test';
import assert from 'node:assert';
import { parseRelation, labelOf } from '../lib/relation.ts';
import { fitLinear, fitQuadratic } from '../lib/regression.ts';
import { differentiate, integrateAdaptive } from '../lib/analysis.ts';

test('parseRelation correctly parses explicit function y = x^2 - 4', () => {
  const result = parseRelation('y = x^2 - 4');
  assert.strictEqual(result.status, 'ok');
  if (result.status === 'ok') {
    assert.strictEqual(result.value.kind, 'explicit');
    assert.strictEqual(typeof result.value.fn, 'function');
    // f(0) should be -4
    assert.strictEqual(result.value.fn(0), -4);
    // f(2) should be 0
    assert.strictEqual(result.value.fn(2), 0);
  }
});

test('parseRelation parses function definition f(x) = 3*x + 1', () => {
  const env = { vars: {}, funcs: {} };
  const result = parseRelation('f(x) = 3*x + 1', env);
  assert.strictEqual(result.status, 'ok');
  if (result.status === 'ok') {
    assert.strictEqual(result.value.kind, 'functionDef');
    assert.strictEqual(result.value.name, 'f');
    assert.strictEqual(result.value.fn(2), 7);
  }
});

test('fitLinear calculates least squares regression', () => {
  const points = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
  ];
  const fit = fitLinear(points);
  assert.ok(fit);
  assert.ok(Math.abs(fit.r2 - 1.0) < 0.001);
});

test('differentiate and integrateAdaptive on polynomials', () => {
  const f = (x: number) => x * x;
  // Derivative of x^2 at x = 3 is 2*x = 6
  const df3 = differentiate(f, 3);
  assert.strictEqual(df3.isDefined, true);
  assert.ok(Math.abs(df3.value - 6) < 0.01);

  // Integral of x^2 from 0 to 3 is [x^3/3] = 9
  const area = integrateAdaptive(f, 0, 3);
  assert.strictEqual(area.status, 'ok');
  if (area.status === 'ok') {
    assert.ok(Math.abs(area.value - 9) < 0.01);
  }
});
