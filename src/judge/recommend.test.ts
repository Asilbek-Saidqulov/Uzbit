import test from 'node:test';
import assert from 'node:assert';
import { problemStatus, recommendNext } from './recommend.ts';
import type { Attempt } from './storage';
import type { JudgeProblem } from './types';

const p = (id: string, difficulty: JudgeProblem['difficulty']) => ({ id, difficulty }) as JudgeProblem;
const attempt = (problemId: string, verdict: Attempt['verdict'], at: number) =>
  ({ id: `${problemId}-${at}`, problemId, language: 'python', code: '', verdict, passed: 0, total: 1, at }) as Attempt;

const PROBLEMS = [p('hard1', 'hard'), p('easy1', 'easy'), p('med1', 'medium'), p('easy2', 'easy')];

test('a newcomer gets the easiest problem first, in list order', () => {
  assert.deepStrictEqual(recommendNext(PROBLEMS, []), { problem: PROBLEMS[1], reason: 'next' });
});

test('solved problems are skipped', () => {
  const r = recommendNext(PROBLEMS, [attempt('easy1', 'accepted', 1)]);
  assert.strictEqual(r?.problem.id, 'easy2');
});

test('a problem that was tried but not solved is offered to resume, newest first', () => {
  const attempts = [attempt('med1', 'wrong_answer', 5), attempt('hard1', 'runtime_error', 2)];
  assert.deepStrictEqual(recommendNext(PROBLEMS, attempts), { problem: PROBLEMS[2], reason: 'resume' });
});

test('a problem tried and later solved is not offered to resume', () => {
  const attempts = [attempt('med1', 'accepted', 6), attempt('med1', 'wrong_answer', 5)];
  assert.strictEqual(recommendNext(PROBLEMS, attempts)?.reason, 'next');
});

test('nothing is recommended once everything is solved', () => {
  const attempts = PROBLEMS.map((x, i) => attempt(x.id, 'accepted', i));
  assert.strictEqual(recommendNext(PROBLEMS, attempts), null);
});

test('problemStatus tells todo, tried and solved apart', () => {
  const attempts = [attempt('a', 'accepted', 3), attempt('a', 'wrong_answer', 1), attempt('b', 'wrong_answer', 2)];
  assert.strictEqual(problemStatus('a', attempts), 'solved');
  assert.strictEqual(problemStatus('b', attempts), 'tried');
  assert.strictEqual(problemStatus('c', attempts), 'todo');
});

import { NO_ANSWERS, recommendTechnique } from './recommend.ts';
import { ALGORITHMS } from './data/algorithms.ts';

const ask = (over: Partial<typeof NO_ANSWERS>) => recommendTechnique({ ...NO_ANSWERS, ...over }).algorithmId;

test('the guide points a small input to brute force', () => {
  assert.strictEqual(ask({ smallInput: true, graph: true }), 'brute-force');
});

test('weighted graphs go to Dijkstra, unweighted graphs to BFS', () => {
  assert.strictEqual(ask({ graph: true, weighted: true }), 'dijkstra');
  assert.strictEqual(ask({ graph: true }), 'bfs');
});

test('a sorted array with no other clue goes to binary search', () => {
  assert.strictEqual(ask({ sorted: true }), 'binary-search');
});

test('a best contiguous block goes to Kadane, a fixed block to sliding window rules', () => {
  assert.strictEqual(ask({ subarray: true, bestOrCount: true }), 'kadane');
  assert.strictEqual(ask({ subarray: true }), 'prefix-sums');
});

test('a weight limit with choices goes to knapsack, not the plain coin table', () => {
  assert.strictEqual(ask({ choices: true, capacity: true }), 'knapsack');
  assert.strictEqual(ask({ choices: true, bestOrCount: true }), 'dp-basics');
});

test('a best value with no overlapping choices goes to greedy', () => {
  assert.strictEqual(ask({ bestOrCount: true }), 'greedy');
});

test('nothing selected falls back to brute force', () => {
  assert.strictEqual(ask({}), 'brute-force');
});

test('every technique the guide returns exists in the catalogue, with a reason and a dontUse note', () => {
  const ids = new Set(ALGORITHMS.map((a) => a.id));
  const questions = Object.keys(NO_ANSWERS) as (keyof typeof NO_ANSWERS)[];
  const combos: Partial<typeof NO_ANSWERS>[] = [{}];
  for (const q of questions) combos.push({ [q]: true });
  for (const q of questions) for (const r of questions) combos.push({ [q]: true, [r]: true });
  for (const c of combos) {
    const advice = recommendTechnique({ ...NO_ANSWERS, ...c });
    assert.ok(ids.has(advice.algorithmId), `${advice.algorithmId} is not in ALGORITHMS`);
    assert.ok(advice.reason.length > 0 && advice.dontUse.length > 0);
  }
});
