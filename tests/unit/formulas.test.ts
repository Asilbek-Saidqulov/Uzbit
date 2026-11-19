import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { readFileSync } from 'node:fs';

// Every formula the curriculum shows must be valid LaTeX. A broken one renders as raw source.
test('every curriculum formula renders as LaTeX', () => {
  const src = readFileSync(new URL('../../src/data/curriculumData.ts', import.meta.url), 'utf8');
  const formulas = [...src.matchAll(/formula:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => eval(`'${m[1]}'`) as string);
  assert.ok(formulas.length >= 10, 'expected the curriculum formulas to be found');
  for (const f of formulas) {
    assert.doesNotThrow(() => katex.renderToString(f, { throwOnError: true }), `formula does not render: ${f}`);
    assert.ok(!f.includes('\f') && !f.includes('\t'), `formula has a control character: ${f}`);
  }
});
