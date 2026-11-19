import type { Attempt } from '@/judge/storage';
import { supabase } from '@/lib/supabase';

/** A row in the attempts table. */
export interface AttemptRow {
  id: string;
  user_id: string;
  problem_id: string;
  language: string;
  code: string;
  verdict: string;
  passed: number;
  total: number;
  created_at: string;
}

export const MAX_HISTORY = 300;

export function toRow(attempt: Attempt, userId: string): AttemptRow {
  return {
    id: attempt.id,
    user_id: userId,
    problem_id: attempt.problemId,
    language: attempt.language,
    code: attempt.code,
    verdict: attempt.verdict,
    passed: attempt.passed,
    total: attempt.total,
    created_at: new Date(attempt.at).toISOString(),
  };
}

export function fromRow(row: AttemptRow): Attempt {
  return {
    id: row.id,
    problemId: row.problem_id,
    language: row.language as Attempt['language'],
    code: row.code,
    verdict: row.verdict as Attempt['verdict'],
    passed: row.passed,
    total: row.total,
    at: Date.parse(row.created_at),
  };
}

/**
 * Combines this browser's history with the account's history.
 * Duplicates (same id) are kept once, the newest first, and the total is capped.
 */
export function mergeAttempts(local: Attempt[], remote: Attempt[]): Attempt[] {
  const byId = new Map<string, Attempt>();
  for (const a of [...remote, ...local]) byId.set(a.id, a);
  return [...byId.values()].sort((x, y) => y.at - x.at).slice(0, MAX_HISTORY);
}

/** Loads the signed-in user's history. Returns null if the request fails, so local history is kept. */
export async function fetchAttempts(userId: string): Promise<Attempt[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY);
  if (error || !data) return null;
  return (data as AttemptRow[]).map(fromRow);
}

/** Saves one submission for the signed-in user. A failure is not fatal: the attempt is still kept locally. */
export async function saveAttempt(attempt: Attempt, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('attempts').insert(toRow(attempt, userId));
  return !error;
}
