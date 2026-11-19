/**
 * Rules for requests the server proxy (api/judge0.ts) accepts. Kept separate from the
 * function so they can be tested without a server.
 */

/** Judge0 language ids the proxy will forward: C++ (GCC) and Rust. Anything else is refused. */
export const ALLOWED_LANGUAGE_IDS: ReadonlySet<number> = new Set([54, 73]);

export const MAX_BODY_CHARS = 200_000;
export const MAX_SOURCE_CHARS = 50_000;
export const MAX_STDIN_CHARS = 100_000;
/** Upper bound on the CPU time a single run may ask for, in seconds. */
export const MAX_CPU_TIME_SECONDS = 10;
export const DEFAULT_CPU_TIME_SECONDS = 5;

export interface ProxyRequest {
  source_code: string;
  language_id: number;
  stdin: string;
  cpu_time_limit: number;
}

export type ProxyCheck = { ok: true; value: ProxyRequest } | { ok: false; error: string };

function fail(error: string): ProxyCheck {
  return { ok: false, error };
}

/** Validates a parsed request body and returns the exact fields that will be forwarded. */
export function checkProxyRequest(body: unknown): ProxyCheck {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Body must be a JSON object.');
  const b = body as Record<string, unknown>;

  if (typeof b.source_code !== 'string' || b.source_code.length === 0) return fail('source_code is required.');
  if (b.source_code.length > MAX_SOURCE_CHARS) return fail('source_code is too long.');

  if (typeof b.language_id !== 'number' || !ALLOWED_LANGUAGE_IDS.has(b.language_id)) {
    return fail('language_id is not allowed.');
  }

  const stdin = b.stdin ?? '';
  if (typeof stdin !== 'string' || stdin.length > MAX_STDIN_CHARS) return fail('stdin is invalid or too long.');

  const requested =
    typeof b.cpu_time_limit === 'number' && Number.isFinite(b.cpu_time_limit)
      ? b.cpu_time_limit
      : DEFAULT_CPU_TIME_SECONDS;
  const cpu = Math.min(Math.max(requested, 1), MAX_CPU_TIME_SECONDS);

  return {
    ok: true,
    value: { source_code: b.source_code, language_id: b.language_id, stdin, cpu_time_limit: cpu },
  };
}

/* ------------------------------------------------------------------ */
/* Base64 transport                                                    */
/* ------------------------------------------------------------------ */
/*
 * Judge0 refuses to return a result as plain JSON (HTTP 400) when any text in it is not valid
 * UTF-8, which compiler error messages often are. The proxy therefore talks to Judge0 in base64
 * and decodes the result itself, replacing any invalid bytes instead of failing.
 */

/** UTF-8 text to base64. Works in the browser, Node and the Vercel edge runtime. */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Base64 to UTF-8 text. Invalid byte sequences become U+FFFD rather than throwing. */
export function fromBase64(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const binary = atob(String(value).replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

const TEXT_FIELDS = ['stdout', 'stderr', 'compile_output', 'message'] as const;

/** Decodes the text fields of a Judge0 result that was requested with base64_encoded=true. */
export function decodeJudge0Result(result: any): any {
  if (!result || typeof result !== 'object') return result;
  const out = { ...result };
  for (const field of TEXT_FIELDS) {
    if (typeof out[field] === 'string') {
      try {
        out[field] = fromBase64(out[field]);
      } catch {
        /* not valid base64: leave the field as it came */
      }
    }
  }
  return out;
}