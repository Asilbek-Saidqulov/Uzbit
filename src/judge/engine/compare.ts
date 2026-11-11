const normalize = (s: string) =>
  s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as any)[k], (b as any)[k]));
}

const isNumber = (t: string) => t !== '' && !Number.isNaN(Number(t));

/**
 * Compares a program's output with the expected output.
 * Accepts JSON values with numeric tolerance, and whitespace-insensitive
 * token comparison for plain text answers.
 */
export function outputsMatch(actual: string, expected: string): boolean {
  const a = normalize(actual);
  const e = normalize(expected);
  if (a === e) return true;
  try {
    return deepEqual(JSON.parse(a), JSON.parse(e));
  } catch {
    /* not JSON: fall through to token comparison */
  }
  const at = a.split(/\s+/);
  const et = e.split(/\s+/);
  if (at.length !== et.length) return false;
  return at.every((t, i) =>
    t === et[i] || (isNumber(t) && isNumber(et[i]) && Math.abs(Number(t) - Number(et[i])) < 1e-6)
  );
}
