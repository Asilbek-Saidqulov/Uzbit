import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outputsMatch } from '../../src/judge/engine/compare.ts';
import { buildProgram } from '../../src/judge/engine/harness.ts';
import { PROBLEMS } from '../../src/judge/data/problems.ts';

test('outputs match ignoring trailing spaces and line endings', () => {
  assert.equal(outputsMatch('5 \n', '5'), true);
  assert.equal(outputsMatch('5\r\n', '5'), true);
});

test('numbers are compared by value', () => {
  assert.equal(outputsMatch('2.0000001', '2'), true);
  assert.equal(outputsMatch('2.5', '2'), false);
});

test('JSON results compare structurally', () => {
  assert.equal(outputsMatch('[1, 2]', '[1,2]'), true);
  assert.equal(outputsMatch('[1, 3]', '[1,2]'), false);
});

test('a missing value is wrong', () => {
  assert.equal(outputsMatch('', '5'), false);
});

test('function problems get a harness that calls the entry function', () => {
  const p = PROBLEMS.find((x) => x.mode === 'function' && x.languages.includes('python'))!;
  const program = buildProgram(p, 'def f(x):\n    return x\n', 'python');
  assert.match(program, new RegExp(`print\\(__json\\.dumps\\(${p.entryFunction}\\(`));
});

test('stdio problems run as written', () => {
  const p = PROBLEMS.find((x) => x.mode === 'stdio')!;
  assert.equal(buildProgram(p, 'print(1)', 'python'), 'print(1)');
});

test('every problem has at least one example and a test', () => {
  for (const p of PROBLEMS) {
    assert.ok(p.tests.length > 0, `${p.id} has no tests`);
    assert.ok(p.tests.some((t) => t.example), `${p.id} has no example`);
  }
});
