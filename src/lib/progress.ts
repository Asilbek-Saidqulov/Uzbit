/**
 * Learning progress: which lessons are done, and which days the learner was active.
 * Pure functions plus a small localStorage store. Coding attempts live in judge/storage.ts;
 * the dashboard combines both.
 */

export interface LessonRecord {
  /** How many times the check question was answered. */
  tries: number;
  /** When the check was first answered correctly (ms). Missing while the lesson is not done. */
  done?: number;
}

export interface ProgressState {
  v: 1;
  lessons: Record<string, LessonRecord>;
  /** Lessons completed per local calendar day, "YYYY-MM-DD". */
  activity: Record<string, number>;
}

export const emptyProgress = (): ProgressState => ({ v: 1, lessons: {}, activity: {} });

const STORAGE_KEY = 'uzbit:progress:v1';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as "YYYY-MM-DD". Local, so a late-night session counts for that evening. */
export function dayKey(when: Date | number): string {
  const d = typeof when === 'number' ? new Date(when) : when;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type LessonStatus = 'todo' | 'tried' | 'done';

export function lessonStatus(state: ProgressState, id: string): LessonStatus {
  const rec = state.lessons[id];
  if (!rec) return 'todo';
  if (rec.done) return 'done';
  return rec.tries > 0 ? 'tried' : 'todo';
}

export function completedLessonIds(state: ProgressState): Set<string> {
  return new Set(Object.entries(state.lessons).filter(([, r]) => r.done).map(([id]) => id));
}

/** Records one answer to a lesson's check question. Returns a new state. */
export function recordLessonResult(state: ProgressState, id: string, correct: boolean, now = Date.now()): ProgressState {
  const prev = state.lessons[id] ?? { tries: 0 };
  const firstCompletion = correct && !prev.done;
  const record: LessonRecord = { tries: prev.tries + 1, done: prev.done ?? (correct ? now : undefined) };
  if (record.done === undefined) delete record.done;
  const activity = { ...state.activity };
  if (firstCompletion) {
    const key = dayKey(now);
    activity[key] = (activity[key] ?? 0) + 1;
  }
  return { ...state, lessons: { ...state.lessons, [id]: record }, activity };
}

/** Combines this browser's progress with the account's. Nothing is ever lost by merging. */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const lessons: Record<string, LessonRecord> = {};
  for (const id of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)])) {
    const x = a.lessons[id];
    const y = b.lessons[id];
    const done = x?.done && y?.done ? Math.min(x.done, y.done) : x?.done ?? y?.done;
    const record: LessonRecord = { tries: Math.max(x?.tries ?? 0, y?.tries ?? 0) };
    if (done) record.done = done;
    lessons[id] = record;
  }
  const activity: Record<string, number> = {};
  for (const day of new Set([...Object.keys(a.activity), ...Object.keys(b.activity)])) {
    activity[day] = Math.max(a.activity[day] ?? 0, b.activity[day] ?? 0);
  }
  return { v: 1, lessons, activity };
}

/** Accepts anything read from storage or the network and returns a safe state. */
export function sanitizeProgress(raw: unknown): ProgressState {
  const out = emptyProgress();
  if (!raw || typeof raw !== 'object') return out;
  const { lessons, activity } = raw as { lessons?: unknown; activity?: unknown };
  if (lessons && typeof lessons === 'object') {
    for (const [id, rec] of Object.entries(lessons as Record<string, unknown>)) {
      if (!rec || typeof rec !== 'object') continue;
      const { tries, done } = rec as { tries?: unknown; done?: unknown };
      const entry: LessonRecord = { tries: typeof tries === 'number' && tries >= 0 ? Math.floor(tries) : 0 };
      if (typeof done === 'number' && done > 0) entry.done = done;
      out.lessons[id] = entry;
    }
  }
  if (activity && typeof activity === 'object') {
    for (const [day, n] of Object.entries(activity as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof n === 'number' && n > 0) out.activity[day] = Math.floor(n);
    }
  }
  return out;
}

/* ---------- Activity grid ---------- */

export interface DayActivity {
  lessons: number;
  submissions: number;
}

/** Lessons completed and code submissions per day. */
export function activityByDay(state: ProgressState, attemptTimes: number[]): Record<string, DayActivity> {
  const out: Record<string, DayActivity> = {};
  const slot = (key: string) => (out[key] ??= { lessons: 0, submissions: 0 });
  for (const [day, n] of Object.entries(state.activity)) slot(day).lessons += n;
  for (const at of attemptTimes) slot(dayKey(at)).submissions += 1;
  return out;
}

export const totalFor = (d?: DayActivity) => (d ? d.lessons + d.submissions : 0);

/** Shade 0 to 4 for a day's activity count. */
export function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export interface HeatCell {
  key: string;
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** After today: drawn as an empty slot and not selectable. */
  future: boolean;
}

/**
 * Columns of weeks, Monday at the top, ending with the week that contains today.
 * Returns `weeks` columns of 7 cells.
 */
export function buildHeatmap(days: Record<string, DayActivity>, weeks: number, today: Date): HeatCell[][] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const mondayOffset = (end.getDay() + 6) % 7; // Monday = 0
  const start = new Date(end);
  start.setDate(end.getDate() - mondayOffset - (weeks - 1) * 7);

  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(date);
      const count = totalFor(days[key]);
      col.push({ key, date, count, level: activityLevel(count), future: date.getTime() > end.getTime() });
    }
    columns.push(col);
  }
  return columns;
}

/** Consecutive active days ending today, or ending yesterday if today has no activity yet. */
export function currentStreak(days: Record<string, DayActivity>, today: Date): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (totalFor(days[dayKey(cursor)]) === 0) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (totalFor(days[dayKey(cursor)]) > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ---------- Storage ---------- */

export function loadProgress(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: progress still works for this visit */
  }
}

export function clearProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const PROGRESS_STORAGE_KEY = STORAGE_KEY;
