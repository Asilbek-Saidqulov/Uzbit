import test from 'node:test';
import assert from 'node:assert';
import {
  activityByDay,
  activityLevel,
  buildHeatmap,
  currentStreak,
  dayKey,
  emptyProgress,
  lessonStatus,
  mergeProgress,
  recordLessonResult,
  sanitizeProgress,
} from './progress.ts';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

test('a wrong answer counts as tried, not done', () => {
  const s = recordLessonResult(emptyProgress(), 'algebra/quadratics', false, at(2026, 11, 10));
  assert.strictEqual(lessonStatus(s, 'algebra/quadratics'), 'tried');
  assert.deepStrictEqual(s.activity, {});
});

test('the first right answer completes the lesson and counts for that day', () => {
  let s = recordLessonResult(emptyProgress(), 'a/b', false, at(2026, 11, 10));
  s = recordLessonResult(s, 'a/b', true, at(2026, 11, 10));
  assert.strictEqual(lessonStatus(s, 'a/b'), 'done');
  assert.strictEqual(s.lessons['a/b'].tries, 2);
  assert.strictEqual(s.activity['2026-11-10'], 1);
});

test('answering a finished lesson again does not add activity or undo it', () => {
  let s = recordLessonResult(emptyProgress(), 'a/b', true, at(2026, 11, 10));
  s = recordLessonResult(s, 'a/b', false, at(2026, 11, 11));
  s = recordLessonResult(s, 'a/b', true, at(2026, 11, 12));
  assert.strictEqual(lessonStatus(s, 'a/b'), 'done');
  assert.deepStrictEqual(s.activity, { '2026-11-10': 1 });
});

test('recording a result never changes the previous state', () => {
  const before = emptyProgress();
  recordLessonResult(before, 'a/b', true);
  assert.deepStrictEqual(before, emptyProgress());
});

test('dayKey uses the local calendar day', () => {
  assert.strictEqual(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.strictEqual(dayKey(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('merging keeps the union, the earliest completion, and the larger counts', () => {
  const a = { v: 1 as const, lessons: { x: { tries: 1, done: 200 }, y: { tries: 3 } }, activity: { '2026-11-01': 2 } };
  const b = { v: 1 as const, lessons: { x: { tries: 4, done: 100 }, z: { tries: 1, done: 50 } }, activity: { '2026-11-01': 1, '2026-11-02': 1 } };
  const m = mergeProgress(a, b);
  assert.deepStrictEqual(m.lessons.x, { tries: 4, done: 100 });
  assert.strictEqual(lessonStatus(m, 'y'), 'tried');
  assert.strictEqual(lessonStatus(m, 'z'), 'done');
  assert.deepStrictEqual(m.activity, { '2026-11-01': 2, '2026-11-02': 1 });
});

test('merging with empty progress changes nothing', () => {
  const a = recordLessonResult(emptyProgress(), 'a/b', true, at(2026, 11, 3));
  assert.deepStrictEqual(mergeProgress(a, emptyProgress()), a);
});

test('sanitizeProgress drops anything malformed', () => {
  const s = sanitizeProgress({
    lessons: { ok: { tries: 2, done: 5 }, bad: 'nope', neg: { tries: -4 } },
    activity: { '2026-11-01': 3, 'not a date': 9, '2026-11-02': 'x' },
  });
  assert.deepStrictEqual(s.lessons, { ok: { tries: 2, done: 5 }, neg: { tries: 0 } });
  assert.deepStrictEqual(s.activity, { '2026-11-01': 3 });
  assert.deepStrictEqual(sanitizeProgress(null), emptyProgress());
  assert.deepStrictEqual(sanitizeProgress('junk'), emptyProgress());
});

test('activityLevel steps up with more activity', () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 40].map(activityLevel), [0, 1, 2, 2, 3, 3, 4, 4]);
});

test('activityByDay combines lessons and submissions per day', () => {
  let s = recordLessonResult(emptyProgress(), 'a/b', true, at(2026, 11, 9));
  s = recordLessonResult(s, 'a/c', true, at(2026, 11, 9));
  const days = activityByDay(s, [at(2026, 11, 9, 8), at(2026, 11, 10)]);
  assert.deepStrictEqual(days['2026-11-09'], { lessons: 2, submissions: 1 });
  assert.deepStrictEqual(days['2026-11-10'], { lessons: 0, submissions: 1 });
});

test('the heatmap has whole weeks that start on Monday and end with the current week', () => {
  const today = new Date(2026, 10, 11); // Wednesday
  const cols = buildHeatmap({}, 4, today);
  assert.strictEqual(cols.length, 4);
  for (const col of cols) {
    assert.strictEqual(col.length, 7);
    assert.strictEqual(col[0].date.getDay(), 1, 'top row is Monday');
  }
  const last = cols[3];
  assert.strictEqual(last[2].key, '2026-11-11');
  assert.strictEqual(last[2].future, false);
  assert.strictEqual(last[3].future, true, 'Thursday is still ahead');
  assert.strictEqual(cols[0][0].key, '2026-10-19');
});

test('the heatmap carries each day’s count and level', () => {
  const today = new Date(2026, 10, 11);
  const cols = buildHeatmap({ '2026-11-10': { lessons: 2, submissions: 2 } }, 2, today);
  const cell = cols[1][1];
  assert.strictEqual(cell.key, '2026-11-10');
  assert.strictEqual(cell.count, 4);
  assert.strictEqual(cell.level, 3);
});

test('streak counts consecutive days ending today', () => {
  const days = { '2026-11-09': { lessons: 1, submissions: 0 }, '2026-11-10': { lessons: 0, submissions: 1 }, '2026-11-11': { lessons: 1, submissions: 0 } };
  assert.strictEqual(currentStreak(days, new Date(2026, 10, 11)), 3);
});

test('a streak survives until the end of today', () => {
  const days = { '2026-11-09': { lessons: 1, submissions: 0 }, '2026-11-10': { lessons: 1, submissions: 0 } };
  assert.strictEqual(currentStreak(days, new Date(2026, 10, 11)), 2, 'nothing yet today, yesterday still counts');
  assert.strictEqual(currentStreak(days, new Date(2026, 10, 12)), 0, 'a full missed day breaks it');
});
