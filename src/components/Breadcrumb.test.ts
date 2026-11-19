import test from 'node:test';
import assert from 'node:assert';
import { getBreadcrumbTrail } from './Breadcrumb.tsx';

const labels = (tab: Parameters<typeof getBreadcrumbTrail>[0], expression?: string, lesson?: Parameters<typeof getBreadcrumbTrail>[2]) =>
  getBreadcrumbTrail(tab, expression, lesson).items.map((item) => item.label);

test('Breadcrumb shows the coding section and current page', () => {
  assert.deepStrictEqual(labels('code'), ['Practice', 'Coding']);
});

test('Breadcrumb includes the plotted expression on the graph page', () => {
  assert.deepStrictEqual(labels('graphing', 'y = x^2 - 4'), ['Explore', 'Graph: y = x^2 - 4']);
  assert.deepStrictEqual(labels('graphing'), ['Explore', 'Graph']);
});

test('Breadcrumb uses plain-language names for geometry and formulas', () => {
  assert.deepStrictEqual(labels('geometry'), ['Explore', 'Geometry']);
  assert.deepStrictEqual(labels('reference'), ['Learn', 'Formulas']);
  assert.deepStrictEqual(labels('threed'), ['Explore', '3D shapes']);
});

test('A lesson shows its track and its title', () => {
  assert.deepStrictEqual(labels('lesson', undefined, { trackTitle: 'Algebra', lessonTitle: 'Quadratics' }), ['Learn', 'Algebra', 'Quadratics']);
});

test('The dashboard has its own single-item trail', () => {
  assert.deepStrictEqual(labels('dashboard'), ['Dashboard']);
});

test('Home, log in and sign up have no trail', () => {
  for (const tab of ['overview', 'login', 'signup'] as const) assert.deepStrictEqual(labels(tab), []);
});

test('Only the last breadcrumb item is the current page', () => {
  const { items } = getBreadcrumbTrail('curriculum');
  assert.ok(items[0].tab, 'section links to its tab');
  assert.strictEqual(items[items.length - 1].tab, undefined, 'current page has no link');
});

test('Breadcrumb never shows the old technical labels', () => {
  for (const tab of ['graphing', 'geometry', 'code', 'curriculum', 'reference', 'overview', 'threed', 'dashboard'] as const) {
    const text = labels(tab).join(' ');
    assert.ok(!/Overview|Sandbox|Bifurcation|Euclidean|Studio|JSXGraph/.test(text), `${tab}: ${text}`);
  }
});
