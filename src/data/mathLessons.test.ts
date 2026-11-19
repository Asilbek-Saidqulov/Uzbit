import test from 'node:test';
import assert from 'node:assert';
import { ALL_LESSONS, getLesson, lessonNeighbors, nextIncompleteLesson, TRACKS } from './mathLessons.ts';
import { parseRelation } from '../lib/relation.ts';
import { getProblem } from '../judge/data/problems.ts';
import { resolveRoute, lessonPath } from '../lib/routes.ts';

test('every lesson id is unique and matches its address', () => {
  assert.strictEqual(new Set(ALL_LESSONS.map((l) => l.id)).size, ALL_LESSONS.length);
  for (const l of ALL_LESSONS) {
    assert.strictEqual(l.id, `${l.trackId}/${l.slug}`);
    assert.strictEqual(resolveRoute(lessonPath(l.trackId, l.slug))?.tab, 'lesson');
  }
});

test('every track ends with a checkpoint', () => {
  for (const t of TRACKS) assert.strictEqual(t.lessons[t.lessons.length - 1].slug, 'checkpoint', t.id);
});

test('every check has one valid right answer and an explanation', () => {
  for (const l of ALL_LESSONS) {
    const c = l.check;
    assert.ok(c.options.length >= 3, l.id);
    assert.ok(Number.isInteger(c.correctIndex) && c.correctIndex >= 0 && c.correctIndex < c.options.length, l.id);
    assert.strictEqual(new Set(c.options).size, c.options.length, `${l.id} has repeated options`);
    assert.ok(c.explanation.length > 20, l.id);
  }
});

test('every lesson has a plain hook and something to do', () => {
  for (const l of ALL_LESSONS.filter((x) => x.slug !== 'checkpoint')) {
    assert.ok(l.hook.length > 40, l.id);
    assert.ok(l.demo || l.tryIt, `${l.id} has nothing to play with`);
  }
});

test('every expression a lesson plots is understood by the grapher', () => {
  for (const l of ALL_LESSONS) {
    for (const expr of l.tryIt?.expressions ?? []) {
      const r = parseRelation(expr, {} as never);
      assert.strictEqual(r.status, 'ok', `${l.id}: ${expr}`);
    }
  }
});

test('every practice link points at a real problem', () => {
  for (const l of ALL_LESSONS) if (l.practice) assert.ok(getProblem(l.practice.problemId), `${l.id}: ${l.practice.problemId}`);
});

test('lessons are ordered and neighbours cross tracks', () => {
  const first = ALL_LESSONS[0];
  assert.strictEqual(lessonNeighbors(first.id).prev, undefined);
  const lastOfFirstTrack = TRACKS[0].lessons[TRACKS[0].lessons.length - 1];
  assert.strictEqual(lessonNeighbors(lastOfFirstTrack.id).next?.trackId, TRACKS[1].id);
  assert.strictEqual(getLesson('algebra', 'quadratics')?.id, 'algebra/quadratics');
});

test('nextIncompleteLesson finds the first unfinished lesson', () => {
  assert.strictEqual(nextIncompleteLesson(() => false)?.id, ALL_LESSONS[0].id);
  assert.strictEqual(nextIncompleteLesson((id) => id === ALL_LESSONS[0].id)?.id, ALL_LESSONS[1].id);
  assert.strictEqual(nextIncompleteLesson(() => true), undefined);
  assert.strictEqual(nextIncompleteLesson((id) => id.startsWith('algebra'), TRACKS[0]), undefined);
});
