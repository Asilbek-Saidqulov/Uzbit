import test from 'node:test';
import assert from 'node:assert';
import { graphPath, lessonPath, PAGE_PATHS, resolveRoute, safeNext } from './routes.ts';

test('fixed pages resolve to their tab', () => {
  for (const [tab, path] of Object.entries(PAGE_PATHS)) assert.strictEqual(resolveRoute(path)?.tab, tab);
});

test('a trailing slash does not matter', () => {
  assert.strictEqual(resolveRoute('/dashboard/')?.tab, 'dashboard');
});

test('lessons and tracks resolve with their parameters', () => {
  assert.deepStrictEqual(resolveRoute('/learn/algebra/quadratics'), { tab: 'lesson', trackId: 'algebra', lessonSlug: 'quadratics' });
  assert.deepStrictEqual(resolveRoute('/learn/algebra'), { tab: 'track', trackId: 'algebra' });
});

test('formulas is not mistaken for a track', () => {
  assert.strictEqual(resolveRoute('/learn/formulas')?.tab, 'reference');
});

test('unknown tracks, lessons and pages do not resolve', () => {
  assert.strictEqual(resolveRoute('/learn/nope'), null);
  assert.strictEqual(resolveRoute('/learn/algebra/nope'), null);
  assert.strictEqual(resolveRoute('/this-page-does-not-exist'), null);
});

test('lessonPath round-trips through resolveRoute', () => {
  assert.strictEqual(resolveRoute(lessonPath('calculus', 'taylor'))?.lessonSlug, 'taylor');
});

test('graphPath puts every expression in the address', () => {
  assert.strictEqual(graphPath([]), '/explore/graph');
  const url = new URL(graphPath(['y = x^2', 'y = 2*x + 1']), 'http://x');
  assert.deepStrictEqual(url.searchParams.getAll('expr'), ['y = x^2', 'y = 2*x + 1']);
});

test('safeNext only allows paths on this site', () => {
  assert.strictEqual(safeNext('/learn'), '/learn');
  assert.strictEqual(safeNext('https://evil.example'), '/dashboard');
  assert.strictEqual(safeNext('//evil.example'), '/dashboard');
  assert.strictEqual(safeNext('/\\evil.example'), '/dashboard');
  assert.strictEqual(safeNext(null), '/dashboard');
});

test('safeNext never sends someone back to the log in or sign up page', () => {
  assert.strictEqual(safeNext('/login'), '/dashboard');
  assert.strictEqual(safeNext('/signup'), '/dashboard');
});
