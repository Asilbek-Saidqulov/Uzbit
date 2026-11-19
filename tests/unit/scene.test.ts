import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, DEFAULT_PARAMS, type ShapeId } from '../../src/geometry3d/models.ts';
import { buildScene } from '../../src/geometry3d/scene.ts';

const ALL = Object.keys(MODELS) as ShapeId[];

for (const id of ALL) {
  test(`${id}: every dimension has a label anchor and a tap target, and no coordinate is NaN`, () => {
    const m = MODELS[id] as any;
    const built = buildScene(id, DEFAULT_PARAMS[id]);
    const hitIds = new Set(built.hits.map((h) => h.dimId));
    for (const d of m.dimensions(DEFAULT_PARAMS[id])) {
      assert.ok(built.anchors[d.id], `${id}: no label anchor for ${d.id}`);
      assert.ok(hitIds.has(d.id), `${id}: no tap target for ${d.id}`);
      const a = built.anchors[d.id];
      assert.ok(Number.isFinite(a.x + a.y + a.z), `${id}: anchor ${d.id} is not finite`);
    }
    assert.ok(Number.isFinite(built.size) && built.size > 0);
    assert.ok(Number.isFinite(built.cameraPosition.length()));
    built.dispose();
  });
}

test('scenes rebuild for a very small and a very large solid', () => {
  for (const id of ALL) {
    const m = MODELS[id] as any;
    const dims = m.dimensions(m.defaults);
    for (const scale of [0.05, 500]) {
      const r = m.apply(m.defaults, dims.find((d: any) => d.kind === 'length')!.id, scale);
      if (r.ok) buildScene(id, r.params).dispose();
    }
  }
});
