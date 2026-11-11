import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAttempts, toRow, fromRow, type AttemptRow } from './attempts.ts';
import type { Attempt } from '@/judge/storage';

const a = (id: string, at: number): Attempt => ({
  id, problemId: 'ab-sum', language: 'python', code: 'print(1)', verdict: 'accepted', passed: 5, total: 5, at,
});

test('a submission survives a round trip through the database format', () => {
  const original = a('11111111-1111-4111-8111-111111111111', Date.UTC(2026, 0, 2, 10, 30));
  const row: AttemptRow = { ...toRow(original, 'user-1'), created_at: toRow(original, 'user-1').created_at };
  assert.deepEqual(fromRow(row), original);
});

test('merging keeps each submission once, newest first', () => {
  const local = [a('x', 3000), a('y', 1000)];
  const remote = [a('y', 1000), a('z', 2000)];
  const merged = mergeAttempts(local, remote);
  assert.deepEqual(merged.map((m) => m.id), ['x', 'z', 'y']);
});

test('merging caps the history', () => {
  const many = Array.from({ length: 400 }, (_, i) => a(`id-${i}`, i));
  assert.equal(mergeAttempts(many, []).length, 300);
});
