import test from 'node:test';
import assert from 'node:assert';
import { getBreadcrumbTrail } from './Breadcrumb.tsx';

const labels = (tab: Parameters<typeof getBreadcrumbTrail>[0], expression?: string) =>
  getBreadcrumbTrail(tab, expression).items.map((item) => item.label);

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

test('Only the last breadcrumb item is the current page', () => {
  const { items } = getBreadcrumbTrail('curriculum');
  assert.ok(items[0].tab, 'section links to its tab');
  assert.strictEqual(items[items.length - 1].tab, undefined, 'current page has no link');
});

test('Breadcrumb never shows the old technical labels', () => {
  for (const tab of ['graphing', 'geometry', 'code', 'curriculum', 'reference', 'overview', 'threed'] as const) {
    const text = labels(tab).join(' ');
    assert.ok(!/Overview|Sandbox|Bifurcation|Euclidean|Studio|JSXGraph/.test(text), `${tab}: ${text}`);
  }
});
