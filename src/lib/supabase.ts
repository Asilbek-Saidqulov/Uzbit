import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client. Public keys only: the anon key is safe in the browser,
 * because row level security in the database decides what each user can read.
 * If the variables are missing, the app runs as before, in the browser only.
 */
// import.meta.env exists in the Vite build and in the browser; plain Node (tests) has none.
const env = ((import.meta as { env?: Record<string, string | undefined> }).env) ?? {};
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const backendConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
