import type { Language, Verdict } from './types';

/* Everything here is per-browser and stored in localStorage. Storage can be
 * unavailable (private mode, disabled cookies), so every access is guarded. */

const ATTEMPTS_KEY = 'uzbit-judge:attempts:v1';
const LAST_LANGUAGE_KEY = 'uzbit-judge:last-language:v1';
const WIDE_KEY = 'uzbit-judge:wide:v1';
const MAX_ATTEMPTS = 300;

export interface Attempt {
  id: string;
  problemId: string;
  language: Language;
  code: string;
  verdict: Verdict;
  passed: number;
  total: number;
  at: number;
}

const draftKey = (problemId: string, language: Language) => `uzbit-judge:draft:${problemId}:${language}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or storage disabled: keep working without persistence */
  }
}

export function loadAttempts(): Attempt[] {
  return read<Attempt[]>(ATTEMPTS_KEY, []);
}

/** Replaces the whole local history, for example after merging with the account's history. */
export function saveAttempts(list: Attempt[]) {
  write(ATTEMPTS_KEY, list.slice(0, MAX_ATTEMPTS));
}

export function addAttempt(attempt: Attempt): Attempt[] {
  const next = [attempt, ...loadAttempts()].slice(0, MAX_ATTEMPTS);
  write(ATTEMPTS_KEY, next);
  return next;
}

export function loadDraft(problemId: string, language: Language): string | null {
  try {
    return window.localStorage.getItem(draftKey(problemId, language));
  } catch {
    return null;
  }
}

export function saveDraft(problemId: string, language: Language, code: string) {
  try {
    window.localStorage.setItem(draftKey(problemId, language), code);
  } catch {
    /* ignore */
  }
}

export function loadLastLanguage(fallback: Language): Language {
  return read<Language>(LAST_LANGUAGE_KEY, fallback);
}

export function saveLastLanguage(language: Language) {
  write(LAST_LANGUAGE_KEY, language);
}

const panelHeightKey = (wide: boolean) => `uzbit-judge:panel-height:${wide ? 'wide' : 'normal'}:v1`;

/** The height of the terminal panel under the editor, remembered separately for normal and wide mode. */
export function loadPanelHeight(wide: boolean): number | null {
  const value = read<number | null>(panelHeightKey(wide), null);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function savePanelHeight(wide: boolean, height: number) {
  write(panelHeightKey(wide), Math.round(height));
}

/** Whether the workspace was left in wide screen mode. */
export function loadWide(): boolean {
  return read<boolean>(WIDE_KEY, false) === true;
}

export function saveWide(wide: boolean) {
  write(WIDE_KEY, wide);
}

export function solvedProblemIds(attempts: Attempt[]): Set<string> {
  return new Set(attempts.filter((a) => a.verdict === 'accepted').map((a) => a.problemId));
}
