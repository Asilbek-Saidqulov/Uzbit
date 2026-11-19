import test from 'node:test';
import assert from 'node:assert/strict';
import { compileExpression, sanitizeMathExpression, analyzeFunctionKeyPoints } from './graphParser';

test('sanitizeMathExpression normalizes powers and standard math functions', () => {
  assert.equal(sanitizeMathExpression('x^2 - 4'), 'Math.pow(x, 2) - 4');
  assert.equal(sanitizeMathExpression('2x + 1'), '2*x + 1');
  assert.equal(sanitizeMathExpression('sin(x)'), 'Math.sin(x)');
  assert.equal(sanitizeMathExpression('y = 3x^2'), '3*Math.pow(x, 2)');
});

test('compileExpression evaluates polynomial with variable parameters', () => {
  const compiled = compileExpression('a * x^2 + b * x + c');
  assert.equal(compiled.isValid, true);
  const y = compiled.evaluator(2, { a: 3, b: -2, c: 1 });
  // 3*(2^2) - 2*(2) + 1 = 12 - 4 + 1 = 9
  assert.equal(y, 9);
});

test('analyzeFunctionKeyPoints finds roots and y-intercept for x^2 - 4', () => {
  const compiled = compileExpression('x^2 - 4');
  const points = analyzeFunctionKeyPoints(compiled.evaluator, {}, -5, 5, 100);

  // Y-intercept at x=0 is -4
  const yInt = points.find((p) => p.type === 'y-intercept');
  assert.ok(yInt);
  assert.equal(yInt?.y, -4);

  // Roots should be close to -2 and 2
  const roots = points.filter((p) => p.type === 'root');
  assert.equal(roots.length >= 2, true);
  assert.ok(roots.some((r) => Math.abs(r.x - 2) < 0.1));
  assert.ok(roots.some((r) => Math.abs(r.x - (-2)) < 0.1));
});
