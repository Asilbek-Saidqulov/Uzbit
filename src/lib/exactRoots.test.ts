import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exactQuadraticRoots, squareFreeParts } from './exactRoots.ts';

const texts = (a: number, b: number, c: number) => exactQuadraticRoots(a, b, c)?.roots.map((r) => r.text);

test('rational roots are plain fractions', () => {
  assert.deepEqual(texts(1, -4, 3), ['1', '3']);
  assert.deepEqual(texts(4, 0, -1), ['-1/2', '1/2']);
  assert.deepEqual(texts(1.5, 0, -6), ['-2', '2']);
});

test('irrational roots keep the radical exact', () => {
  assert.deepEqual(texts(1, 0, -3), ['√3', '-√3']);
  assert.deepEqual(texts(1, 0, -12), ['2√3', '-2√3']);
  assert.deepEqual(texts(2, 0, -1), ['√2/2', '-√2/2']);
  assert.deepEqual(texts(1, -1, -1), ['(1 + √5)/2', '(1 - √5)/2']);
  assert.deepEqual(texts(1, -2, -1), ['1 + √2', '1 - √2']);
});

test('a repeated root and complex roots', () => {
  const double = exactQuadraticRoots(1, -2, 1);
  assert.equal(double?.kind, 'double');
  assert.deepEqual(texts(1, -2, 1), ['1']);
  assert.deepEqual(texts(1, 0, 1), ['i', '-i']);
  assert.deepEqual(texts(1, 2, 5), ['-1 + 2i', '-1 - 2i']);
});

test('decimal coefficients are scaled to whole numbers', () => {
  // 0.1x² + 0.2x + 0.3 has the same roots as x² + 2x + 3
  assert.deepEqual(texts(0.1, 0.2, 0.3), ['-1 + i√2', '-1 - i√2']);
});

test('coefficients that are not rational give no exact form', () => {
  assert.equal(exactQuadraticRoots(1, 0.3333333, 1), null);
});

test('square-free split', () => {
  assert.deepEqual(squareFreeParts(12), { k: 2, m: 3 });
  assert.deepEqual(squareFreeParts(50), { k: 5, m: 2 });
});
