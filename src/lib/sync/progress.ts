import { sanitizeProgress, type ProgressState } from '../progress';
import { supabase } from '../supabase';

/** Loads the signed-in user's lesson progress. Null if the request fails, so local progress is kept. */
export async function fetchProgress(userId: string): Promise<ProgressState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('progress').select('data').eq('user_id', userId).maybeSingle();
  if (error) return null;
  return sanitizeProgress(data?.data);
}

/** Saves the whole progress document for the signed-in user. */
export async function saveRemoteProgress(userId: string, state: ProgressState): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
  return !error;
}
